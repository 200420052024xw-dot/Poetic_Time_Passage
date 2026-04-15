from pathlib import Path

PROJECT_ROOT = Path(__file__).resolve().parents[1]
PROMPT_DIR = PROJECT_ROOT / "prompt"

def load_prompt(filename, **kwargs):
    file_path = (PROMPT_DIR / filename).resolve()
    if PROMPT_DIR not in file_path.parents:
        raise ValueError(f"Invalid prompt path: {filename}")

    with file_path.open("r", encoding="utf-8") as f:
        prompt_template = f.read()
    return prompt_template.format(**kwargs)
