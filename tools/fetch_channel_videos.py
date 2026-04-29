import os
import json
import logging
import uuid
import time
from datetime import datetime, timezone
from dotenv import load_dotenv
from apify_client import ApifyClient
from supabase import create_client, Client

# --- Configuración de Logging del SOP ---
logging.basicConfig(level=logging.INFO, format='%(asctime)s - [%(name)s] - [%(levelname)s] - %(message)s')
logger = logging.getLogger("fetch_channel_videos")

load_dotenv()

# --- Configuración & Environment Variables ---
APIFY_TOKEN = os.getenv("APIFY_API_TOKEN")
SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_KEY")

APIFY_ACTOR = "apify/youtube-scraper" # Placeholder exacto de Apify a utilizar
CHANNEL_URL = "https://www.youtube.com/@StarterStory"

TMP_DIR = os.path.join(os.getcwd(), ".tmp")

# Garantizar que .tmp existe
os.makedirs(TMP_DIR, exist_ok=True)

def dump_fallback(data, prefix="error"):
    """SOP Requirement: Guardar en .tmp/ para trazabilidad en caso de fallos de BBDD/APIs"""
    stamp = datetime.now().strftime('%Y%m%d%H%M%S')
    filepath = os.path.join(TMP_DIR, f"{prefix}_{stamp}.json")
    try:
        with open(filepath, "w", encoding='utf-8') as f:
            json.dump(data, f, ensure_ascii=False, indent=2)
        logger.info(f"Payload de resguardo persistido en fallback local: {filepath}")
    except Exception as e:
        logger.error(f"Fallo crítico al escribir el fallback file: {str(e)}")

def fetch_videos_from_apify(client: ApifyClient, max_items=5) -> list:
    """Invoca al actor de Apify con la url del canal y descarga la data. Maneja retries."""
    logger.info(f"Iniciando extracción con Apify Actor:'{APIFY_ACTOR}' Endpoint:'{CHANNEL_URL}'")
    
    run_input = {
        "startUrls": [{"url": CHANNEL_URL}],
        "maxResults": max_items,
        "maxResultsShorts": 0,
        "downloadSubtitles": True
    }
    
    # Requirement: 3 reintentos en caso de timeout
    max_retries = 3
    for attempt in range(max_retries):
        try:
            logger.info(f"Aguardando respuesta del servidor de Apify (Intento {attempt+1})...")
            run = client.actor(APIFY_ACTOR).call(run_input=run_input, timeout_secs=300)
            dataset_id = run.get("defaultDatasetId")
            items = [item for item in client.dataset(dataset_id).iterate_items()]
            logger.info(f"Extracción exitosa. {len(items)} items/videos devueltos.")
            return items
        except Exception as e:
            logger.warning(f"Fallo en intento Apify {attempt + 1}/{max_retries}: {str(e)}")
            if attempt == max_retries - 1:
                logger.error("Total Timeout alcanzado en el Fetcher. Abortando Gracefully.")
                dump_fallback({"error": str(e), "message": "Apify API Total Timeout"}, "apify_timeout")
                return []
            time.sleep(2 ** attempt) # Espera exponencial
    return []

