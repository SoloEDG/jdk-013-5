<script setup lang="ts">
import { onMounted, onUnmounted, ref, watch } from "vue";
import {
  Waves,
  ArrowUpRight,
  MapPin,
  MousePointer2,
  Eye,
  Headphones,
  BookOpen,
  Compass,
  ChevronRight,
  X,
} from "lucide-vue-next";
import { PanoramaView } from "../features/panorama";
import { ChapterList, MediaPlayer, Transport } from "../features/chapters";
import { HotspotLayer, HotspotDetail } from "../features/hotspots";
import { InterviewPanel, PeopleList } from "../features/interviews";
import { JournalPanel } from "../features/journal";
import {
  KeyboardGuide,
  LiveRegion,
  NarrationPanel,
  channelLabels,
  describeScene,
} from "../features/a11y";
import { createWorkspace } from "./workspace";
const w = createWorkspace(),
  about = ref(false),
  stage = ref<HTMLElement>(),
  layer = ref<InstanceType<typeof HotspotLayer>>(),
  fullError = ref("");
async function fullscreen() {
  try {
    if (document.fullscreenElement) await document.exitFullscreen();
    else await stage.value?.requestFullscreen();
  } catch {
    fullError.value = "当前浏览器不支持全屏";
  }
}

/** 用户正在笔记等表单控件中输入：暂停一切自动语音，绝不抢走输入焦点。 */
function isTyping(): boolean {
  const el = document.activeElement;
  if (!el) return false;
  const tag = el.tagName;
  return (
    tag === "INPUT" ||
    tag === "TEXTAREA" ||
    tag === "SELECT" ||
    (el as HTMLElement).isContentEditable
  );
}
/** 自动播报的统一闸门：手记页、访谈中、输入中均不自动插话。 */
function autoSpeak(text: string, interrupt = false) {
  if (w.tab.value !== "story" || w.branch.personId.value || isTyping()) return;
  w.speech.speak(text, { interrupt });
}
function narrateScene() {
  if (w.branch.personId.value) return;
  w.narration.narrate(
    describeScene(
      w.playback.chapter.value,
      w.playback.state.time,
      w.orderedTargets.value,
      w.camera.camera,
    ),
  );
}
function closeDetail() {
  const id = w.keyboard.activeId.value;
  w.discovery.close();
  // 详情关闭后焦点回到对应的热点按钮；目标已离开时间窗时退回舞台容器。
  requestAnimationFrame(() => {
    const btn = id ? layer.value?.focusButton(id) : undefined;
    if (!btn) stage.value?.focus();
  });
}

/** 元素是否在原生处理方向键 / 回车（启用中的表单控件），禁用控件把按键让给叙事通道。 */
function isNativeKeyTarget(el: HTMLElement | null): boolean {
  if (!el) return false;
  const t = el.tagName;
  if (t === "INPUT" || t === "SELECT" || t === "TEXTAREA")
    return !(el as HTMLInputElement).disabled;
  return el.isContentEditable;
}
/** 全局键盘通道：表单控件内不劫持按键；访谈面板的 Esc 由其自身处理。 */
function onKeydown(e: KeyboardEvent) {
  if (isTyping()) return;
  const target = e.target as HTMLElement;
  const inStage = !!target.closest?.(".stage");
  const inButton = tag(target) === "BUTTON";
  switch (e.key) {
    case "Escape":
      if (w.discovery.detail.value) {
        e.preventDefault();
        closeDetail();
      } else if (about.value) {
        about.value = false;
      }
      return;
    case "n":
    case "N":
      if (w.tab.value === "story" && !w.branch.personId.value) {
        e.preventDefault();
        narrateScene();
      }
      return;
    case "m":
    case "M": {
      e.preventDefault();
      const ch = w.speech.cycleChannel();
      // 用 live region 提示切换结果，保证即使关掉语音也能听到当前模式。
      w.speech.speak(`播报通道已切换为${channelLabels[ch]}。`, {
        interrupt: true,
      });
      return;
    }
    case "ArrowUp":
    case "ArrowLeft":
    case "ArrowDown":
    case "ArrowRight":
      if (inStage && !w.branch.personId.value && !isNativeKeyTarget(target)) {
        e.preventDefault();
        if (e.key === "ArrowUp" || e.key === "ArrowLeft") w.keyboard.prev();
        else w.keyboard.next();
      }
      return;
    case "Enter":
      // 按钮 / 表单自身的原生行为不重复处理；焦点在画面容器上时由通道打开。
      if (
        inStage &&
        !inButton &&
        !w.branch.personId.value &&
        !isNativeKeyTarget(target) &&
        target.closest?.(".panorama")
      ) {
        e.preventDefault();
        w.keyboard.activate();
      }
      return;
  }
}
function tag(el: HTMLElement | null): string {
  return el?.tagName ?? "";
}
document.addEventListener("keydown", onKeydown);
onMounted(() => {
  w.viewHooks.focusHotspot = (id) => layer.value?.focusButton(id);
});
onUnmounted(() => {
  document.removeEventListener("keydown", onKeydown);
  w.dispose();
});

