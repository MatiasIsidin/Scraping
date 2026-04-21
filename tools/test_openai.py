import os
from dotenv import load_dotenv
from openai import OpenAI

load_dotenv()

def test_openai():
    api_key = os.getenv("OPENAI_API_KEY")
    if not api_key or "tu_token" in api_key:
        print("⏭️  OpenAI key missing or default. Skipping tests.")
        return

    try:
        print("⏳ Testing OpenAI...")
        client = OpenAI(api_key=api_key)
        # Traer listado de los modelos disponibles (ligero y gratuito para verificar handshake)
        models = client.models.list()
        print(f"✅ OpenAI conectado exitosamente! Modelos accesibles: {len(models.data)}")
    except Exception as e:
        print(f"❌ Error en la conexión con OpenAI: {str(e)}")

if __name__ == "__main__":
    test_openai()
