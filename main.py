from pathlib import Path
from concurrent.futures import ThreadPoolExecutor
import shutil
import socket
import subprocess
import time

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel

from service.comment import create_comment
from service.display_features import (
    ANSWER,
    CANDIDATES,
    LEARNING_CARD,
    RECITATION,
    answer_poem_question,
    create_candidate_cards,
    create_learning_card,
    create_recitation_text,
)
from service.generator import generate_poem_post
from service.picture import create_picture
from service.poem_recognition import CONFIDENCE, POEM, POET, REASON, SOURCE, TITLE, recognize_poem_content
from service.poster import create_poster_svg
import uvicorn

BASE_DIR = Path(__file__).resolve().parent
STATIC_DIR = BASE_DIR / "static"

POST_COPY = "\u670b\u53cb\u5708\u6587\u6848"
POSTSCRIPT = "\u670b\u53cb\u5708\u9644\u8a00"
IMAGE_PATH = "\u56fe\u7247\u8def\u5f84"
POST_TIME = "\u670b\u53cb\u5708\u53d1\u5e03\u65f6\u95f4"
LIKES = "\u670b\u53cb\u5708\u70b9\u8d5e"
COMMENTS = "\u670b\u53cb\u5708\u8bc4\u8bba"
COMMENTER = "\u8bc4\u8bba\u4eba"
COMMENT_CONTENT = "\u8bc4\u8bba\u5185\u5bb9"
POSTER_PATH = "\u6d77\u62a5\u8def\u5f84"

