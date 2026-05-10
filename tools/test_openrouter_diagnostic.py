import requests
import os
import json
from dotenv import load_dotenv

load_dotenv(".env.local")
key = os.getenv("OPENROUTER_API_KEY")
model = os.getenv("OPENROUTER_MODEL")

print(f"Testing model: {model}")
response = requests.post(
    url="https://openrouter.ai/api/v1/chat/completions",
    headers={
        "Authorization": f"Bearer {key}",
        "Content-Type": "application/json"
    },
    data=json.dumps({
        "model": model,
        "messages": [{"role": "user", "content": "hi"}]
    })
)

print(f"Status Code: {response.status_code}")
print(f"Response: {response.text}")
