# SOP 02: AI Processing & Latam Classification Engine

## 1. Architectural Goal
Consumir determinísticamente los videos crudos (`raw_videos`) y sus transcripciones íntegras desde Supabase, procesarlos mediante Inteligencia Artificial (OpenAI) para abstraer sus mecánicas de negocio funcionales, y clasificar su viabilidad matemática contra problemas actuales de la región LATAM. El resultado lógico debe ser versionado independientemente, garantizando retroactividad y re-evaluación dinámica en el tiempo sin comprometer la capa de Data Cruda.

## 2. Tools Workflow (The 3-Layer Execution)

De cumplirse la separación, el motor IA requerirá:

1. **`tools/query_unprocessed_videos.py`**: Identifica qué registros de `raw_videos` aún no poseen una entrada bajo la versión lógica actual en `latam_classification`.
2. **`tools/process_ai_classification.py`**: Invoca al motor de OpenAI y aplica JSON Structured Outputs asegurando que el modelo nos devuelva los datos requeridos.
3. **`tools/upsert_classification.py`**: Confirma la estructura y la almacena permanentemente.
*(Nota: Para optimización, estos tres módulos atómicos suelen correr como funciones dentro de un único pipeline orquestado en Layer 2).*

### 2.1 Inputs & Outputs Principales
- **Input (Fetcher DB):** `classification_version` de configuración (ej. `v1.0-latam-painpoints`).
- **Output (Fetcher DB):** Listado batch de tuplas tipo `(youtube_video_id, transcript)`.
- **Input (AI Engine):** Transcript mapeado bajo un *System Prompt* determinístico con una semilla estructural de Pydantic/JSON Scheme.
- **Output (AI Engine):** Objeto validado con los campos: `business_model`, `core_mechanic`, arreglos de scores específicos en LATAM y conclusiones de viabilidad.
- **Output (DB Shipper):** Registros insertados en Supabase bajo la tabla transaccional procesada.

## 3. Lógica de Procesamiento IA y Clasificación Absoluta

### 3.1 Prompting Determinístico y Extracción
- La API de OpenAI debe invocarse utilizando `response_format` JSON. Esto es innegociable.
- La abstracción primaria a calcular internamente debe ser:
  - `business_model`: Categorización fundamental (B2B, SaaS, E-Commerce tradicional, Arbitraje, etc.).
  - `core_mechanic`: La palanca exacta (ej. "Comprar leads genéricos en Facebook, nutrir via email, cerrar high-ticket por llamada").

### 3.2 Sistema de Scoring y Latam Pain Points
- El Prompt System contendrá un framework fijo de *Problemas de Mercado LATAM* predefinidos (Inflación, Falta de crédito mercantil, Barreras de aduana, Logística fragmentada).
- La IA realizará un "match" ponderado para cada Pain Point y asignará obligatoriamente un `score` paramétrico con límites del 1 al 10 en su objeto "latam_classification" validado.
- Se exigirá como propiedad del output general un `latam_relevance_score` resumido y promediado que servirá para que el motor de Soluciones decida entregarlo o no más adelante.

### 3.3 Re-procesamiento Dinámico (Versionado)
- Todo registro clasificado insertado almacena la columna `classification_version` (ej. `v1.2-latam`).
- Si el negocio cambia o se agregan nuevos *Pain Points* relevantes en América Latina, en vez de borrar la BBDD, simplemente la configuración maestra eleva su versión a `v2.0-latam`.
- Inmediatamente el Tool 1 (la Query a Supabase) al buscar qué videos no poseen metadata `v2.0` extraerá la totalidad histórica de `raw_videos` y volverá a generar análisis nuevos sin tocar ni alterar el original que ya capturó el Scraper.

## 4. Execution Rules
- **Delegación a Modal (Opt-in):** Procesar listados crudos grandes requiere un tiempo de computo alto y paralelos TCP amplios. Las subrutinas largas deben considerar su subida al cloud de Modal y esperar su Callback de conclusión.
- **Límites de Contexto Tokens:** Si el Transcript reportado devora el Input Window Context excediendo el límite, el Tool deberá aplicar Truncation preventivo (reducir conservando ideas principales con Chunking) o denegar la evaluación evitando el crash inmanejable de la respuesta HTTP 400.

## 5. Edge Cases & Errores (Strict Handling)

| Condición Edge Case | Acción Determinística & Manejo (SOP) |
| :--- | :--- |
| **OpenAI Rate Limit (HTTP 429) / Saturation** | Implementar `tenacity` (o `time.sleep` equivalente) para backoff exponencial (re-intentar en 3s -> 10s -> 30s). Frenar batch localmente y registrar caída si la retención expira después de 4 caídas. |
| **Alucinación o Inconsistencia Estructural** | Todo payload debe pasar un validador estricto. Si le faltan keys de pain-point a la respuesta de IA, es desechado al log transitorio `.tmp/invalid_schema.json` sin impactar la base de datos y sin romper la rutina con Excepciones de tipado. |
| **Video sin Transcript (`""`)** | La lógica de inicialización en Layer 2 automáticamente detectará esta condición y la considerará "Clasificación Completada = Nula", evitando el desperdicio millonario de tokens estáticos en OpenAI enviando llamadas vacías. |
| **Filtrado de Contenido (Safety Block)** | Negocios extra-regionales (cripto lavado etc.) pueden disparar los flag de OpenAI. El error se atrapa sin StackTrace pánico y deja listado local. |

## 6. Logs & Trazabilidad
Todos los reportes de salida deben incluir la trazabilidad monetaria. Obligatorio logguear desde el objeto response:
`[TIMESTAMP] - [AI_TOOL] - [INFO] - Video ID procesado. Tokens -> IN: {prompt_tokens}, OUT: {completion_tokens}. Latam Score Result: {score}`.
