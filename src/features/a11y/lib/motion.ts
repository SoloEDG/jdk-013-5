import { onUnmounted, ref, type Ref } from "vue";

export interface MotionPreference {
  reduced: Ref<boolean>;
  dispose: () => void;
}

/**
 * 跟踪系统的「减少动态效果」偏好（不依赖组件生命周期，可在 store 中使用）。
 * 偏好开启时，相机转向等动画退化为瞬时跳转，场景变化改由文字播报传达。
 */
export function createReducedMotion(): MotionPreference {
  const reduced = ref(false);
  let mql: MediaQueryList | undefined;
  const update = () => {
    if (mql) reduced.value = mql.matches;
  };
  if (typeof window !== "undefined" && window.matchMedia) {
    mql = window.matchMedia("(prefers-reduced-motion: reduce)");
    reduced.value = mql.matches;
    mql.addEventListener("change", update);
  }
  return {
    reduced,
    dispose: () => mql?.removeEventListener("change", update),
  };
}

/** 组件内使用的组合式封装，卸载时自动移除监听。 */
export function useReducedMotion() {
  const motion = createReducedMotion();
  onUnmounted(() => motion.dispose());
  return motion.reduced;
}
