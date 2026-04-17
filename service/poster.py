import base64
import html
import mimetypes
import uuid
from pathlib import Path
from urllib.parse import unquote, urlparse

import requests

POSTER_PATH = "\u6d77\u62a5\u8def\u5f84"
POSTER_PREVIEW_PATH = "海报预览路径"
POSTER_FORMAT = "海报格式"


def _wrap_text(text: str, width: int) -> list[str]:
    text = (text or "").strip()
    if not text:
        return []

    lines = []
    current = ""
    for char in text:
        current += char
        if len(current) >= width or char in "\u3002\uff01\uff1f\uff1b":
            lines.append(current.strip())
            current = ""
    if current.strip():
        lines.append(current.strip())
    return lines


def _limit_lines(lines: list[str], max_lines: int) -> list[str]:
    if len(lines) <= max_lines:
        return lines
    limited = lines[:max_lines]
    limited[-1] = f"{limited[-1].rstrip()}..."
    return limited


def _file_to_data_uri(file_path: Path) -> str:
    mime = mimetypes.guess_type(file_path.name)[0] or "image/png"
    encoded = base64.b64encode(file_path.read_bytes()).decode("ascii")
    return f"data:{mime};base64,{encoded}"


def _remote_to_data_uri(image_url: str, base_dir: Path) -> str:
    parsed = urlparse(image_url)
    if parsed.hostname in {"127.0.0.1", "localhost"} and parsed.path.startswith("/static/"):
        local_path = base_dir / unquote(parsed.path.lstrip("/"))
        if local_path.exists() and local_path.is_file():
            return _file_to_data_uri(local_path)

    response = requests.get(image_url, timeout=20)
    if response.status_code >= 400:
        raise ValueError(f"Poster image download failed: HTTP {response.status_code}")
    if len(response.content) > 8 * 1024 * 1024:
        raise ValueError("Poster image is larger than 8 MB.")

    mime = response.headers.get("content-type", "").split(";")[0] or mimetypes.guess_type(parsed.path)[0] or "image/png"
    encoded = base64.b64encode(response.content).decode("ascii")
    return f"data:{mime};base64,{encoded}"


def _image_to_svg_href(image_path: str, static_dir: Path, base_dir: Path) -> str:
    if not image_path:
        return ""

    if image_path.startswith("http://") or image_path.startswith("https://"):
        return _remote_to_data_uri(image_path, base_dir)

    local_path = image_path.lstrip("/")
    if local_path.startswith("static/"):
        file_path = base_dir / local_path
    else:
        file_path = static_dir / local_path

    if not file_path.exists() or not file_path.is_file():
        return ""

    return _file_to_data_uri(file_path)


def _svg_text(lines: list[str], x: int, start_y: int, size: int, color: str, line_height: int) -> str:
    nodes = []
    for index, line in enumerate(lines):
        y = start_y + index * line_height
        nodes.append(
            f'<text x="{x}" y="{y}" font-size="{size}" fill="{color}" '
            f'font-family="Noto Serif SC, SimSun, serif">{html.escape(line)}</text>'
        )
    return "\n".join(nodes)


def create_poster_svg(
    *,
    poem: str,
    poet: str,
    title: str,
    content: str,
    postscript: str,
    image_path: str,
    static_dir: Path,
    base_dir: Path,
) -> dict:
    if not poem.strip():
        raise ValueError("Poem cannot be empty.")

    poster_dir = static_dir / "posters"
    poster_dir.mkdir(parents=True, exist_ok=True)

    image_href = _image_to_svg_href(image_path, static_dir, base_dir)
    filename = f"poster_{uuid.uuid4().hex}.svg"
    file_path = poster_dir / filename

    poster_title = title.strip() or "诗境流年"
    poster_poet = poet.strip() or "Unknown"
    title_lines = _limit_lines(_wrap_text(poster_title, 12), 2)
    poem_lines = _limit_lines(_wrap_text(poem, 14), 3)
    content_lines = _limit_lines(_wrap_text(content, 22), 5)
    postscript_lines = _limit_lines(_wrap_text(postscript, 22), 2)

    image_node = ""
    if image_href:
        image_node = (
            f'<image href="{html.escape(image_href)}" x="90" y="260" width="720" height="720" '
            'preserveAspectRatio="xMidYMid slice" clip-path="url(#imageClip)" />'
        )

    svg = f'''<svg xmlns="http://www.w3.org/2000/svg" width="900" height="1400" viewBox="0 0 900 1400">
  <defs>
    <clipPath id="imageClip"><rect x="90" y="260" width="720" height="720" rx="20" ry="20" /></clipPath>
  </defs>
  <rect width="900" height="1400" fill="#f7f3ea" />
  <rect x="44" y="44" width="812" height="1312" fill="none" stroke="#1f6f68" stroke-width="4" />
  <rect x="64" y="64" width="772" height="1272" fill="none" stroke="#c43b4d" stroke-width="2" opacity="0.65" />
  {_svg_text(title_lines, 90, 145, 48, "#123c3a", 56)}
  <text x="92" y="230" font-size="30" fill="#8a2d3c" font-family="Noto Serif SC, SimSun, serif">{html.escape(poster_poet)}</text>
  <rect x="90" y="260" width="720" height="720" rx="20" fill="#d9e4dc" />
  {image_node}
  <rect x="90" y="1015" width="720" height="2" fill="#1f6f68" opacity="0.45" />
  {_svg_text(poem_lines, 100, 1080, 36, "#123c3a", 52)}
  {_svg_text(content_lines, 100, 1080 + max(len(poem_lines), 1) * 58 + 32, 25, "#263331", 38)}
  {_svg_text(postscript_lines, 100, 1300, 23, "#8a2d3c", 34)}
</svg>'''
    file_path.write_text(svg, encoding="utf-8")
    poster_url = f"/static/posters/{filename}"
    return {POSTER_PATH: poster_url, POSTER_PREVIEW_PATH: poster_url, POSTER_FORMAT: "svg"}
