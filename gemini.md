# Project Constitution
## Data schemas, Behavioral rules, Architectural invariants

### 1. Data Schema 

**1.1 Content Entity (from Apify / Transcription Services)**
```json
{
  "youtube_video_id": "string",
  "channel_id": "string",
  "title": "string",
  "description": "string",
  "url": "string",
  "published_at": "timestamp",
  "transcript": "string"
}
```

**1.2 Raw Video Snapshots (Metrics over time)**
```json
{
  "snapshot_id": "uuid",
  "youtube_video_id": "string",
  "view_count": "integer",
  "like_count": "integer",
  "comment_count": "integer",
  "scraped_at": "timestamp"
}
```

**1.3 Processed Classification (from OpenAI, stored in Supabase)**
*(Permite múltiples clasificaciones por video para re-procesamiento dinámico)*
```json
{
  "classification_id": "uuid",
  "youtube_video_id": "string",
  "classification_version": "string",
  "business_category": "string",
  "business_model": "string",
  "core_mechanic": "string",
  "latam_relevance_score": "integer",
  "latam_classification": [
    {
      "pain_point": "string",
      "score": "integer",
      "category": "string"
    }
  ],
  "analysis_summary": "string",
  "processed_at": "timestamp"
}
```

**1.4 Delivery Payload (Solutions Engine Output para Frontend)**
*(Mapea 1 solución a 1 o más videos)*
```json
{
  "solution_id": "uuid",
  "user_rpm_profile": "string",
  "referenced_videos": ["string"],
  "latam_problem_addressed": "string",
  "explanation_latam_context": "string",
  "proposed_viable_solution": "string",
  "difficulty_level": "string", 
  "estimated_cost_range": "string",
  "required_skills": ["string"],
  "rpm_alignment_score": "integer",
  "feasibility_score": "integer",
  "generated_at": "timestamp"
}
```

**1.5 Pain Point (from IA Extraction, stored in Supabase)** *(Sprint 3+)*
*(Repositorio centralizado de dolores del mercado. Relación N:M con videos vía pain_point_sources)*
```json
{
  "id": "uuid",
  "title": "string",
  "description": "string",
  "category": "string",
  "severity": "integer (1-10)",
  "business_type": "string",
  "opportunity_score": "integer (1-10)",
  "market_scope": "string",
  "frequency_count": "integer",
  "composite_score": "decimal",
  "extraction_version": "string",
  "is_validated": "boolean",
  "is_active": "boolean",
  "latam_relevance_score": "integer (0-100)",
  "latam_classification": "jsonb[]",
  "created_at": "timestamp",
  "updated_at": "timestamp"
}
```

**1.6 Pain Point Source (Tabla puente N:M)** *(Sprint 3+)*
*(Conecta pain_points con videos/transcripts. Almacena la evidencia textual)*
```json
{
  "id": "uuid",
  "pain_point_id": "uuid (FK pain_points)",
  "youtube_video_id": "string (FK videos)",
  "transcript_segment": "string",
  "extraction_confidence": "decimal (0-100)",
  "extraction_model": "string",
  "extraction_version": "string",
  "extracted_at": "timestamp"
}
```

### 2. Behavioral Rules
- Strictly adhere to Phase constraints.
- Data-First Rule: Coding begins ONLY after Payload shape is confirmed.
- Halt Execution: No scripts in `tools/` until blueprint approved.
- **Idempotency & Uniqueness:** El sistema debe evitar duplicados usando identificadores únicos (`youtube_video_id`).
- **Incrementalidad:** El scraping debe ser incremental (solo procesar videos nuevos o generar snapshots en el tiempo).
- **Trazabilidad:** Todas las ejecuciones deben registrarse en logs (`scraping_logs` y `extraction_logs`).
- **Separación de Datos:** Uso de snapshots para separar entidades estáticas de la metadata viva y separar datos crudos (metadata, transcripciones) de datos procesados (clasificación, análisis IA, pain points).
- **Escalabilidad Extendida:** Permitir escalar a múltiples canales sumando `channel_id`.
- **Límites de IA:** La IA se usa para análisis y generación, pero no para lógica determinística del sistema.
- **Resiliencia:** Manejar errores de forma controlada sin interrumpir el sistema completo.
- **Rate Limiting:** Respetar límites de APIs externas mediante delays y control de frecuencia.
- **Re-ejecución & Versionado:** Mantener un `extraction_version` / `classification_version` para permitir de forma granular el re-procesamiento dinámico cuando cambien criterios, prompts o modelos.
- **Deduplicación de Pain Points:** Antes de insertar un nuevo pain point, buscar existentes por categoría + similitud de título. Si existe, incrementar `frequency_count` y recalcular `composite_score`.
- **Trazabilidad de Extracción IA:** Registrar modelo usado, tokens consumidos y costo estimado en `extraction_logs` para control presupuestario.
- **LLM Fallback Chain:** Intentar OpenRouter (costo optimizado) → OpenAI directo. Nunca fallar silenciosamente.

### 3. Architectural Invariants
- 3-Layer Architecture (Architecture SOPs, Navigation logic, Tools execution).
- `tools/` contains atomic, deterministic Python scripts.
- Intermediate files go to `.tmp/`.
- Tareas de cómputo intensivas o asíncronas largas se delegan a **Modal**.
- El almacenamiento (`Source of Truth`) debe mantener separación estricta entre Data Cruda, Evolutiva (Snapshots), Procesada (Pain Points, Clasificaciones) y Generada (Soluciones) dentro de **Supabase**.
- Las migraciones SQL deben ser idempotentes (`IF NOT EXISTS` / `IF EXISTS`) y se almacenan en `db/migrations/`.
- Los prompts del sistema se centralizan en `lib/prompts/` para versionado y reutilización.

