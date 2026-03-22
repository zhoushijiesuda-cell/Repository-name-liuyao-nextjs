"use client";

import { useMemo, useState } from "react";
import {
  AlertTriangle,
  BookOpen,
  CalendarClock,
  ChevronRight,
  Clock3,
  Download,
  Printer,
  RefreshCw,
  ScrollText,
  ShieldAlert,
  Target,
  TrendingUp,
} from "lucide-react";

const lineMap = {
  6: { yin: true, moving: true, symbol: "━ ━", changed: 7 },
  7: { yin: false, moving: false, symbol: "━━━", changed: 7 },
  8: { yin: true, moving: false, symbol: "━ ━", changed: 8 },
  9: { yin: false, moving: true, symbol: "━━━", changed: 8 },
} as const;

type LineMeta = {
  line: number;
  raw: number;
  symbol: string;
  moving: boolean;
  relation: string;
  element: string;
  branch: string;
  god: string;
  empty: boolean;
  isWorld: boolean;
  isResponse: boolean;
  hiddenGod: string;
  strength?: { score: number; level: string };
};

const trigramMap: Record<string, string> = {
  "111": "乾",
  "110": "兑",
  "101": "离",
  "100": "震",
  "011": "巽",
  "010": "坎",
  "001": "艮",
  "000": "坤",
};

const trigramElements: Record<string, string> = {
  乾: "金",
  兑: "金",
  离: "火",
  震: "木",
  巽: "木",
  坎: "水",
  艮: "土",
  坤: "土",
};

const sixGods = ["青龙", "朱雀", "勾陈", "腾蛇", "白虎", "玄武"];
const sixRelations = ["兄弟", "子孙", "妻财", "官鬼", "父母"] as const;
const fiveElements = ["木", "火", "土", "金", "水"] as const;
const heavenlyStems = ["甲", "乙", "丙", "丁", "戊", "己", "庚", "辛", "壬", "癸"];
const earthlyBranches = ["子", "丑", "寅", "卯", "辰", "巳", "午", "未", "申", "酉", "戌", "亥"];

const branchElements: Record<string, string> = {
  子: "水",
  丑: "土",
  寅: "木",
  卯: "木",
  辰: "土",
  巳: "火",
  午: "火",
  未: "土",
  申: "金",
  酉: "金",
  戌: "土",
  亥: "水",
};

const branchClash: Record<string, string> = {
  子: "午",
  丑: "未",
  寅: "申",
  卯: "酉",
  辰: "戌",
  巳: "亥",
  午: "子",
  未: "丑",
  申: "寅",
  酉: "卯",
  戌: "辰",
  亥: "巳",
};

const branchCombine: Record<string, string> = {
  子: "丑",
  丑: "子",
  寅: "亥",
  卯: "戌",
  辰: "酉",
  巳: "申",
  午: "未",
  未: "午",
  申: "巳",
  酉: "辰",
  戌: "卯",
  亥: "寅",
};

const generates: Record<string, string> = { 木: "火", 火: "土", 土: "金", 金: "水", 水: "木" };
const controls: Record<string, string> = { 木: "土", 土: "水", 水: "火", 火: "金", 金: "木" };

const seasonSupport: Record<string, string[]> = {
  木: ["寅", "卯"],
  火: ["巳", "午"],
  土: ["辰", "戌", "丑", "未"],
  金: ["申", "酉"],
  水: ["亥", "子"],
};

const categoryConfig: Record<string, { useGod: string[]; focus: string; taboo?: string }> = {
  求财: { useGod: ["妻财", "子孙"], focus: "看财爻与世爻是否承接", taboo: "兄弟过旺、财弱、动而受克" },
  感情: { useGod: ["官鬼", "妻财"], focus: "看世应关系与对方星", taboo: "世应冲克、用神空破" },
  考试: { useGod: ["父母", "官鬼"], focus: "看父母爻、官鬼爻、世爻临场状态", taboo: "父母弱、世弱、临冲破" },
  工作: { useGod: ["官鬼", "父母"], focus: "看职位、流程、沟通承接", taboo: "官鬼空破、应不接世" },
  健康: { useGod: ["官鬼", "子孙"], focus: "仅作传统文化体验参考", taboo: "官鬼重叠、子孙无力" },
  综合: { useGod: ["世爻"], focus: "先看世应和整体卦势" },
};

function detectCategory(text: string) {
  const t = text.trim();
  if (!t) return "综合";
  if (/(财|收入|钱|投资|副业|奖金|生意|求财|财运)/.test(t)) return "求财";
  if (/(感情|恋爱|婚|复合|对象|暧昧)/.test(t)) return "感情";
  if (/(考试|学习|成绩|论文|面试|申请)/.test(t)) return "考试";
  if (/(工作|offer|升职|职场|项目|领导)/.test(t)) return "工作";
  if (/(健康|身体|失眠|情绪|恢复)/.test(t)) return "健康";
  return "综合";
}

function hashSeed(input: string) {
  let h = 1779033703 ^ input.length;
  for (let i = 0; i < input.length; i++) {
    h = Math.imul(h ^ input.charCodeAt(i), 3432918353);
    h = (h << 13) | (h >>> 19);
  }
  return (h >>> 0) || 1;
}

