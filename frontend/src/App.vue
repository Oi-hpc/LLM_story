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

const canRollback = computed(() => rollbackSnapshots.value.length >= 1)
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
  const lastUser = messages.value.filter((m) => m.role === 'user').pop()
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
    lastUserChoice: lastUser ? lastUser.content : '（开场）',
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

function rollbackTo(snapshotIndex) {
  const snap = rollbackSnapshots.value
  if (snapshotIndex < 0 || snapshotIndex >= snap.length) return
  const prev = snap[snapshotIndex]
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
  rollbackSnapshots.value = snap.slice(0, snapshotIndex + 1)
  showRollbackPanel.value = false
}

const showRollbackPanel = ref(false)
const showMenu = ref(true)

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
    showMenu.value = false
  } catch (e) {
    error.value = '读档失败'
  }
}

function startFromMenu() {
  showMenu.value = false
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

function startNew() {
  if (!confirm('将清除当前进度并重新开始，是否继续？')) return
  startFromMenu()
}

watch(bgmTag, (tag) => {
  currentBgm.value = tag
})

onMounted(() => {
  if (!showMenu.value && messages.value.length === 0) {
    narrative.value = '加载中… 请点击「新游戏」开始，或「读档」继续上次进度。'
  }
})
</script>

<template>
  <div class="app">
    <div v-if="showMenu" class="menu-screen">
      <div class="menu-content">
        <h1 class="menu-title">雾中村庄</h1>
        <p class="menu-subtitle">生死抉择</p>
        <p class="menu-story">
          东欧边境，暴风雪夜。押送车在雪林中翻覆，你从残骸中苏醒，只记得女儿萝丝被夺走、妻子米娅倒在血泊中。雪地上拖行的血迹指向山谷里那座被浓雾吞没的村庄——那里传来不似人声的尖啸，乌鸦惊飞，而你除了一把枪与所剩无几的理智，一无所有。<br><br>
          每一个选择都将把你引向生存、真相，或是万劫不复。你愿意踏入雾中吗？
        </p>
        <div class="menu-actions">
          <button type="button" class="btn btn-menu-primary" @click="startFromMenu">新游戏</button>
          <button type="button" class="btn btn-menu-secondary" @click="loadGame">读档</button>
        </div>
        <p v-if="error" class="menu-error">{{ error }}</p>
      </div>
    </div>
    <template v-else>
    <header class="header">
      <h1 class="title">雾中村庄 · 生死抉择</h1>
      <div class="actions">
        <button class="btn btn-secondary" @click="loadGame">读档</button>
        <button class="btn btn-secondary" :disabled="!canSave" @click="saveGame">存档</button>
        <button class="btn btn-secondary" :disabled="!canRollback" @click="showRollbackPanel = true">回溯</button>
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
        <Teleport to="body">
          <div v-if="showRollbackPanel" class="rollback-overlay" @click.self="showRollbackPanel = false">
            <div class="rollback-panel">
              <h3 class="rollback-title">回溯时间轴</h3>
              <p class="rollback-hint">选择要回溯到的节点，从该选择之后重新推进剧情。</p>
              <ul class="rollback-timeline">
                <li
                  v-for="(s, i) in rollbackSnapshots"
                  :key="i"
                  class="rollback-item"
                  :class="{ current: i === rollbackSnapshots.length - 1 }"
                  @click="rollbackTo(i)"
                >
                  <span class="rollback-turn">第 {{ s.chapterIndex + 1 }} 章 · 第 {{ s.turnIndex + 1 }} 轮</span>
                  <span class="rollback-choice">{{ s.lastUserChoice ?? '（开场）' }}</span>
                </li>
              </ul>
              <button type="button" class="btn btn-secondary rollback-cancel" @click="showRollbackPanel = false">取消</button>
            </div>
          </div>
        </Teleport>
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
    </template>
  </div>
</template>

<style scoped>
.app {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  background: var(--bg-dark);
}

.menu-screen {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 2rem;
  background: linear-gradient(180deg, var(--bg-dark) 0%, #0d0f12 50%, var(--bg-dark) 100%);
}
.menu-content {
  max-width: 520px;
  width: 100%;
  text-align: center;
}
.menu-title {
  font-family: var(--font-display);
  font-size: clamp(2.5rem, 8vw, 4rem);
  font-weight: 700;
  color: var(--accent);
  margin: 0 0 0.25rem 0;
  letter-spacing: 0.15em;
  text-shadow: 0 0 24px rgba(139, 0, 0, 0.4);
}
.menu-subtitle {
  font-family: var(--font-display);
  font-size: 1.1rem;
  color: var(--text-dim);
  letter-spacing: 0.4em;
  margin: 0 0 2.5rem 0;
}
.menu-story {
  font-family: var(--font-mono);
  font-size: 0.95rem;
  line-height: 1.85;
  color: var(--text);
  margin: 0 0 2.5rem 0;
  text-align: left;
}
.menu-actions {
  display: flex;
  flex-direction: column;
  gap: 1rem;
  align-items: center;
}
.btn-menu-primary,
.btn-menu-secondary {
  min-width: 12rem;
  padding: 0.75rem 1.5rem;
  font-size: 1rem;
}
.btn-menu-primary {
  background: var(--accent);
  color: #fff;
  border-color: var(--accent);
}
.btn-menu-primary:hover {
  background: var(--accent-dim);
  border-color: var(--accent-dim);
}
.btn-menu-secondary {
  background: transparent;
  border-color: var(--border);
  color: var(--text);
}
.btn-menu-secondary:hover {
  border-color: var(--accent);
  color: var(--accent);
}
.menu-error {
  margin: 1rem 0 0 0;
  font-size: 0.85rem;
  color: var(--red);
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

.rollback-overlay {
  position: fixed;
  inset: 0;
  z-index: 100;
  background: rgba(0, 0, 0, 0.7);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 1rem;
}
.rollback-panel {
  background: var(--bg-panel);
  border: 1px solid var(--border);
  border-radius: 6px;
  max-width: 420px;
  width: 100%;
  max-height: 80vh;
  overflow: hidden;
  display: flex;
  flex-direction: column;
}
.rollback-title {
  font-family: var(--font-display);
  font-size: 1rem;
  color: var(--accent);
  margin: 0;
  padding: 1rem 1.25rem 0.5rem;
}
.rollback-hint {
  font-size: 0.8rem;
  color: var(--text-dim);
  margin: 0;
  padding: 0 1.25rem 1rem;
}
.rollback-timeline {
  list-style: none;
  margin: 0;
  padding: 0 1rem 1rem;
  overflow-y: auto;
  flex: 1;
}
.rollback-item {
  padding: 0.6rem 0.75rem;
  margin-bottom: 0.35rem;
  background: var(--bg-dark);
  border: 1px solid var(--border);
  border-radius: 4px;
  cursor: pointer;
  transition: border-color 0.2s;
}
.rollback-item:hover {
  border-color: var(--accent);
}
.rollback-item.current {
  border-color: var(--accent);
  color: var(--accent);
}
.rollback-turn {
  display: block;
  font-size: 0.75rem;
  color: var(--text-dim);
  margin-bottom: 0.25rem;
}
.rollback-choice {
  font-size: 0.85rem;
  display: block;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.rollback-cancel {
  margin: 0 1rem 1rem;
}
</style>
