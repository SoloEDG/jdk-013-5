<script setup lang="ts">
import { Ear, X } from "lucide-vue-next";
import type { Narration } from "../model/narration";
import type { Speech } from "../lib/speech";

const props = defineProps<{ narration: Narration; speech: Speech }>();
function close() {
  props.speech.stop();
}
</script>
<template>
  <!--
    口述场景面板：文字与语音同源同句。
    不使用 aria-hidden：关闭按钮保持可聚焦；文字内容与 live region
    同句，由 speech 网关的去重冷却 + 通道模式避免重复念出。
  -->
  <section v-if="narration.lastText.value" class="narration-panel" aria-label="口述场景文字">
    <div class="np-head">
      <span><Ear :size="14" /> 口述场景 · 文字先行</span>
      <button aria-label="停止口述并关闭文字" @click="close()"><X :size="14" /></button>
    </div>
    <p>{{ narration.lastText.value }}</p>
    <small
      >语音加载较慢时可直接阅读以上文字。同时使用系统读屏时，可在左侧把播报通道切为「仅语音」，避免同一句重复朗读。</small
    >
  </section>
</template>
