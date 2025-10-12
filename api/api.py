import requests
import re

def music():
    url = "https://api.rcouyi.com/suno/submit/music"
    headers = {
        'Authorization': 'Bearer B6501b01F2F0F1F4',
        'Content-Type': 'application/json'
    }
    return url,headers

def picture():
    api_picture = "Bearer 6501b01F2F0F1F4"
    headers = {
        'Authorization': api_picture,
        'Content-Type': 'application/json'
    }
    return headers


#硅基流动
url = "https://api.siliconflow.cn/v1/chat/completions"

headers = {
    "Authorization": "Bearer wfrezoskwbvcoexcvxoinby",
    "Content-Type": "application/json"
}

def extract_poem(query, model="deepseek-ai/DeepSeek-V3"):
    data = {
        "model": model,
        "messages": [
            {"role": "system", "content": """
            # 系统角色
            你是一位中国古代诗词处理专家。  

            # 任务
            根据用户输入内容，提取其中的 **文言文、古诗句** 部分，并自动纠正错别字。  

            # 输出要求
            1. 仅输出提取后的、纠正过的诗句或文言文内容；  
            2. 不输出解释、评论、提示或其他文字；  
            3. 保持原有格式与韵律，只纠正明显的错别字；  
            4. 若输入中无古诗或文言文，则不输出任何内容。  

            # 示例
            输入：明月几十有，把酒问晴天
            输出：明月几时有，把酒问青天
            """},
            {"role": "user", "content": query}
        ]
    }
    response = requests.post(url, headers=headers, json=data)
    poem_first = response.json()['choices'][0]['message']['content']
    poem_second = poem_first.replace("。", "")
    poem = re.sub(r'[<>:"/\\|?*\n]', '_', poem_second)
    print(f"\n提取到的诗句：{poem}\n")
    return poem


def extract_poet(query, model="deepseek-ai/DeepSeek-V3"):
    data = {
        "model": model,
        "messages": [
            {"role": "system",
             "content": """任务目标：请根据用户提供的一句古诗，识别出其对应的诗人，要求仅仅输出诗人的名字，不输出其他任何无关的内容"""},
            {"role": "user", "content": query}
        ]
    }
    response = requests.post(url, headers=headers, json=data)
    poet = response.json()['choices'][0]['message']['content']
    print(f"诗词的作者是：{poet}\n")
    return poet


def extract_poem_title(query, model="deepseek-ai/DeepSeek-V3"):
    data = {
        "model": model,
        "messages": [
            {"role": "system", "content": """
            # 系统角色
            你是一位“古诗数据库查询专家”。  

            # 任务
            根据用户提供的一句古诗，精准查找该诗句对应的诗的题目。  

            # 输出要求
            1. 仅输出诗的题目，不输出任何解释、评论、提示或其他文字；  
            2. 确保输出的诗题**准确无误**；  
            3. 保持原始诗题格式，不添加标点或额外修饰。  

            # 输出示例
            静夜思
            """},
            {"role": "user", "content": query}
        ]
    }
    response = requests.post(url, headers=headers, json=data)
    poem_title = response.json()['choices'][0]['message']['content']
    print(f"诗词的标题是：{poem_title}\n")
    return poem_title


def llm(query, system_prompt, model="deepseek-ai/DeepSeek-V3"):
    data = {
        "model": model,
        "messages": [
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": query}
        ]
    }

    response = requests.post(url, headers=headers, json=data)
    return response.json()['choices'][0]['message']['content']


