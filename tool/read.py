import os

def load_prompt(filename, **kwargs):
    file_path = os.path.join("prompt", filename)
    with open(file_path, "r", encoding="utf-8") as f:
        prompt_template = f.read()
    return prompt_template.format(**kwargs)




