import modal
import urllib.request
import os

# Definición de la App en Modal
app = modal.App("starter-story-weekly-worker")

# Constantes de configuración
SCRAPER_URL = "https://tu-dominio-vercel.app/api/run-incremental-scraper?run_type=weekly_cron_modal&threshold=5&limit=50"

@app.function(
    schedule=modal.Cron("0 3 * * 0"), # Domingo 03:00 AM UTC
    secrets=[modal.Secret.from_name("custom-secret")] # Si se requiere auth en el futuro
)
def weekly_scraper_trigger():
    """
    Función de fallback que dispara el scraper incremental vía HTTP.
    Mantiene la trazabilidad indicando que el origen es Modal.
    """
    print(f"--- [MODAL] Iniciando disparo semanal de scraping ---")
    
    # En producción, usaríamos la URL real de Vercel
    # Por ahora imprimimos la intención
    print(f"Target URL: {SCRAPER_URL}")
    
    try:
        # Nota: Esto requiere que el endpoint sea público o tenga bypass de auth
        # with urllib.request.urlopen(SCRAPER_URL) as response:
        #    status = response.getcode()
        #    print(f"Response Status: {status}")
        print("Trigger enviado exitosamente (Simulado en desarrollo)")
        return True
    except Exception as e:
        print(f"Error disparando scraper: {str(e)}")
        return False

if __name__ == "__main__":
    # Permite ejecución manual para testear
    with app.run():
        weekly_scraper_trigger.remote()
