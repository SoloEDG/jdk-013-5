import { computed, ref } from "vue";
import { createCamera } from "../features/panorama";
import { createPlayback } from "../features/chapters";
import { createDiscovery } from "../features/hotspots";
import { createBranch } from "../features/interviews";
import { createJournal } from "../features/journal";
import {
  createKeyboardNav,
  createNarration,
  createReducedMotion,
  createSpeech,
  sortTargets,
} from "../features/a11y";
import type { Command, Position } from "../shared/types";
export function createWorkspace() {
  const camera = createCamera(),
    playback = createPlayback(),
    discovery = createDiscovery(() => playback.state),
    branch = createBranch(),
    journal = createJournal(),
    tab = ref("story");
  // 无障碍叙事通道：语音网关、口述场景、减少动态效果偏好、键盘导航。
  const motion = createReducedMotion(),
    speech = createSpeech(),
    narration = createNarration(speech);
  /**
   * 视图层注入的焦点钩子：store 不直接触碰 DOM，
   * 转向结束后经由它把焦点交给对应热点按钮。
   */
  const viewHooks = { focusHotspot: (_id: string) => {} };
  /** 全应用唯一的目标排序：切章、回访、缩放、键盘切换共用。 */
  const orderedTargets = computed(() =>
    sortTargets(discovery.visible.value, camera.camera),
  );
  const keyboard = createKeyboardNav({
    camera,
    speech,
    reducedMotion: motion.reduced,
    visible: discovery.visible,
    openDetail: (id) => dispatch({ type: "hotspot", id }),
    onTargetChange: (id) => viewHooks.focusHotspot(id),
  });
  const position = (): Position => ({
    chapterId: playback.state.chapterId,
    time: playback.state.time,
    camera: { ...camera.camera },
    playing: playback.state.playing,
  });
  function enterPerson(id: string) {
    branch.enter(id, position());
    playback.state.playing = false;
    discovery.close();
  }
  function dispatch(command: Command) {
    switch (command.type) {
      case "chapter":
        if (branch.personId.value) return;
        playback.select(command.id);
        camera.reset();
        discovery.close();
        keyboard.reconcile();
        break;
      case "seek":
        playback.seek(command.time);
        break;
      case "hotspot":
        discovery.select(command.id);
        keyboard.syncTo(command.id);
        break;
      case "return": {
        const saved = branch.leave();
        if (saved) {
          playback.select(saved.chapterId);
          playback.seek(saved.time);
          camera.restore(saved.camera);
          playback.state.playing = saved.playing;
          keyboard.reconcile();
        }
        break;
      }
      case "revisit":
        branch.leave();
        playback.select(command.entry.chapterId);
        playback.seek(command.entry.time);
        camera.restore(command.entry.camera);
        discovery.select(command.entry.hotspotId);
        keyboard.syncTo(command.entry.hotspotId);
        tab.value = "story";
        break;
    }
  }
  function save() {
    const h = discovery.detail.value;
    if (h && !discovery.expired.value)
      journal.save(h, position());
  }
  function dispose() {
    motion.dispose();
    speech.stop();
  }
  return {
    camera,
    playback,
    discovery,
    branch,
    journal,
    tab,
    motion,
    speech,
    narration,
    keyboard,
    orderedTargets,
    viewHooks,
    position,
    enterPerson,
    dispatch,
    save,
    dispose,
  };
}
export type Workspace = ReturnType<typeof createWorkspace>;
