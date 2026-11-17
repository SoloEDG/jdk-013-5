<script setup lang="ts">
import type { Speech } from "../lib/speech";
defineProps<{ speech: Speech }>();
</script>
<template>
  <!--
    无焦点的播报区：文字始终先写入这里，语音再异步跟上。
    polite 不会打断当前读屏内容，元素本身不参与 Tab 顺序，因此永远不会抢走焦点。
  -->
  <div class="sr-only" role="status" aria-live="polite" aria-atomic="true">
    {{ speech.liveText.value }}
  </div>
</template>
