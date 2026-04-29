import { createClient, SupabaseClient } from '@supabase/supabase-js';

// --- CONFIGURACIÓN DE ENTORNO SEGURA ---
const getEnv = (name: string) => (typeof process !== 'undefined' ? process.env[name] : '') || '';

const supabaseUrl = getEnv('NEXT_PUBLIC_SUPABASE_URL') || getEnv('SUPABASE_URL');
const supabaseAnonKey = getEnv('NEXT_PUBLIC_SUPABASE_ANON_KEY') || getEnv('SUPABASE_ANON_KEY');
const supabaseServiceKey = getEnv('SUPABASE_SERVICE_ROLE_KEY') || getEnv('SUPABASE_KEY');

/**
 * Crea un cliente de Supabase de forma segura.
 * Durante el build de Next.js, si faltan las variables, retorna un objeto dummy 
 * para evitar que el proceso falle prematuramente.
 */
function createSafeClient(url: string, key: string, options?: any): SupabaseClient {
  const isBuildTime = process.env.NEXT_PHASE === 'phase-production-build';

  if (!url || !key || url === '' || key === '') {
    if (isBuildTime) {
      console.log(`[SUPABASE-INIT] Build detectado: Saltando creación real (URL: ${!!url}, KEY: ${!!key})`);
    } else {
      console.error(`[SUPABASE-INIT] ERROR: Variables de entorno faltantes para Supabase.`);
    }
    
    // Retornamos un Proxy que falla con un mensaje claro si se intenta usar en build
    return new Proxy({} as any, {
      get: (_, prop) => {
        return () => {
          throw new Error(
            `Fallo al llamar a '${String(prop)}' en SupabaseClient. El cliente no se inicializó correctamente (¿faltan variables de entorno?).`
          );
        };
      }
    });
  }

  return createClient(url, key, options);
}

// 1. Cliente público (Frontend / SSR)
export const supabaseClient = createSafeClient(supabaseUrl, supabaseAnonKey);

// 2. Cliente administrador (Backend / APIs)
export const supabaseAdmin = createSafeClient(supabaseUrl, supabaseServiceKey, {
  auth: { autoRefreshToken: false, persistSession: false }
});
