import json
import os
import re
from pathlib import Path

import requests


def _load_dotenv():
    env_path = Path(__file__).resolve().parents[1] / ".env"
    if not env_path.exists():
        return

    for raw_line in env_path.read_text(encoding="utf-8-sig").splitlines():
        line = raw_line.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue

        name, value = line.split("=", 1)
        name = name.strip()
        value = value.strip().strip('"').strip("'")
        if name:
            os.environ.setdefault(name, value)


def _required_env(name):
    value = os.getenv(name)
    if not value:
        raise RuntimeError(f"Missing {name}. Add it to .env.")
    return value


def _bearer_headers(token):
    return {
        "Authorization": f"Bearer {token}",
        "Content-Type": "application/json",
    }


_load_dotenv()

CHAT_URL = os.getenv("CHAT_URL", "https://api.siliconflow.cn/v1/chat/completions")
CHAT_HEADERS = _bearer_headers(_required_env("CHAT_API_KEY"))


def picture():
    return _bearer_headers(_required_env("PICTURE_API_KEY"))


def _read_chat_content(response):
    """Read chat content from normal OpenAI-style payloads and JSON-string payloads."""
    try:
        payload = response.json()
    except ValueError as exc:
        raise RuntimeError(f"LLM returned non-JSON response: {response.text[:300]}") from exc

    if isinstance(payload, str):
        try:
            payload = json.loads(payload)
        except json.JSONDecodeError:
            return payload

    if not isinstance(payload, dict):
        raise RuntimeError(f"LLM returned unsupported response type: {type(payload).__name__}")

    if "error" in payload:
        raise RuntimeError(f"LLM API error: {payload['error']}")

    try:
        return payload["choices"][0]["message"]["content"]
    except (KeyError, IndexError, TypeError) as exc:
        raise RuntimeError(f"LLM response missing choices/message/content: {payload}") from exc


def _post_chat(query, system_prompt, model="deepseek-ai/DeepSeek-V3"):
    data = {
        "model": model,
        "messages": [
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": query},
        ],
    }
    response = requests.post(CHAT_URL, headers=CHAT_HEADERS, json=data, timeout=60)
    if response.status_code >= 400:
        raise RuntimeError(f"LLM HTTP {response.status_code}: {response.text[:300]}")
    return _read_chat_content(response)


def extract_poem(query, model="deepseek-ai/DeepSeek-V3"):
    prompt = (
        "You are an expert in classical Chinese poetry. Extract the classical poem "
        "or literary Chinese phrase from the user input, correct obvious typos, "
        "and output only the corrected text. If none exists, output an empty string."
    )
    poem_first = _post_chat(query, prompt, model)
    poem_second = poem_first.replace("\u3002", "")
    poem = re.sub(r'[<>:"/\\|?*\n]', "_", poem_second)
    print(f"\npoem extracted: {poem}\n")
    return poem


def extract_poet(query, model="deepseek-ai/DeepSeek-V3"):
    prompt = "Identify the poet for the given classical Chinese poem line. Output only the poet name."
    poet = _post_chat(query, prompt, model)
    print(f"poet: {poet}\n")
    return poet


def extract_poem_title(query, model="deepseek-ai/DeepSeek-V3"):
    prompt = "Find the poem title for the given classical Chinese poem line. Output only the title."
    poem_title = _post_chat(query, prompt, model)
    print(f"poem title: {poem_title}\n")
    return poem_title


def llm(query, system_prompt, model="deepseek-ai/DeepSeek-V3"):
    return _post_chat(query, system_prompt, model)
