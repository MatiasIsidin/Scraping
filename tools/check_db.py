import os
from supabase import create_client
from dotenv import load_dotenv

load_dotenv(".env.local")

def check_db():
    url = os.environ.get("SUPABASE_URL")
    key = os.environ.get("SUPABASE_KEY")
    if not url or not key:
        print("Faltan credenciales de Supabase en .env.local")
        return

    supabase = create_client(url, key)
    try:
        # Consultamos videos unidos a sus transcripciones
        res = supabase.table("videos").select("youtube_video_id, title, transcripts(source, word_count)").limit(5).execute()
        print("Conexión exitosa. Datos encontrados:")
        for row in res.data:
            trans = row.get('transcripts', [])
            source = trans[0].get('source') if trans else "N/A"
            print(f"ID: {row.get('youtube_video_id')} | Title: {row.get('title')[:30]} | Source: {source}")
    except Exception as e:
        print(f"Error al consultar la tabla: {str(e)}")

if __name__ == "__main__":
    check_db()
