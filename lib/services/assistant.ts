import { getCategoryConfig } from "@/constants/Categories";
import LLMurl from "@/constants/LLMurl";
import { format, isSameMonth, subDays } from "date-fns";
import { formatPrice } from "../utils";
import { Budget } from "./budgets";
import { Transaction } from "./transactions";


function buildContext(
    transactions: Transaction[],
    budget : Budget | null ,
    currency : string,
){
    const now = new Date();
    const cutoff = subDays(now, 30);
    const recent = transactions.filter((tx)=> new Date (tx.date) >= cutoff);


    const thisMonthExpense = transactions.filter(
        (tx)=>tx.type === "EXPENSE" && isSameMonth(new Date(tx.date), now)
    ).reduce((sum, tx)=> sum + tx.amount, 0);

    const spentByCategory:  Record<string, number> = {};

    let income = 0;
    let expense = 0;

    recent.forEach((tx)=>{
        if(tx.type === "EXPENSE"){
            expense += tx.amount;
            spentByCategory[tx.category] = (spentByCategory[tx.category] ?? 0) + tx.amount;
        }else{
            income += tx.amount
        }
    });

    const categoryLines = Object.entries(spentByCategory).sort((a,b)=> b[1] - a[1]).map(
        ([category, amount])=> `-${getCategoryConfig(category as any).label} : ${formatPrice(amount, currency)}`,
    ).join("\n");

    const budgetLine = budget ? `${formatPrice(thisMonthExpense, currency)} spent of ${formatPrice(budget.amount, currency)} monthly budget` : "No monthly budget set.";

    const txLines = recent.slice(0,40).map(
        (tx)=> `-${format(new Date(tx.date), "d MMM yyyy")} | ${tx.type} | ${getCategoryConfig(tx.category).label} | ${formatPrice(tx.amount, currency)}${tx.description ? `| ${tx.description}`: ""}`
    ).join("\n");

    return `Last 30 days summary : 
    Total Income : ${formatPrice(income, currency)}
    Total expense : ${formatPrice(expense, currency)}

    Spending by category: ${categoryLines || "No expenses recorded."}

    Monthly budget : ${budgetLine}

    Recent transactions : ${txLines || "No transactions recorded."}
    `;
}

export async function askAssistant (
    question: string,
    transactions: Transaction[],
    budget: Budget | null,
    currency: string,
){
    const apiKey = process.env.EXPO_PUBLIC_GEMINI_KEY;
    
    if(!apiKey) throw new Error("Missing EXPO_PUBLIC_GEMINI_KEY");

    const context = buildContext(transactions, budget, currency);

    const prompt = `You are a helpful personal finance assistant inside the Zohu app. Answer the user's question using only the financial data below. Be concise and specific with numbers. If the data doesn't answer the question, say so.

    ${context}

    User question : ${question}`;

    const res = await fetch(LLMurl.GEMINI_URL_LITE,
    {
        method: "POST",
         headers: {
            "Content-Type": "application/json",
            "x-goog-api-key": apiKey,
        },
        body:JSON.stringify({
            contents:[
                {
                    role: "user",
                    parts:[{text: prompt}],
                },
            ],
        }),
    });

    if(!res.ok){
        const errText = await res.text();
        throw new Error(`Gemini request failed: ${errText}`)
    }

    const data = await res.json();
    const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;
    if(!text) throw new Error("No response from Gemini");

    return text as string;
}