function mulberry32(a: number) {
  return function () {
    let t = (a += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function seededLine(rand: () => number): 6 | 7 | 8 | 9 {
  const tosses = Array.from({ length: 3 }, () => (rand() < 0.5 ? 2 : 3));
  return tosses.reduce((a, b) => a + b, 0) as 6 | 7 | 8 | 9;
}

function relation(self: string, other: string) {
  const a = fiveElements.indexOf(self as any);
  const b = fiveElements.indexOf(other as any);
  return sixRelations[(b - a + 5) % 5];
}

function generatedBy(el: string) {
  return Object.keys(generates).find((k) => generates[k] === el) || "";
}

function controlledBy(el: string) {
  return Object.keys(controls).find((k) => controls[k] === el) || "";
}

function elementInteract(a: string, b: string) {
  if (a === b) return "同类";
  if (generates[a] === b) return "生";
  if (generates[b] === a) return "受生";
  if (controls[a] === b) return "克";
  if (controls[b] === a) return "受克";
  return "平";
}

function getBinary(lines: number[]) {
  return lines.map((n) => (lineMap[n as keyof typeof lineMap].yin ? 0 : 1));
}

function getTrigram(lines: number[]) {
  const bits = getBinary(lines);
  return {
    lower: trigramMap[bits.slice(0, 3).join("")],
    upper: trigramMap[bits.slice(3, 6).join("")],
  };
}

function getChangedLines(lines: number[]) {
  return lines.map((n) => lineMap[n as keyof typeof lineMap].changed);
}

function timeCast(question: string, dt: Date) {
  const seed = hashSeed(`${question}|${dt.getFullYear()}-${dt.getMonth() + 1}-${dt.getDate()} ${dt.getHours()}:${dt.getMinutes()}`);
  const rand = mulberry32(seed);
  return Array.from({ length: 6 }, () => seededLine(rand));
}

function pickMonthBranch(dt: Date) {
  return earthlyBranches[dt.getMonth() % 12];
}

function pickDayBranch(dt: Date) {
  const dayNum = Math.floor(dt.getTime() / 86400000);
  return earthlyBranches[((dayNum % 12) + 12) % 12];
}

function pickDayStem(dt: Date) {
  const dayNum = Math.floor(dt.getTime() / 86400000);
  return heavenlyStems[((dayNum % 10) + 10) % 10];
}

function getEmptyBranches(dayStem: string) {
  const idx = heavenlyStems.indexOf(dayStem);
  return [earthlyBranches[(idx + 10) % 12], earthlyBranches[(idx + 11) % 12]];
}

function getSixGodOrder(dayStem: string) {
  const startIndex = heavenlyStems.indexOf(dayStem) % 6;
  return Array.from({ length: 6 }, (_, i) => sixGods[(startIndex + i) % 6]);
}

function formatShortDate(date: Date | null) {
  if (!date) return "";
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function formatTime(dt: Date) {
  return `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, "0")}-${String(dt.getDate()).padStart(2, "0")} ${String(dt.getHours()).padStart(2, "0")}:${String(dt.getMinutes()).padStart(2, "0")}`;
}

function buildLines(lines: number[], dt: Date): LineMeta[] {
  const trigram = getTrigram(lines);
  const palace = trigramElements[trigram.lower];
  const branchSeed = trigram.lower.charCodeAt(0) + trigram.upper.charCodeAt(0);
  const world = (branchSeed % 6) + 1;
  let response = world + 3;
  if (response > 6) response -= 6;
  const empties = getEmptyBranches(pickDayStem(dt));
  const gods = getSixGodOrder(pickDayStem(dt));
  return lines.map((line, i) => {
    const element = trigramElements[i < 3 ? trigram.lower : trigram.upper];
    const branch = earthlyBranches[(branchSeed + i * 2) % 12];
    return {
      line: i + 1,
      raw: line,
      symbol: lineMap[line as keyof typeof lineMap].symbol,
      moving: lineMap[line as keyof typeof lineMap].moving,
      relation: relation(palace, element),
      element,
      branch,
      god: gods[i],
      empty: empties.includes(branch),
      isWorld: i + 1 === world,
      isResponse: i + 1 === response,
      hiddenGod: i % 2 === 0 ? relation(palace, generatedBy(element) || element) : "—",
    };
  });
}

function scoreLineStrength(item: LineMeta, monthBranch: string, dayBranch: string) {
  let score = 50;
  const monthElement = branchElements[monthBranch];
  const dayElement = branchElements[dayBranch];
  if (seasonSupport[item.element]?.includes(monthBranch)) score += 22;
  if (monthElement === item.element) score += 10;
  if (monthElement === generatedBy(item.element)) score += 12;
  if (monthElement === controlledBy(item.element)) score -= 16;
  if (dayElement === item.element) score += 8;
  if (dayElement === generatedBy(item.element)) score += 6;
  if (dayElement === controlledBy(item.element)) score -= 8;
  if (item.moving) score += 10;
  if (item.isWorld) score += 4;
  if (item.isResponse) score += 2;
  if (item.empty) score -= 10;
  if (branchClash[item.branch] === monthBranch || branchClash[item.branch] === dayBranch) score -= 8;
  if (branchCombine[item.branch] === monthBranch || branchCombine[item.branch] === dayBranch) score += 6;
  let level = "平";
  if (score >= 82) level = "旺";
  else if (score >= 66) level = "相";
  else if (score >= 46) level = "平";
  else if (score >= 30) level = "休";
  else level = "囚";
  return { score, level };
}

function analyzeInteractions(items: (LineMeta & { strength: { score: number; level: string } })[], monthBranch: string, dayBranch: string) {
  const notes: string[] = [];
  items.forEach((item) => {
    if (branchClash[item.branch] === dayBranch) notes.push(`${item.line}爻逢日冲`);
    if (branchClash[item.branch] === monthBranch) notes.push(`${item.line}爻逢月冲`);
    if (branchCombine[item.branch] === dayBranch || branchCombine[item.branch] === monthBranch) notes.push(`${item.line}爻逢合`);
  });
  return Array.from(new Set(notes));
}

function analyzeSixChongLiuHe(origin: { upper: string; lower: string }) {
  const pair = `${origin.upper}${origin.lower}`;
  const sixChongPairs = ["乾坤", "坎离", "震巽", "艮兑"];
  const liuhePairs = ["乾巽", "坤震", "坎兑", "离艮"];
  if (sixChongPairs.includes(pair) || sixChongPairs.includes(`${origin.lower}${origin.upper}`)) return { type: "六冲", text: "六冲格局，进程偏反复。" };
  if (liuhePairs.includes(pair) || liuhePairs.includes(`${origin.lower}${origin.upper}`)) return { type: "六合", text: "六合格局，进程偏牵连与拖延。" };
  return { type: "普通", text: "本局需回到世应与用神。" };
}

function findUseGod(category: string, lineItems: (LineMeta & { strength: { score: number; level: string } })[]) {
  const cfg = categoryConfig[category] || categoryConfig["综合"];
  const targets = cfg.useGod;
  const filtered = lineItems.filter((x) => targets.includes(x.relation));
  const sorted = [...filtered].sort((a, b) => b.strength.score - a.strength.score);
  return { targets, all: filtered, best: sorted[0] || null };
}

function getNearestBranchDay(targetBranch: string, baseDate: Date) {
  const start = new Date(baseDate);
  start.setHours(0, 0, 0, 0);
  const baseDayNum = Math.floor(start.getTime() / 86400000);
  for (let i = 0; i < 14; i++) {
    const branch = earthlyBranches[((baseDayNum + i) % 12 + 12) % 12];
    if (branch === targetBranch) {
      const d = new Date(start);
      d.setDate(start.getDate() + i);
      return d;
    }
  }
  return null;
}

function buildTimingPrediction(useGod: any, movingLines: any[], baseDate: Date) {
  if (!useGod?.best) {
    let rangeText = "大致在 1~2 周内会有变化";
    if (movingLines.length === 0) rangeText = "短期变化不明显，可能在 2~4 周内才有动静";
    if (movingLines.length >= 3) rangeText = "变化较多，可能先乱后定，在 1~3 周内逐渐显现";
    return {
      shortText: "应期不集中，但已有动象",
      exactDateText: "无明确对应日，建议观察近期变化节点。",
      rangeText,
      stage1: movingLines.length >= 2 ? "3~7天内先见动静" : "7天左右先见端倪",
      stage2: "7~14天为关键变化段",
    };
  }
  const targetBranch = useGod.best.branch;
  const nearestDay = getNearestBranchDay(targetBranch, baseDate);
  const level = useGod.best.strength.level;
  let rangeText = "大致在一月内慢慢显形";
  let stage1 = "先缓后动";
  let stage2 = "一月内定局";
  if (["旺", "相"].includes(level)) {
    rangeText = movingLines.length === 0 ? "大致在 7~14 天内见眉目" : "大致在 3~7 天内先见动静";
    stage1 = movingLines.length === 0 ? "3~7天先见端倪" : "3天左右先见第一波变化";
    stage2 = "7~14天进入关键判断期";
  } else if (level === "平") {
    rangeText = movingLines.length === 0 ? "大致在 2~4 周内见分晓" : "大致在 1~2 周内会先有变化";
    stage1 = "5~10天开始转动";
    stage2 = "2周左右更能看清走向";
  } else {
    rangeText = movingLines.length === 0 ? "大致在 1~2 个月内缓慢推进" : "大致先拖一拖，再在 2~4 周内见转机";
    stage1 = "短期不快，先看是否松动";
    stage2 = "2~4周后更可能出现转机";
  }
  const exactDateText = nearestDay ? `${targetBranch}日是最近的重点应期，约在 ${formatShortDate(nearestDay)} 前后。` : `${targetBranch}日是重点应期。`;
  return {
    shortText: nearestDay ? `重点看 ${targetBranch}日（约 ${formatShortDate(nearestDay)}）前后` : `重点看 ${targetBranch}日前后`,
    exactDateText,
    rangeText,
    stage1,
    stage2,
  };
}

function buildDecision(score: number, hasChong: boolean, hasHe: boolean, useGodWeak: boolean, worldWeak: boolean) {
  if (score >= 72) return "可推进";
  if (hasChong || useGodWeak || worldWeak) return "暂缓";
  if (hasHe) return "观望";
  return "谨慎推进";
}

function buildTriggerText(hasChong: boolean, hasHe: boolean, movingCount: number) {
  if (hasChong) return "真正的变化点在外部节奏被打破之后。";
  if (hasHe) return "当前更像被拖住，等牵制条件松开才会往前走。";
  if (movingCount > 0) return "局内已有动象，后续变化会逐步放大。";
  return "当前更适合等待条件变化，不宜硬推。";
}

function buildSummary(params: {
  verdict: string;
  category: string;
  useGod: any;
  world: any;
  movingLines: any[];
  interactions: string[];
  timingPrediction: any;
}) {
  const { verdict, category, useGod, world, movingLines, interactions, timingPrediction } = params;
  const useGodWeak = !!useGod?.best && ["休", "囚"].includes(useGod.best.strength.level);
  const useGodStrong = !!useGod?.best && ["旺", "相"].includes(useGod.best.strength.level);
  const worldWeak = !!world && ["休", "囚"].includes(world.strength.level);
  const worldStrong = !!world && ["旺", "相"].includes(world.strength.level);
  const hasChong = interactions.some((x: string) => x.includes("冲"));
  const hasHe = interactions.some((x: string) => x.includes("合"));
  let opening = "当前条件不算稳定，事情能动，但不适合急推。";
  if (verdict === "偏顺" && useGodStrong && worldStrong) opening = "当前整体条件偏正向，可以主动推进。";
  else if (useGodStrong && worldWeak) opening = "机会在，但你这边承接力偏弱，节奏要放稳。";
  else if (useGodWeak && worldWeak) opening = "当前不在顺势位，硬做容易费力。";
  else if (verdict === "不利") opening = "当前不宜强推，越急越容易出偏差。";
  let processText = "这件事更像先出现变化，再慢慢定下来。";
  if (movingLines.length >= 3) processText = "局内动象较多，过程不会一条线走完，中途容易反复和调整。";
  else if (movingLines.length === 0) processText = "短期内更适合观察，不像立刻成局的走势。";
  if (hasChong) processText += " 盘面有冲，推进点往往出现在节奏变化的时候。";
  if (hasHe) processText += " 盘面有合，现在多少带点被拖住的感觉。";
  const ending = `时间上看，${timingPrediction.rangeText}${timingPrediction.exactDateText}`;
  const tail: Record<string, string> = {
    求财: "当前宜先稳住，再看机会，不宜贪快。",
    感情: "先看对方反应，再决定是否继续推进。",
    考试: "先稳节奏，把最薄弱的部分补起来。",
    工作: "讲策略比硬顶更重要。",
    健康: "以休息与检查为先。",
    综合: "当前更适合顺势处理。",
  };
  return `${opening}${processText}${ending}${tail[category] || "当前更适合顺势处理。"}`;
}

function buildReading(question: string, dt: Date, lines: number[]) {
  const category = detectCategory(question);
  const monthBranch = pickMonthBranch(dt);
  const dayBranch = pickDayBranch(dt);
  const dayStem = pickDayStem(dt);
  const origin = getTrigram(lines);
  const changed = getTrigram(getChangedLines(lines));
  const baseItems = buildLines(lines, dt);
  const items = baseItems.map((x) => ({ ...x, strength: scoreLineStrength(x, monthBranch, dayBranch) }));
  const changedBase = buildLines(getChangedLines(lines), dt);
  const changedItems = changedBase.map((x, idx) => ({
    ...x,
    strength: scoreLineStrength(x, monthBranch, dayBranch),
    transform: elementInteract(x.element, baseItems[idx].element).includes("生") ? "回头生" : elementInteract(x.element, baseItems[idx].element).includes("克") ? "回头克" : "回头平",
    advance: "平",
    fushen: baseItems[idx].hiddenGod,
    feishen: baseItems[idx].relation,
  }));
  const world = items.find((x) => x.isWorld);
  const response = items.find((x) => x.isResponse);
  const movingLines = items.filter((x) => x.moving);
  const useGod = findUseGod(category, items);
  const interactions = analyzeInteractions(items, monthBranch, dayBranch);
  const six = analyzeSixChongLiuHe(origin);
  const worldToResponse = world && response ? elementInteract(world.element, response.element) : "平";
  let score = 50;
  const engineReasons: string[] = [];
  if (useGod.best) {
    score += (useGod.best.strength.score - 50) * 0.6;
    engineReasons.push(`用神最强点在第${useGod.best.line}爻，旺衰${useGod.best.strength.level}`);
    if (useGod.best.moving) engineReasons.push("用神发动");
    if (useGod.best.empty) engineReasons.push("用神旬空");
  } else {
    engineReasons.push("用神不集中");
    score -= 6;
  }
  if (world) {
    score += (world.strength.score - 50) * 0.25;
    engineReasons.push(`世爻${world.strength.level}`);
  }
  if (response) {
    score += (response.strength.score - 50) * 0.15;
    engineReasons.push(`应爻${response.strength.level}`);
  }
  if (worldToResponse === "生" || worldToResponse === "受生") {
    score += 6;
    engineReasons.push("世应有生助");
  }
  if (worldToResponse === "克" || worldToResponse === "受克") {
    score -= 6;
    engineReasons.push("世应有克制");
  }
  if (interactions.some((x) => x.includes("月冲"))) {
    score -= 8;
    engineReasons.push("见月冲");
  }
  if (interactions.some((x) => x.includes("逢合"))) {
    score += 4;
    engineReasons.push("有合象");
  }
  if (six.type === "六冲") {
    score -= 4;
    engineReasons.push("六冲格局");
  }
  if (six.type === "六合") {
    score += 4;
    engineReasons.push("六合格局");
  }
  const finalScore = Math.max(0, Math.min(100, Math.round(score)));
  let verdict = "中性";
  if (finalScore >= 72) verdict = "偏顺";
  else if (finalScore >= 56) verdict = "中性";
  else if (finalScore >= 42) verdict = "偏弱";
  else verdict = "不利";
  const timingPrediction = buildTimingPrediction(useGod, movingLines, dt);
  const useGodWeak = !!useGod?.best && ["休", "囚"].includes(useGod.best.strength.level);
  const worldWeak = !!world && ["休", "囚"].includes(world.strength.level);
  const hasChong = interactions.some((x) => x.includes("冲"));
  const hasHe = interactions.some((x) => x.includes("合"));
  const actionSuggestion = buildDecision(finalScore, hasChong, hasHe, useGodWeak, worldWeak);
  const triggerText = buildTriggerText(hasChong, hasHe, movingLines.length);
  const conciseSummary = buildSummary({ verdict, category, useGod, world, movingLines, interactions, timingPrediction });
  return {
    category,
    timing: formatTime(dt),
    monthBranch,
    dayBranch,
    dayStem,
    origin,
    changed,
    items,
    changedItems,
    finalScore,
    verdict,
    engineReasons,
    summary: conciseSummary,
    useGodText: useGod.best ? `重点参考位在第 ${useGod.best.line} 爻 ${useGod.best.relation}，旺衰 ${useGod.best.strength.level}。` : `当前用神不集中，需结合整体结构判断。`,
    worldText: world && response ? `世爻在第 ${world.line} 爻，旺衰 ${world.strength.level}；应爻在第 ${response.line} 爻，旺衰 ${response.strength.level}。世应关系为“${worldToResponse}”。` : "世应信息不足，当前以整体卦势判断。",
    movingText: movingLines.length ? `动爻出现在 ${movingLines.map((x) => `${x.line}爻`).join("、")}。` : "本局静象偏重，短期内更适合观察。",
    monthDayText: `月建主大环境，日辰主眼前触发。${six.text}`,
    changedText: interactions.length ? `盘面信号：${interactions.join("、")}。` : "当前未见明显合冲主导，仍以旺衰和世应为主。",
    advancedAdvice: [
      `判断主轴：${categoryConfig[category]?.focus || "先看世应用神。"}`,
      `风险点：${categoryConfig[category]?.taboo || "避免单点判断过重。"}`,
      "先看用神，再看世爻，再看应爻与动变。",
    ],
    timingPrediction,
    actionSuggestion,
    triggerText,
  };
}

function exportText(reading: any, question: string) {
  const text = [
    `问题：${question || "综合占问"}`,
    `起卦时间：${reading.timing}`,
    `类别：${reading.category}`,
    `结论：${reading.verdict}`,
    `建议：${reading.actionSuggestion}`,
    `概览：${reading.summary}`,
    `应期：${reading.timingPrediction.stage1}；${reading.timingPrediction.stage2}`,
    `触发点：${reading.triggerText}`,
  ].join("\n");
  const blob = new Blob([text], { type: "text/plain;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `六爻分析结果_${reading.timing.replace(/[: ]/g, "-")}.txt`;
  a.click();
  URL.revokeObjectURL(url);
}

function printHtml(reading: any, question: string) {
  const html = `<html><head><meta charset="utf-8" /><title>六爻分析单</title><style>body{font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;padding:24px;color:#111827}.box{border:1px solid #d1d5db;border-radius:14px;padding:14px;margin-bottom:12px}</style></head><body><h1>六爻分析单</h1><div class="box"><strong>问题</strong><div>${question || "综合占问"}</div></div><div class="box"><strong>结论概览</strong><div>${reading.summary}</div></div><div class="box"><strong>建议</strong><div>${reading.actionSuggestion}</div></div><div class="box"><strong>应期</strong><div>${reading.timingPrediction.stage1}；${reading.timingPrediction.stage2}</div></div></body></html>`;
  const w = window.open("", "_blank");
  if (!w) return;
  w.document.open();
  w.document.write(html);
  w.document.close();
  w.focus();
  setTimeout(() => w.print(), 300);
}

function Metric({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div style={{ padding: 16, borderRadius: 18, background: "#f8fafc", border: "1px solid #e5edf5" }}>
      <div style={{ fontSize: 13, color: "#6b7280" }}>{label}</div>
      <div style={{ marginTop: 8, fontSize: 22, fontWeight: 800, letterSpacing: "-0.02em" }}>{value}</div>
      {hint ? <div style={{ marginTop: 8, fontSize: 12, color: "#6b7280", lineHeight: 1.6 }}>{hint}</div> : null}
    </div>
  );
}

function CardTitle({ icon, title, sub }: { icon: React.ReactNode; title: string; sub?: string }) {
  return (
    <div style={{ display: "flex", alignItems: "flex-start", gap: 12 }}>
      <div style={{ width: 40, height: 40, borderRadius: 12, background: "#f4f7fb", border: "1px solid #e5edf5", display: "flex", alignItems: "center", justifyContent: "center" }}>{icon}</div>
      <div>
        <div style={{ fontSize: 20, fontWeight: 700, letterSpacing: "-0.02em" }}>{title}</div>
        {sub ? <div style={{ fontSize: 13, color: "#6b7280", marginTop: 3 }}>{sub}</div> : null}
      </div>
    </div>
  );
}

function LineRow({ item, changed }: { item: any; changed: any }) {
  return (
    <div style={{ border: "1px solid #e7edf5", borderRadius: 18, padding: 14, marginBottom: 12, background: "#ffffff" }}>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(5, minmax(0, 1fr))", gap: 8, fontSize: 14 }}>
        <div><b>爻位</b><div style={{ marginTop: 4 }}>第{item.line}爻</div></div>
        <div><b>结构</b><div style={{ marginTop: 4 }}>{item.symbol}</div></div>
        <div><b>关系</b><div style={{ marginTop: 4 }}>{item.relation} / {item.element}</div></div>
        <div><b>地支</b><div style={{ marginTop: 4 }}>{item.branch} / {item.god}</div></div>
        <div><b>变化</b><div style={{ marginTop: 4 }}>{item.moving ? "动" : "静"} → {changed.relation}{changed.element}</div></div>
      </div>
      <div style={{ marginTop: 10, fontSize: 12, color: "#6b7280" }}>旺衰：{item.strength.level}｜标记：{item.isWorld ? "世 " : ""}{item.isResponse ? "应 " : ""}{item.empty ? "空" : ""}｜伏神：{changed.fushen}｜飞神：{changed.feishen}</div>
    </div>
  );
}

function statusTone(action: string) {
  if (action === "可推进") return { bg: "#ecfdf3", bd: "#bbf7d0", tx: "#166534" };
  if (action === "观望") return { bg: "#fff7ed", bd: "#fed7aa", tx: "#9a3412" };
  return { bg: "#fef2f2", bd: "#fecaca", tx: "#991b1b" };
}

function runSelfChecks() {
  console.assert(detectCategory("我这次考试能不能过") === "考试", "分类：考试失败");
  console.assert(detectCategory("我最近财运如何") === "求财", "分类：求财失败");
  console.assert(getChangedLines([6, 7, 8, 9, 7, 8]).length === 6, "变爻长度失败");
  console.assert(formatShortDate(new Date("2026-03-25T00:00:00")) === "2026-03-25", "日期格式失败");
}
runSelfChecks();

export default function Page() {
  const [question, setQuestion] = useState("");
  const [customTime, setCustomTime] = useState("");
  const [lines, setLines] = useState<number[]>([]);
  const [castTime, setCastTime] = useState<Date | null>(null);
  const [tab, setTab] = useState("overview");

  const reading = useMemo(() => {
    if (!castTime || lines.length !== 6) return null;
    return buildReading(question || "综合占问", castTime, lines);
  }, [question, castTime, lines]);

  const castNow = () => {
    const now = customTime ? new Date(customTime) : new Date();
    if (Number.isNaN(now.getTime())) return;
    setCastTime(now);
    setLines(timeCast(question || "综合占问", now));
  };

  const reset = () => {
    setQuestion("");
    setCustomTime("");
    setLines([]);
    setCastTime(null);
  };

  const tone = reading ? statusTone(reading.actionSuggestion) : null;

  return (
    <div style={{ minHeight: "100vh", background: "linear-gradient(180deg, #f6f8fb 0%, #eef3f8 100%)", padding: 24 }}>
      <div style={{ maxWidth: 1240, margin: "0 auto" }}>
        <div style={{ background: "rgba(255,255,255,0.92)", border: "1px solid #e4ebf3", borderRadius: 28, padding: 24, boxShadow: "0 10px 30px rgba(15,23,42,0.04)" }}>
          <div style={{ display: "flex", justifyContent: "space-between", gap: 16, flexWrap: "wrap", alignItems: "flex-start" }}>
            <div>
              <div style={{ display: "inline-flex", alignItems: "center", gap: 8, padding: "8px 12px", borderRadius: 999, background: "#f7fafc", border: "1px solid #e6edf5", fontSize: 12, color: "#64748b" }}>
                <BookOpen size={14} />
                决策分析界面
              </div>
              <div style={{ marginTop: 14, fontSize: 38, fontWeight: 900, letterSpacing: "-0.04em", color: "#0f172a" }}>六爻</div>
              <div style={{ marginTop: 10, fontSize: 15, color: "#6b7280", maxWidth: 780, lineHeight: 1.8 }}>
               
              </div>
            </div>
            <div style={{ padding: "10px 14px", borderRadius: 16, background: "#0f172a", color: "#ffffff", fontSize: 12, fontWeight: 700 }}>
              Advanced UI
            </div>
          </div>
        </div>

        <div style={{ height: 18 }} />

        <div style={{ display: "grid", gridTemplateColumns: "1.3fr 0.9fr", gap: 18 }}>
          <div style={{ background: "#ffffff", border: "1px solid #e4ebf3", borderRadius: 28, padding: 22, boxShadow: "0 10px 26px rgba(15,23,42,0.03)" }}>
            <CardTitle icon={<ScrollText size={18} color="#0f172a" />} title="问题输入" sub="输入问题后，系统会按当前时间或自定义时间起局。" />
            <div style={{ marginTop: 18 }}>
              <div style={{ fontSize: 13, color: "#6b7280", marginBottom: 8 }}>问题内容</div>
              <textarea
                value={question}
                onChange={(e) => setQuestion(e.target.value)}
                placeholder="例如：接下来三个月工作推进是否顺利？"
                style={{ width: "100%", minHeight: 132, border: "1px solid #dde7f0", borderRadius: 20, padding: 16, resize: "vertical", background: "#fbfdff", fontSize: 16, outline: "none" }}
              />
            </div>
          </div>

          <div style={{ background: "#ffffff", border: "1px solid #e4ebf3", borderRadius: 28, padding: 22, boxShadow: "0 10px 26px rgba(15,23,42,0.03)" }}>
            <CardTitle icon={<Clock3 size={18} color="#0f172a" />} title="参数设置" sub="可以直接使用当前时间，也可以自定义时间。" />
            <div style={{ marginTop: 18 }}>
              <div style={{ fontSize: 13, color: "#6b7280", marginBottom: 8 }}>起局时间</div>
              <input
                type="datetime-local"
                value={customTime}
                onChange={(e) => setCustomTime(e.target.value)}
                style={{ width: "100%", border: "1px solid #dde7f0", borderRadius: 18, padding: 14, background: "#fbfdff", fontSize: 15, outline: "none" }}
              />
            </div>
            <div style={{ marginTop: 18, display: "grid", gap: 10 }}>
              <button onClick={castNow} style={{ padding: "14px 16px", borderRadius: 18, border: "1px solid #0f172a", background: "#0f172a", color: "#fff", fontWeight: 700, cursor: "pointer" }}>
                <Clock3 size={16} style={{ marginRight: 8, verticalAlign: "middle" }} />
                开始分析
              </button>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10 }}>
                <button onClick={reset} style={{ padding: "12px 14px", borderRadius: 16, border: "1px solid #dde7f0", background: "#fff", cursor: "pointer" }}>
                  <RefreshCw size={15} style={{ marginRight: 6, verticalAlign: "middle" }} />
                  重置
                </button>
                <button onClick={() => reading && exportText(reading, question)} disabled={!reading} style={{ padding: "12px 14px", borderRadius: 16, border: "1px solid #dde7f0", background: reading ? "#fff" : "#f8fafc", color: reading ? "#111827" : "#9ca3af", cursor: reading ? "pointer" : "not-allowed" }}>
                  <Download size={15} style={{ marginRight: 6, verticalAlign: "middle" }} />
                  导出
                </button>
                <button onClick={() => reading && printHtml(reading, question)} disabled={!reading} style={{ padding: "12px 14px", borderRadius: 16, border: "1px solid #dde7f0", background: reading ? "#fff" : "#f8fafc", color: reading ? "#111827" : "#9ca3af", cursor: reading ? "pointer" : "not-allowed" }}>
                  <Printer size={15} style={{ marginRight: 6, verticalAlign: "middle" }} />
                  打印
                </button>
              </div>
            </div>
          </div>
        </div>

        {reading && tone && (
          <>
            <div style={{ height: 18 }} />
            <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
              {[
                ["overview", "概览"],
                ["timing", "节奏"],
                ["details", "排盘"],
                ["analysis", "分析"],
              ].map(([key, label]) => (
                <button
                  key={key}
                  onClick={() => setTab(key)}
                  style={{
                    padding: "11px 16px",
                    borderRadius: 999,
                    border: tab === key ? "1px solid #0f172a" : "1px solid #dbe4ee",
                    background: tab === key ? "#0f172a" : "#ffffff",
                    color: tab === key ? "#ffffff" : "#111827",
                    cursor: "pointer",
                    fontWeight: 600,
                  }}
                >
                  {label}
                </button>
              ))}
            </div>

            <div style={{ height: 18 }} />

            {tab === "overview" && (
              <div style={{ display: "grid", gridTemplateColumns: "1.65fr 1fr", gap: 18 }}>
                <div style={{ background: "#ffffff", border: "1px solid #e4ebf3", borderRadius: 28, padding: 24, boxShadow: "0 10px 26px rgba(15,23,42,0.03)" }}>
                  <CardTitle icon={<Target size={18} color="#0f172a" />} title="结论概览" sub="先看结论，再决定要不要继续下钻。" />
                  <div style={{ marginTop: 18, padding: 18, borderRadius: 24, border: `1px solid ${tone.bd}`, background: tone.bg }}>
                    <div style={{ fontSize: 13, color: tone.tx, opacity: 0.85 }}>建议动作</div>
                    <div style={{ marginTop: 8, fontSize: 32, fontWeight: 900, letterSpacing: "-0.03em", color: tone.tx }}>{reading.actionSuggestion}</div>
                  </div>
                  <div style={{ marginTop: 18, padding: 20, borderRadius: 22, background: "#fbfdff", border: "1px solid #e6edf5" }}>
                    <div style={{ fontSize: 14, color: "#6b7280", marginBottom: 10 }}>综合判断</div>
                    <div style={{ fontSize: 16, lineHeight: 1.95, color: "#0f172a" }}>{reading.summary}</div>
                  </div>
                  <div style={{ marginTop: 16, display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
                    <div style={{ padding: 18, borderRadius: 20, background: "#fafcff", border: "1px solid #e5edf5" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 14, fontWeight: 700 }}>
                        <ShieldAlert size={16} />
                        风险提示
                      </div>
                      <div style={{ marginTop: 10, fontSize: 14, color: "#475569", lineHeight: 1.8 }}>{reading.triggerText}</div>
                    </div>
                    <div style={{ padding: 18, borderRadius: 20, background: "#fafcff", border: "1px solid #e5edf5" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 14, fontWeight: 700 }}>
                        <ChevronRight size={16} />
                        进程判断
                      </div>
                      <div style={{ marginTop: 10, fontSize: 14, color: "#475569", lineHeight: 1.8 }}>{reading.movingText}</div>
                    </div>
                  </div>
                </div>

                <div style={{ display: "grid", gap: 16 }}>
                  <div style={{ background: "#ffffff", border: "1px solid #e4ebf3", borderRadius: 28, padding: 20, boxShadow: "0 10px 26px rgba(15,23,42,0.03)" }}>
                    <CardTitle icon={<TrendingUp size={18} color="#0f172a" />} title="核心指标" />
                    <div style={{ marginTop: 16, display: "grid", gap: 12 }}>
                      <Metric label="当前结论" value={reading.verdict} />
                      <Metric label="建议动作" value={reading.actionSuggestion} />
                      <Metric label="评分" value={String(reading.finalScore)} />
                      <Metric label="卦象" value={`${reading.origin.upper}${reading.origin.lower} → ${reading.changed.upper}${reading.changed.lower}`} />
                    </div>
                  </div>

                  <div style={{ background: "#ffffff", border: "1px solid #e4ebf3", borderRadius: 28, padding: 20, boxShadow: "0 10px 26px rgba(15,23,42,0.03)" }}>
                    <CardTitle icon={<AlertTriangle size={18} color="#0f172a" />} title="关键节点" />
                    <div style={{ marginTop: 16, display: "grid", gap: 10 }}>
                      <Metric label="第一次变化" value={reading.timingPrediction.stage1} />
                      <Metric label="关键阶段" value={reading.timingPrediction.stage2} />
                      <Metric label="重点日期" value={reading.timingPrediction.exactDateText} />
                    </div>
                  </div>
                </div>
              </div>
            )}

            {tab === "timing" && (
              <div style={{ display: "grid", gridTemplateColumns: "1.1fr 1fr", gap: 18 }}>
                <div style={{ background: "#ffffff", border: "1px solid #e4ebf3", borderRadius: 28, padding: 24 }}>
                  <CardTitle icon={<CalendarClock size={18} color="#0f172a" />} title="节奏判断" sub="只展示时间和推进节奏。" />
                  <div style={{ marginTop: 18, display: "grid", gap: 14 }}>
                    <div style={{ padding: 20, borderRadius: 22, background: "#f8fafc", border: "1px solid #e5edf5" }}>
                      <div style={{ fontSize: 13, color: "#6b7280" }}>阶段一</div>
                      <div style={{ marginTop: 8, fontSize: 24, fontWeight: 800 }}>{reading.timingPrediction.stage1}</div>
                    </div>
                    <div style={{ padding: 20, borderRadius: 22, background: "#f8fafc", border: "1px solid #e5edf5" }}>
                      <div style={{ fontSize: 13, color: "#6b7280" }}>阶段二</div>
                      <div style={{ marginTop: 8, fontSize: 24, fontWeight: 800 }}>{reading.timingPrediction.stage2}</div>
                    </div>
                    <div style={{ padding: 20, borderRadius: 22, background: "#f8fafc", border: "1px solid #e5edf5" }}>
                      <div style={{ fontSize: 13, color: "#6b7280" }}>重点日期</div>
                      <div style={{ marginTop: 8, fontSize: 18, fontWeight: 700 }}>{reading.timingPrediction.exactDateText}</div>
                    </div>
                  </div>
                </div>

                <div style={{ background: "#ffffff", border: "1px solid #e4ebf3", borderRadius: 28, padding: 24 }}>
                  <CardTitle icon={<ShieldAlert size={18} color="#0f172a" />} title="触发条件" sub="什么时候更容易出现真正变化。" />
                  <div style={{ marginTop: 18, padding: 18, borderRadius: 22, border: "1px solid #e5edf5", background: "#fbfdff", fontSize: 16, lineHeight: 1.9 }}>
                    {reading.triggerText}
                  </div>
                  <div style={{ marginTop: 16, padding: 18, borderRadius: 22, border: "1px solid #e5edf5", background: "#fbfdff" }}>
                    <div style={{ fontSize: 14, color: "#6b7280" }}>环境说明</div>
                    <div style={{ marginTop: 8, fontSize: 15, lineHeight: 1.8 }}>{reading.monthDayText}</div>
                  </div>
                </div>
              </div>
            )}

            {tab === "details" && (
              <div style={{ background: "#ffffff", border: "1px solid #e4ebf3", borderRadius: 28, padding: 24 }}>
                <CardTitle icon={<ScrollText size={18} color="#0f172a" />} title="排盘明细" sub="保留专业信息，但降低视觉噪音。" />
                <div style={{ marginTop: 18 }}>
                  {reading.items.map((item: any, idx: number) => (
                    <LineRow key={item.line} item={item} changed={reading.changedItems[idx]} />
                  ))}
                </div>
              </div>
            )}

            {tab === "analysis" && (
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 18 }}>
                <div style={{ background: "#ffffff", border: "1px solid #e4ebf3", borderRadius: 28, padding: 24 }}>
                  <CardTitle icon={<ShieldAlert size={18} color="#0f172a" />} title="分析摘要" />
                  <div style={{ marginTop: 18, display: "grid", gap: 14 }}>
                    <div style={{ padding: 18, borderRadius: 20, background: "#f8fafc", border: "1px solid #e5edf5", lineHeight: 1.8 }}>{reading.useGodText}</div>
                    <div style={{ padding: 18, borderRadius: 20, background: "#f8fafc", border: "1px solid #e5edf5", lineHeight: 1.8 }}>{reading.worldText}</div>
                    <div style={{ padding: 18, borderRadius: 20, background: "#f8fafc", border: "1px solid #e5edf5", lineHeight: 1.8 }}>{reading.changedText}</div>
                  </div>
                </div>

                <div style={{ background: "#ffffff", border: "1px solid #e4ebf3", borderRadius: 28, padding: 24 }}>
                  <CardTitle icon={<Target size={18} color="#0f172a" />} title="判断依据" />
                  <div style={{ marginTop: 18, display: "grid", gap: 14 }}>
                    {reading.advancedAdvice.map((item: string, idx: number) => (
                      <div key={idx} style={{ padding: 18, borderRadius: 20, background: "#f8fafc", border: "1px solid #e5edf5", lineHeight: 1.8 }}>
                        {idx + 1}. {item}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
