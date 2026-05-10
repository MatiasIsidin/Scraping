import requests
import os
from dotenv import load_dotenv

load_dotenv(".env.local")
key = os.getenv("OPENROUTER_API_KEY")

response = requests.get(
    url="https://openrouter.ai/api/v1/models",
    headers={"Authorization": f"Bearer {key}"}
)

if response.status_code == 200:
    models = response.json().get("data", [])
    free_models = [m["id"] for m in models if ":free" in m["id"]]
    print("Free models found:")
    for m in free_models:
        print(m)
    
    gemma_models = [m["id"] for m in models if "gemma" in m["id"].lower()]
    print("\nGemma models found:")
    for m in gemma_models:
        print(m)
else:
    print(f"Error: {response.status_code}")
