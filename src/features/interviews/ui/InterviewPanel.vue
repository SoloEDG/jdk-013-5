<script setup lang="ts">
import { computed, ref, watch } from "vue";
import { ArrowLeft, ArrowRight, Quote } from "lucide-vue-next";
import { readingDuration } from "../lib/transcript";
import { useFocusTrap } from "../../a11y";
import type { Branch } from "../model/branch";
const props = defineProps<{ branch: Branch }>();
const emit = defineEmits<{ back: [] }>();
const panel = ref<HTMLElement>();
const open = computed(() => !!props.branch.personId.value);
const trap = useFocusTrap(panel, open);
watch(
  () => props.branch.personId.value,
  (id, old) => {
    if (id && !old) {
      trap.enter();
    } else if (!id && old) {
      trap.restore();
    }
  },
);
function onKeydown(e: KeyboardEvent) {
  if (e.key === "Escape") {
    e.stopPropagation();
    emit("back");
  }
}
</script>
<template>
  <section
    v-if="branch.person.value"
    ref="panel"
    class="interview"
    role="dialog"
    aria-modal="true"
    :aria-label="`人物访谈：${branch.person.value.name}`"
    tabindex="-1"
    @keydown="onKeydown"
  >
    <div class="interview-art">
      <div class="portrait">{{ branch.person.value.name.slice(0, 1) }}</div>
      <small>口述影像 · 田野记录</small>
    </div>
    <div class="interview-body">
      <button class="text-button" @click="$emit('back')">
        <ArrowLeft :size="16" /> 返回主线 (Esc)</button
      ><small
        >PEOPLE OF THE HARBOR · 预计
        {{ readingDuration(branch.person.value.paragraphs) }} 秒</small
      >
      <h2>{{ branch.person.value.name }}</h2>
      <p class="muted">{{ branch.person.value.role }}</p>
      <Quote class="quote-icon" />
      <blockquote>{{ branch.person.value.quote }}</blockquote>
      <p
        class="transcript"
        :key="branch.paragraph.value"
        role="status"
        aria-live="polite"
      >
        {{ branch.person.value.paragraphs[branch.paragraph.value] }}
      </p>
      <div class="interview-pages">
        <button
          :disabled="branch.paragraph.value === 0"
          @click="branch.paragraph.value--"
        >
          上一段</button
        ><span
          >第 {{ branch.paragraph.value + 1 }} 段，共
          {{ branch.person.value.paragraphs.length }} 段</span
        ><button
          v-if="
            branch.paragraph.value < branch.person.value.paragraphs.length - 1
          "
          @click="branch.paragraph.value++"
        >
          下一段 <ArrowRight :size="14" /></button
        ><button v-else @click="$emit('back')">结束访谈 ↗</button>
      </div>
    </div>
  </section>
</template>
