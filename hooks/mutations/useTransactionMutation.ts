import { NewTransaction, Transaction, createTransaction, deleteTransaction } from "@/lib/services/transactions";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useSupabase } from "../useSupabase";


export function useDeleteTransaction(){
    const supabase = useSupabase();
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: (
            tx: Pick<Transaction, "id">,
        )=>deleteTransaction(supabase, tx.id),
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
