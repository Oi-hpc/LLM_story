import test from 'node:test'
import assert from 'node:assert/strict'
import { buildImagePromptMessages, buildMessages, extractJson, getImageUrl } from './index.js'

test('custom mode makes the player background the world constraint', () => {
  const messages = buildMessages({
    gameMode: 'custom',
    worldBackground: '一座漂浮在木星风暴上的城市，所有居民都依靠记忆作为货币。',
    currentState: { health: 100, items: [] },
    messages: [{ role: 'user', content: '开始游戏' }],
  })

  assert.equal(messages[0].role, 'system')
  assert.match(messages[0].content, /玩家自定义世界背景/)
  assert.match(messages[0].content, /木星风暴/)
  assert.equal(messages[1].content, '开始游戏')
})

test('default mode keeps the Resident Evil game master prompt', () => {
  const messages = buildMessages({ messages: [] })
  assert.match(messages[0].content, /生化危机8/)
  assert.doesNotMatch(messages[0].content, /玩家自定义世界背景（最高世界观约束）/)
})

test('scene prompt input includes current narrative and a default background', () => {
  const messages = buildImagePromptMessages({
    narrative: '暴雪中的木门被撞开，一道影子掠过走廊。',
    areaId: 'village_house',
    chapterIndex: 1,
  })
  const scene = JSON.parse(messages[1].content)

  assert.match(scene.world_background, /生化危机8/)
  assert.match(scene.current_narrative, /木门/)
  assert.equal(scene.area_id, 'village_house')
  assert.equal(scene.chapter, 2)
})

test('extractJson accepts fenced JSON and removes trailing commas', () => {
  const parsed = extractJson('说明\n```json\n{"prompt":"cinematic scene",}\n```')
  assert.deepEqual(parsed, { prompt: 'cinematic scene' })
})

test('image response accepts both OpenAI-compatible URL and base64 formats', () => {
  assert.equal(getImageUrl({ url: 'https://img.example/scene.png' }), 'https://img.example/scene.png')
  assert.equal(getImageUrl({ b64_json: 'YWJj' }), 'data:image/png;base64,YWJj')
  assert.equal(getImageUrl({}), '')
})
