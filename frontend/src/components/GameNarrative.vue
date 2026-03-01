<script setup>
defineProps({
  narrative: { type: String, default: '' },
  options: { type: Array, default: () => [] },
  allowCustomInput: { type: Boolean, default: true },
  loading: { type: Boolean, default: false },
  error: { type: String, default: '' },
})
defineEmits(['choose'])
const customInput = defineModel('customInput', { type: String, default: '' })
</script>

<template>
  <div class="narrative-panel">
    <div class="narrative-box">
      <p class="narrative-text">{{ narrative || '…' }}</p>
      <p v-if="loading" class="loading">行动中…</p>
      <p v-if="error" class="error">{{ error }}</p>
    </div>
    <div class="choices">
      <button
        v-for="(opt, i) in options"
        :key="i"
        class="choice-btn"
        :disabled="loading"
        @click="$emit('choose', opt)"
      >
        {{ opt }}
      </button>
      <div v-if="allowCustomInput" class="custom-row">
        <input
          v-model="customInput"
          type="text"
          class="custom-input"
          placeholder="或输入你的行动…"
          :disabled="loading"
          @keydown.enter="$emit('choose', customInput ?? '')"
        />
        <button
          class="choice-btn submit-custom"
          :disabled="loading || !(customInput && customInput.trim())"
          @click="$emit('choose', customInput ?? '')"
        >
          执行
        </button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.narrative-panel {
  display: flex;
  flex-direction: column;
  gap: 1rem;
  flex: 1;
  min-height: 0;
}
.narrative-box {
  flex: 1;
  padding: 1rem 1.25rem;
  background: var(--bg-panel);
  border: 1px solid var(--border);
  border-radius: 4px;
  overflow-y: auto;
  min-height: 160px;
}
.narrative-text {
  margin: 0 0 0.5rem 0;
  white-space: pre-wrap;
  word-break: break-word;
  color: var(--text);
}
.loading {
  margin: 0.5rem 0 0 0;
  color: var(--text-dim);
  font-size: 0.9rem;
}
.error {
  margin: 0.5rem 0 0 0;
  color: var(--red);
  font-size: 0.9rem;
}
.choices {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}
.choice-btn {
  padding: 0.6rem 1rem;
  text-align: left;
  background: var(--bg-panel);
  border: 1px solid var(--border);
  color: var(--text);
  border-radius: 2px;
  transition: border-color 0.2s, color 0.2s;
}
.choice-btn:hover:not(:disabled) {
  border-color: var(--accent);
  color: var(--accent);
}
.choice-btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}
.custom-row {
  display: flex;
  gap: 0.5rem;
  align-items: center;
}
.custom-input {
  flex: 1;
  padding: 0.6rem 1rem;
  background: var(--bg-dark);
  border: 1px solid var(--border);
  color: var(--text);
  border-radius: 2px;
}
.custom-input:focus {
  outline: none;
  border-color: var(--accent);
}
.submit-custom {
  flex-shrink: 0;
}
</style>
