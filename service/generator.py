from concurrent.futures import ThreadPoolExecutor
from tool.read import load_prompt
from api.api import llm

POST_COPY = "朋友圈文案"
POSTSCRIPT = "朋友圈附言"
POST_TIME = "朋友圈发布时间"
LIKES = "朋友圈点赞"


def _split_likes(value):
    if isinstance(value, list):
        return [str(item).strip() for item in value if str(item).strip()]
    if not value:
        return []
    return [item.strip() for item in str(value).replace("\n", "|").split("|") if item.strip()]


def generate_poem_post(poem, poet):
    """
    根据古诗生成朋友圈内容，包括：
    - 朋友圈文案
    - 朋友圈附言
    - 朋友圈发布时间
    - 点赞用户列表
    """

    # -------------------------------
    # 读取并格式化 prompt
    # -------------------------------
    prompt_copy = load_prompt("copy.txt", poem=poem, poet=poet)
    prompt_postscript = load_prompt("postscript.txt", poem=poem, poet=poet)
    prompt_time = load_prompt("time_create.txt", poem=poem, poet=poet)
    prompt_like = load_prompt("link.txt", poem=poem, poet=poet)

    # -------------------------------
    # 并行执行 LLM
    # -------------------------------
    with ThreadPoolExecutor() as executor:
        future_copy = executor.submit(llm, poem, prompt_copy)
        future_postscript = executor.submit(llm, poem, prompt_postscript)
        future_time = executor.submit(llm, poem, prompt_time)
        future_like = executor.submit(llm, poem, prompt_like)

        copy = future_copy.result()
        postscript = future_postscript.result()
        time = future_time.result()
        like = future_like.result()

    # -------------------------------
    # 返回结果
    # -------------------------------
    result = {
        POST_COPY: copy,
        POSTSCRIPT: postscript,
        POST_TIME: time,
        LIKES: _split_likes(like),
    }

    print(result)
    return result
