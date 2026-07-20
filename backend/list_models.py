import truststore
truststore.inject_into_ssl()

import google.generativeai as genai
import os
from dotenv import load_dotenv

load_dotenv(".env")
genai.configure(api_key=os.getenv("GEMINI_API_KEY"), transport="rest")

try:
    print("Listing available Gemini models with truststore:")
    for m in genai.list_models():
        print(f" - {m.name} (methods: {m.supported_generation_methods})")
except Exception as e:
    print(f"Error: {e}")
