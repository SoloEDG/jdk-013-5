<script setup lang="ts">
import { onMounted, onUnmounted, ref } from "vue";
import { UserRound, Files, AudioLines } from "lucide-vue-next";
import type { Hotspot, Camera } from "../../../shared/types";
import { project } from "../../panorama";
import { describeHotspot } from "../../a11y";
const props = defineProps<{
  items: Hotspot[];
  camera: Camera;
  enabled: boolean;
  activeId: string | null;
}>();
const emit = defineEmits<{ open: [id: string]; focus: [id: string] }>();
const host = ref<HTMLElement>(),
  size = ref({ width: 1000, height: 520 }),
  buttons = ref<Record<string, HTMLButtonElement | null>>({});
let observer: ResizeObserver;
function position(h: Hotspot) {
  return project(
    h.yaw,
    h.pitch,
    props.camera,
    size.value.width,
    size.value.height,
  );
}
/**
 * 供转向动画结束、详情关闭等显式时机调用，把焦点还给对应按钮。
 * 键盘切换目标时由键盘通道显式触发，避免在用户输入笔记时意外抢走焦点。
 */
function focusButton(id: string): boolean {
  const btn = buttons.value[id];
  if (btn && btn.offsetParent !== null) {
    btn.focus();
    return true;
  }
  return false;
}
defineExpose({ focusButton });
onMounted(() => {
  observer = new ResizeObserver(([e]) => {
    if (e)
      size.value = { width: e.contentRect.width, height: e.contentRect.height };
  });
  observer.observe(host.value!);
});
onUnmounted(() => observer?.disconnect());
</script>
<template>
  <div ref="host" class="hotspot-layer">
    <template v-if="enabled"
      ><button
        v-for="h in items"
        :key="h.id"
        :ref="(el) => (buttons[h.id] = (el as HTMLButtonElement | null) ?? null)"
        v-show="position(h).visible"
        class="hotspot"
        :class="{ active: h.id === activeId }"
        :style="{ left: position(h).x + 'px', top: position(h).y + 'px' }"
        :tabindex="h.id === activeId ? 0 : -1"
        :aria-label="describeHotspot(h, camera)"
        :aria-current="h.id === activeId ? 'true' : undefined"
        @pointerdown.stop
        @focus="emit('focus', h.id)"
        @click.stop="emit('open', h.id)"
      >
        <span
          ><UserRound v-if="h.kind === 'person'" /><Files
            v-else-if="h.kind === 'archive'" /><AudioLines v-else /></span
        ><strong>{{ h.title }}</strong
        ><small>{{ h.id === activeId ? "当前选中 · 点击探索 ↗" : "点击探索 ↗" }}</small>
      </button></template
    >
  </div>
</template>
