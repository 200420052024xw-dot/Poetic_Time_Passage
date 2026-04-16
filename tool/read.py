from prompt import prompts


PROMPT_VARIABLES = {
    "extract_poem.txt": "extract_poem",
    "copy.txt": "copy",
    "postscript.txt": "postscript",
    "time_create.txt": "time_create",
    "link.txt": "link",
    "commenter.txt": "commenter",
    "comment.txt": "comment",
    "picture_conception_analysis.txt": "picture_conception_analysis",
    "picture_summary.txt": "picture_summary",
    "picture_enhance.txt": "picture_enhance",
    "picture_atmosphere.txt": "picture_atmosphere",
    "picture_art_style.txt": "picture_art_style",
    "picture_conception_split.txt": "picture_conception_split",
    "picture_conception_select.txt": "picture_conception_select",
    "picture_create.txt": "picture_create",
}


def load_prompt(filename, **kwargs):
    variable_name = PROMPT_VARIABLES.get(filename)
    if "/" in filename or "\\" in filename or not variable_name or not hasattr(prompts, variable_name):
        raise ValueError(f"Invalid prompt path: {filename}")

    prompt_template = getattr(prompts, variable_name)
    return prompt_template.format(**kwargs)
