<script setup lang="ts">
const props = defineProps<{ nameReady: boolean; pinReady: boolean; confirmationReady: boolean }>()
const steps = computed(() => [
  { label: 'Nome', ready: props.nameReady },
  { label: 'PIN', ready: props.pinReady },
  { label: 'Confirmação', ready: props.confirmationReady },
])
const completed = computed(() => steps.value.filter((step) => step.ready).length)
</script>
<template>
  <div class="setup-progress">
    <div class="setup-progress-heading">
      <span>{{ completed === 3 ? 'Tudo pronto para começar!' : 'Prepare seu palco' }}</span>
      <span>{{ completed }}/3</span>
    </div>
    <div
      role="progressbar"
      aria-label="Preparação da festa"
      :aria-valuenow="completed"
      :aria-valuemin="0"
      :aria-valuemax="3"
      class="setup-progress-track"
    >
      <span :style="{ transform: 'scaleX(' + completed / 3 + ')' }" />
    </div>
    <ol>
      <li v-for="(step, index) in steps" :key="step.label" :class="{ complete: step.ready }">
        <span class="setup-step-icon"
          ><AppIcon v-if="step.ready" name="check" /><span v-else>{{ index + 1 }}</span></span
        >
        {{ step.label }}
      </li>
    </ol>
  </div>
</template>
<style scoped>
.setup-progress {
  padding: 18px;
  border: 1px solid var(--line);
  border-radius: 16px;
  background: var(--bg);
}
.setup-progress-heading {
  display: flex;
  justify-content: space-between;
  gap: 12px;
  font-size: 12px;
  font-weight: 700;
}
.setup-progress-heading > span:last-child {
  color: var(--accent);
}
.setup-progress-track {
  height: 5px;
  margin: 12px 0 14px;
  border-radius: 9px;
  overflow: hidden;
  background: var(--line);
}
.setup-progress-track > span {
  display: block;
  width: 100%;
  height: 100%;
  transform-origin: left;
  background: var(--accent);
  transition: transform var(--motion-enter) var(--motion-ease);
}
ol {
  display: flex;
  justify-content: space-between;
  gap: 8px;
  list-style: none;
  padding: 0;
  margin: 0;
}
li {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 11px;
  color: var(--muted);
}
.setup-step-icon {
  width: 20px;
  height: 20px;
  display: inline-grid;
  place-items: center;
  border-radius: 50%;
  border: 1px solid var(--line);
  font-size: 10px;
}
.setup-step-icon .app-icon {
  width: 13px;
  height: 13px;
}
.complete .setup-step-icon {
  background: var(--accent);
  border-color: var(--accent);
  color: var(--on-accent);
}
.complete {
  color: var(--text);
}
</style>
