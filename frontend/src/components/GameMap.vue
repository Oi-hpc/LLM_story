<script setup>
defineProps({
  areaId: { type: String, default: 'crash_site' },
  visibleAreas: { type: Array, default: () => ['crash_site'] },
  chapterIndex: { type: Number, default: 0 },
})
const areas = [
  { id: 'crash_site', label: '翻车点' },
  { id: 'forest_path', label: '林间小路' },
  { id: 'village_gate', label: '村口' },
  { id: 'village_square', label: '村中广场' },
  { id: 'village_house', label: '民宅' },
  { id: 'castle_approach', label: '城堡外围' },
  { id: 'dungeon', label: '地牢' },
  { id: 'factory_entrance', label: '工厂入口' },
]
</script>

<template>
  <div class="map-panel">
    <h2 class="map-title">区域</h2>
    <div class="map-placeholder">
      <div
        v-for="a in areas"
        :key="a.id"
        class="map-node"
        :class="{
          current: a.id === areaId,
          visible: visibleAreas && visibleAreas.includes(a.id),
          dim: visibleAreas && visibleAreas.length && !visibleAreas.includes(a.id),
        }"
      >
        {{ a.label }}
      </div>
    </div>
    <p class="map-hint">第 {{ chapterIndex + 1 }} 章 · 当前: {{ areaId }}</p>
  </div>
</template>

<style scoped>
.map-panel {
  padding: 1rem;
  background: var(--bg-panel);
  border: 1px solid var(--border);
  border-radius: 4px;
}
.map-title {
  font-family: var(--font-display);
  font-size: 0.9rem;
  color: var(--accent);
  margin: 0 0 0.75rem 0;
  letter-spacing: 0.05em;
}
.map-placeholder {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 0.5rem;
  min-height: 120px;
}
.map-node {
  padding: 0.5rem 0.75rem;
  background: var(--bg-dark);
  border: 1px solid var(--border);
  border-radius: 2px;
  font-size: 0.8rem;
  color: var(--text-dim);
  text-align: center;
}
.map-node.visible {
  border-color: var(--border);
  color: var(--text);
}
.map-node.current {
  border-color: var(--accent);
  color: var(--accent);
  background: var(--accent-dim);
}
.map-node.dim {
  opacity: 0.4;
}
.map-hint {
  margin: 0.75rem 0 0 0;
  font-size: 0.75rem;
  color: var(--text-dim);
}
</style>
