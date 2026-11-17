import { onBeforeUnmount, onMounted, type Ref } from "vue";

/**
 * 模态焦点陷阱：进入时记住触发元素并把 Tab 循环限制在容器内，
 * 退出时焦点回到原位置——访谈面板因此拥有清楚的焦点范围与返回位置。
 */
export function useFocusTrap(
  container: Ref<HTMLElement | undefined>,
  active: Ref<boolean>,
) {
  let lastFocused: HTMLElement | null = null;
  function focusable(): HTMLElement[] {
    const host = container.value;
    if (!host) return [];
    return Array.from(
      host.querySelectorAll<HTMLElement>(
        'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])',
      ),
    ).filter((el) => el.offsetParent !== null || el === document.activeElement);
  }
  function onKeydown(e: KeyboardEvent) {
    if (e.key !== "Tab" || !active.value) return;
    const items = focusable();
    if (!items.length) {
      e.preventDefault();
      return;
    }
    const first = items[0]!;
    const last = items[items.length - 1]!;
    const current = document.activeElement as HTMLElement | null;
    if (e.shiftKey && (current === first || !container.value?.contains(current))) {
      e.preventDefault();
      last.focus();
    } else if (!e.shiftKey && current === last) {
      e.preventDefault();
      first.focus();
    }
  }
  function focusFirst() {
    const items = focusable();
    (items[0] ?? container.value)?.focus();
  }
  onMounted(() => {
    // active 初始可能已为真（组件挂载即模态）。
    if (active.value) {
      lastFocused = document.activeElement as HTMLElement | null;
      requestAnimationFrame(focusFirst);
    }
    document.addEventListener("keydown", onKeydown, true);
  });
  onBeforeUnmount(() => document.removeEventListener("keydown", onKeydown, true));
  return {
    enter() {
      lastFocused = document.activeElement as HTMLElement | null;
      requestAnimationFrame(focusFirst);
    },
    restore() {
      lastFocused?.focus?.();
      lastFocused = null;
    },
  };
}
