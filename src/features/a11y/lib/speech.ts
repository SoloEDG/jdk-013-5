import { computed, ref } from "vue";

export interface SpeakOptions {
  /** 打断当前播报；默认排队在当前语句之后。 */
  interrupt?: boolean;
  /** 同时写入礼貌 live region，让读屏软件也能收到。默认 true。 */
  live?: boolean;
}

/**
 * 播报通道：
 * - both：语音合成 + live region（默认，适合不使用系统读屏的观众）；
 * - voice：仅语音，live region 保持安静，避免与系统读屏重复；
 * - reader：仅 live region 文字，交给系统读屏，不启动语音合成。
 * 同时开启系统读屏与语音引擎的观众切到 reader / voice，同一句话就不会被念两遍。
 */
export type SpeechChannel = "both" | "voice" | "reader";
export const channelLabels: Record<SpeechChannel, string> = {
  both: "双通道（语音与文字）",
  voice: "仅语音",
  reader: "仅读屏文字",
};

/**
 * 统一语音 / 播报网关。
 *
 * 设计要点：
 * - 文字始终先行：所有播报先写入 live region，再尝试语音合成，
 *   语音引擎加载慢或不可用时，文字通道已经可用；
 * - 双通道去重：同一段文本在冷却窗口内只播一次，
 *   避免 watcher 重复触发或语音与读屏重复念出同一句话；
 * - 不抢焦点：本模块只操作 SpeechSynthesis 与无焦点的 live region，
 *   自动播放触发的讲述绝不会把焦点从正在输入的笔记上移走。
 */
export function createSpeech() {
  const supported =
    typeof window !== "undefined" && "speechSynthesis" in window;
  const voicesReady = ref(false);
  const channel = ref<SpeechChannel>("both");
  const liveText = ref("");
  const queue: string[] = [];
  let speaking = false;
  const recent = new Map<string, number>();
  const dedupMs = 4000;

  function refreshVoices() {
    if (!supported) return;
    const list = window.speechSynthesis.getVoices();
    voicesReady.value = list.length > 0;
  }
  if (supported) {
    refreshVoices();
    window.speechSynthesis.addEventListener?.("voiceschanged", refreshVoices);
  }

  function pickVoice(): SpeechSynthesisVoice | undefined {
    const voices = window.speechSynthesis.getVoices();
    return (
      voices.find((v) => /zh(-|_)?(CN|Hans)/i.test(v.lang)) ||
      voices.find((v) => v.lang.toLowerCase().startsWith("zh")) ||
      voices[0]
    );
  }

  function drain() {
    if (!supported || channel.value === "reader" || speaking) return;
    const text = queue.shift();
    if (!text) return;
    const utter = new SpeechSynthesisUtterance(text);
    const voice = pickVoice();
    if (voice) {
      utter.voice = voice;
      utter.lang = voice.lang;
    } else {
      utter.lang = "zh-CN";
    }
    utter.rate = 1;
    speaking = true;
    utter.onend = utter.onerror = () => {
      speaking = false;
      drain();
    };
    // 个别浏览器在长任务后会挂起队列，用 resume 兜底。
    window.speechSynthesis.resume();
    window.speechSynthesis.speak(utter);
  }

  function fresh(text: string): boolean {
    const now = Date.now();
    for (const [key, at] of recent) if (now - at > dedupMs) recent.delete(key);
    if (recent.has(text)) return false;
    recent.set(text, now);
    return true;
  }

  function speak(text: string, options: SpeakOptions = {}) {
    const { interrupt = false, live = true } = options;
    if (!text) return;
    const useLive = live && channel.value !== "voice";
    const useVoice = supported && channel.value !== "reader";
    if (useLive) liveText.value = text;
    if (!useVoice || !fresh(text)) return;
    if (interrupt) {
      queue.length = 0;
      window.speechSynthesis.cancel();
      speaking = false;
    }
    queue.push(text);
    drain();
  }

  function stop() {
    queue.length = 0;
    if (supported) window.speechSynthesis.cancel();
    speaking = false;
  }

  const order: SpeechChannel[] = ["both", "voice", "reader"];
  function cycleChannel(): SpeechChannel {
    channel.value = order[(order.indexOf(channel.value) + 1) % order.length]!;
    if (channel.value === "reader") stop();
    return channel.value;
  }

  const active = computed(() => speaking || queue.length > 0);
  /** reader 模式下文字仍然可用，因此没有「静音」概念，只有通道选择。 */
  const muted = computed(() => channel.value === "reader");

  return {
    supported,
    voicesReady,
    channel,
    muted,
    liveText,
    active,
    speak,
    stop,
    cycleChannel,
  };
}

export type Speech = ReturnType<typeof createSpeech>;