// 切章：播报新场景，帮助减少动态效果的用户理解场景变化。
watch(
  () => w.playback.state.chapterId,
  (id, old) => {
    if (!old || id === old) return;
    const c = w.playback.chapter.value;
    autoSpeak(`场景切换到《${c.title}》，地点 ${c.location}。`, true);
  },
);
// 可探索集合变化（时间窗出现 / 结束、切章、回访）：校正键盘活动项并轻声提示。
let lastVisibleKey = "";
watch(
  () => w.discovery.visible.value.map((h) => h.id).join(","),
  (key) => {
    const prev = new Set(lastVisibleKey.split(",").filter(Boolean));
    const next = new Set(key.split(",").filter(Boolean));
    w.keyboard.reconcile();
    for (const id of next) {
      if (!prev.has(id)) {
        const h = w.discovery.visible.value.find((item) => item.id === id);
        if (h) autoSpeak(`新的故事出现：${h.title}。`);
      }
    }
    lastVisibleKey = key;
  },
  { immediate: true },
);
// 已打开热点的时间窗结束：提示一次，卡片保留可读完，按钮不再可点。
watch(w.discovery.expired, (gone) => {
  if (gone && w.discovery.detail.value)
    autoSpeak(
      `《${w.discovery.detail.value.title}》的时间窗已经结束，文字仍可读完，但它已不是当前场景里可点击的对象。`,
      true,
    );
});
// 进入 / 离开访谈：说明焦点范围与返回方式（焦点移动由 InterviewPanel 完成）。
watch(w.branch.personId, (id, old) => {
  if (id && !old && w.branch.person.value)
    w.speech.speak(
      `进入人物访谈，${w.branch.person.value.name}。焦点已限制在访谈面板内，按 Esc 返回主线原位置。`,
      { interrupt: true },
    );
  else if (!id && old)
    w.speech.speak("已返回主线，焦点回到进入访谈前的位置。", { interrupt: true });
});
// 切到手记页时停止场景语音，避免在输入笔记时被讲述打断。
watch(w.tab, (tab) => {
  if (tab === "journal") w.speech.stop();
});
// 媒体（全景 / 影像）加载失败：文字与语音同时给出，键盘用户也能察觉。
watch(
  () => w.playback.state.error,
  (message) => {
    if (message) w.speech.speak(message, { interrupt: true });
  },
);
</script>
<template>
  <div class="site-shell">
    <LiveRegion :speech="w.speech" />
    <header class="site-header">
      <a class="brand" href="#" @click.prevent="w.tab.value = 'story'"
        ><span class="brand-icon"><Waves /></span
        ><b>岸线 <i>SHORELINE</i></b></a
      >
      <nav aria-label="主导航">
        <button
          :class="{ active: w.tab.value === 'story' }"
          @click="w.tab.value = 'story'"
        >
          互动纪录片</button
        ><button
          :class="{ active: w.tab.value === 'journal' }"
          @click="w.tab.value = 'journal'"
        >
          探索手记 <span>{{ w.journal.entries.value.length }}</span></button
        ><button @click="about = true">
          关于本片 <ArrowUpRight :size="13" />
        </button>
      </nav>
      <div class="edition">一座海港的记忆 <span>VOL. 001</span></div>
    </header>
    <main>
      <div class="intro">
        <div>
          <p class="eyebrow"><span /> AN IMMERSIVE DOCUMENTARY</p>
          <h1>潮汐之间<span>Between the Tides</span></h1>
          <p class="intro-copy">把目光交给远方，把时间留给故事。</p>
        </div>
        <div class="intro-meta">
          <span>中国 · 东南沿海</span>
          <p>3 个章节 <i>/</i> 360° 自由探索 <i>/</i> 3 位讲述者</p>
        </div>
      </div>
      <template v-if="w.tab.value === 'story'"
        ><div class="workspace">
          <section ref="stage" class="stage" tabindex="-1" aria-label="全景探索舞台，可用方向键在故事目标间移动">
            <PanoramaView
              :controller="w.camera"
              :source="w.playback.chapter.value.panorama"
              ><MediaPlayer
                :playback="w.playback"
                :branch="!!w.branch.personId.value"
              />
              <div class="stage-shade" />
              <div class="stage-top">
                <span class="scene-badge"><span /> 360° 全景现场</span
                ><span class="location"
                  ><MapPin :size="13" />
                  {{ w.playback.chapter.value.location }}</span
                >
              </div>
              <HotspotLayer
                ref="layer"
                :items="w.orderedTargets.value"
                :camera="w.camera.camera"
                :enabled="w.discovery.enabled.value && !w.branch.personId.value"
                :active-id="w.keyboard.activeId.value"
                @open="w.dispatch({ type: 'hotspot', id: $event })"
                @focus="w.keyboard.syncTo($event)"
              />
              <div class="scene-caption">
                <small
                  >CHAPTER 0{{
                    ["dawn", "craft", "night"].indexOf(
                      w.playback.state.chapterId,
                    ) + 1
                  }}</small
                >
                <h2>{{ w.playback.chapter.value.title }}</h2>
                <p>{{ w.playback.chapter.value.description }}</p>
              </div>
              <div class="drag-hint">
                <MousePointer2 :size="14" /> 按住拖动环顾，或用方向键在故事间移动
              </div></PanoramaView
            ><HotspotDetail
              v-if="w.discovery.detail.value && !w.branch.personId.value"
              :hotspot="w.discovery.detail.value"
              :saved="w.journal.has(w.discovery.detail.value.id)"
              :expired="w.discovery.expired.value"
              @close="closeDetail()"
              @save="w.save()"
              @interview="
                w.enterPerson(w.discovery.detail.value?.personId || '')
              "
            /><NarrationPanel
              :narration="w.narration"
              :speech="w.speech"
            /><InterviewPanel
              :branch="w.branch"
              @back="w.dispatch({ type: 'return' })"
            /><Transport
              :playback="w.playback"
              :disabled="!!w.branch.personId.value"
              @reset="w.camera.reset()"
              @fullscreen="fullscreen"
            />
            <p v-if="fullError" role="status">{{ fullError }}</p>
          </section>
          <aside class="sidebar">
            <div class="section-heading">
              <h2>故事章节</h2>
              <span>CHAPTERS</span>
            </div>
            <p class="sidebar-copy">循着潮水，走进他们的日常。</p>
            <ChapterList
              :active="w.playback.state.chapterId"
              @select="w.dispatch({ type: 'chapter', id: $event })"
            />
            <div class="chapter-foot">
              <Headphones :size="15" /><span>建议佩戴耳机，沉浸聆听</span>
            </div>
            <div class="explore-toggle">
              <span><Eye :size="17" /> 场景探索热点</span
              ><button
                role="switch"
                aria-label="显示热点"
                :aria-checked="w.discovery.enabled.value"
                :class="{ on: w.discovery.enabled.value }"
                @click="w.discovery.enabled.value = !w.discovery.enabled.value"
              >
                <i />
              </button>
            </div>
            <div class="discovery-count">
              <span>已收集的故事</span
              ><b
                >{{
                  w.journal.entries.value.length.toString().padStart(2, "0")
                }}
                <em>/ 06</em></b
              >
            </div>
            <KeyboardGuide
              :keyboard="w.keyboard"
              :narration="w.narration"
              :speech="w.speech"
              :visible="w.orderedTargets.value"
              :camera="w.camera.camera"
              :disabled="!!w.branch.personId.value"
              :on-narrate="narrateScene"
            />
            <button class="journal-link" @click="w.tab.value = 'journal'">
              <BookOpen :size="15" /> 打开我的探索手记
              <ChevronRight :size="15" />
            </button>
          </aside>
        </div>
        <section class="below">
          <div class="field-note">
            <small><Compass :size="14" /> EXPLORER'S NOTE</small>
            <h2>故事，不止一个方向。</h2>
            <p>
              转动视角或按方向键，寻找画面里的微光。<br />每个热点都通向一段值得停留的时光。
            </p>
          </div>
          <div class="voices">
            <div class="section-heading">
              <h2>听见他们的故事</h2>
              <span>THE VOICES</span>
            </div>
            <PeopleList @open="w.enterPerson($event)" />
          </div></section></template
      ><JournalPanel
        v-else
        :journal="w.journal"
        @revisit="w.dispatch({ type: 'revisit', entry: $event })"
      />
      <footer>
        <span>SHORELINE ORIGINALS <i>© 2026</i></span
        ><span>让每一段平凡的生活，被看见。 <Waves :size="18" /></span>
      </footer>
    </main>
    <div v-if="about" class="modal-backdrop" @click.self="about = false">
      <section
        class="about"
        role="dialog"
        aria-modal="true"
        aria-label="关于本片"
      >
        <button class="close" aria-label="关闭关于" @click="about = false">
          <X /></button
        ><small>ABOUT THE FILM</small>
        <h2>潮汐之间</h2>
        <p>
          以海港、木船与灯塔为线索的互动纪录片演示。全景为原创程序绘制示意场景，章节影像为本地生成的潮汐动画；人物与口述内容均为虚构，用于体验非线性叙事。
        </p>
        <p>
          拖动环顾四周，滚轮调整视角；也可以全程使用键盘：方向键在故事目标间移动并带动画面转向，Enter 打开，N 口述场景，M 开关语音，Esc 返回。探索记录仅保存在此浏览器中。
        </p>
        <button class="primary" @click="about = false">开始探索 ↗</button>
      </section>
    </div>
  </div>
</template>
