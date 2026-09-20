import { CategoryKey } from "@/constants/Categories";
import { SupabaseClient } from "@supabase/supabase-js";

export type TransactionType = "INCOME" | "EXPENSE";
export type InputMethod = "MANUAL" | "RECEIPT_SCAN" | "VOICE";

export type Transaction = {
    id: string;
    user_id:string;
    account_id:string;
    type:TransactionType;
    amount:number;
    category:CategoryKey;
    description: string | null;
    date:string;
    status:string;
    input_method:InputMethod;
    voice_transcript:string | null;
    is_flagged:boolean;
    flag_reason:string | null;
    created_at: string;
    updated_at: string;
}

export type TransactionFilters = {
    type?: TransactionType | null;
    accountId?:string | null;
}

export async function getTransactions(
    supabase: SupabaseClient,
    userId:string,
    filters: TransactionFilters = {}
){
    let query = supabase.from("transactions").select("*").eq("user_id",userId)
    if(filters.type) query = query.eq("type", filters.type);
    if(filters.accountId) query = query.eq("account_id", filters.accountId);

    const {data, error} = await query.order("date", {ascending : false});

    if(error) throw error;
    return data as Transaction[];
}

export async function deleteTransaction(
    supabase: SupabaseClient,
    transactionId: string,
){
    const {error} = await supabase.rpc("delete_transaction_with_balance", {
        p_transaction_id: transactionId,
    });

    return {error};
}

export type NewTransaction = {
    user_id: string,
    account_id: string,
    type : TransactionType,
    amount: number,
    category: CategoryKey,
    description?: string | null,
    date: string,
    input_method:InputMethod,
    voice_transcript: string | null 
}

export async function createTransaction(supabase: SupabaseClient, payload: NewTransaction){
    const {data: transaction, error} = await supabase
        .rpc("create_transaction_with_balance", {
            p_user_id: payload.user_id,
            p_account_id: payload.account_id,
            p_type: payload.type,
            p_amount: payload.amount,
            p_category: payload.category,
            p_description: payload.description ?? null,
            p_date: payload.date,
            p_input_method: payload.input_method,
            p_voice_transcript: payload.voice_transcript,
        })
        .single();

    if(error) return {transaction: null, error};
    return {transaction: transaction as Transaction, error: null};
}
