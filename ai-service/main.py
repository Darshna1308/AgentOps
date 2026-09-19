import os
import time
from fastapi import FastAPI
from dotenv import load_dotenv
from groq import Groq


load_dotenv()

app = FastAPI()

GROQ_API_KEY = os.getenv("GROQ_API_KEY")

if not GROQ_API_KEY:
    raise RuntimeError(
        "GROQ_API_KEY is not configured"
    )

client = Groq(api_key=GROQ_API_KEY)


@app.get("/")
def home():
    return {"message": "AgentOps AI Service is running!"}


@app.post("/run")
def run_agent(prompt: str):

    start_time = time.time()

    response = client.chat.completions.create(
        model="openai/gpt-oss-20b",
        messages=[
            {
                "role": "user",
                "content": prompt
            }
        ]
    )

    end_time = time.time()

    latency = round((end_time - start_time) * 1000)

    return {
        "prompt": prompt,
        "response": response.choices[0].message.content,
        "latency_ms": latency,
        "tokens": response.usage.total_tokens
    }