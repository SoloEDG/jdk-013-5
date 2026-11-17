import type { Camera, Hotspot } from "../../../shared/types";
import { wrap } from "../../../shared/format";

/**
 * 热点相对当前视角的顺时针方位差（-180, 180]。
 * 正值表示目标在画面右侧，负值在左侧。
 */
export function targetBearing(hotspot: Hotspot, camera: Camera): number {
  return wrap(hotspot.yaw - camera.yaw);
}

/**
 * 全应用唯一的故事目标排序规则：
 * 1. 相对当前朝向的顺时针方位差（从正前方开始向右转）；
 * 2. 仰角（先平视后抬头/俯视）；
 * 3. 时间窗开始时间；
 * 4. id 兜底，保证稳定。
 *
 * 切章、回访、缩放以及键盘切换都走这一份排序，
 * 缩放只改 fov、不参与排序，因此顺序与索引保持不变。
 */
export function sortTargets(items: Hotspot[], camera: Camera): Hotspot[] {
  return [...items].sort((a, b) => {
    const bearingDiff = targetBearing(a, camera) - targetBearing(b, camera);
    if (bearingDiff !== 0) return bearingDiff;
    if (a.pitch !== b.pitch) return a.pitch - b.pitch;
    if (a.start !== b.start) return a.start - b.start;
    return a.id.localeCompare(b.id);
  });
}
