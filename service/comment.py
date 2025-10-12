from tool.read import load_prompt
from api.api import llm

def create_comment(poem, poet):
    """
    根据古诗生成三位评论者及其评论内容
    返回格式：([评论者姓名列表], [评论内容列表])
    """
    # -------------------------------
    # 第一步：生成三位评论者
    # -------------------------------
    prompt_commenter = load_prompt("commenter.txt", poem=poem, poet=poet)
    poet_result = llm(poem, prompt_commenter)

    # 解析评论者姓名
    names_list = [name.strip() for name in poet_result.strip().split("|")]
    if len(names_list) != 3:
        print(f"警告：评论者生成异常，返回值：{poet_result}，将使用默认评论者")
        names_list = ["评论者A", "评论者B", "评论者C"]

    commenter_1, commenter_2, commenter_3 = names_list[:3]
    print(f"评论者: {commenter_1}、{commenter_2}、{commenter_3}")

    # -------------------------------
    # 第二步：生成评论内容
    # -------------------------------
    prompt_comment = load_prompt(
        "comment.txt",
        poem=poem,
        commenter_1=commenter_1,
        commenter_2=commenter_2,
        commenter_3=commenter_3
    )
    comment_result = llm(poem, prompt_comment)
    print(f"LLM 返回评论原始内容：{comment_result}")

    # 解析评论
    comment_list = []
    for i, c in enumerate(comment_result.strip().split("|")):
        text = c.strip()
        if i < len(names_list) and text.startswith(names_list[i]):
            text = text[len(names_list[i]):].strip()
        comment_list.append(text)

    # 如果未生成三条评论，补充默认内容
    while len(comment_list) < 3:
        comment_list.append("（评论生成失败）")

    return names_list[:3], comment_list[:3]