<script setup lang="ts">
import { Keyboard, AudioLines, Radio } from "lucide-vue-next";
import type { KeyboardNav } from "../model/keyboardNav";
import type { Narration } from "../model/narration";
import type { Speech, SpeechChannel } from "../lib/speech";
import { channelLabels } from "../lib/speech";
import type { Camera, Hotspot } from "../../../shared/types";

defineProps<{
  keyboard: KeyboardNav;
  narration: Narration;
  speech: Speech;
  visible: Hotspot[];
  camera: Camera;
  disabled: boolean;
  onNarrate: () => void;
}>();
const channelShort: Record<SpeechChannel, string> = {
  both: "双通道",
  voice: "仅语音",
  reader: "仅读屏文字",
};
</script>
<template>
  <div class="keyboard-guide" :class="{ disabled }" role="group" aria-label="键盘叙事导航">
    <span class="kg-title"><Keyboard :size="14" /> 键盘叙事通道</span>
    <button
      class="kg-btn"
      :disabled="disabled || !visible.length"
      aria-label="上一个故事目标"
      @click="keyboard.prev()"
    >
      ↑ 上一个
    </button>
    <button
      class="kg-btn"
      :disabled="disabled || !visible.length"
      aria-label="下一个故事目标"
      @click="keyboard.next()"
    >
      ↓ 下一个
    </button>
    <button
      class="kg-btn kg-primary"
      :disabled="disabled || !visible.length"
      aria-label="打开当前选中的故事"
      @click="keyboard.activate()"
    >
      打开 ↵
    </button>
    <button class="kg-btn" :disabled="disabled" aria-label="口述当前场景" @click="onNarrate()">
      <AudioLines :size="13" /> 口述场景 (N)
    </button>
    <button
      class="kg-btn"
      :aria-label="`播报通道：${channelLabels[speech.channel.value]}，点击切换（M 键）`"
      @click="speech.cycleChannel()"
    >
      <Radio :size="13" /> {{ channelShort[speech.channel.value] }} (M)
    </button>
    <p class="kg-hint">
      聚焦画面后：↑/↓ 或 ←/→ 切换目标并转向，Enter 打开，N 口述场景，M 切换播报通道，Esc 关闭。
      同时使用系统读屏时，请选择「仅语音」或「仅读屏文字」，避免同一句被念两遍。
    </p>
  </div>
</template>
