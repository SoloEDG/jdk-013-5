import { ref, type Ref } from "vue";
import type { CameraController } from "../../panorama/model/camera";
import type { Speech } from "../lib/speech";
import { sortTargets } from "../lib/targetOrder";
import { describeHotspot } from "../lib/describe";
import type { Hotspot } from "../../../shared/types";

interface KeyboardDeps {
  camera: CameraController;
  speech: Speech;
  reducedMotion: Ref<boolean>;
  /** 当前可探索故事（已按时间窗过滤），顺序由外部保证或在此统一排序。 */
  visible: Ref<Hotspot[]>;
  /** 打开热点详情（走与鼠标点击相同的 workspace 分发路径）。 */
  openDetail: (id: string) => void;
  /**
   * 活动目标变化（方向键切换 / 回车打开）后的焦点移动回调，
   * 由视图层在转向动画结束后把焦点交给目标按钮；store 本身不直接操作 DOM。
   */
  onTargetChange?: (id: string) => void;
}

/**
 * 键盘叙事导航的单一事实源。
 *
 * - 所有目标经 sortTargets 统一排序，切章 / 回访 / 缩放后顺序规则一致；
 * - 切换目标带动相机转向目标（减少动态效果时瞬时跳转）；
 * - 播报只走语音网关，不触碰 DOM 焦点，自动播放时不会抢走笔记输入焦点；
 * - activeId 同时作为热点按钮的 roving tabindex 依据。
 */
export function createKeyboardNav(deps: KeyboardDeps) {
  const { camera, speech, reducedMotion, visible, openDetail, onTargetChange } =
    deps;
  const activeId = ref<string | null>(null);

  function ordered(): Hotspot[] {
    return sortTargets(visible.value, camera.camera);
  }
  function currentIndex(list: Hotspot[]): number {
    const i = list.findIndex((h) => h.id === activeId.value);
    return i;
  }
  /** 可见集合变化（切章 / 时间窗结束 / 回访）后，把活动项校正到合法范围。 */
  function reconcile(announce = false) {
    const list = ordered();
    if (!list.length) {
      activeId.value = null;
      return;
    }
    const i = currentIndex(list);
    if (i === -1) {
      // 原活动项已不在集合（时间窗结束 / 切章 / 回访）：
      // 回落到统一排序的第一项，保证活动索引始终合法。
      activeId.value = list[0]!.id;
    }
    if (announce) announceActive(false);
  }
  function announceActive(interrupt: boolean) {
    const list = ordered();
    const h = list.find((item) => item.id === activeId.value);
    if (h) speech.speak(describeHotspot(h, camera.camera), { interrupt, live: true });
  }
  function move(step: number) {
    const list = ordered();
    if (!list.length) {
      speech.speak("当前时刻没有可探索的故事。", { interrupt: true });
      return;
    }
    const i = currentIndex(list);
    const next = list[(i + step + list.length) % list.length]!;
    activeId.value = next.id;
    camera.focusOn(next.yaw, next.pitch, reducedMotion.value, () =>
      onTargetChange?.(next.id),
    );
    announceActive(true);
  }
  function activate() {
    const list = ordered();
    const h = list.find((item) => item.id === activeId.value) ?? list[0];
    if (!h) {
      speech.speak("当前时刻没有可探索的故事。", { interrupt: true });
      return;
    }
    activeId.value = h.id;
    // 打开详情后焦点由详情对话框承接（其挂载时自动聚焦关闭按钮），
    // 这里不再把焦点移回背后的热点按钮。
    camera.focusOn(h.yaw, h.pitch, reducedMotion.value);
    openDetail(h.id);
    speech.speak(`已打开 ${h.title}。${h.summary}`, { interrupt: true });
  }
  /** 把活动项同步为某个具体热点（鼠标点击 / 回访时保持两条通道一致）。 */
  function syncTo(id: string) {
    if (visible.value.some((h) => h.id === id)) activeId.value = id;
  }
  return {
    activeId,
    ordered,
    reconcile,
    next: () => move(1),
    prev: () => move(-1),
    activate,
    syncTo,
  };
}
export type KeyboardNav = ReturnType<typeof createKeyboardNav>;
