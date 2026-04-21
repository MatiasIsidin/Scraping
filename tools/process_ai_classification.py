import os
import json
import logging
import uuid
from datetime import datetime, timezone
from dotenv import load_dotenv
from supabase import create_client, Client
from openai import OpenAI, RateLimitError, APIError
from pydantic import BaseModel, Field
import tenacity

# --- Configuración de Logs SOP 02 ---
logging.basicConfig(level=logging.INFO, format='%(asctime)s - [%(name)s] - [%(levelname)s] - %(message)s')
logger = logging.getLogger("ai_classification")

load_dotenv()

# --- Configurations & Environment ---
SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_KEY")
OPENAI_KEY = os.getenv("OPENAI_API_KEY")

# Variable Maestro Arquitectónico: Regula el re-procesamiento retroactivo
CLASSIFICATION_VERSION = "v1.0-latam-base"
MODEL_NAME = "gpt-4o-mini" # Fast, cost-efficient para extracciones estructuradas
MAX_BATCH_SIZE = 10 # Safety limit para desarrollo y consumo local

TMP_DIR = os.path.join(os.getcwd(), ".tmp")
os.makedirs(TMP_DIR, exist_ok=True)


# --- 1. Definición Funcional Pydantic para OpenAI Structured Outputs ---
class LatamPainPoint(BaseModel):
    pain_point: str = Field(description="Problema fundamental que enfrenta LATAM (Ej: Falta de crédito mercantil, Logística, Burocracia extrema)")
    category: str = Field(description="Categoría general del problema (Ej: Financiero, Logístico, Legal, Social)")
    score: int = Field(description="Puntuaje del 1 al 10 de qué tan bien la tesis central de este negocio ataca y resuelve este pain point", ge=1, le=10)

class ClassificationOutput(BaseModel):
    business_category: str = Field(description="Categoría general macro del mercado (ej. SaaS B2B, E-Commerce, Arbitraje, Creador de Contenido)")
    business_model: str = Field(description="Tesis central descriptiva del modelo de negocio original (El Qué)")
    core_mechanic: str = Field(description="El engranaje exacto pragmático que atrae el cliente y monetiza (El Cómo)")
    latam_relevance_score: int = Field(description="Score paramétrico general (1-10) del nivel de viabilidad, permeabilidad y resiliencia en LATAM", ge=1, le=10)
    latam_classification: list[LatamPainPoint] = Field(description="Arreglo de pain points que la mecánica ayuda a sortear o capitalizar directamente")
    analysis_summary: str = Field(description="Resumen corto ejecutivo (max 3 líneas) hiper-focalizado justificando los scores frente a la realidad de américa latina")


def dump_fallback(data, prefix="error"):
    """Archiva en fallback según demanda del SOP en caso de fallos de RateLimit o BBDD"""
    stamp = datetime.now().strftime('%Y%m%d%H%M%S')
    filepath = os.path.join(TMP_DIR, f"{prefix}_{stamp}.json")
    try:
        with open(filepath, "w", encoding='utf-8') as f:
            json.dump(data, f, ensure_ascii=False, indent=2)
    except Exception as e:
        logger.error(f"Fallo grabando al log crudo (.tmp): {str(e)}")

# Fallback Resiliente (Tenacity) SOP Constraint contra Fallos y Sobrecarga
@tenacity.retry(
    wait=tenacity.wait_exponential(multiplier=1, min=3, max=30),
    stop=tenacity.stop_after_attempt(4),
    retry=tenacity.retry_if_exception_type((RateLimitError, APIError)),
    reraise=True
)
def extract_business_logic(client: OpenAI, title: str, description: str, transcript: str) -> ClassificationOutput:
    """Ejecución determinística contra Inteligencia Artificial empleando JSON Structured Objects nativos"""
    
    # Truncamiento de seguridad antes de desatar errores 400 por largo excesivo (Limitado a ~65k Caracteres por seguridad)
    safe_transcript = transcript[:65000] 
    
    system_prompt = (
        "Eres un analista de negocios táctico top-tier especializado en la macroeconomía y ecosistema emprendedor de América Latina. "
        "Tu misión es inferir limpiamente el modelo de negocio original del creador basado en el transcript proveído, "
        "y luego puntear rigurosamente cómo esa mecánica interactúa con problemáticas latinas. "
        "Sé deductivo, nunca inventes capacidades. Si la mecánica está atada a plataformas de USA (ej. robocalls o credit scores de US) y no aplica asimílela con scores pésimos."
    )
    
    user_context = (
        f"TITLE: {title}\n"
        f"DESCRIPTION: {description}\n"
        f"TRANSCRIPT:\n{safe_transcript}"
    )

    # Inyección directa exigiendo la plantilla Base Pydantic
    response = client.beta.chat.completions.parse(
        model=MODEL_NAME,
        messages=[
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": user_context}
        ],
        response_format=ClassificationOutput,
    )
    
    # Trazabilidad SOP Obligatoria (Control de costes)
    usage = response.usage
    logger.info(f"OpenAI Metadatos -> Prompt: {usage.prompt_tokens} Completados: {usage.completion_tokens} | Total Coste Tokens: {usage.total_tokens}")
    
    return response.choices[0].message.parsed


