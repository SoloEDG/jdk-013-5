import { reactive, ref } from "vue";
import type { Camera } from "../../../shared/types";
import { clamp, wrap } from "../../../shared/format";
export function createCamera() {
  const camera = reactive<Camera>({ yaw: 0, pitch: 0, fov: 70 });
  const animating = ref(false);
  let raf = 0;
  function restore(value: Camera) {
    camera.yaw = wrap(value.yaw);
    camera.pitch = clamp(value.pitch, -65, 65);
    camera.fov = clamp(value.fov, 35, 95);
  }
  function cancelPan() {
    if (raf) cancelAnimationFrame(raf);
    raf = 0;
    animating.value = false;
  }
  /**
   * 平滑转向目标方位。
   * reducedMotion 为真时退化为瞬时跳转——场景变化改由语音 / live region
   * 的文字播报传达，不依赖动态效果。
   * onDone 在转向结束（或瞬时跳转后）触发，用于把焦点移到目标上。
   */
  function focusOn(
    yaw: number,
    pitch: number,
    reducedMotion = false,
    onDone?: () => void,
  ) {
    cancelPan();
    const targetPitch = clamp(pitch, -65, 65);
    if (reducedMotion) {
      restore({ ...camera, yaw, pitch: targetPitch });
      onDone?.();
      return;
    }
    const startYaw = camera.yaw,
      startPitch = camera.pitch,
      deltaYaw = wrap(yaw - startYaw),
      deltaPitch = targetPitch - startPitch,
      duration = Math.min(850, 320 + Math.hypot(deltaYaw, deltaPitch) * 5),
      started = performance.now();
    animating.value = true;
    const step = (now: number) => {
      const t = Math.min(1, (now - started) / duration),
        ease = t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
      camera.yaw = wrap(startYaw + deltaYaw * ease);
      camera.pitch = clamp(startPitch + deltaPitch * ease, -65, 65);
      if (t < 1) raf = requestAnimationFrame(step);
      else {
        raf = 0;
        animating.value = false;
        onDone?.();
      }
    };
    raf = requestAnimationFrame(step);
  }
  return {
    camera,
    animating,
    restore,
    focusOn,
    move: (dx: number, dy: number) => {
      cancelPan();
      restore({
        ...camera,
        yaw: camera.yaw - dx * 0.13,
        pitch: camera.pitch + dy * 0.13,
      });
    },
    zoom: (delta: number) => {
      cancelPan();
      restore({ ...camera, fov: camera.fov + delta * 0.03 });
    },
    reset: () => {
      cancelPan();
      restore({ yaw: 0, pitch: 0, fov: 70 });
    },
  };
}
export type CameraController = ReturnType<typeof createCamera>;
