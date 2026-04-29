# Starter Story LATAM Engine

Aplicación inteligente que extrae, clasifica y genera soluciones de negocio para LATAM basadas en videos de Starter Story.

## Stack
- Next.js (Frontend + Backend)
- Supabase (PostgreSQL)
- Apify (Scraping)
- Modal (Workers)
- OpenAI (IA)

## Objetivo
Detectar oportunidades de negocio en LATAM basadas en problemas reales y modelos existentes.

## Configuración de Producción (Vercel)

Para que el proyecto compile y funcione correctamente en Vercel, es obligatorio configurar las siguientes variables de entorno:

### Supabase
- `NEXT_PUBLIC_SUPABASE_URL`: URL de tu proyecto Supabase.
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`: Anon Key pública.
- `SUPABASE_SERVICE_ROLE_KEY`: Service Role Key (Admin) para bypass de RLS.

### Servicios Externos
- `APIFY_API_TOKEN`: Token de acceso a Apify.
- `MODAL_ASSEMBLYAI_WEBHOOK_URL`: URL del webhook de Modal para transcripciones con AssemblyAI.

### IA y Otros (Opcional según uso)
- `OPENAI_API_KEY`: Para el sistema de clasificación de IA.
