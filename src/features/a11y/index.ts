export {
  createSpeech,
  channelLabels,
  type Speech,
  type SpeechChannel,
} from "./lib/speech";
export {
  createReducedMotion,
  useReducedMotion,
  type MotionPreference,
} from "./lib/motion";
export { useFocusTrap } from "./lib/focusTrap";
export { sortTargets, targetBearing } from "./lib/targetOrder";
export {
  describeHotspot,
  describeScene,
  directionLabel,
} from "./lib/describe";
export { createNarration, type Narration } from "./model/narration";
export { createKeyboardNav, type KeyboardNav } from "./model/keyboardNav";
export { default as LiveRegion } from "./ui/LiveRegion.vue";
export { default as KeyboardGuide } from "./ui/KeyboardGuide.vue";
export { default as NarrationPanel } from "./ui/NarrationPanel.vue";
