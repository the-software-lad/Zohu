import { CATEGORIES, CategoryKey } from "@/constants/Categories";
import { z } from "zod";

export const transactionSchema = z.object({
    type: z.enum(["EXPENSE","INCOME"]),
    amount: z.string().min(1,"Enter an amount.").refine((val)=>{
        const normalized = val.replace(/,/g, "").trim();
        if(!/^(?:\d+(?:\.\d*)?|\.\d+)$/.test(normalized)) return false;
        return Number(normalized) > 0;
    },"Enter a valid amount."),
    category:z.custom<CategoryKey>(
        (val)=> typeof val === "string" && Object.prototype.hasOwnProperty.call(CATEGORIES, val),
    ),
    accountId: z.string().min(1, "Select an account"),
    description: z.string().optional(),
    date: z.date(),
});

export type TransactionFormValues = z.infer<typeof transactionSchema>
