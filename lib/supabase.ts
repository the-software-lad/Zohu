import { createClient } from "@supabase/supabase-js";

const supbaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL!;
const supbaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_KEY!;

if (!supbaseUrl || !supbaseAnonKey){
    throw new Error(
        "Missing Supabase env vars. Add EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_KEY to your .env file."
    )
}

export function createClerkSupabaseClient(getToken:()=> Promise <string | null>){
    return createClient(supbaseUrl, supbaseAnonKey, {
        async accessToken(){
            return getToken();
        }
    });
}