<script setup>
import { ref, computed, watch, onMounted } from 'vue'
import GameNarrative from './components/GameNarrative.vue'
import GameStats from './components/GameStats.vue'
import GameMap from './components/GameMap.vue'
import GameBgm from './components/GameBgm.vue'

const STORAGE_KEY = 'llm_story_save'
const BGM_TAGS = ['calm', 'tense', 'mystery', 'action', 'sad']

const chapterIndex = ref(0)
const chapterSummary = ref('')
const turnIndex = ref(0)
const state = ref({
  health: 100,
  ammo: 10,
  items: ['LEMI手枪', '急救药 x1'],
  relation_npc: {},
})
const messages = ref([])
const rollbackSnapshots = ref([])
const narrative = ref('')
const options = ref([])
const allowCustomInput = ref(true)
const areaId = ref('crash_site')
const visibleAreas = ref(['crash_site'])
const bgmTag = ref('tense')
const loading = ref(false)
const error = ref('')
const customInput = ref('')
const currentBgm = ref(null)

const canRollback = computed(() => rollbackSnapshots.value.length > 1)
const canSave = computed(() => messages.value.length > 0)

function mergeState(update) {
  if (!update || typeof update !== 'object') return
  if (typeof update.health === 'number') state.value.health = Math.max(0, Math.min(100, update.health))
  if (typeof update.ammo === 'number') state.value.ammo = update.ammo
  if (Array.isArray(update.items)) state.value.items = [...update.items]
  if (update.relation_npc && typeof update.relation_npc === 'object') {
    state.value.relation_npc = { ...state.value.relation_npc, ...update.relation_npc }
  }
}

function pushTurnSnapshot() {
  rollbackSnapshots.value.push({
    chapterIndex: chapterIndex.value,
    chapterSummary: chapterSummary.value,
    turnIndex: turnIndex.value,
    state: JSON.parse(JSON.stringify(state.value)),
    messages: JSON.parse(JSON.stringify(messages.value)),
    narrative: narrative.value,
    options: [...(options.value || [])],
    allowCustomInput: allowCustomInput.value,
    areaId: areaId.value,
    visibleAreas: [...(visibleAreas.value || [])],
    bgmTag: bgmTag.value,
  })
}

function sendChoice(choice) {
  if (loading.value) return
  const content = typeof choice === 'string' ? choice : customInput.value?.trim()
  if (!content) return
  messages.value.push({ role: 'user', content })
  if (allowCustomInput.value) customInput.value = ''
  loading.value = true
  error.value = ''

  fetch('/api/chat', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      messages: messages.value,
      chapterSummary: chapterSummary.value || undefined,
      currentState: state.value,
    }),
  })
    .then((r) => r.json())
    .then((data) => {
      if (data.error) throw new Error(data.error)
      narrative.value = data.narrative || ''
      options.value = data.options || []
      allowCustomInput.value = !!data.allowCustomInput
      mergeState(data.state_update)
      areaId.value = data.area_id || areaId.value
      visibleAreas.value = Array.isArray(data.visible_areas) ? data.visible_areas : [areaId.value]
      bgmTag.value = BGM_TAGS.includes(data.bgm_tag) ? data.bgm_tag : 'tense'
      messages.value.push({ role: 'assistant', content: data.narrative })
      turnIndex.value += 1
      pushTurnSnapshot()

      if (data.chapter_end && data.chapter_summary) {
        chapterSummary.value = data.chapter_summary
        chapterIndex.value += 1
        turnIndex.value = 0
        rollbackSnapshots.value = []
        pushTurnSnapshot()
      }
    })
    .catch((e) => {
      error.value = e.message || '请求失败，请重试'
    })
    .finally(() => {
      loading.value = false
    })
}

function rollback() {
  if (!canRollback.value || rollbackSnapshots.value.length < 2) return
  rollbackSnapshots.value.pop()
  const prev = rollbackSnapshots.value[rollbackSnapshots.value.length - 1]
  chapterIndex.value = prev.chapterIndex
  chapterSummary.value = prev.chapterSummary
  turnIndex.value = prev.turnIndex
  state.value = JSON.parse(JSON.stringify(prev.state))
  messages.value = JSON.parse(JSON.stringify(prev.messages))
  narrative.value = prev.narrative
  options.value = [...(prev.options || [])]
  allowCustomInput.value = prev.allowCustomInput
  areaId.value = prev.areaId
  visibleAreas.value = [...(prev.visibleAreas || [])]
  bgmTag.value = prev.bgmTag
  rollbackSnapshots.value.pop()
}

