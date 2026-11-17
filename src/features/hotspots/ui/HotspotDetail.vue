<script setup lang="ts">
import { onMounted, ref } from "vue";
import { X, ArrowUpRight, Clock3 } from "lucide-vue-next";
import type { Hotspot } from "../../../shared/types";
import { kindLabel } from "../lib/visibility";
defineProps<{ hotspot: Hotspot; saved: boolean; expired: boolean }>();
defineEmits<{ close: []; interview: []; save: [] }>();
const closeBtn = ref<HTMLButtonElement>();
// 对话框打开即接管焦点，Esc 与关闭按钮都能直接退出。
onMounted(() => closeBtn.value?.focus());
</script>
<template>
  <aside
    class="detail-card"
    role="dialog"
    aria-modal="true"
    aria-label="热点详情"
    :aria-describedby="expired ? 'hotspot-expired-note' : undefined"
  >
    <button
      ref="closeBtn"
      class="close"
      aria-label="关闭热点 (Esc)"
      @click="$emit('close')"
    >
      <X /></button
    ><small>{{ kindLabel(hotspot.kind) }} / FIELD NOTES</small>
    <h2>{{ hotspot.title }}</h2>
    <p v-if="expired" id="hotspot-expired-note" class="expired-note" role="note">
      <Clock3 :size="13" />
      这个故事的时间窗已经结束：文字可以读完，但它已不是当前场景里可点击的对象。
    </p>
    <p>{{ hotspot.summary }}</p>
    <button
      v-if="hotspot.personId"
      class="primary"
      :disabled="expired"
      :aria-disabled="expired"
      @click="!expired && $emit('interview')"
    >
      进入人物访谈 <ArrowUpRight :size="16" /></button
    ><button
      class="text-button"
      :disabled="expired"
      :aria-disabled="expired"
      @click="!expired && $emit('save')"
    >
      {{ saved ? "已加入探索记录" : "＋ 收藏这个发现" }}
    </button>
  </aside>
</template>
