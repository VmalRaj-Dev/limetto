// lib/supabaseClient.ts
import { createPagesServerClient } from '@supabase/auth-helpers-nextjs'
import { GetServerSidePropsContext } from 'next'
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

// ✅ Client-side Supabase client
export const supabase = createClient(supabaseUrl, supabaseAnonKey)

// ✅ Server-side Supabase client (for getServerSideProps)
export const createSupabaseServerClient = (ctx: GetServerSidePropsContext) => {
  return createPagesServerClient(ctx)
}
