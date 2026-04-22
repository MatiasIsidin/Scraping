import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL || '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY || '';
const supabaseServiceKey = process.env.SUPABASE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY || '';

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn('Backend Warn: NEXT_PUBLIC_SUPABASE_URL o NEXT_PUBLIC_SUPABASE_ANON_KEY no están definidas.');
}

if (!supabaseServiceKey) {
  console.warn('Backend Warn: SUPABASE_KEY o SUPABASE_SERVICE_ROLE_KEY no está definida.');
}

// 1. Cliente público con permisos limitados (Frontend / SSR genérico)
export const supabaseClient = createClient(supabaseUrl, supabaseAnonKey);

// 2. Cliente administrador puro con role-key (Para APIs / Backend tools / Evita RLS)
export const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
  auth: { autoRefreshToken: false, persistSession: false }
});
