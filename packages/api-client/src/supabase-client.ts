import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@cvc/types/supabase.generated";

export type CvcSupabaseClient = SupabaseClient<Database>;

export interface CreateClientOptions {
  url: string;
  anonKey: string;
  storage?: {
    getItem(key: string): string | null | Promise<string | null>;
    setItem(key: string, value: string): void | Promise<void>;
    removeItem(key: string): void | Promise<void>;
  };
}

export function createCvcClient(opts: CreateClientOptions): CvcSupabaseClient {
  return createClient<Database>(opts.url, opts.anonKey, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: false,
      storage: opts.storage,
    },
  });
}
