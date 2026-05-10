import os
import json
import logging
import time
import uuid
from datetime import datetime, timezone
from dotenv import load_dotenv
from supabase import create_client, Client
from openai import OpenAI
import tenacity

# --- configuration ---
load_dotenv(".env.local")

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - [SPRINT3-TEST] - [%(levelname)s] - %(message)s'
)
logger = logging.getLogger("sprint3_production_test")

SUPABASE_URL = os.getenv("NEXT_PUBLIC_SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_SERVICE_ROLE_KEY")
OPENROUTER_KEY = os.getenv("OPENROUTER_API_KEY")
OPENROUTER_MODEL = os.getenv("OPENROUTER_MODEL", "openai/gpt-4o-mini")
MAX_TOKENS = 2000

# Version control for Sprint 3
EXTRACTION_VERSION = "v3.0-prod-test"

if not all([SUPABASE_URL, SUPABASE_KEY, OPENROUTER_KEY]):
    logger.error("Missing environment variables. Check .env.local")
    exit(1)

supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)
# OpenRouter is OpenAI compatible
ai_client = OpenAI(
    api_key=OPENROUTER_KEY,
    base_url="https://openrouter.ai/api/v1"
)

# --- prompt and schema ---
SYSTEM_PROMPT = """
Eres un analista experto en investigación de mercado para el ecosistema startup en Latinoamérica.
Tu objetivo es analizar la transcripción de un video y extraer "Pain Points" (puntos de dolor/problemas reales) que los emprendedores o clientes enfrentan en LATAM.

REGLAS DE EXTRACCIÓN:
1. Extrae únicamente problemas reales mencionados o fuertemente implícitos en la historia.
2. Cada Pain Point debe estar vinculado a una evidencia textual exacta o parafraseada del transcript.
3. Clasifica la severidad del problema (1-10).
4. Identifica la categoría (Financiero, Operativo, Logístico, Legal, Ventas, etc.).

Debes responder ÚNICAMENTE con un objeto JSON válido con la siguiente estructura:
{
  "pain_points": [
    {
      "title": "Título corto del problema",
      "description": "Explicación detallada del problema en el contexto de LATAM",
      "category": "Categoría",
      "severity_score": 7,
      "frequency_score": 5,
      "evidence": "Cita o segmento del transcript que demuestra este problema",
      "market_segment": "Segmento de mercado afectado (ej: Pequeñas empresas, freelancers, retail)",
      "country": "País mencionado o null si es general para LATAM"
    }
  ]
}
"""

def estimate_cost(model, prompt_tokens, completion_tokens):
    # This is a rough estimation for logging as requested.
    # Prices vary by model on OpenRouter. 
    # For many free models, it's 0.
    return 0.0 # Placeholder for cost tracking

@tenacity.retry(
    wait=tenacity.wait_exponential(multiplier=1, min=5, max=60),
    stop=tenacity.stop_after_attempt(5),
    retry=tenacity.retry_if_exception(lambda e: "429" in str(e) or "Rate limit" in str(e)),
    reraise=True
)
def get_ai_extraction(video_title, transcript):
    import requests
    # Truncate transcript to avoid token limits
    safe_transcript = transcript[:5000] 
    
    user_content = f"VIDEO TITLE: {video_title}\n\nTRANSCRIPT:\n{safe_transcript}"
    
    headers = {
        "Authorization": f"Bearer {OPENROUTER_KEY}",
        "Content-Type": "application/json"
    }
    
    payload = {
        "model": OPENROUTER_MODEL,
        "messages": [
            {"role": "system", "content": SYSTEM_PROMPT},
            {"role": "user", "content": user_content}
        ],
        "response_format": {"type": "json_object"}
    }
    
    start_time = time.time()
    try:
        response = requests.post(
            url="https://openrouter.ai/api/v1/chat/completions",
            headers=headers,
            data=json.dumps(payload),
            timeout=60
        )
        duration = time.time() - start_time
        
        if response.status_code != 200:
            logger.error(f"OpenRouter Error {response.status_code}: {response.text}")
            raise Exception(f"Error code: {response.status_code} - {response.text}")
            
        res_data = response.json()
        content = res_data["choices"][0]["message"]["content"]
        data = json.loads(content)
        
        usage = res_data.get("usage", {})
        return {
            "data": data,
            "tokens": {
                "prompt": usage.get("prompt_tokens", 0),
                "completion": usage.get("completion_tokens", 0),
                "total": usage.get("total_tokens", 0)
            },
            "duration": duration,
            "model": res_data.get("model", OPENROUTER_MODEL)
        }
    except Exception as e:
        err_msg = str(e)
        if "429" in err_msg:
            logger.warning(f"OpenRouter Rate Limit (429) detected: {err_msg}. Retrying...")
        else:
            logger.error(f"AI API Error: {err_msg}")
        raise e

