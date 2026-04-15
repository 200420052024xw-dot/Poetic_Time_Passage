import json
import re

from api.api import extract_poem, extract_poem_title, extract_poet, llm

POEM = "\u8bd7\u53e5"
POET = "\u8bd7\u4eba"
TITLE = "\u9898\u76ee"
REASON = "\u8bc6\u522b\u8bf4\u660e"
CONFIDENCE = "识别置信度"
SOURCE = "识别来源"


def _extract_json(text: str) -> dict:
    try:
        return json.loads(text)
    except json.JSONDecodeError:
        match = re.search(r"\{[\s\S]*\}", text)
        if not match:
            raise
        return json.loads(match.group(0))


def _value(parsed: dict, *keys: str) -> str:
    for key in keys:
        value = parsed.get(key)
        if value:
            return str(value).strip()
    return ""


def _looks_like_explanation(value: str) -> bool:
    text = value.strip()
    if not text:
        return False
    explanation_markers = ("无法", "不能", "没有", "可能", "以下", "解释", "JSON", "{", "}", "：", ":")
    return len(text) > 80 or "\n" in text or any(marker in text for marker in explanation_markers)


def _confidence(poem: str, poet: str, title: str, source: str) -> str:
    if source == "fallback_extract":
        return "低" if not (poet and title) else "中"
    if poem and poet and title:
        return "高"
    if poem and (poet or title):
        return "中"
    return "低"


def recognize_poem_content(content: str) -> dict:
    prompt = f"""
You are a classical Chinese poetry recognition assistant.
The user may input a poem line with typos, a partial line, or a modern Chinese description.
Match the most likely original poem line and return strict JSON only.
Use these exact JSON keys: "{POEM}", "{POET}", "{TITLE}", "{REASON}".
If unknown, use an empty string for that field.
"""
    raw = llm(content, prompt)
    try:
        parsed = _extract_json(raw)
        source = "llm_json"
    except Exception:
        parsed = {POEM: "", POET: "", TITLE: "", REASON: raw.strip()}
        source = "fallback_extract"

    poem = _value(parsed, POEM, "poem", "line")
    poet = _value(parsed, POET, "poet", "author")
    title = _value(parsed, TITLE, "title")
    reason = _value(parsed, REASON, "reason", "explanation")

    if poem and _looks_like_explanation(poem):
        poem = ""

    if not poem:
        poem = extract_poem(content).strip()
        reason = reason or "Matched by extracting and correcting the original input."
        source = "fallback_extract"

    if poem and _looks_like_explanation(poem):
        raise ValueError("No recognizable poem line was found.")

    if poem and not poet:
        poet = extract_poet(poem).strip()
    if poem and not title:
        title = extract_poem_title(poem).strip()

    if not poem:
        raise ValueError("No recognizable poem line was found.")

    return {
        POEM: poem,
        POET: poet,
        TITLE: title,
        REASON: reason or "Matched the most likely original poem line.",
        CONFIDENCE: _confidence(poem, poet, title, source),
        SOURCE: source,
    }
