import 'dotenv/config'
import express from 'express'
import cors from 'cors'
import OpenAI from 'openai'

const app = express()
app.use(cors())
app.use(express.json({ limit: '1mb' }))

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY || '',
  baseURL: process.env.OPENAI_BASE_URL || undefined,
})

const SYSTEM_PROMPT = `# 角色与任务
你是《生化危机8：村庄》的生存恐怖游戏主持人（Game Master）。玩家扮演伊森·温特斯（Ethan Winters），目标是在诡异的东欧村庄中寻找并解救女儿萝丝。你根据玩家的选择推进剧情，并**始终只输出一个合法 JSON 对象**，不要输出任何 JSON 之外的文字。

## 叙事风格
- **语言**：极具视觉感、压抑且带血腥感。注重环境与感官描写（如雪地的刺骨寒冷、腐烂的气味、木屋的吱呀声、远处的嘶吼）。
- **节奏**：每轮叙述控制在 2–4 段，留白与悬念并重，避免一次性信息过载。
- **世界观**：严格遵循《生化危机8》设定（村庄、四大贵族、霉菌、伊森的不死体质等），不得脱离该世界观；重大分支（如角色生死）需在本章内收束或写入 chapter_summary。

## 数值与状态
- **state_update** 仅填写**本轮有变化**的项，前端会与当前状态合并。
  - **health**：0–100 的整数。可大致对应：良好 80+，注意 30–79，危险 1–29，0 为死亡。受到攻击下降，使用急救药/洗手液等恢复。
  - **ammo**：当前手枪子弹数。初始 LEMI 为 10 发，拾取或换弹后更新。
  - **items**：字符串数组，如 ["LEMI手枪", "急救药 x1", "钥匙"]。初始可为 ["LEMI手枪", "急救药 x1"]。
  - **relation_npc**：可选，与关键 NPC 的关系或态度（若有变化再写）。

## 决策与死亡
- **选项**：每轮提供 [A]、[B]、[C] 三个行动建议，表述简短有力（例如「检查翻覆的车辆，搜寻物资」）。**allowCustomInput** 始终为 true，允许玩家输入自定义行动。
- **死亡与结局**：若玩家做出极度危险或鲁莽的选择，你可暗中进行「行动判定」；失败时可安排死亡。**死亡时**：narrative 中明确写出死亡过程与结局，chapter_end 设为 true，chapter_summary 中简要写明死因与结局，供后续章节或重新开始使用。

## 故事起点（无上一章摘要时使用）
克里斯·雷德菲尔德带走萝丝并「杀害」米娅之后。伊森在押送车侧翻的残骸中醒来——深夜、东欧雪林、冷风灌入破碎车窗、雪地上有拖行血迹通向山谷中的破败村庄，远处森林传来非人的凄厉嘶吼。初始状态：健康良好（左手绷带隐隐作痛），LEMI 手枪 10/10，急救药 1/1。

## 地图区域 ID（area_id / visible_areas）
请从以下或类似 ID 中选用，保持前后一致：crash_site（翻车点）, forest_path（林间小路）, village_gate（村口）, village_square（村中广场）, village_house（民宅）, castle_approach（城堡外围）, dungeon（地牢）, factory_entrance（工厂入口）等。

## 必须输出的 JSON 结构（只输出此对象，无其他内容）：
{
  "narrative": "本轮的叙述正文，含环境与感官描写，2–4 段为宜。若角色死亡，在此写出死亡过程与结局。",
  "options": ["[A] 行动一描述", "[B] 行动二描述", "[C] 行动三描述"],
  "allowCustomInput": true,
  "state_update": { "health": 100, "ammo": 10, "items": ["LEMI手枪", "急救药 x1"] },
  "area_id": "crash_site",
  "visible_areas": ["crash_site", "forest_path"],
  "bgm_tag": "tense",
  "chapter_end": false,
  "chapter_summary": null
}

字段约定：
- narrative:  string，本轮剧情，直接给玩家看。
- options:   string[]，3 个行动建议，可带 [A][B][C] 前缀或简洁描述。
- allowCustomInput: 固定 true。
- state_update: 仅包含本轮变化的键；health 0–100，ammo 数字，items 字符串数组。
- area_id / visible_areas: 与上述区域 ID 一致。
- bgm_tag: 仅限 calm | tense | mystery | action | sad 之一。
- chapter_end: 本章结束或角色死亡时为 true。
- chapter_summary: 当 chapter_end 为 true 时必填 string（重要抉择、生死、关键道具、下一章入口或结局概要）；否则 null。

若玩家输入难以解析或偏离剧情，用 narrative 温和拉回《生化危机8》情境，并保持 JSON 格式。

**JSON 格式要求**：直接输出一个 JSON 对象，不要用 \`\`\`json 代码块包裹，不要输出任何前后说明文字。narrative 字段内如需换行请用 \\n 表示，勿使用未转义的真实换行；字符串内双引号请转义为 \\"。`