app = FastAPI(title="Poem Moments API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://127.0.0.1:5173",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.mount("/static", StaticFiles(directory=STATIC_DIR), name="static")


@app.middleware("http")
async def log_requests(request, call_next):
    started = time.perf_counter()
    _log(f"request start: {request.method} {request.url.path}")
    try:
        response = await call_next(request)
    except Exception:
        elapsed = (time.perf_counter() - started) * 1000
        _log(f"request error: {request.method} {request.url.path} after {elapsed:.0f}ms")
        raise

    elapsed = (time.perf_counter() - started) * 1000
    _log(f"request done: {request.method} {request.url.path} {response.status_code} {elapsed:.0f}ms")
    return response


class UserInput(BaseModel):
    content: str


class PosterInput(BaseModel):
    poem: str
    poet: str = ""
    title: str = ""
    content: str = ""
    postscript: str = ""
    image_path: str = ""


class QuestionInput(BaseModel):
    poem: str
    poet: str = ""
    title: str = ""
    question: str


class PoemCardInput(BaseModel):
    poem: str
    poet: str = ""
    title: str = ""


class MomentInput(BaseModel):
    poem: str
    poet: str = ""
    title: str = ""


@app.get("/health")
def health_check():
    return {"status": "ok"}


def _require_content(content: str) -> str:
    value = content.strip()
    if not value:
        raise HTTPException(status_code=400, detail="Input cannot be empty.")
    return value


def _log(message: str):
    print(f"[Poem Moments] {message}", flush=True)


def _is_port_in_use(host: str, port: int) -> bool:
    with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as sock:
        sock.settimeout(0.5)
        return sock.connect_ex((host, port)) == 0


@app.post("/recognize-poem")
def recognize_poem(user_input: UserInput):
    content = _require_content(user_input.content)
    _log(f"/recognize-poem start: {content[:40]}")
    try:
        recognized = recognize_poem_content(content)
        _log(f"/recognize-poem recognized: {recognized.get(POEM, '')}")
        recognized[CANDIDATES] = create_candidate_cards(
            content,
            recognized[POEM],
            recognized[POET],
            recognized[TITLE],
        )
        _log(f"/recognize-poem candidates: {len(recognized[CANDIDATES])}")
        return recognized
    except ValueError as exc:
        raise HTTPException(status_code=422, detail=str(exc)) from exc
    except RuntimeError as exc:
        raise HTTPException(status_code=502, detail=str(exc)) from exc


@app.post("/create-moments")
def create_moments(moment: MomentInput):
    poem = _require_content(moment.poem)
    poet = moment.poet.strip()
    poem_title = moment.title.strip()
    _log(f"/create-moments start: {poem[:40]}")

    try:
        with ThreadPoolExecutor() as executor:
            future_post = executor.submit(generate_poem_post, poem, poet)
            future_comments = executor.submit(create_comment, poem, poet)
            future_picture = executor.submit(create_picture, poem, static_dir=STATIC_DIR)

            post_info = future_post.result()
            _log("/create-moments post copy finished")
            commenters, comments = future_comments.result()
            _log("/create-moments comments finished")
            picture_path = future_picture.result()
            _log(f"/create-moments picture finished: {picture_path}")
    except RuntimeError as exc:
        raise HTTPException(status_code=502, detail=str(exc)) from exc

    comments_all = [
        {COMMENTER: commenters[0], COMMENT_CONTENT: comments[0]},
        {COMMENTER: commenters[1], COMMENT_CONTENT: comments[1]},
        {COMMENTER: commenters[2], COMMENT_CONTENT: comments[2]},
    ]

    return {
        POET: poet,
        POEM: poem,
        TITLE: poem_title,
        POST_COPY: post_info.get(POST_COPY, ""),
        POSTSCRIPT: post_info.get(POSTSCRIPT, ""),
        IMAGE_PATH: f"/{picture_path}",
        POST_TIME: post_info.get(POST_TIME, ""),
        LIKES: post_info.get(LIKES, []),
        COMMENTS: comments_all,
    }


@app.post("/create-poem-card")
def create_poem_card(card: PoemCardInput):
    poem = _require_content(card.poem)
    poet = card.poet.strip()
    title = card.title.strip()
    _log(f"/create-poem-card start: {poem[:40]}")
    try:
        learning_card = create_learning_card(poem, poet, title)
        recitation = create_recitation_text(
            poem,
            learning_card.get("作者", poet),
            learning_card.get("题目", title),
        )
        _log("/create-poem-card finished")
        return {
            POEM: poem,
            POET: learning_card.get("作者", poet),
            TITLE: learning_card.get("题目", title),
            LEARNING_CARD: learning_card,
            RECITATION: recitation,
        }
    except RuntimeError as exc:
        raise HTTPException(status_code=502, detail=str(exc)) from exc


@app.post("/ask-poem")
def ask_poem(question: QuestionInput):
    poem = _require_content(question.poem)
    user_question = _require_content(question.question)
    _log(f"/ask-poem start: {user_question[:40]}")
    try:
        answer = answer_poem_question(poem, question.poet, question.title, user_question)
        _log("/ask-poem finished")
        return {ANSWER: answer}
    except RuntimeError as exc:
        raise HTTPException(status_code=502, detail=str(exc)) from exc


@app.post("/create-poster")
def create_poster(poster: PosterInput):
    _log(f"/create-poster start: {poster.title or poster.poem[:20]}")
    try:
        result = create_poster_svg(
            poem=poster.poem,
            poet=poster.poet,
            title=poster.title,
            content=poster.content,
            postscript=poster.postscript,
            image_path=poster.image_path,
            static_dir=STATIC_DIR,
            base_dir=BASE_DIR,
        )
        _log(f"/create-poster finished: {result.get(POSTER_PATH, '')}")
        return result
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc


def main():
    frontend_dir = BASE_DIR / "poem-frontend"
    npm_cmd = shutil.which("npm.cmd") or shutil.which("npm")
    frontend_process = None
    backend_port = 8000
    frontend_port = 5173

    if _is_port_in_use("127.0.0.1", backend_port):
        print(
            f"Backend port {backend_port} is already in use. "
            "Stop the old Python backend process before running python main.py again.",
            flush=True,
        )
        return

    if _is_port_in_use("127.0.0.1", frontend_port):
        print(
            f"Frontend port {frontend_port} is already in use. "
            "Stop the old Node/Vite frontend process before running python main.py again.",
            flush=True,
        )
        return

    if frontend_dir.exists() and npm_cmd:
        frontend_process = subprocess.Popen(
            [npm_cmd, "run", "dev", "--", "--host", "127.0.0.1"],
            cwd=frontend_dir,
        )
        print(f"Frontend dev server starting at http://127.0.0.1:{frontend_port}/", flush=True)
    else:
        print("Frontend dev server not started: poem-frontend directory or npm was not found.", flush=True)

    try:
        print(f"Backend API starting at http://127.0.0.1:{backend_port}/", flush=True)
        uvicorn.run("main:app", host="0.0.0.0", port=backend_port, reload=False)
    finally:
        if frontend_process and frontend_process.poll() is None:
            frontend_process.terminate()


if __name__ == "__main__":
    main()
