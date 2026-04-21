# SOP 03: Delivery Payload & Solutions Engine

## 1. Architectural Goal
Consolidar el análisis de la capa `latam_classification` de forma transaccional cruzándola contra el **Perfil RPM del Usuario**. El objetivo arquitectónico es que la Inteligencia Artificial actúe estrictamente como un motor de inferencia matemática generador de soluciones viables contextualizadas y validadas contra barreras reales (Dificultad, Skills, Capital), evitando así alucinaciones creativas, forzando la trazabilidad absoluta a los videos fuente (Starter Story).

## 2. Tools Workflow (The 3-Layer Execution)

La secuencia de este motor requerirá:

1. **`tools/query_user_matrix.py`**: Interroga y junta: a) Variables del usuario RPM, b) Top N videos clasificados (basados en coincidencia geométrica o filtro SQL con el problema expuesto).
2. **`tools/generate_rpm_solutions.py`**: Realiza el cruce a través de OpenAI Structured Data, prohibida la "creatividad abierta", exigiendo una lista JSON de Soluciones dictada por sus emparejamientos.
3. **`tools/delivery_shipper.py`**: Persiste el objeto de soluciones en Supabase, dejándolo listo para consumo In-Time por el cliente Next.js.

### 2.1 Inputs & Outputs
- **Input (Combinatoria al AI Engine):**
  1. Base contextual: Top List de Videos Pre-Clasificados con sus scores (`business_model`, `core_mechanic`).
  2. Parámetro estricto: Listado de `latam_pain_points`.
  3. Variable Cliente: Perfil RPM (Recursos, Problemas, Medios/Skills).
- **Output (Solutions Engine):** Arreglo garantizado de **mínimo 4** `solution_payload` (esquema definido en `gemini.md`) validadas en esquema.
- **Output (DB Shipper):** Payload final guardado permanentemente en base de datos, vinculado 1:N a los usuarios de la APP.

## 3. Lógica Constructiva del Motor de Soluciones

### 3.1 Ensamblaje Combinatorio (Zero-Creativity Policy)
- El Prompt de sistema convertirá a OpenAI en un **Valuador Deductivo**.
- Toda idea/solución generada debe ser un sub-producto comprobado de emparejar un `core_mechanic` de al menos un video y aplicarlo a suplir una necesidad identificada en el mercado.
- **Trazabilidad Absoluta:** La propiedad `referenced_videos` alojará un array inmutable con los UUIDs de los videos originales. Si una instrucción no puede referenciar de dónde infirió la solución, el *Structured Output* la considerará inválida y se la prohibirá.

### 3.2 Reglas de Match (Filtro Paramétrico)
La Respuesta exigirá un mapeo estructurado del esfuerzo necesario, emparejando:
1. **Dificultad Técnica:** (Enum forzado: `Low`, `Medium`, `High`).
2. **Capital Estimado:** Rangos fijos dictados al prompt (ej. `<$100`, `$1k-$5k`, `+10k`) ajustado la realidad cambiaria local.
3. **Required Skills:** Matriz resultante (`["Ventas corporativas", "Programacion Python"]`) para validar contra el RPM original.

### 3.3 Fit Final (Score 0-100)
- Basado en los choques entre Capital Estimiado/Required Skills observadas vs las habilidades/fondos declarados por el RPM del usuario, el Motor calificará la idea obligatoriamente con un `feasibility_score` de 0 a 100.
- Una solución por arriba de 80 informará *High Match* al frontend.

## 4. Adaptación LATAM Explícita
La extracción deberá popular la etapa fundamental del Payload con `explanation_latam_context`. El motor de inferencia debe transformar mecánicas gringas en modelos tropicalizables (Ej: Si un modelo demanda Shopify Payments excluido en gran parte de la región, obligatoriamente lo debe explicar mencionando su contraparte como MercadoPago u optimización por redes). Propuestas genéricas del mercado americano resultarán en rechazos sistemáticos.

## 5. Manejo de Edge Cases e Inconsistencias (Strict Handling)

| Condición Edge Case | Acción Determinística & Manejo (SOP) |
| :--- | :--- |
| **Inconsistencia Abismal Usuario/Video** | Si se expone un `core_mechanic` hiper avanzado financiero a un perfil RPM inicial, el generador calificará la factibilidad < 20 y deberá de iterar forzando la búsqueda de una mecánica distinta disponible en el Input Base del chunk para no entregar basuras imposibles. |
| **Menos de 4 Soluciones** | El JSON Schema Validator se configura con `minItems: 4`. Si el motor responde 3, crashea el parser y activa un reintento (Max Retry: 3). En caída final voltea a lista de error para depuración local manual. |
| **No existen Latam Pains Aplicables** | Si el video no tiene correlación lógica con ninguna falla de LATAM (ej. "Negocio de quitar nieve"), el Motor saltará el video considerándolo no-tropicalizable. |

## 6. Generación Final y Tráfico a Next.js
- Una vez consolidadas las 4 respuestas, se persistirán en la base de datos Supabase en su propia tabla relacional, sirviendo la metadata ya final (Vistas crudas al frontend directamente unidas por ForeignKey al video real del canal de YouTube extraído por Apify en SOP 01).
