import { AccountType, createAccount, deleteAccount, setDefaultAccount, updateAccount } from "@/lib/services/accounts";
import { useUser } from "@clerk/expo";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useSupabase } from "../useSupabase";

export function useCreateAccount(){
    const {user} = useUser();
    const supabase = useSupabase();
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: (payload:{name: string; type:AccountType})=>createAccount(supabase, user!.id, payload),
        onSuccess: ()=>{
            queryClient.invalidateQueries({queryKey: ["accounts"]});
        },
    });
}


export function useUpdateAccount(){
    const supabase = useSupabase();
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: ({accountId, payload}:{accountId: string; payload:{name: string; type: AccountType}})=>
            updateAccount(supabase, accountId, payload),
        onSuccess: ()=>{
            queryClient.invalidateQueries({queryKey: ["accounts"]});
        },
    });
}

export function useDeleteteAccount(){
    const supabase = useSupabase();
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: ({accountId, force = false}:{accountId: string; force?:boolean})=>
            deleteAccount(supabase, accountId, {force}),
        onSuccess: ()=>{
            queryClient.invalidateQueries({queryKey: ["accounts"]});
            queryClient.invalidateQueries({queryKey: ["transactions"]});
        },
    });
}

export function useSetDefaultAccount(){
    const supabase = useSupabase();
    const queryClient = useQueryClient();
    const {user} = useUser();

    return useMutation({
        mutationFn: (accountId : string)=>
            setDefaultAccount(supabase, user!.id, accountId),
        onSuccess: ()=>{
            queryClient.invalidateQueries({queryKey: ["accounts"]});
        },
    });
}