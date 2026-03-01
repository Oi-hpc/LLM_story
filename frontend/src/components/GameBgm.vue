<script setup>
import { ref, watch } from 'vue'
const props = defineProps({
  tag: { type: String, default: 'tense' },
})
const audioRef = ref(null)
const muted = ref(true)
// BGM：将音频文件放到 frontend/public/audio/ 下，文件名与下方 key 对应（如 calm.mp3）
// 若某 key 无对应文件可留空字符串，该情绪下不播放
const trackMap = {
  calm: '/audio/calm.mp3',
  tense: '/audio/tense.mp3',
  mystery: '/audio/mystery.mp3',
  action: '/audio/action.mp3',
  sad: '/audio/sad.mp3',
}
watch(
  () => props.tag,
  (tag) => {
    const url = trackMap[tag] || trackMap.tense
    if (audioRef.value && url) {
      audioRef.value.src = url
      audioRef.value.load()
    }
  },
  { immediate: true }
)
function toggleMute() {
  muted.value = !muted.value
  if (audioRef.value) audioRef.value.muted = muted.value
}
</script>

<template>
  <div class="bgm-wrap">
    <audio
      ref="audioRef"
      loop
      autoplay
      :muted="muted"
      :src="(trackMap[tag] || trackMap.tense) || undefined"
    />
    <button type="button" class="bgm-toggle" @click="toggleMute">
      {{ muted ? '🔇 BGM 开' : '🔊 BGM 关' }}
    </button>
  </div>
</template>

<style scoped>
.bgm-wrap {
  position: fixed;
  bottom: 1rem;
  left: 1rem;
  z-index: 10;
}
.bgm-toggle {
  padding: 0.35rem 0.6rem;
  font-size: 0.75rem;
  background: var(--bg-panel);
  border: 1px solid var(--border);
  color: var(--text-dim);
  border-radius: 2px;
}
.bgm-toggle:hover {
  color: var(--text);
}
</style>
