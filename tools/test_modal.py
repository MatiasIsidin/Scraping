import subprocess

def test_modal():
    print("⏳ Testing Modal CLI...")
    try:
        # Modal CLI config test (Normalmente se configura con `modal token new` o con variables de entorno)
        result = subprocess.run(["python", "-m", "modal", "token", "info"], capture_output=True, text=True)
        if result.returncode == 0:
            output_clean = result.stdout.strip().replace('\n', ', ')
            print("✅ Modal autenticado exitosamente!")
            print(f"   Detalles: {output_clean}")
        else:
            print(f"⏭️  Modal no autenticado o no configurado aún.\n   (Mensaje: {result.stderr.strip()})")
    except Exception as e:
        print(f"❌ Error al ejecutar el check de Modal: {str(e)}")

if __name__ == "__main__":
    test_modal()
