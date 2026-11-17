import { ref } from "vue";
import type { Speech } from "../lib/speech";

/**
 * 口述场景通道：保留最近一段口述文本。
 * 文字在调用 narrate 的同一刻即可阅读，语音随后异步加载播报，
 * 因此语音引擎慢时，文字始终先可用。
 */
export function createNarration(speech: Speech) {
  const lastText = ref("");
  const lastAt = ref(0);
  function narrate(text: string) {
    if (!text) return;
    lastText.value = text;
    lastAt.value = Date.now();
    speech.speak(text, { interrupt: true, live: true });
  }
  return { lastText, lastAt, narrate };
}
export type Narration = ReturnType<typeof createNarration>;