def main():
    logger.info("=== Invocando Rutina de Inferencia IA: process_ai_classification ===")
    
    if not SUPABASE_URL or "tu_url" in SUPABASE_URL or not OPENAI_KEY or "tu_token" in OPENAI_KEY:
        logger.error("Abortando Tool: ApiKeys no provistas para conectarse al LLM o BBDD.")
        return
        
    supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)
    ai_client = OpenAI(api_key=OPENAI_KEY)
    
    # 2. SEPARACIÓN VERIFICADA: ¿Qué videos del catálogo Carecen de Análisis en NUESTRA Versión?
    logger.info(f"Interrogando BBDD buscando historial de clasificaciones v_actual: '{CLASSIFICATION_VERSION}'")
    try:
        class_res = supabase.table("latam_classification").select("youtube_video_id").eq("classification_version", CLASSIFICATION_VERSION).execute()
        classified_ids = {row["youtube_video_id"] for row in class_res.data}
    except Exception as e:
        logger.error(f"Caída de red interrogando clasificaciones (Supabase): {e}")
        return

    # Buscar Raw Videos
    try:
        # Petición Batch de Seguridad 100 (El Fetcher y la Arquitectura manejan los límites grandes)
        raw_res = supabase.table("raw_videos").select("youtube_video_id, title, description, transcript").limit(100).execute()
        all_raw = raw_res.data
    except Exception as e:
        logger.error(f"Caída extrayendo lista de raw_videos a inferir: {e}")
        return
        
    unprocessed = [v for v in all_raw if v["youtube_video_id"] not in classified_ids]
    
    logger.info(f"Scan de videos completado. Tota Raw DB: {len(all_raw)} | Pendientes a ser evaluados bajo ({CLASSIFICATION_VERSION}): {len(unprocessed)}.")
                
    if not unprocessed:
        logger.info("Pipeline al corriente. No hay registros sucios que precisan de IA. Saliendo sin costos.")
        return
        
    to_process = unprocessed[:MAX_BATCH_SIZE]
    logger.info(f"Encendiendo motor OpenAI para evaluación matemática de {len(to_process)} extractos...")
    
    classifications_payloads = []
    
    # 3. PROCESAMIENTO LINEAL / INFERENCIA SEGREGADA 
    for video in to_process:
        vid_id = video["youtube_video_id"]
        transcript = video.get("transcript", "")
        
        # SOP Constraint Edge Case: Evitar gastos absurdos en video vació pero firmarlo procesado
        if not transcript or str(transcript).strip() == "":
            logger.warning(f"Video {vid_id} filtrado lógicamente por transcript vacío. Subiendo clasificación nula.")
            classifications_payloads.append({
                "classification_id": str(uuid.uuid4()),
                "youtube_video_id": vid_id,
                "classification_version": CLASSIFICATION_VERSION,
                "business_category": "Omitido (No Data)",
                "business_model": "N/A",
                "core_mechanic": "N/A",
                "latam_relevance_score": 0,
                "latam_classification": [],
                "analysis_summary": "Ignorado preventivamente por límite estricto SOP debido a contexto faltante del canal original.",
                "processed_at": datetime.now(timezone.utc).isoformat()
            })
            continue
            
        logger.info(f"🔧 Generando Analítcas -> [{vid_id}] // {video.get('title')[:35]}...")
        try:
            parsed_result: ClassificationOutput = extract_business_logic(
                ai_client, 
                video.get('title', ''), 
                video.get('description', ''), 
                transcript
            )
            logger.info(f"✓ Video Digerido. Score Geo-Específico Asignado: {parsed_result.latam_relevance_score} pts.")
            
            payload = {
                "classification_id": str(uuid.uuid4()),
                "youtube_video_id": vid_id,
                "classification_version": CLASSIFICATION_VERSION,
                "business_category": parsed_result.business_category,
                "business_model": parsed_result.business_model,
                "core_mechanic": parsed_result.core_mechanic,
                "latam_relevance_score": parsed_result.latam_relevance_score,
                # Convertimos la lista de Pydantic Models a dict normal
                "latam_classification": [pp.model_dump() for pp in parsed_result.latam_classification],
                "analysis_summary": parsed_result.analysis_summary,
                "processed_at": datetime.now(timezone.utc).isoformat()
            }
            classifications_payloads.append(payload)
            
        except Exception as e:
            logger.error(f"Fallo determinístico (Posible Alucinación Schema/Timeout) para: [{vid_id}]. Razón: {str(e)}")
            dump_fallback(video, f"failed_schema_{vid_id}")
            continue # Seguir con la cola sin interrupciones severas
            
    # 4. ENTREGA (SUPABASE FINAL)
    if classifications_payloads:
        try:
            logger.info(f"Disparando volcado masivo ({len(classifications_payloads)} entidades) a la red de Supabase...")
            # Pudiendo utilizar insert si Classification ID es PK pura
            supabase.table("latam_classification").insert(classifications_payloads).execute()
            logger.info("✔ Registros procesados confirmados materialmente en la Database.")
        except Exception as e:
            logger.error(f"Sincronía Pura a tabla abortada. Escribiendo remanente temporal: {str(e)}")
            dump_fallback(classifications_payloads, "failed_classification_batch")
            
    logger.info("=== Subrutina OpenAI Inferencia Concluida ===")

if __name__ == "__main__":
    main()
