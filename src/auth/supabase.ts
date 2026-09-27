import { createClient, type SupabaseClient } from '@supabase/supabase-js'

/*
 * Only the project URL and the *publishable* (anon) key belong in the browser. They are safe to
 * expose because every table is protected by row-level security. Never put the secret /
 * service_role key in a NEXT_PUBLIC_/VITE_ variable — anything with those prefixes is shipped to every visitor.
 */
const env = import.meta.env
const url = (env.NEXT_PUBLIC_SUPABASE_URL ?? env.VITE_SUPABASE_URL)?.trim()
const key = (
  env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ??
  env.NEXT_PUBLIC_SUPABASE_ANON_KEY ??
  env.VITE_SUPABASE_PUBLISHABLE_KEY ??
  env.VITE_SUPABASE_ANON_KEY
)?.trim()

export const supabaseConfigured = Boolean(url && key)

export const supabase: SupabaseClient | null = supabaseConfigured
  ? createClient(url!, key!, { auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true } })
  : null