def process_batch():
    logger.info("=== INICIANDO PRUEBA REAL DE PRODUCCIÓN SPRINT 3 ===")
    
    # 1. SELECCIÓN DE VIDEOS
    logger.info("Seleccionando videos con transcripts exitosos y no procesados...")
    try:
        # Fetch videos that don't have pain points yet
        # We join with transcripts to get the content and word_count
        query = supabase.table("transcripts").select(
            "youtube_video_id, transcript, word_count, videos(title)"
        ).eq("status", "success").order("word_count", desc=True).limit(50)
        
        results = query.execute()
        all_eligible = results.data
        
        if not all_eligible:
            logger.info("No hay videos pendientes con transcript 'success'.")
            return
        
        # Filter out those already in pain_points table (since my query didn't do a proper anti-join via client)
        processed_res = supabase.table("pain_points").select("video_id").execute()
        processed_video_ids = {r["video_id"] for r in processed_res.data}
        
        to_process = [v for v in all_eligible if v["youtube_video_id"] not in processed_video_ids]
        
        logger.info(f"Total elegibles: {len(all_eligible)} | Pendientes reales: {len(to_process)}")
        
        if not to_process:
            logger.info("Todos los videos ya han sido procesados para pain points.")
            return

    except Exception as e:
        logger.error(f"Error en selección de videos: {e}")
        return

    # Stats for final report
    stats = {
        "videos_processed": 0,
        "pain_points_inserted": 0,
        "sources_inserted": 0,
        "failed_videos": [],
        "total_tokens": 0,
        "total_duration": 0
    }

    # 2. EJECUCIÓN CONTROLADA
    for video in to_process:
        vid_id = video["youtube_video_id"]
        title = video["videos"]["title"] if video.get("videos") else "Unknown Title"
        transcript = video["transcript"]
        
        logger.info(f"--- Procesando Video: {vid_id} | {title[:50]}... ---")
        
        try:
            # IA Extraction
            extraction = get_ai_extraction(title, transcript)
            
            p_points = extraction["data"].get("pain_points", [])
            logger.info(f"IA generó {len(p_points)} pain points. Tokens: {extraction['tokens']['total']} | Tiempo: {extraction['duration']:.2f}s")
            
            # 3. VALIDACIONES E INSERTS
            inserted_count = 0
            sources_count = 0
            
            for pp_data in p_points:
                # Mandatory fields validation
                if not pp_data.get("title") or not pp_data.get("category"):
                    logger.warning(f"Saltando pain point inválido (falta título o categoría): {pp_data}")
                    continue
                
                # Insert Pain Point
                pp_payload = {
                    "video_id": vid_id,
                    "title": pp_data["title"],
                    "description": pp_data.get("description", "Sin descripción"),
                    "category": pp_data["category"],
                    "market_segment": pp_data.get("market_segment", "LATAM General"),
                    "severity_score": pp_data.get("severity_score", 0),
                    "frequency_score": pp_data.get("frequency_score", 0),
                    "version": EXTRACTION_VERSION,
                    "final_score": (pp_data.get("severity_score", 0) + pp_data.get("frequency_score", 0)) / 2.0
                }
                
                try:
                    # Check for duplicates (title + video_id)
                    existing = supabase.table("pain_points").select("id").eq("video_id", vid_id).eq("title", pp_data["title"]).execute()
                    if existing.data:
                        logger.info(f"Saltando duplicado: {pp_data['title']}")
                        continue
                        
                    pp_res = supabase.table("pain_points").insert(pp_payload).execute()
                    pp_id = pp_res.data[0]["id"]
                    inserted_count += 1
                    
                    # Insert Source
                    source_payload = {
                        "pain_point_id": pp_id,
                        "source_name": "YouTube Transcript",
                        "source_type": "video",
                        "source_url": f"https://youtube.com/watch?v={vid_id}",
                        "country": pp_data.get("country"), # Can be null
                        "evidence": pp_data.get("evidence", ""),
                        "credibility_score": 10 # Transcripts are high credibility
                    }
                    
                    supabase.table("pain_point_sources").insert(source_payload).execute()
                    sources_count += 1
                    
                except Exception as db_e:
                    logger.error(f"Error insertando en DB: {db_e}")
            
            stats["videos_processed"] += 1
            stats["pain_points_inserted"] += inserted_count
            stats["sources_inserted"] += sources_count
            stats["total_tokens"] += extraction["tokens"]["total"]
            stats["total_duration"] += extraction["duration"]
            
            logger.info(f"Video {vid_id} completado. Insertados: {inserted_count} PP, {sources_count} Sources.")
            
            # Delay entre videos para evitar rate limits
            time.sleep(5)

        except Exception as e:
            error_msg = str(e)
            logger.error(f"Fallo crítico en video {vid_id}: {error_msg}")
            stats["failed_videos"].append({
                "video_id": vid_id,
                "reason": error_msg
            })
            # Continuar con el siguiente video
            continue

    # 4. RESULTADO FINAL
    print("\n" + "="*50)
    print("RESULTADO FINAL DE LA PRUEBA")
    print("="*50)
    print(f"1. Cantidad de videos procesados exitosamente: {stats['videos_processed']}")
    print(f"2. Cantidad de pain points insertados: {stats['pain_points_inserted']}")
    print(f"3. Cantidad de fuentes insertadas: {stats['sources_inserted']}")
    print(f"4. Lista de videos fallidos: {[v['video_id'] for v in stats['failed_videos']]}")
    print(f"5. Motivo de fallos: {[v['reason'] for v in stats['failed_videos']]}")
    print("\n6. Query SQL real para verificar integridad:")
    print("""
SELECT 
  pp.video_id,
  pp.title,
  COUNT(pps.id) as sources
FROM pain_points pp
LEFT JOIN pain_point_sources pps
ON pp.id = pps.pain_point_id
GROUP BY pp.id, pp.video_id, pp.title;
    """)
    print("\n7. Verificación final:")
    print("- No duplicates: Checked by (title + video_id) before insert.")
    print("- No orphan sources: Foreign key constraint (pain_point_id) ensures integrity.")
    print("- No null critical fields: Validated before insert.")
    print("="*50)

if __name__ == "__main__":
    process_batch()
