# 生化危机 · 基于 LLM 的交互式叙述游戏（H5）

以生化危机为背景的 H5 互动叙事游戏，故事走向由 AI 根据你的选择推进，支持固定选项与自定义输入、章节制、回溯与存档。

## 功能概览

- **玩法**：AI 叙述剧情并给出选项，可点击选项或输入自定义行动；章节模式（约 10 分钟/章），章节间通过摘要传递状态；单章内可回溯到任意回合；支持存档与读档（本地）。
- **体验**：生化危机风格界面、数值展示（生命/弹药/物品）、区域地图与当前/可见区域高亮、多风格 BGM 随剧情切换。

## 技术栈

- **前端**：Vue 3 + Vite，响应式布局，适配移动端与桌面。
- **后端**：Node.js + Express，代理调用 OpenAI 兼容 API，解析为结构化 JSON 返回。

## 环境要求

- Node.js 18+
- 可用的 OpenAI 或兼容接口的 API Key（如 OpenAI、Azure、国内中转等）

## 快速开始

### 1. 安装依赖

```bash
# 根目录
npm install

# 后端
cd backend && npm install

# 前端
cd frontend && npm install
```

### 2. 配置后端 API Key

在 `backend` 目录下复制环境变量示例并填写：

```bash
cd backend
cp .env.example .env
```

编辑 `backend/.env`。**使用 DeepSeek API** 时配置示例：

```env
OPENAI_API_KEY=你的DeepSeek_API_Key
OPENAI_BASE_URL=https://api.deepseek.com/v1
OPENAI_MODEL=deepseek-chat
```

（DeepSeek 兼容 OpenAI 接口，无需改代码；可选模型还有 `deepseek-reasoner`。本后端已启用 DeepSeek 的 **JSON Output**（`response_format: { type: 'json_object' }`），若使用其他厂商 API 且不支持该参数，需在代码中移除 `response_format`。）

使用 OpenAI 官方或其它兼容接口时，修改 `OPENAI_BASE_URL` 和 `OPENAI_MODEL` 即可。

**若出现连接超时（ETIMEDOUT）**：直连 `api.openai.com` 在国内往往不可用，请务必在 `.env` 中设置 `OPENAI_BASE_URL` 为可用的代理或国内兼容接口（例如各类 OpenAI API 中转服务），并确保该地址可在本机访问。可选增加 `REQUEST_TIMEOUT_MS=60000` 调整请求超时时间（毫秒）。

### 3. 启动开发环境

在项目根目录执行（会同时启动后端与前端）：

```bash
npm run dev
```

或分别启动：

```bash
# 终端 1：后端 http://localhost:3000
cd backend && npm run dev

# 终端 2：前端 http://localhost:5173（已代理 /api 到后端）
cd frontend && npm run dev
```

浏览器访问 **http://localhost:5173**，点击「新游戏」即可开始。首次会由 AI 给出开场叙述与选项。

### 4. 生产构建与运行

```bash
# 构建前端
npm run build

# 将 frontend/dist 部署到任意静态服务器；后端单独部署并配置 CORS 与前端域名
cd backend && npm run start
```

前端需能访问到后端的 `/api/chat`。若前后端同域，无需改代码；若跨域，需在后端配置 CORS 允许前端域名。

## 项目结构

```
LLM_story/
├── backend/           # 后端服务
│   ├── index.js       # Express + LLM 代理 + 系统提示词
│   ├── .env.example
│   └── package.json
├── frontend/          # 前端 H5 应用
│   ├── src/
│   │   ├── App.vue    # 主逻辑：对话、存档、回溯、章节
│   │   ├── components/
│   │   │   ├── GameNarrative.vue  # 叙述框 + 选项 + 自定义输入
│   │   │   ├── GameStats.vue      # 生命/弹药/物品
│   │   │   ├── GameMap.vue        # 区域与当前/可见高亮
│   │   │   └── GameBgm.vue        # BGM 按情绪标签切换
│   │   ├── main.js
│   │   └── style.css
│   ├── index.html
│   ├── vite.config.js # 开发时 /api 代理到后端
│   └── package.json
├── 需求文档.md
├── package.json       # 根脚本：npm run dev 同时起前后端
└── README.md
```

## 说明与限制

- **存档**：仅保存在浏览器本地（localStorage），不支持跨设备同步；清除站点数据会丢失存档。
- **回溯**：仅限当前章节内；回溯后再次推进会基于该回合上下文重新请求 AI。
- **地图**：当前为占位区域列表，与 AI 返回的 `area_id` / `visible_areas` 对应；如需真实地图图，可在 `GameMap.vue` 中替换为预置图片或 SVG，并按区域 ID 高亮。
- **BGM**：将 MP3/OGG 放入 `frontend/public/audio/`，文件名对应情绪：`calm.mp3`、`tense.mp3`、`mystery.mp3`、`action.mp3`、`sad.mp3`。详见 `frontend/public/audio/README.md`；开关在页面左上角。

更多设计细节见 [需求文档.md](./需求文档.md)。
