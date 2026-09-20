import { NewTransaction, Transaction, TransactionType, createTransaction, deleteTransaction } from "@/lib/services/transactions";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useSupabase } from "../useSupabase";


export function useDeleteTransaction(){
    const supabase = useSupabase();
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: (
            tx: Pick<Transaction, "id" | "account_id" | "amount" | "type" >,)=>deleteTransaction(supabase, tx.id, tx.account_id, tx.amount, tx.type as TransactionType,),
        onSuccess: (result)=>{
            if(result.error) return;
            queryClient.invalidateQueries({queryKey: ["transactions"]});
            queryClient.invalidateQueries({queryKey: ["accounts"]});
        },
    });
}


export function useCreateTransaction(){
    const supabase = useSupabase();
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: (payload: NewTransaction)=>createTransaction(supabase, payload),
        onSuccess: (result)=>{
            if(result.error) return;
            queryClient.invalidateQueries({queryKey: ["transactions"]});
            queryClient.invalidateQueries({queryKey: ["accounts"]});
        },
    });
}