import json
import re

from api.api import llm

CANDIDATES = "候选诗句"
LEARNING_CARD = "诗词文化解读"
VISUAL_BRIEF = "意境视觉分析"
RECITATION = "朗诵文本"
ANSWER = "回答"


def _extract_json(text: str):
    try:
        return json.loads(text)
    except json.JSONDecodeError:
        match = re.search(r"(\{[\s\S]*\}|\[[\s\S]*\])", text)
        if not match:
            raise
        return json.loads(match.group(0))


def _as_list(value):
    return value if isinstance(value, list) else []


def _as_dict(value):
    return value if isinstance(value, dict) else {}


def create_candidate_cards(user_input: str, poem: str, poet: str, title: str) -> list[dict]:
    prompt = f"""
你是古诗词识别展示助手。请根据用户输入和最终识别结果，生成 3 个候选诗句对比卡片。
必须返回 JSON 数组，不要输出 Markdown。
每个对象必须包含字段：候选、诗句、作者、题目、匹配理由。
第 1 个候选必须是最终识别结果。
最终识别结果：
诗句：{poem}
作者：{poet}
题目：{title}
"""
    raw = llm(user_input, prompt)
    try:
        candidates = _as_list(_extract_json(raw))
    except Exception:
        candidates = []

    normalized = []
    for index, item in enumerate(candidates[:3], start=1):
        if not isinstance(item, dict):
            continue
        normalized.append(
            {
                "候选": str(item.get("候选", index)),
                "诗句": str(item.get("诗句", "")).strip(),
                "作者": str(item.get("作者", "")).strip(),
                "题目": str(item.get("题目", "")).strip(),
                "匹配理由": str(item.get("匹配理由", "")).strip(),
            }
        )

    if not normalized:
        normalized.append(
            {
                "候选": "1",
                "诗句": poem,
                "作者": poet,
                "题目": title,
                "匹配理由": "与用户输入的关键词和语义最接近，作为最终识别结果。",
            }
        )

    return normalized


def create_learning_card(poem: str, poet: str, title: str) -> dict:
    prompt = f"""
你是古诗词文化解读助手。请围绕给定诗句生成适合页面展示的诗词文化解读卡片。
必须返回 JSON 对象，不要输出 Markdown。
字段固定为：原诗、朝代、作者、题目、白话译文、作者简介、意象分析、情感表达、适用场景。
“原诗”字段必须返回完整古诗全文，不要只返回用户给定的一句。若无法确认完整原诗，则至少返回可确认的原文并保持原句准确。
“朝代”字段只返回朝代名称，例如“唐”“宋”“元”，不要附加说明。
每个字段内容简洁，适合展示给普通用户。
诗句：{poem}
作者：{poet}
题目：{title}
"""
    raw = llm(poem, prompt)
    try:
        parsed = _as_dict(_extract_json(raw))
    except Exception:
        parsed = {}

    return {
        "原诗": str(parsed.get("原诗", poem)).strip() or poem,
        "朝代": str(parsed.get("朝代", "")).strip(),
        "作者": str(parsed.get("作者", poet)).strip() or poet,
        "题目": str(parsed.get("题目", title)).strip() or title,
        "白话译文": str(parsed.get("白话译文", "")).strip(),
        "作者简介": str(parsed.get("作者简介", "")).strip(),
        "意象分析": str(parsed.get("意象分析", "")).strip(),
        "情感表达": str(parsed.get("情感表达", "")).strip(),
        "适用场景": str(parsed.get("适用场景", "")).strip(),
    }


def create_visual_brief(poem: str, poet: str, title: str) -> dict:
    prompt = f"""
你是诗词视觉设计分析助手。请把诗词转化为图片生成前的展示性分析。
必须返回 JSON 对象，不要输出 Markdown。
字段固定为：诗词意象、情感基调、画面元素、色彩建议、画风建议。
其中每个字段返回 2 到 5 个短词，使用中文顿号分隔。
诗句：{poem}
作者：{poet}
题目：{title}
"""
    raw = llm(poem, prompt)
    try:
        parsed = _as_dict(_extract_json(raw))
    except Exception:
        parsed = {}

    return {
        "诗词意象": str(parsed.get("诗词意象", "")).strip(),
        "情感基调": str(parsed.get("情感基调", "")).strip(),
        "画面元素": str(parsed.get("画面元素", "")).strip(),
        "色彩建议": str(parsed.get("色彩建议", "")).strip(),
        "画风建议": str(parsed.get("画风建议", "")).strip(),
    }


def create_recitation_text(poem: str, poet: str, title: str) -> str:
    prompt = f"""
你是诗词朗诵指导助手。请为下面诗句生成一段适合朗读按钮播放的短文本。
要求包含题目、作者、诗句，并用自然停顿表达朗诵节奏。只输出朗诵文本。
诗句：{poem}
作者：{poet}
题目：{title}
"""
    return llm(poem, prompt).strip()


def answer_poem_question(poem: str, poet: str, title: str, question: str) -> str:
    prompt = f"""
你是诗词互动问答助手。请基于给定诗词回答用户问题。
回答要简洁、准确、适合页面展示，控制在 120 字以内。
诗句：{poem}
作者：{poet}
题目：{title}
"""
    return llm(question, prompt).strip()
