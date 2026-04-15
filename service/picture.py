from concurrent.futures import ThreadPoolExecutor, as_completed
from api.api import picture, llm
from tool.read import load_prompt
import http.client
import base64
import json
import re
import uuid
from pathlib import Path

# 意境分析
def artistic_conception(poem):
    # 读取初次意境分析 prompt
    prompt_conception_analysis = load_prompt("picture_conception_analysis.txt", poem=poem)

    # 并行执行三次 llm
    results = []
    with ThreadPoolExecutor() as executor:
        futures = [executor.submit(llm, poem, prompt_conception_analysis) for _ in range(3)]
        for future in as_completed(futures):
            try:
                results.append(future.result())
            except Exception as e:
                print(f"llm 执行出错: {e}")

    if len(results) < 3:
        print("警告：未能获取完整的三段描述，将使用已有结果。")

    # 取结果（保证有三个）
    mood_imagery_1 = results[0] if len(results) > 0 else ""
    mood_imagery_2 = results[1] if len(results) > 1 else ""
    mood_imagery_3 = results[2] if len(results) > 2 else ""

    # 汇总三个描述，进行总结
    prompt_summary = load_prompt(
        "picture_summary.txt",
        mood_imagery_1=mood_imagery_1,
        mood_imagery_2=mood_imagery_2,
        mood_imagery_3=mood_imagery_3
    )

    mood_imagery_final = llm(poem, prompt_summary)
    print(f"意境分析结果：{mood_imagery_final}")
    return mood_imagery_final


# 画面感增强
def enhance(mood_imager_final):
    prompt_enhance = load_prompt("picture_enhance.txt", mood_imager_final=mood_imager_final)
    enhance_final = llm(mood_imager_final, prompt_enhance)
    print(f"画面增加结果：{enhance_final}")
    return enhance_final


# 氛围分析
def atmosphere(mood_imager_final):
    prompt_atmosphere = load_prompt("picture_atmosphere.txt", mood_imager_final=mood_imager_final)
    atmosphere_final = llm(mood_imager_final, prompt_atmosphere)
    print(f"氛围分析结果：{atmosphere_final}")
    return atmosphere_final


# 画风选择
def art_style(mood_imager_final, poem):
    prompt_art_style = load_prompt(
        "picture_art_style.txt",
        mood_imager_final=mood_imager_final,
        poem=poem
    )
    art_style_final = llm(mood_imager_final, prompt_art_style)
    print(f"画风选择结果：{art_style_final}")
    return art_style_final


# 意境拆解+意境筛选
def mood_imagery_end(input):
    prompt_split = load_prompt("picture_conception_split.txt", input=input)
    atmosphere_1 = llm(input, prompt_split)

    prompt_select = load_prompt("picture_conception_select.txt", atmosphere_1=atmosphere_1)
    atmosphere_2 = llm(atmosphere_1, prompt_select)
    print(f"最终意境：{atmosphere_2}\n")
    return atmosphere_2


# 图片生成
def _safe_picture_name(picture_name):
    cleaned = re.sub(r'[<>:"/\\|?*\n\r\s]+', "_", picture_name.replace("。", "").strip())
    return cleaned[:80] or f"poem_{uuid.uuid4().hex}"


def picture_create(atmosphere_end, art_style_final, atmosphere_final, enhance_final, picture_name, static_dir):

    prompt = load_prompt(
        "picture_create.txt",
        atmosphere_end=atmosphere_end,
        art_style_final=art_style_final,
        atmosphere_final=atmosphere_final,
        enhance_final=enhance_final
    )
    print(f"文生图提示词：{prompt}\n")

    conn = http.client.HTTPSConnection("api.rcouyi.com", timeout=60)
    payload = json.dumps({
        "model": "gpt-image-1",
        "prompt": prompt,
        "n": 1,
        "quality": "medium",
        "size": "1024x1024",
        "output_format": "png"
    })

    headers = picture()

    try:
        conn.request("POST", "/v1/images/generations", payload, headers)
        res = conn.getresponse()
        data_picture_bytes = res.read()

        if res.status >= 400:
            detail = data_picture_bytes[:300].decode("utf-8", errors="replace")
            raise RuntimeError(f"Image API HTTP {res.status}: {detail}")

        try:
            data_picture = json.loads(data_picture_bytes)
            b64_str = data_picture["data"][0]["b64_json"]
        except (json.JSONDecodeError, KeyError, IndexError, TypeError) as exc:
            detail = data_picture_bytes[:300].decode("utf-8", errors="replace")
            raise RuntimeError(f"Image API returned unexpected payload: {detail}") from exc

        try:
            image_data = base64.b64decode(b64_str)
        except ValueError as exc:
            raise RuntimeError("Image API returned invalid base64 image data.") from exc

        image_dir = Path(static_dir) / "images"
        image_dir.mkdir(parents=True, exist_ok=True)
        file_name = f"{_safe_picture_name(picture_name)}.png"
        file_path = image_dir / file_name
        file_path.write_bytes(image_data)

        print(f"图片保存成功！文件路径：{file_path}\n")
        return f"static/images/{file_name}"
    finally:
        conn.close()


def create_picture(poem, static_dir="static"):
    """
    根据古诗生成朋友圈配图
    """
    # 第一步：串行执行意境分析
    mood_imagery_first = artistic_conception(poem)

    # 第二步：并行执行四个函数`
    with ThreadPoolExecutor() as executor:
        futures = {
            executor.submit(enhance, mood_imagery_first): "enhance",
            executor.submit(atmosphere, mood_imagery_first): "atmosphere",
            executor.submit(art_style, mood_imagery_first, poem): "art_style",
            executor.submit(mood_imagery_end, mood_imagery_first): "mood_imagery_end",
        }

        results = {}
        for future in as_completed(futures):
            func_name = futures[future]
            try:
                results[func_name] = future.result()
            except Exception as e:
                print(f"{func_name} 执行出错: {e}")

    # 第三步：串行执行图片生成
    picture_path = picture_create(
        results.get("mood_imagery_end", ""),
        results.get("art_style", ""),
        results.get("atmosphere", ""),
        results.get("enhance", ""),
        poem,
        static_dir,
    )

    return picture_path
