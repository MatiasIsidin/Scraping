import os
from dotenv import load_dotenv
from supabase import create_client, Client

load_dotenv()

def test_supabase():
    url = os.getenv("SUPABASE_URL")
    key = os.getenv("SUPABASE_KEY")
    
    if not url or not key or "tu_url" in url or "tu_service_role" in key:
        print("⏭️  Supabase URL/Key missing or default. Skipping tests.")
        return

    try:
        print("⏳ Testing Supabase...")
        supabase: Client = create_client(url, key)
        # Una petición tonta para obligar un "Ping" a la BBDD.
        response = supabase.table("non_existent").select("*").limit(1).execute()
    except Exception as e:
        # Una respuesta 400 (porque la tabla no existe) significa que HTTP llegó al servidor!
        if 'relation "public.non_existent" does not exist' in str(e) or '400' in str(e) or "doesn't exist" in str(e):
             print("✅ Supabase conectado exitosamente! (Respuesta recibida correctamente del DB)")
        else:
             print(f"❌ Error en la conexión con Supabase: {str(e)}")

if __name__ == "__main__":
    test_supabase()
