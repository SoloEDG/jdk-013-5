import { computed, ref } from "vue";
import { hotspots } from "../../../shared/content";
import { activeHotspots } from "../lib/visibility";
export function createDiscovery(
  position: () => { chapterId: string; time: number },
) {
  const enabled = ref(true),
    selected = ref<string | null>(null);
  const visible = computed(() => {
    const p = position();
    return activeHotspots(hotspots, p.chapterId, p.time);
  });
  const detail = computed(() => hotspots.find((h) => h.id === selected.value));
  /**
   * 已打开的详情若已离开当前时间窗：文字允许读完，
   * 但它不再属于可探索集合，热点按钮也不会再渲染为可点击对象。
   */
  const expired = computed(
    () => !!detail.value && !visible.value.some((h) => h.id === detail.value!.id),
  );
  return {
    enabled,
    selected,
    visible,
    detail,
    expired,
    select: (id: string) => {
      if (hotspots.some((h) => h.id === id)) selected.value = id;
    },
    close: () => (selected.value = null),
  };
}
