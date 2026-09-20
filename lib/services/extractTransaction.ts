import { CategoryKey } from "@/constants/Categories";
import { SupabaseClient } from "@supabase/supabase-js";

export type ExtractedTransaction = {
    type: "EXPENSE" | "INCOME" | null;
    amount: number | null;
    category: CategoryKey | null;
    description: string | null;
    date: string | null;
    transcript: string | null;
}

async function callExtractionBackend(
    supabase: SupabaseClient,
    kind: "receipt" | "voice",
    inlineData: {mimeType: string; data: string},
){
    const {data, error} = await supabase.functions.invoke<ExtractedTransaction>(
        "extract-transaction",
        {body: {kind, ...inlineData}},
    );

    if(error) throw error;
    if(!data) throw new Error("No extraction response");
    return data;
}

export async function extractTransactionFromReceipt(
    supabase: SupabaseClient,
    base64Image: string,
    mimeType: string,
): Promise<ExtractedTransaction>{
    return callExtractionBackend(supabase, "receipt", {mimeType, data:base64Image});
}

export async function extractTransactionFromVoice(
    supabase: SupabaseClient,
    base64Audio:string,
    mimeType: string,
): Promise<ExtractedTransaction>{
    return callExtractionBackend(supabase, "voice", {mimeType, data:base64Audio});
}
