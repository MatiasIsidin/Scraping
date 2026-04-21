# SOP 01: Apify Extraction & Supabase Raw Persistence Pipeline

## 1. Architectural Goal
Extraer determinísticamente y de forma incremental videos desde YouTube (vía Apify), obteniendo metadata y transcripciones, para luego catalogar dichos datos como *"Raw Data"* en Supabase, previniendo duplicidades y proveyendo métricas evolutivas. Todo funcionando como base inicial para el Layer 1 del proyecto.

## 2. Tools Workflow (The 3-Layer Execution)

El plan de ejecución confía la lógica pesada a scripts atómicos dentro de `tools/`:

1. **`tools/fetch_channel_videos.py`**
   - Llama al Actor de Apify.
2. **`tools/upsert_raw_metadata.py`**
   - Recibe listados y sube a Supabase verificando llaves primarias. Asigna Snapshots.

### 2.1 Inputs & Outputs
- **Input (Fetcher):** URL del canal o `channel_id`, Max Items, e `incremental_date` (última captura en BD).
- **Output (Fetcher):** Archivo JSON temporal en `.tmp/apify_raw_output.json`.
- **Input (Supabase Shipper):** El JSON en `.tmp/apify_raw_output.json`.
- **Output (Supabase Shipper):** Registros Insertados/Actualizados de manera transaccional en PostgreSQL (Supabase). Generación local de estado `log_shipping_success.json`.

## 3. Data Ingestion & Segregation Logic

### 3.1 Lógica Incremental y Manejo de Duplicados
- **Identificador Único Universal:** Todo el ecosistema confía en `youtube_video_id` como PK/Llave única referencial.
- **Evitar Duplicados:** La tabla `raw_videos` recibe una inserción de tipo UPSERT (`on_conflict="youtube_video_id"`). Si las metadata maestras (Título, Descripción) cambian, se actualizarán las estáticas.
- **Scraping Incremental Eficiente:** El script debe leer mediante consulta a Supabase la fecha del último snapshot exitoso. Apify será llamado pidiéndole que extraiga desde esa fecha en adelante, minimizando costos.
- **Snapshots Evolutivos:** Cada vez que el scraper visite un video *ya existente*, las interacciones (views, likes) generarán un *nuevo registro* en la tabla secundaria `video_snapshots` referenciándolo con un nuevo UUID, documentando la evolución algorítmica.

### 3.2 Separación Datos Crudos vs Procesados
Esta SOP está limitada a la **Raw Layer**. Es arquitectónicamente imperativo que las tablas de origen de `raw_videos` y `video_snapshots` no contengan lógica de negocio, ideas generadas o variables de la IA. La base debe reflejar exclusivamente la realidad 1:1 física del proveedor (YouTube).

## 4. Execution Rules
- **Rate Limits de Supabase:** Para eludir bloqueos de PostgREST, los payloads se dividirán para subir mediante _Batch Insertion_ (bloques de 50 registros por llamada).
- **Frecuencia del Sistema:** El trigger (Webhook/Cron) llamará al Fetcher idealmente una a dos veces al día.
- **Retries de APIs:**
  - Actor de Apify: 3 reintentos on timeout (Delay exponencial).
  - Supabase Insert: Timeout a los 10s. 3 Reintentos.

## 5. Edge Cases & Manejo de Errores Strict

| Condición Edge Case | Acción Determinística & Manejo (SOP) |
| :--- | :--- |
| **Video sin Transcript** (YouTube Shorts, sin subtítulos, bloqueados) | El scraper marca el objeto crudo con `transcript: ""`. El registro a BBDD no falla. El script de procesamiento (Layer 3 de IA en las siguientes SOPs) deberá descartarlo explícitamente en el futuro utilizando esta condición vacía. |
| **Rate Limit / API Offline Supabase** | Todo batch fallido no aborta el script; escribe un payload persistente `.tmp/failed_batch_XYZ.json`. La Navigation Layer usará un Retry Tool más tarde para consumirlo. |
| **Campos Numéricos Omitidos / Nulos** | Si una métrica como `comment_count` viene nula dede Apify (desactivados), se convertirá en formato integer `0` antes de enviarla a la tabla del Snapshot para preservar strictness. |
| **Apify Total Timeout (Falla Masiva)** | Script cierra limpiamente en Exception, graba stack trace en un `tools/logs/error.log` y retorna código de error para que la capa 2 aborte el Pipeline del día sin intentar insertar DB. |

## 6. Logs & Trazabilidad
Todos los scripts python usarán el estándar `logging` con la convención:
`[TIMESTAMP] - [TOOL_NAME] - [INFO/ERROR/WARN] - Event_Message`
La salida estándar (STDOUT) debe evitar prints ruidosos, focalizándose en reportar el avance en "Chunks" insertados.
