import type { Camera, Chapter, Hotspot } from "../../../shared/types";
import { timecode, wrap } from "../../../shared/format";
import { kindLabel } from "../../hotspots/lib/visibility";
import { targetBearing } from "./targetOrder";

/** 方位角转中文罗盘方位，键盘导航与口述场景共用同一套说法。 */
export function directionLabel(bearing: number): string {
  const b = wrap(bearing);
  if (Math.abs(b) <= 22.5) return "正前方";
  if (b > 22.5 && b <= 67.5) return "右前方";
  if (b > 67.5 && b <= 112.5) return "正右方";
  if (b > 112.5 && b <= 157.5) return "右后方";
  if (b >= -157.5 && b < -112.5) return "左后方";
  if (b >= -112.5 && b < -67.5) return "正左方";
  return "左前方";
}

/** 「人物 / 时间 / 方位」三段式提示，是键盘通道里每个热点的可听名称。 */
export function describeHotspot(hotspot: Hotspot, camera: Camera): string {
  const bearing = targetBearing(hotspot, camera);
  const vertical =
    hotspot.pitch - camera.pitch > 12
      ? "上方"
      : hotspot.pitch - camera.pitch < -12
        ? "下方"
        : "";
  const person = hotspot.personId ? "，人物热点" : "";
  return (
    `${hotspot.title}，${kindLabel(hotspot.kind)}${person}。` +
    `时间窗 ${timecode(hotspot.start)} 到 ${timecode(hotspot.end)}，` +
    `方位${vertical ? vertical + "、" : ""}${directionLabel(bearing)}，` +
    `相对视角约 ${Math.round(Math.abs(bearing))} 度。`
  );
}

/** 口述场景：章节信息 + 当前时间窗内全部目标，按统一排序依次说明。 */
export function describeScene(
  chapter: Chapter,
  time: number,
  items: Hotspot[],
  camera: Camera,
): string {
  const head = `当前章节，${chapter.title}，地点${chapter.location}，时间 ${timecode(time)}。`;
  if (!items.length) return `${head}当前时刻没有可探索的故事，可以调整播放进度或切换章节。`;
  const list = items
    .map((h, i) => `第 ${i + 1} 个，${describeHotspot(h, camera)}`)
    .join(" ");
  return `${head}共有 ${items.length} 个可探索故事。${list}`;
}
