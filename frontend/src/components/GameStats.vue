<script setup>
defineProps({
  state: {
    type: Object,
    default: () => ({ health: 100, ammo: 30, items: [], relation_npc: {} }),
  },
})
</script>

<template>
  <div class="stats-panel">
    <h2 class="stats-title">状态</h2>
    <div class="stat-row">
      <span class="stat-label">生命</span>
      <div class="stat-bar health">
        <div class="stat-fill" :style="{ width: (state.health ?? 100) + '%' }" />
      </div>
      <span class="stat-value">{{ state.health ?? 100 }}%</span>
    </div>
    <div class="stat-row">
      <span class="stat-label">弹药</span>
      <span class="stat-value">{{ state.ammo ?? 0 }}</span>
    </div>
    <div v-if="state.items && state.items.length" class="items-row">
      <span class="stat-label">物品</span>
      <ul class="items-list">
        <li v-for="(item, i) in state.items" :key="i">{{ item }}</li>
      </ul>
    </div>
  </div>
</template>

<style scoped>
.stats-panel {
  padding: 1rem;
  background: var(--bg-panel);
  border: 1px solid var(--border);
  border-radius: 4px;
  font-family: var(--font-mono);
}
.stats-title {
  font-family: var(--font-display);
  font-size: 0.9rem;
  color: var(--accent);
  margin: 0 0 0.75rem 0;
  letter-spacing: 0.05em;
}
.stat-row {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  margin-bottom: 0.5rem;
}
.stat-label {
  width: 3rem;
  color: var(--text-dim);
  font-size: 0.85rem;
}
.stat-bar {
  flex: 1;
  height: 8px;
  background: var(--bg-dark);
  border-radius: 2px;
  overflow: hidden;
}
.stat-bar.health .stat-fill {
  background: var(--green);
  height: 100%;
  transition: width 0.3s;
}
.stat-value {
  min-width: 2.5rem;
  text-align: right;
  font-size: 0.85rem;
  color: var(--text);
}
.items-row {
  margin-top: 0.75rem;
  padding-top: 0.75rem;
  border-top: 1px solid var(--border);
}
.items-list {
  margin: 0.25rem 0 0 0;
  padding-left: 1.25rem;
  color: var(--text-dim);
  font-size: 0.85rem;
}
</style>
