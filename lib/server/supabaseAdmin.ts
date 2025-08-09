import { createClient } from '@supabase/supabase-js'

const url = process.env.NEXT_PUBLIC_SUPABASE_URL as string
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY as string

export const supabaseAdmin = (url && serviceKey)
  ? createClient(url, serviceKey)
  : null

export type SupabaseAdminType = typeof supabaseAdmin


