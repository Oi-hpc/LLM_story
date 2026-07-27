<script setup>
import { ref, watch } from 'vue'

const props = defineProps({
  narrative: { type: String, default: '' },
  worldBackground: { type: String, default: '' },
  areaId: { type: String, default: '' },
  chapterIndex: { type: Number, default: 0 },
})

const loading = ref(false)
const imageUrl = ref('')
const prompt = ref('')
const error = ref('')

watch(
  () => props.narrative,
  () => {
    imageUrl.value = ''
    prompt.value = ''
    error.value = ''
  }
)

async function generateImage() {
  if (!props.narrative || loading.value) return
  loading.value = true
  imageUrl.value = ''
  prompt.value = ''
  error.value = ''
  try {
    const response = await fetch('/api/generate-scene-image', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        narrative: props.narrative,
        worldBackground: props.worldBackground,
        areaId: props.areaId,
        chapterIndex: props.chapterIndex,
      }),
    })
    const data = await response.json()
    if (!response.ok || data.error) throw new Error(data.error || '场景生图失败')
    imageUrl.value = data.imageUrl
    prompt.value = data.prompt
  } catch (e) {
    error.value = e.message || '场景生图失败，请稍后重试'
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <section class="scene-image-panel">
    <div class="scene-image-heading">
      <div>
        <h2 class="scene-image-title">场景影像</h2>
        <p class="scene-image-hint">AI 提炼当前场景，再由 Grok 绘制</p>
      </div>
      <button
        type="button"
        class="generate-btn"
        :disabled="loading || !narrative"
        @click="generateImage"
      >
        {{ loading ? '绘制中…' : imageUrl ? '重新生成' : '生成当前场景' }}
      </button>
    </div>

    <div v-if="imageUrl" class="scene-image-wrap">
      <img :src="imageUrl" alt="AI 根据当前游戏场景生成的画面" class="scene-image" />
    </div>
    <p v-else-if="loading" class="scene-image-placeholder">正在构思画面并调用 Grok，请稍候…</p>
    <p v-if="error" class="scene-image-error">{{ error }}</p>

    <details v-if="prompt" class="prompt-details">
      <summary>查看生图 Prompt</summary>
      <p>{{ prompt }}</p>
    </details>
  </section>
</template>

<style scoped>
.scene-image-panel {
  margin-bottom: 1rem;
  padding: 0.85rem 1rem;
  background: var(--bg-panel);
  border: 1px solid var(--border);
  border-radius: 4px;
}
.scene-image-heading {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
}
.scene-image-title {
  margin: 0;
  color: var(--accent);
  font-family: var(--font-display);
  font-size: 0.9rem;
  letter-spacing: 0.05em;
}
.scene-image-hint {
  margin: 0.2rem 0 0;
  color: var(--text-dim);
  font-size: 0.75rem;
}
.generate-btn {
  flex-shrink: 0;
  padding: 0.45rem 0.75rem;
  border: 1px solid var(--accent);
  border-radius: 2px;
  background: transparent;
  color: var(--accent);
  font-family: inherit;
}
.generate-btn:hover:not(:disabled) {
  background: var(--accent);
  color: #fff;
}
.generate-btn:disabled {
  cursor: not-allowed;
  opacity: 0.5;
}
.scene-image-wrap {
  margin-top: 0.85rem;
  overflow: hidden;
  border: 1px solid var(--border);
  border-radius: 3px;
  background: #050607;
}
.scene-image {
  display: block;
  width: 100%;
  max-height: 420px;
  object-fit: contain;
}
.scene-image-placeholder,
.scene-image-error {
  margin: 0.85rem 0 0;
  color: var(--text-dim);
  font-size: 0.8rem;
}
.scene-image-error {
  color: var(--red);
}
.prompt-details {
  margin-top: 0.75rem;
  color: var(--text-dim);
  font-size: 0.75rem;
}
.prompt-details summary {
  cursor: pointer;
}
.prompt-details p {
  margin: 0.5rem 0 0;
  line-height: 1.6;
  word-break: break-word;
}
@media (max-width: 560px) {
  .scene-image-heading {
    align-items: stretch;
    flex-direction: column;
  }
  .generate-btn {
    width: 100%;
  }
}
</style>