/** 解析失败时追加给模型的重试提示，强调仅输出合法 JSON */
const JSON_RETRY_PROMPT = `【重要】你上一轮回复无法被解析为合法 JSON。请立即重新输出，且必须遵守以下规则：
1. 只输出一个 JSON 对象，从 { 开始到 } 结束，不要输出任何其他文字、说明或 markdown。
2. 不要使用 \`\`\`json 或 \`\`\` 代码块包裹。
3. narrative 字段内的换行必须写成 \\n，不能是真实换行；字符串内的双引号必须写成 \\"。
4. 不要有尾逗号（如 ,] 或 ,}）。
请直接输出修正后的 JSON，不要有任何前缀或后缀。`

function buildMessages(body) {
  const { messages, chapterSummary, currentState } = body
  const parts = [SYSTEM_PROMPT]

  if (chapterSummary && chapterSummary.trim()) {
    parts.push(`\n## 上一章摘要（请据此延续剧情）\n${chapterSummary}`)
  }
  if (currentState && typeof currentState === 'object' && Object.keys(currentState).length > 0) {
    parts.push(`\n## 当前状态\n${JSON.stringify(currentState, null, 2)}`)
  }

  const systemContent = parts.join('\n')
  const msgs = [{ role: 'system', content: systemContent }]
  for (const m of messages || []) {
    if (m.role && m.content) msgs.push({ role: m.role, content: String(m.content) })
  }
  return msgs
}

/**
 * 从模型输出中提取并解析 JSON，兼容被 markdown 包裹、前后有说明文字、括号在字符串内等情况。
 */
function extractJson(text) {
  if (!text || typeof text !== 'string') return null
  let raw = text.trim()

  // 去掉 markdown 代码块：```json ... ``` 或 ``` ... ```
  const codeBlockMatch = raw.match(/```(?:json)?\s*([\s\S]*?)```/)
  if (codeBlockMatch) raw = codeBlockMatch[1].trim()

  const start = raw.indexOf('{')
  if (start === -1) return null

  // 按括号匹配找到对象结束位置，避免 narrative 等字段内的 "}" 导致截断
  let depth = 0
  let inString = false
  let escape = false
  let quote = null
  let end = -1
  for (let i = start; i < raw.length; i++) {
    const c = raw[i]
    if (escape) {
      escape = false
      continue
    }
    if (c === '\\' && inString) {
      escape = true
      continue
    }
    if (!inString) {
      if (c === '"' || c === "'") {
        inString = true
        quote = c
        continue
      }
      if (c === '{') depth++
      else if (c === '}') {
        depth--
        if (depth === 0) {
          end = i + 1
          break
        }
      }
      continue
    }
    if (c === quote) inString = false
  }
  if (end === -1) end = raw.lastIndexOf('}') + 1
  if (end <= start) return null

  let jsonStr = raw.slice(start, end)

  // 修复常见非法 JSON：尾逗号、部分未转义换行
  jsonStr = jsonStr.replace(/,(\s*[}\]])/g, '$1')

  try {
    return JSON.parse(jsonStr)
  } catch {
    // 备用：从第一个 { 到最后一个 }，再修尾逗号后重试
    const fallbackEnd = raw.lastIndexOf('}') + 1
    if (fallbackEnd > start) {
      let fallbackStr = raw.slice(start, fallbackEnd).replace(/,(\s*[}\]])/g, '$1')
      try {
        return JSON.parse(fallbackStr)
      } catch {
        // ignore
      }
    }
    return null
  }
}

// #region agent log
const _log = (location, message, data, hypothesisId) =>
  fetch('http://127.0.0.1:7466/ingest/ca98747a-be7d-445c-a430-441bb3fd82d8', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'X-Debug-Session-Id': '4f10b6' },
    body: JSON.stringify({
      sessionId: '4f10b6',
      location,
      message,
      data: { ...data, hypothesisId },
      timestamp: Date.now(),
    }),
  }).catch(() => {})
// #endregion