def upsert_to_supabase(supabase: Client, items: list):
    """Procesa datos crudos, los divide y los transacciona a las 2 tablas en Supabase"""
    if not items:
        logger.info("No hay items a procesar para Supabase.")
        return

    raw_videos = []
    transcripts = []
    snapshots = []
    
    logger.info("Procesando payloads para segregación de capas (Raw Data & Snapshots)")
    
    for item in items:
        # 1. Check Primary Key Existente
        video_id = item.get("id") or item.get("videoId")
        if not video_id:
            logger.warning("Video omitido: Ausencia de ID válido (youtube_video_id) en el Dataset.")
            continue
            
        # 2. SOP Edge Case: Manejo seguro de Transcript
        subtitles = item.get("subtitles") or item.get("text")
        transcript = subtitles if subtitles else ""
        if not transcript:
            logger.info(f"Video '{video_id}' carece de transcript. Guardado como string vacío per SOP.")
            
        published_at = item.get("date") or datetime.now(timezone.utc).isoformat()
        
        # Tabla Primaria: Entidades Estáticas e Identidad (UPSERT ready)
        raw_videos.append({
            "youtube_video_id": video_id,
            "channel_id": item.get("channelId", "UknownStarterStoryID"),
            "title": item.get("title", ""),
            "description": item.get("description", ""),
            "url": item.get("url", f"https://www.youtube.com/watch?v={video_id}"),
            "published_at": published_at,
            "transcript": transcript # Mantenemos por compatibilidad per SOP 5
        })

        # Tabla de Transcripciones (Nueva Arquitectura)
        if transcript:
            transcripts.append({
                "youtube_video_id": video_id,
                "transcript": transcript,
                "source": "apify",
                "language": "en", # Default
                "word_count": len(transcript.split()),
                "created_at": datetime.now(timezone.utc).isoformat()
            })
        
        # 3. SOP Edge Case: Limpieza a integer base 0 para métricas ausentes
        def safe_int(val):
            try: return int(val)
            except: return 0

        # Tabla Secundaria: Snapshot evolutivo 
        snapshots.append({
            "snapshot_id": str(uuid.uuid4()),
            "youtube_video_id": video_id,
            "view_count": safe_int(item.get("viewCount")),
            "like_count": safe_int(item.get("likeCount")),
            "comment_count": safe_int(item.get("commentCount")),
            "scraped_at": datetime.now(timezone.utc).isoformat()
        })
        
    # Chunk/Batch Uploading per SOP (Bloques de X tamaño para eludir Rates limits)
    batch_size = 50
    for i in range(0, len(raw_videos), batch_size):
        raw_batch = raw_videos[i:i + batch_size]
        snap_batch = snapshots[i:i + batch_size]
        
        logger.info(f"Intentando transacción Transaccional de Bloque {i//batch_size + 1}: ({len(raw_batch)} videos físicos)")
        try:
            # Upsert en videos (antes raw_videos)
            supabase.table("videos").upsert(raw_batch).execute()
            
            # Upsert en transcripts
            if transcripts:
                trans_batch = [t for t in transcripts if t["youtube_video_id"] in [rv["youtube_video_id"] for rv in raw_batch]]
                if trans_batch:
                    supabase.table("transcripts").upsert(trans_batch).execute()

            # Recordar historial snapshot con Insert simple
            supabase.table("video_snapshots").insert(snap_batch).execute()
            
            logger.info(f"Bloque {i//batch_size + 1} insertado satisfactoriamente.")
            
        except Exception as e:
            logger.error(f"Rechazo de Supabase al escribir el bloque. Error: {str(e)}")
            dump_fallback({"raw_batch": raw_batch, "snap_batch": snap_batch, "error_msg": str(e)}, "failed_db_batch")

def main():
    logger.info("=== Iniciando Ejecución atómica: fetch_channel_videos ===")
    
    if not APIFY_TOKEN or "tu_token" in APIFY_TOKEN or not SUPABASE_URL or "tu_url" in SUPABASE_URL:
        logger.error("Ejecución abortada: Credenciales incompletas en .env")
        return
        
    apify_client = ApifyClient(APIFY_TOKEN)
    supabase_client: Client = create_client(SUPABASE_URL, SUPABASE_KEY)
    
    # Idealmente la capa superior en un futuro inyectará el max_items basado en la fecha incremental, por ahora traemos 5 maximos
    items = fetch_videos_from_apify(apify_client, max_items=5)
    
    if items:
        upsert_to_supabase(supabase_client, items)
        
    logger.info("=== Tool atómica finalizada ===")

if __name__ == "__main__":
    main()
