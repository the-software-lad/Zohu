import { createClient } from "npm:@supabase/supabase-js@2.116.0";

const GEMINI_URL =
  "https://generativelanguage.googleapis.com/v1beta/models/gemini-3.6-flash:generateContent";
const MAX_REQUEST_BYTES = 12 * 1024 * 1024;
const MAX_MEDIA_BYTES = 8 * 1024 * 1024;

const EXPENSE_CATEGORIES = [
  "food",
  "groceries",
  "transport",
  "shopping",
  "entertainment",
  "health",
  "utilities",
  "rent",
  "education",
  "travel",
  "insurance",
  "subscriptions",
  "emi",
  "personal_care",
  "other",
] as const;

const INCOME_CATEGORIES = [
  "salary",
  "freelance",
  "business",
  "investment",
  "gift",
  "other_income",
] as const;

const ALLOWED_MIME_TYPES = {
  receipt: new Set(["image/jpeg", "image/png", "image/webp", "image/heic", "image/heif"]),
  voice: new Set([
    "audio/aac",
    "audio/flac",
    "audio/m4a",
    "audio/mp3",
    "audio/mpeg",
    "audio/ogg",
    "audio/wav",
    "audio/webm",
  ]),
};

const RESPONSE_SCHEMA = {
  type: "object",
  properties: {
    type: { type: "string", enum: ["EXPENSE", "INCOME"], nullable: true },
    amount: { type: "number", nullable: true },
    category: {
      type: "string",
      enum: [...EXPENSE_CATEGORIES, ...INCOME_CATEGORIES],
      nullable: true,
    },
    description: { type: "string", nullable: true },
    date: { type: "string", nullable: true },
    transcript: { type: "string", nullable: true },
  },
  required: ["type", "amount", "category", "description", "date", "transcript"],
};

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

type ExtractionPayload = {
  kind: "receipt" | "voice";
  mimeType: string;
  data: string;
};

class HttpError extends Error {
  constructor(
    readonly status: number,
    message: string,
  ) {
    super(message);
  }
}

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
  });
}

async function readBodyWithLimit(request: Request) {
  const contentLength = Number(request.headers.get("content-length") ?? 0);
  if (contentLength > MAX_REQUEST_BYTES) {
    throw new HttpError(413, "Request too large");
  }
  if (!request.body) throw new HttpError(400, "Missing request body");

  const reader = request.body.getReader();
  const chunks: Uint8Array[] = [];
  let size = 0;

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    size += value.byteLength;
    if (size > MAX_REQUEST_BYTES) {
      await reader.cancel();
      throw new HttpError(413, "Request too large");
    }
    chunks.push(value);
  }

  const body = new Uint8Array(size);
  let offset = 0;
  for (const chunk of chunks) {
    body.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return new TextDecoder().decode(body);
}

async function enforceAuthenticatedQuota(authorization: string) {
  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY");
  if (!supabaseUrl || !supabaseAnonKey) throw new Error("Missing Supabase configuration");

  const supabase = createClient(supabaseUrl, supabaseAnonKey, {
    global: { headers: { Authorization: authorization } },
    auth: { persistSession: false },
  });
  const { error } = await supabase.rpc("consume_ai_extraction_quota");

  if (!error) return;
  if (error.message.includes("rate_limit_exceeded")) {
    throw new HttpError(429, "Too many extraction requests");
  }
  if (
    error.message.includes("authentication_required") ||
    error.message.toLowerCase().includes("jwt")
  ) {
    throw new HttpError(401, "Unauthorized");
  }
  throw new Error(`Quota check failed: ${error.code}`);
}

