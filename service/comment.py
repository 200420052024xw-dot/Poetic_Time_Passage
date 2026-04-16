import json
import re

from api.api import llm
from tool.read import load_prompt


FALLBACK_COMMENTERS = ["李白", "杜甫", "苏轼", "王维", "李清照", "辛弃疾", "王国维", "鲁迅"]
FALLBACK_COMMENTS = [
    "此句清气自来，余味在言外。",
    "景中有情，淡处见深，读来令人驻足。",
    "把一瞬心境写成千古共感，难怪后来人反复回望。",
]


def _strip_code_fence(text):
    text = (text or "").strip()
    text = re.sub(r"^```(?:json)?\s*", "", text, flags=re.IGNORECASE)
    text = re.sub(r"\s*```$", "", text)
    return text.strip()


def _extract_json_payload(text):
    text = _strip_code_fence(text)
    start_candidates = [idx for idx in (text.find("["), text.find("{")) if idx != -1]
    if not start_candidates:
        return ""

    start = min(start_candidates)
    opener = text[start]
    closer = "]" if opener == "[" else "}"
    end = text.rfind(closer)
    if end == -1 or end <= start:
        return ""
    return text[start : end + 1]


def _load_json(text):
    payload = _extract_json_payload(text)
    if not payload:
        return None
    try:
        return json.loads(payload)
    except json.JSONDecodeError:
        return None


def _clean_name(value):
    text = str(value or "").strip()
    text = re.sub(r"^[\s\-*•\d一二三四五六七八九十]+[\.、:：)]\s*", "", text)
    text = re.sub(r"^(评论人|人物|角色|姓名|名字)\s*[一二三123]?\s*[:：]\s*", "", text)
    text = text.strip(" \t\r\n\"'“”‘’[]【】()（）")
    text = re.sub(r"[，,。；;：:|｜/\\].*$", "", text).strip()
    text = re.sub(r"\s+", "", text)
    return text[:8]


def _clean_comment(value, names=None):
    text = str(value or "").strip()
    text = _strip_code_fence(text)
    text = re.sub(r"^[\s\-*•\d一二三四五六七八九十]+[\.、:：)]\s*", "", text)
    text = re.sub(r"^(角色[一二三123]|评论[一二三123]?|评论内容|内容)\s*[:：]\s*", "", text)

    for name in names or []:
        if name and text.startswith(name):
            text = text[len(name) :].lstrip(" ：:，,")

    text = text.strip(" \t\r\n\"'“”‘’")
    return text


def _split_names(text):
    text = _strip_code_fence(text).replace("｜", "|")
    separators = r"[|\n\r、，,；;]+"
    return [_clean_name(item) for item in re.split(separators, text) if _clean_name(item)]


def _split_comments(text, names):
    text = _strip_code_fence(text).replace("｜", "|")
    if "|" in text:
        parts = text.split("|")
    else:
        parts = [line for line in re.split(r"[\n\r]+", text) if line.strip()]
        if len(parts) < 3:
            parts = re.split(r"(?:^|\s)(?:[一二三123]|角色[一二三]|评论[一二三123])[\.\)、:：]\s*", text)

    return [_clean_comment(part, names) for part in parts if _clean_comment(part, names)]


def _unique_names(names, poet):
    poet = (poet or "").strip()
    result = []
    for name in names:
        cleaned = _clean_name(name)
        if not cleaned or cleaned == poet or cleaned in result:
            continue
        result.append(cleaned)
    return result


def _complete_names(names, poet):
    result = _unique_names(names, poet)
    for fallback in FALLBACK_COMMENTERS:
        if len(result) >= 3:
            break
        if fallback != (poet or "").strip() and fallback not in result:
            result.append(fallback)
    return result[:3]


def _parse_commenters(raw_text, poet):
    parsed = _load_json(raw_text)
    names = []

    if isinstance(parsed, list):
        for item in parsed:
            if isinstance(item, dict):
                value = (
                    item.get("姓名")
                    or item.get("名字")
                    or item.get("评论人")
                    or item.get("人物")
                    or item.get("name")
                )
                names.append(value)
            else:
                names.append(item)
    elif isinstance(parsed, dict):
        for key in ("评论人", "人物", "names", "commenters"):
            value = parsed.get(key)
            if isinstance(value, list):
                names.extend(value)

    if not names:
        names = _split_names(raw_text)

    return _complete_names(names, poet)


def _parse_comments(raw_text, names):
    parsed = _load_json(raw_text)
    comments_by_name = {}
    comments = []

    if isinstance(parsed, list):
        for item in parsed:
            if isinstance(item, dict):
                name = _clean_name(item.get("评论人") or item.get("姓名") or item.get("name"))
                content = (
                    item.get("评论")
                    or item.get("评论内容")
                    or item.get("内容")
                    or item.get("comment")
                    or item.get("content")
                )
                cleaned = _clean_comment(content, names)
                if name and cleaned:
                    comments_by_name[name] = cleaned
                elif cleaned:
                    comments.append(cleaned)
            else:
                comments.append(_clean_comment(item, names))
    elif isinstance(parsed, dict):
        value = parsed.get("评论") or parsed.get("comments")
        if isinstance(value, list):
            for item in value:
                if isinstance(item, dict):
                    content = (
                        item.get("评论")
                        or item.get("评论内容")
                        or item.get("内容")
                        or item.get("comment")
                        or item.get("content")
                    )
                    comments.append(_clean_comment(content, names))
                else:
                    comments.append(_clean_comment(item, names))

    if comments_by_name:
        comments = [comments_by_name.get(name, "") for name in names]

    comments = [comment for comment in comments if comment]
    if not comments:
        comments = _split_comments(raw_text, names)

    while len(comments) < 3:
        comments.append(FALLBACK_COMMENTS[len(comments)])

    return comments[:3]


def create_comment(poem, poet):
    """Generate three historical commenters and their moments-style comments."""
    prompt_commenter = load_prompt("commenter.txt", poem=poem, poet=poet)
    commenter_result = llm(poem, prompt_commenter)
    names_list = _parse_commenters(commenter_result, poet)

    prompt_comment = load_prompt(
        "comment.txt",
        poem=poem,
        commenter_1=names_list[0],
        commenter_2=names_list[1],
        commenter_3=names_list[2],
    )
    comment_result = llm(poem, prompt_comment)
    comment_list = _parse_comments(comment_result, names_list)

    return names_list, comment_list
