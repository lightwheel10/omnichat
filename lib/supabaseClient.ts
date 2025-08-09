import { createClient } from '@supabase/supabase-js'

// Read from env; these are safe to expose in the browser (anon key)
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL as string
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY as string

if (!supabaseUrl || !supabaseAnonKey) {
  // We avoid throwing at import-time in production builds; consumers can handle missing client
  // eslint-disable-next-line no-console
  console.warn('Supabase env vars are not set. Auth will be disabled until configured.')
}

export const supabase = (supabaseUrl && supabaseAnonKey)
  ? createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
      }
    })
  : (null as any)

export type SupabaseClientType = typeof supabase