function validatePayload(payload: unknown): ExtractionPayload {
  if (!payload || typeof payload !== "object") throw new HttpError(400, "Invalid request");

  const { kind, mimeType, data } = payload as Record<string, unknown>;
  if (kind !== "receipt" && kind !== "voice") throw new HttpError(400, "Invalid extraction kind");
  if (typeof mimeType !== "string" || !ALLOWED_MIME_TYPES[kind].has(mimeType.toLowerCase())) {
    throw new HttpError(415, "Unsupported media type");
  }
  if (typeof data !== "string" || data.length === 0 || !/^[A-Za-z0-9+/]*={0,2}$/.test(data)) {
    throw new HttpError(400, "Invalid media data");
  }

  const padding = data.endsWith("==") ? 2 : data.endsWith("=") ? 1 : 0;
  const decodedBytes = Math.floor((data.length * 3) / 4) - padding;
  if (decodedBytes > MAX_MEDIA_BYTES) throw new HttpError(413, "Media too large");

  return { kind, mimeType: mimeType.toLowerCase(), data };
}

function buildPrompt(kind: "receipt" | "voice") {
  if (kind === "receipt") {
    return `You are reading a receipt photo for a personal finance app. Extract the transaction details.
- "type" is always "EXPENSE" for a receipt.
- "amount" is the final total paid (a plain number, no currency symbols).
- "category" must be exactly one of: ${EXPENSE_CATEGORIES.join(", ")}.
- "description" is a short label, ideally the merchant or store name.
- "date" is the receipt date in YYYY-MM-DD format, if visible.
- "transcript" should be null.
- If any field cannot be confidently determined from the image, set it to null. Do not guess.`;
  }

  const today = new Date().toISOString().slice(0, 10);
  return `You are transcribing a short voice note for a personal finance app where the user is logging a transaction. Extract the transaction details.
- "type" is "EXPENSE" or "INCOME" based on what the user said.
- "amount" is the amount mentioned (a plain number, no currency symbols).
- "category" must be exactly one of: ${EXPENSE_CATEGORIES.join(", ")}, ${INCOME_CATEGORIES.join(", ")}. Pick from the income list for INCOME and the expense list for EXPENSE.
- "description" is a short label summarizing what it was for.
- "date" should be null unless the user clearly mentioned a date. Resolve relative dates to YYYY-MM-DD using ${today} as today's date.
- "transcript" is the verbatim transcription of what was said.
- If any field cannot be confidently determined, set it to null. Do not guess.`;
}

async function extractTransaction(payload: ReturnType<typeof validatePayload>) {
  const apiKey = Deno.env.get("GEMINI_API_KEY");
  if (!apiKey) throw new Error("Missing Gemini configuration");

  const response = await fetch(GEMINI_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-goog-api-key": apiKey,
    },
    body: JSON.stringify({
      contents: [
        {
          role: "user",
          parts: [
            { text: buildPrompt(payload.kind) },
            { inlineData: { mimeType: payload.mimeType, data: payload.data } },
          ],
        },
      ],
      generationConfig: {
        responseMimeType: "application/json",
        responseSchema: RESPONSE_SCHEMA,
      },
    }),
  });

  if (!response.ok) throw new Error(`Gemini request failed with status ${response.status}`);
  const result = await response.json();
  const text = result?.candidates?.[0]?.content?.parts?.[0]?.text;
  if (typeof text !== "string") throw new Error("Gemini returned no extraction result");
  return JSON.parse(text);
}

Deno.serve(async (request) => {
  if (request.method === "OPTIONS") return new Response("ok", { headers: CORS_HEADERS });
  if (request.method !== "POST") return jsonResponse({ error: "Method not allowed" }, 405);

  try {
    const authorization = request.headers.get("authorization");
    if (!authorization?.startsWith("Bearer ")) throw new HttpError(401, "Unauthorized");

    await enforceAuthenticatedQuota(authorization);
    const rawBody = await readBodyWithLimit(request);
    let parsedBody: unknown;
    try {
      parsedBody = JSON.parse(rawBody);
    } catch {
      throw new HttpError(400, "Invalid JSON");
    }

    const payload = validatePayload(parsedBody);
    return jsonResponse(await extractTransaction(payload));
  } catch (error) {
    if (error instanceof HttpError) return jsonResponse({ error: error.message }, error.status);
    console.error("Transaction extraction failed", error);
    return jsonResponse({ error: "Extraction failed" }, 502);
  }
});
