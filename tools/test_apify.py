import os
from dotenv import load_dotenv
from apify_client import ApifyClient

load_dotenv()

def test_apify():
    token = os.getenv("APIFY_API_TOKEN")
    if not token or "tu_token" in token:
        print("⏭️  Apify token missing or default. Skipping tests.")
        return

    try:
        print("⏳ Testing Apify...")
        client = ApifyClient(token)
        # Validar identidad del usuario actual
        user = client.user().get()
        print(f"✅ Apify conectado exitosamente! User ID: {user.get('id')}")
    except Exception as e:
        print(f"❌ Error en la conexión con Apify: {str(e)}")

if __name__ == "__main__":
    test_apify()
