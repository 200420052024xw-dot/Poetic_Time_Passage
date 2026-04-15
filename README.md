# 诗词朋友圈

这是一个 AI 诗词传播展示项目，后端使用 FastAPI，前端使用 Vite + React。应用可以根据古诗词原句、残句、错别字线索或白话描述识别诗句，生成文化解读、朋友圈文案、配图和可下载的海报内容。

## 项目结构

```text
.
├── main.py                 # FastAPI 应用和本地启动入口
├── api/                    # 大模型和图片生成接口封装
├── service/                # 诗词识别、内容生成、海报和图片生成逻辑
├── prompt/                 # 提示词模板
├── static/                 # 运行时生成的图片和海报
├── tool/                   # 提示词读取工具
├── poem-frontend/          # Vite + React 前端项目
└── requirements.txt        # Python 后端依赖清单
```

## 环境要求

- Python 3.11 或更高版本
- Node.js 18 或更高版本
- npm

## 环境变量

在项目根目录创建 `.env` 文件，并配置以下变量：

```env
CHAT_URL=https://api.siliconflow.cn/v1/chat/completions
CHAT_API_KEY=你的对话模型接口密钥
PICTURE_API_KEY=你的图片生成接口密钥
```

如果使用默认的 SiliconFlow 兼容接口，`CHAT_URL` 可以不改。`CHAT_API_KEY` 和 `PICTURE_API_KEY` 必须配置。

## 安装依赖

安装后端依赖：

```bash
python -m venv .venv
.venv\Scripts\activate
pip install -r requirements.txt
```

安装前端依赖：

```bash
cd poem-frontend
npm install
```

## 启动项目

在项目根目录运行：

```bash
python main.py
```

该命令会同时启动：

- 后端接口：`http://127.0.0.1:8000`
- 前端开发服务：`http://127.0.0.1:5173`

如果端口已经被占用，请先停止旧的 Python 后端或 Node/Vite 前端进程，再重新运行启动命令。

## 常用命令

只启动后端：

```bash
uvicorn main:app --host 0.0.0.0 --port 8000
```

只启动前端：

```bash
cd poem-frontend
npm run dev
```

构建前端：

```bash
cd poem-frontend
npm run build
```

## 运行时文件

应用会把生成的图片和海报写入 `static/images` 和 `static/posters`。这些文件属于运行产物，已被 git 忽略，可以安全删除；下次生成内容时会重新创建。
