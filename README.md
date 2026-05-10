# Starter Story LATAM — Intelligence Engine

> Plataforma de inteligencia de mercado que extrae, analiza y estructura oportunidades de negocio para América Latina a partir de videos de emprendimiento reales.

## 🎯 North Star

Generar soluciones de negocio viables para LATAM mediante el análisis automático de videos (Starter Story), extrayendo **pain points del mercado** desde transcripciones y cruzándolos con perfiles de usuario para proponer soluciones personalizadas.

---

## 📐 Arquitectura General

```
YouTube (Starter Story)
    │
    ▼
┌─────────────┐     ┌──────────────────┐
│  Apify API  │────▶│  Videos + Meta   │
│  (Scraper)  │     │  (Supabase)      │
└─────────────┘     └──────────────────┘
                            │
                    ┌───────┴────────┐
                    ▼                ▼
            ┌────────────┐   ┌──────────────┐
            │ Transcripts│   │  Snapshots   │
            │ (Apify/AAI)│   │ (Métricas)   │
            └────────────┘   └──────────────┘
                    │
                    ▼
        ┌─────────────────────┐
        │   IA Extraction     │
        │ (OpenRouter/OpenAI) │
        └─────────────────────┘
                    │
            ┌───────┴────────┐
            ▼                ▼
    ┌──────────────┐  ┌──────────────────┐
    │ Pain Points  │  │ Pain Point       │
    │ (Repositorio)│  │ Sources (N:M)    │
    └──────────────┘  └──────────────────┘
            │
            ▼ (Sprint 4+)
    ┌──────────────────┐
    │ LATAM Research & │
    │ Classification   │
    └──────────────────┘
            │
            ▼ (Sprint 5)
    ┌──────────────────┐     ┌──────────────┐
    │ RPM Profiles     │────▶│ Solution     │
    │ (User Matching)  │     │ Engine       │
    └──────────────────┘     └──────────────┘
                                    │
                                    ▼
                            ┌──────────────┐
                            │ MVT Valid.   │
                            └──────────────┘
```

---

## 🛠 Stack Tecnológico

| Capa | Tecnología | Propósito |
|------|-----------|-----------|
| **Frontend** | Next.js 16 (App Router) | Dashboard modular con tabs |
| **Backend** | Next.js API Routes | Endpoints RESTful |
| **Base de Datos** | Supabase (PostgreSQL) | Source of truth central |
| **Scraping** | Apify (YouTube Scraper) | Extracción de videos y metadata |
| **Transcripciones** | Apify + AssemblyAI (vía Modal) | Pipeline con fallback |
| **IA / NLP** | OpenRouter (Gemma/GPT) + OpenAI | Extracción de pain points |
| **Workers** | Modal | Procesamiento pesado (AssemblyAI) |
| **Hosting** | Vercel | Deploy + Cron jobs |
| **Cron** | Vercel Cron | Scraping semanal automático |

---

## 📊 Esquema de Base de Datos (Sprint 3)

### Tablas Core
- **`videos`** — Entidades estáticas de videos (youtube_video_id como PK)
- **`transcripts`** — Texto extraído con status tracking y retry control
- **`video_snapshots`** — Métricas evolutivas (vistas, likes, comentarios)
- **`scraping_logs`** — Trazabilidad completa de ejecuciones

### Tablas de Inteligencia (Sprint 3)
- **`video_analysis`** — Análisis IA 1:1 por video (modelo de negocio, mecánica)
- **`pain_points`** — Repositorio centralizado de dolores del mercado
- **`pain_point_sources`** — Tabla puente N:M (pain_point ↔ video/transcript)
- **`extraction_logs`** — Logs de ejecuciones del pipeline IA con costos

### Tablas Placeholder (Sprint 4-5)
- **`video_classifications`** — Clasificación cruzada con RPM
- **`rpm_profiles`** — Perfiles de usuario
- **`solution_engine_outputs`** — Soluciones generadas
- **`mvt_validation`** — Validación de mercado

> Migración completa en: [`db/migrations/001_sprint3_schema.sql`](db/migrations/001_sprint3_schema.sql)

---

## 🔌 API Endpoints

| Método | Ruta | Descripción |
|--------|------|-------------|
| GET | `/api/videos` | Lista todos los videos |
| GET | `/api/audit-logs` | Auditoría de logs (summary) |
| GET | `/api/audit-logs?mode=raw` | Logs crudos para dashboard |
| GET | `/api/pain-points` | Pain points activos |
| GET | `/api/run-incremental-scraper` | Ejecuta scraping incremental |
| POST | `/api/run-painpoint-extraction` | Ejecuta extracción de pain points |
| GET | `/api/run-transcript-retry` | Reintenta transcripts fallidos |
| GET | `/api/run-transcript-backfill` | Backfill de transcripts faltantes |
| GET | `/api/test-db` | Health check de base de datos |