app.post('/api/chat', async (req, res) => {
  const startTime = Date.now()
  try {
    if (!process.env.OPENAI_API_KEY) {
      return res.status(503).json({ error: '未配置 OPENAI_API_KEY，请在 backend/.env 中设置' })
    }
    const messages = buildMessages(req.body)
    const timeoutMs = Number(process.env.REQUEST_TIMEOUT_MS) || 90000
    const baseURL = process.env.OPENAI_BASE_URL || '(default)'
    // #region agent log
    _log(
      'index.js:api/chat entry',
      'Request config',
      {
        baseURL,
        timeoutMs,
        messagesCount: messages.length,
        hasKey: !!process.env.OPENAI_API_KEY,
      },
      'A,C,E'
    )
    // #endregion
    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), timeoutMs)
    // DeepSeek JSON Output：response_format 确保输出合法 JSON；prompt 中已含 json 字样与样例
    const completion = await openai.chat.completions.create(
      {
        model: process.env.OPENAI_MODEL || 'gpt-4o-mini',
        messages,
        temperature: 1.3,
        max_tokens: 2000,
        response_format: { type: 'json_object' },
      },
      { signal: controller.signal }
    )
    clearTimeout(timer)
    let content = completion.choices?.[0]?.message?.content
    if (!content) {
      return res.status(502).json({ error: '模型未返回内容' })
    }
    let parsed = extractJson(content)
    if (!parsed) {
      const retryMessages = [
        ...messages,
        { role: 'assistant', content },
        { role: 'user', content: JSON_RETRY_PROMPT },
      ]
      const retryController = new AbortController()
      const retryTimer = setTimeout(() => retryController.abort(), timeoutMs)
      try {
        const retryCompletion = await openai.chat.completions.create(
          {
            model: process.env.OPENAI_MODEL || 'gpt-4o-mini',
            messages: retryMessages,
            temperature: 1.3,
            max_tokens: 2000,
            response_format: { type: 'json_object' },
          },
          { signal: retryController.signal }
        )
        clearTimeout(retryTimer)
        const retryContent = retryCompletion.choices?.[0]?.message?.content
        if (retryContent) parsed = extractJson(retryContent)
      } catch (_) {
        clearTimeout(retryTimer)
      }
      if (!parsed) {
        return res.status(502).json({ error: '无法解析模型输出为 JSON（已重试一次）', raw: content })
      }
    }
    res.json(parsed)
  } catch (err) {
    // #region agent log
    const cause = err.cause || {}
    _log(
      'index.js:api/chat catch',
      'Error details',
      {
        errName: err.name,
        errMessage: err.message,
        causeCode: cause.code,
        causeErrno: cause.errno,
        causeType: cause.type,
        elapsedMs: Date.now() - startTime,
        isAbortError: err.name === 'AbortError',
      },
      'B,C,D,E'
    )
    // #endregion
    console.error(err)
    const elapsedMs = Date.now() - startTime
    const timeoutMs = Number(process.env.REQUEST_TIMEOUT_MS) || 90000
    const isAbortByUs =
      (err.message && String(err.message).includes('aborted')) && elapsedMs >= timeoutMs * 0.9
    const isTimeout =
      err.code === 'ETIMEDOUT' ||
      err.errno === 'ETIMEDOUT' ||
      err.name === 'AbortError' ||
      (err.type === 'system' && err.code === 'ETIMEDOUT') ||
      isAbortByUs
    const isNetwork = err.code === 'ENOTFOUND' || err.code === 'ECONNREFUSED' || isTimeout
    let message = err.message || '请求 LLM 失败'
    if (isNetwork) {
      message =
        '无法连接 API 服务器（超时或网络不可达）。若在国内环境，请在 backend/.env 中设置 OPENAI_BASE_URL 为可用的代理或国内兼容接口地址，例如：\nOPENAI_BASE_URL=https://你的代理或中转地址/v1\n若已使用代理仍超时，可尝试增大 REQUEST_TIMEOUT_MS（单位毫秒）。'
    }
    const code = err.status || err.response?.status || 500
    res.status(code >= 400 ? code : 500).json({ error: message })
  }
})

// 连接自检：用 Node 发请求看能否连上配置的 API 地址（帮助排查 ETIMEDOUT 是网络还是环境问题）
app.get('/api/check-connection', async (req, res) => {
  const base = process.env.OPENAI_BASE_URL || 'https://api.openai.com/v1'
  const url = base.replace(/\/v1\/?$/, '') + '/v1/models'
  const timeoutMs = 15000
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), timeoutMs)
  try {
    const r = await fetch(url, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${process.env.OPENAI_API_KEY || 'sk-placeholder'}`,
        'Content-Type': 'application/json',
      },
      signal: controller.signal,
    })
    clearTimeout(timer)
    res.json({
      ok: true,
      message: '能连上 API 服务器',
      url,
      status: r.status,
    })
  } catch (e) {
    clearTimeout(timer)
    const isTimeout = e.code === 'ETIMEDOUT' || e.name === 'AbortError'
    res.status(502).json({
      ok: false,
      message: isTimeout ? '连接超时（ETIMEDOUT）' : '连接失败',
      url,
      error: e.message,
      code: e.code,
      hint: '若你在国内，多数环境下无法直连 api.openai.com，需在 .env 中设置 OPENAI_BASE_URL 为可用的代理或中转地址',
    })
  }
})

const PORT = process.env.PORT || 3000
app.listen(PORT, () => console.log(`Backend http://localhost:${PORT}`))
