from api.api import extract_poem,extract_poem_title,extract_poet
from service.generator import generate_poem_post
from fastapi import FastAPI, HTTPException
from service.picture import create_picture
from service.comment import create_comment
from pydantic import BaseModel
from fastapi import FastAPI
import uvicorn

app = FastAPI(title="古风朋友圈 API")

# === 输入模型 ===
class UserInput(BaseModel):
    content: str

# @app.post("/create-moments")
# def create_moments(user_input: UserInput):
def create_moments(user_input):
    """
    前端传入一句话，后端生成古风朋友圈。
    """
    content = user_input
    if not content:
        raise HTTPException(status_code=400, detail="输入内容不能为空！")

    # 1️ 生成基本诗信息
    poem = extract_poem(content)
    poet = extract_poet(poem)
    poem_title = extract_poem_title(poem)
    print(f"开始处理古诗：“{poem}”- {poet}\n")

    # 2️ 生成朋友圈文案 + 附言 + 时间 + 点赞
    print("===== 生成朋友圈内容 =====")
    post_info = generate_poem_post(poem, poet)

    # 3️ 生成评论
    print("===== 生成评论 =====")
    commenters, comments = create_comment(poem, poet)
    comments_all = [
        {"评论人": commenters[0], "评论内容": comments[0]},
        {"评论人": commenters[1], "评论内容": comments[1]},
        {"评论人": commenters[2], "评论内容": comments[2]}
    ]

    # 4️ 生成朋友圈配图
    print("===== 生成朋友圈配图 =====")
    picture_path = create_picture(poem)
    print("配图生成完成，保存路径：", picture_path, "\n")

    # 5️ 组装返回对象
    result = {
        "诗人": poet,
        "诗句": poem,
        "题目": poem_title,
        "朋友圈文案": post_info.get("朋友圈文案", ""),
        "朋友圈附言": post_info.get("朋友圈附言", ""),
        "图片路径": picture_path,
        "朋友圈发布时间": post_info.get("朋友圈发布时间", ""),
        "朋友圈点赞": post_info.get("朋友圈点赞", 0),
        "朋友圈评论": comments_all
    }

    return result

# ===========================
# 测试调用
# ===========================
if __name__ == "__main__":
    test_input = "春风又绿江南岸，明月何时照我还"
    result = create_moments(test_input)
    import json
    print(json.dumps(result, ensure_ascii=False, indent=2))