function saveGame() {
  const payload = {
    chapterIndex: chapterIndex.value,
    chapterSummary: chapterSummary.value,
    turnIndex: turnIndex.value,
    state: state.value,
    messages: messages.value,
    rollbackSnapshots: rollbackSnapshots.value,
    narrative: narrative.value,
    options: options.value,
    allowCustomInput: allowCustomInput.value,
    areaId: areaId.value,
    visibleAreas: visibleAreas.value,
    bgmTag: bgmTag.value,
  }
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(payload))
    error.value = ''
    alert('存档已保存（仅限本设备）')
  } catch (e) {
    error.value = '存档失败'
  }
}

function loadGame() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) {
      error.value = '暂无存档'
      return
    }
    const payload = JSON.parse(raw)
    chapterIndex.value = payload.chapterIndex ?? 0
    chapterSummary.value = payload.chapterSummary ?? ''
    turnIndex.value = payload.turnIndex ?? 0
    state.value = payload.state ?? { health: 100, ammo: 10, items: ['LEMI手枪', '急救药 x1'], relation_npc: {} }
    messages.value = payload.messages ?? []
    rollbackSnapshots.value = payload.rollbackSnapshots ?? []
    narrative.value = payload.narrative ?? ''
    options.value = payload.options ?? []
    allowCustomInput.value = payload.allowCustomInput !== false
    areaId.value = payload.areaId ?? 'crash_site'
    visibleAreas.value = payload.visibleAreas ?? ['crash_site']
    bgmTag.value = payload.bgmTag ?? 'tense'
    error.value = ''
  } catch (e) {
    error.value = '读档失败'
  }
}

function startNew() {
  if (!confirm('将清除当前进度并重新开始，是否继续？')) return
  chapterIndex.value = 0
  chapterSummary.value = ''
  turnIndex.value = 0
  state.value = { health: 100, ammo: 10, items: ['LEMI手枪', '急救药 x1'], relation_npc: {} }
  messages.value = []
  rollbackSnapshots.value = []
  narrative.value = ''
  options.value = []
  allowCustomInput.value = true
  areaId.value = 'crash_site'
  visibleAreas.value = ['crash_site']
  bgmTag.value = 'tense'
  error.value = ''
  sendChoice('开始游戏。我扮演伊森·温特斯，请从押送车侧翻后我在雪林残骸中醒来的情境开始叙述，并给出 [A][B][C] 三个行动选项。')
}

watch(bgmTag, (tag) => {
  currentBgm.value = tag
})

onMounted(() => {
  if (messages.value.length === 0) {
    narrative.value = '加载中… 请点击「新游戏」开始，或「读档」继续上次进度。'
  }
})
</script>

<template>
  <div class="app">
    <header class="header">
      <h1 class="title">生化危机 · 交互叙事</h1>
      <div class="actions">
        <button class="btn btn-secondary" @click="loadGame">读档</button>
        <button class="btn btn-secondary" :disabled="!canSave" @click="saveGame">存档</button>
        <button class="btn btn-secondary" :disabled="!canRollback" @click="rollback">回溯</button>
        <button class="btn btn-primary" @click="startNew">新游戏</button>
      </div>
    </header>
    <main class="main">
      <aside class="aside">
        <GameStats :state="state" />
        <GameMap :area-id="areaId" :visible-areas="visibleAreas" :chapter-index="chapterIndex" />
      </aside>
      <section class="content">
        <GameBgm :tag="currentBgm" />
        <GameNarrative
          :narrative="narrative"
          :options="options"
          :allow-custom-input="allowCustomInput"
          :loading="loading"
          :error="error"
          v-model:custom-input="customInput"
          @choose="sendChoice"
        />
      </section>
    </main>
  </div>
</template>

<style scoped>
.app {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  background: var(--bg-dark);
}
.header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0.75rem 1rem;
  border-bottom: 1px solid var(--border);
  background: var(--bg-panel);
}
.title {
  font-family: var(--font-display);
  font-size: 1rem;
  font-weight: 700;
  color: var(--accent);
  margin: 0;
}
.actions {
  display: flex;
  gap: 0.5rem;
}
.btn {
  padding: 0.4rem 0.75rem;
  border: 1px solid var(--border);
  background: var(--bg-dark);
  color: var(--text);
  border-radius: 2px;
  font-size: 0.85rem;
}
.btn:hover:not(:disabled) {
  border-color: var(--accent);
  color: var(--accent);
}
.btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}
.btn-primary {
  background: var(--accent);
  color: #fff;
  border-color: var(--accent);
}
.btn-primary:hover:not(:disabled) {
  background: var(--accent-dim);
  border-color: var(--accent-dim);
}
.main {
  flex: 1;
  display: grid;
  grid-template-columns: 280px 1fr;
  gap: 1rem;
  padding: 1rem;
  max-width: 1200px;
  margin: 0 auto;
  width: 100%;
}
.aside {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}
.content {
  display: flex;
  flex-direction: column;
  min-width: 0;
}
@media (max-width: 768px) {
  .main {
    grid-template-columns: 1fr;
  }
  .aside {
    order: 1;
    flex-direction: row;
    flex-wrap: wrap;
  }
}
</style>