---

## ⚙️ Configuración

### Variables de Entorno Requeridas

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=

# Scraping
APIFY_API_TOKEN=

# Transcripciones (Fallback)
MODAL_ASSEMBLYAI_WEBHOOK_URL=

# IA - Extracción de Pain Points
OPENROUTER_API_KEY=        # Primario (costo optimizado)
OPENAI_API_KEY=            # Fallback
```

### Instalación Local

```bash
npm install
npm run dev
```

### Deploy a Producción

```bash
# Vercel detecta automáticamente Next.js
vercel --prod
```

---

## 📁 Estructura del Proyecto

```
├── architecture/          # SOPs técnicos (Layer 1-3)
├── components/            # Componentes UI reutilizables
├── db/
│   └── migrations/        # SQL migraciones para Supabase
├── lib/
│   ├── prompts/           # Prompts del sistema IA
│   └── supabaseClient.ts  # Cliente Supabase (Admin + Public)
├── modal/                 # Workers de Modal (AssemblyAI)
├── services/              # Servicios del backend
│   ├── apifyService.ts
│   ├── apifyTranscriptService.ts
│   ├── assemblyAiFallbackService.ts
│   ├── incrementalScraperService.ts
│   ├── logService.ts
│   ├── painPointExtractionService.ts   ← NUEVO Sprint 3
│   ├── painPointIntelligence.ts        (Legacy market research)
│   ├── transcriptRetryService.ts
│   └── videoSnapshotService.ts
├── src/app/
│   ├── api/               # API Routes
│   ├── globals.css         # Design system
│   ├── layout.tsx          # Root layout
│   └── page.tsx            # Dashboard principal
├── tools/                 # Scripts Python atómicos
└── vercel.json            # Cron configuration
```

---

## 🗺 Roadmap

### ✅ Sprint 1-2 (Completado)
- Scraping de videos de Starter Story via Apify
- Persistencia en Supabase (videos, transcripts, snapshots)
- Pipeline de transcripciones con fallback a AssemblyAI
- Sistema de retry con backoff exponencial
- Logs de trazabilidad completos
- Cron semanal automático en Vercel
- Dashboard básico con listado de videos

### 🔄 Sprint 3 (En Progreso)
- [x] Reestructuración de base de datos relacional
- [x] Migraciones SQL idempotentes
- [x] Pipeline de extracción de pain points desde transcripts
- [x] Soporte multi-LLM (OpenRouter + OpenAI)
- [x] Dashboard modular con tabs
- [x] API endpoints para pain points
- [x] Design system premium (glassmorphism, dark mode)
- [ ] Ejecución y validación del pipeline en producción
- [ ] Refinamiento de prompts de extracción

### 📋 Sprint 4 (Planificado)
- Clasificación LATAM profunda de pain points
- Investigación de mercado automatizada
- Video classifications cruzadas
- Enrichment de pain points con fuentes externas

### 📋 Sprint 5 (Planificado)
- RPM Wizard (perfiles de usuario)
- Solution Engine (motor deductivo)
- MVT Validation (validación de mercado)
- Generación de reportes exportables

---

## 📄 Decisiones Técnicas

1. **OpenRouter como LLM primario**: Permite acceso a modelos gratuitos (Gemma) y de pago (GPT) con un único endpoint, optimizando costos.
2. **Separación pain_points vs pain_point_sources**: Diseño N:M que permite que un mismo dolor de mercado sea referenciado por múltiples videos, evitando duplicación.
3. **Tabla legacy preservada**: La tabla `pain_points_legacy_v1` conserva los datos del market research anterior sin romper producción.
4. **Extraction versioning**: Permite re-procesar transcripts con nuevos prompts/modelos sin perder clasificaciones anteriores.
5. **Composite score**: Fórmula ponderada (Severidad 35% + Frecuencia 30% + Oportunidad 35%) para ranking automático de pain points.
6. **Build-time safety**: El cliente de Supabase usa un Proxy que no falla durante `next build` cuando las env vars no están disponibles.

---

## 🧪 Testing

```bash
# Health check
curl http://localhost:3000/api/test-db

# Scraping manual
curl http://localhost:3000/api/run-incremental-scraper?run_type=manual

# Extracción de pain points
curl -X POST http://localhost:3000/api/run-painpoint-extraction?limit=5
```

---

## 📝 Licencia

Proyecto académico — Universidad.
