import modal
import os

# 1. Definir la infraestructura
image = modal.Image.debian_slim().pip_install("assemblyai", "yt-dlp")
app = modal.App("assemblyai-transcript-fallback")

@app.function(
    image=image,
    secrets=[modal.Secret.from_name("assemblyai-secrets")],
    timeout=600  # 10 minutos de timeout para videos largos
)
def transcribe_video(video_url: str):
    """
    Función core para transcribir YouTube usando AssemblyAI.
    """
    import assemblyai as aai
    import yt_dlp
    
    try:
        # Configuración de API Key
        api_key = os.environ.get("ASSEMBLYAI_API_KEY")
        if not api_key:
            return {"status": "error", "message": "ASSEMBLYAI_API_KEY no encontrada"}
        
        aai.settings.api_key = api_key

        # Extraer URL de stream de audio
        ydl_opts = {'format': 'bestaudio/best', 'noplaylist': True, 'quiet': True}
        with yt_dlp.YoutubeDL(ydl_opts) as ydl:
            info = ydl.extract_info(video_url, download=False)
            audio_url = info['url']

        # Transcribir
        transcriber = aai.Transcriber()
        transcript = transcriber.transcribe(audio_url)

        if transcript.status == aai.TranscriptStatus.error:
            return {"status": "error", "message": transcript.error}

        return {
            "transcript": transcript.text,
            "status": "completed"
        }
    except Exception as e:
        return {"status": "error", "message": str(e)}

@app.function(image=image, secrets=[modal.Secret.from_name("assemblyai-secrets")])
@modal.fastapi_endpoint(method="POST")
def web_transcribe(data: dict):
    """
    Endpoint HTTP para llamar desde Next.js.
    """
    video_url = data.get("videoUrl")
    if not video_url:
        return {"error": "Missing videoUrl"}, 400
    
    # Ejecución sincrónica desde el punto de vista del webhook
    return transcribe_video.local(video_url)
