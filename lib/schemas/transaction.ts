import { CategoryKey } from "@/constants/Categories";
import { z } from "zod";

export const transactionSchema = z.object({
    type: z.enum(["EXPENSE","INCOME"]),
    amount: z.string().min(1,"Enter an amount.").refine((val)=>{
        const parsed = parseFloat(val.replace(/,/g, ""));
        return !Number.isNaN(parsed) && parsed > 0;
    },"Enter a valid amount."),
    category:z.custom<CategoryKey>((val)=> typeof val === "string"),
    accountId: z.string().min(1, "Select an account"),
    description: z.string().optional(),
    date: z.date(),
});

export type TransactionFormValues = z.infer<typeof transactionSchema>