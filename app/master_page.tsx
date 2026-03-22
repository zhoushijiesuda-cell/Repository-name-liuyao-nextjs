"use client";

import { useMemo, useState } from "react";
import {
  Activity,
  BookOpen,
  CalendarClock,
  Clock3,
  Download,
  Printer,
  RotateCcw,
  ScrollText,
  Sparkles,
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
  if (sixChongPairs.includes(pair) || sixChongPairs.includes(`${origin.lower}${origin.upper}`)) return { type: "六冲", text: "六冲卦气偏动，事多反复、变化快。" };
  if (liuhePairs.includes(pair) || liuhePairs.includes(`${origin.lower}${origin.upper}`)) return { type: "六合", text: "六合卦气偏合，事多牵连、缓和、拖延。" };
  return { type: "普通", text: "本卦不以六冲六合为主，需回到世应与用神。" };
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
      fullText: `当前用神不明确，但卦中已有动象，${rangeText}。`,
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
    fullText: `应期上看，${rangeText}。重点触发点落在${targetBranch}，${exactDateText}`,
    exactDateText,
    rangeText,
    stage1,
    stage2,
  };
}

function buildMasterDecision(finalScore: number, hasChong: boolean, hasHe: boolean, useGodWeak: boolean, worldWeak: boolean) {
  if (finalScore >= 72) return "可推进";
  if (hasChong || useGodWeak || worldWeak) return "暂缓推进";
  if (hasHe) return "先观望";
  return "谨慎推进";
}

function buildTriggerText(hasChong: boolean, hasHe: boolean, hasPo: boolean, movingCount: number) {
  if (hasChong) return "触发点在“冲开”。外部条件一变、关系一动、节奏一打破，事情才会明显推进。";
  if (hasHe) return "触发点在“合开”。现在更像被拖住，等黏住的条件松动，事情才会往前走。";
  if (hasPo) return "触发点在“破局”。往往不是平稳推进，而是在出现问题、变化、调整后见结果。";
  if (movingCount > 0) return "触发点在“已有动象继续放大”。不是完全不动，而是还没走到最明显那一步。";
  return "触发点在“外部条件变化”。当前更适合等时机，不适合硬推。";
}

function buildMasterParagraph(params: {
  verdict: string;
  category: string;
  useGod: any;
  world: any;
  response: any;
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
  const hasPo = interactions.some((x: string) => x.includes("破"));
  const hasHe = interactions.some((x: string) => x.includes("合"));

  let opening = "此事当前气机不稳，表面可动，实则仍有阻力。";
  if (verdict === "吉" && useGodStrong && worldStrong) opening = "此事整体可成，而且不只是有机会，还是可以主动争取的一局。";
  else if (useGodStrong && worldWeak) opening = "这件事本身有机会，但你这边承接力不足，过早发力反而容易失手。";
  else if (useGodWeak && worldWeak) opening = "这件事现在并不在顺势位，条件弱、人也弱，硬做多半费力不讨好。";
  else if (verdict === "凶") opening = "此事不宜强推，越急越容易出偏差，越想快越容易被卡。";

  let middle = "眼下更像先动后定，而不是一步到位。";
  if (movingLines.length >= 3) middle = "局中动象偏多，事情不会一条线走完，中途多半会反复、调整、再推进。";
  else if (movingLines.length === 0) middle = "本卦静象偏重，短期内不是立刻成局，更像先看风向再决定。";
  if (hasChong) middle += " 卦里见冲，说明真正的推进点不在平稳时，而在节奏被打破时。";
  if (hasHe) middle += " 卦里见合，说明现在多少有被拖住、被牵住的味道。";
  if (hasPo) middle += " 局中带破，说明过程里容易先出变化，再见结果。";

  const actionMap: Record<string, string> = {
    求财: "求财类问题宜先保稳，再看时机，不宜贪快。",
    感情: "感情类问题宜先观察对方反应，再决定是否推进。",
    考试: "考试类问题宜稳住节奏，先补最薄弱处，不宜自己吓自己。",
    工作: "工作类问题宜讲策略，不宜正面硬顶。",
    健康: "健康类问题以休息和检查为先，不可硬扛。",
    综合: "当前宜顺势而行，不宜逆势用力。",
  };

  return `${opening}${middle}时间上看，${timingPrediction.rangeText}。${timingPrediction.exactDateText} ${actionMap[category] || "当前宜顺势而行，不宜逆势用力。"}`;
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
    engineReasons.push("六冲卦");
  }
  if (six.type === "六合") {
    score += 4;
    engineReasons.push("六合卦");
  }

  const finalScore = Math.max(0, Math.min(100, Math.round(score)));
  let verdict = "中平";
  if (finalScore >= 72) verdict = "吉";
  else if (finalScore >= 56) verdict = "中平";
  else if (finalScore >= 42) verdict = "偏凶";
  else verdict = "凶";

  const timingPrediction = buildTimingPrediction(useGod, movingLines, dt);
  const useGodWeak = !!useGod?.best && ["休", "囚"].includes(useGod.best.strength.level);
  const worldWeak = !!world && ["休", "囚"].includes(world.strength.level);
  const hasChong = interactions.some((x) => x.includes("冲"));
  const hasHe = interactions.some((x) => x.includes("合"));
  const hasPo = interactions.some((x) => x.includes("破"));
  const actionSuggestion = buildMasterDecision(finalScore, hasChong, hasHe, useGodWeak, worldWeak);
  const triggerText = buildTriggerText(hasChong, hasHe, hasPo, movingLines.length);
  const masterParagraph = buildMasterParagraph({ verdict, category, useGod, world, response, movingLines, interactions, timingPrediction });

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
    summary: `你问的是“${question || category}”。本卦 ${origin.upper}${origin.lower}，变卦 ${changed.upper}${changed.lower}。以月建 ${monthBranch}、日辰 ${dayBranch} 参断，规则引擎评分为 ${finalScore} 分，当前判断：${verdict}。`,
    useGodText: useGod.best ? `本题用神取 ${useGod.targets.join("、")}。卦中最有力者为第 ${useGod.best.line} 爻 ${useGod.best.relation}，五行 ${useGod.best.element}，地支 ${useGod.best.branch}，旺衰 ${useGod.best.strength.level}（${useGod.best.strength.score} 分）。` : `本题用神取 ${useGod.targets.join("、")}。当前卦中没有明显主导用神，宜以世应、动变和整体格局为主。`,
    worldText: world && response ? `世爻在第 ${world.line} 爻，旺衰 ${world.strength.level}；应爻在第 ${response.line} 爻，旺衰 ${response.strength.level}。世应关系为“${worldToResponse}”。` : "世应信息不足，当前以整体卦势判断。",
    movingText: movingLines.length ? `动爻出现在 ${movingLines.map((x) => `${x.line}爻`).join("、")}。` : "本卦静爻为主，短期内大方向相对稳定。",
    monthDayText: `月建主大环境，日辰主眼前触发。${six.text}`,
    changedText: interactions.length ? `规则引擎捕捉到：${interactions.join("、")}。` : "未见明显合冲刑害破主导，仍以旺衰与世应为主。",
    advancedAdvice: [`判断主轴：${categoryConfig[category]?.focus || "先看世应用神。"}`, `风险点：${categoryConfig[category]?.taboo || "避免单点判断过重。"}`, "先看用神，再看世爻，再看应爻与动变。"],
    timingPrediction,
    actionSuggestion,
    triggerText,
    masterParagraph,
  };
}

function exportText(reading: any, question: string) {
  const text = [
    `问题：${question || "综合占问"}`,
    `起卦时间：${reading.timing}`,
    `类别：${reading.category}`,
    `月建/日辰：${reading.monthBranch}月 ${reading.dayStem}${reading.dayBranch}日`,
    `本卦/变卦：${reading.origin.upper}${reading.origin.lower} → ${reading.changed.upper}${reading.changed.lower}`,
    `规则引擎评分：${reading.finalScore}`,
    `自动结论：${reading.verdict}`,
    `行动建议：${reading.actionSuggestion}`,
    `触发机制：${reading.triggerText}`,
    `应期：${reading.timingPrediction.shortText}`,
    `第一次变化：${reading.timingPrediction.stage1}`,
    `关键阶段：${reading.timingPrediction.stage2}`,
    "",
    `大师断语：${reading.masterParagraph}`,
  ].join("\n");

  const blob = new Blob([text], { type: "text/plain;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `六爻大师版结果_${reading.timing.replace(/[: ]/g, "-")}.txt`;
  a.click();
  URL.revokeObjectURL(url);
}

function printHtml(reading: any, question: string) {
  const html = `<html><head><meta charset="utf-8" /><title>六爻大师版排盘单</title><style>body{font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;padding:24px;color:#111827}.box{border:1px solid #d1d5db;border-radius:14px;padding:14px;margin-bottom:12px}</style></head><body><h1>六爻大师版排盘单</h1><div class="box"><strong>问题</strong><div>${question || "综合占问"}</div></div><div class="box"><strong>大师断语</strong><div>${reading.masterParagraph}</div></div><div class="box"><strong>行动建议</strong><div>${reading.actionSuggestion}</div></div><div class="box"><strong>触发机制</strong><div>${reading.triggerText}</div></div><div class="box"><strong>应期</strong><div>${reading.timingPrediction.stage1}；${reading.timingPrediction.stage2}</div></div></body></html>`;
  const w = window.open("", "_blank");
  if (!w) return;
  w.document.open();
  w.document.write(html);
  w.document.close();
  w.focus();
  setTimeout(() => w.print(), 300);
}

function StatCard({ title, value, icon }: { title: string; value: string; icon: React.ReactNode }) {
  return (
    <div style={{ background: "#f8fafc", border: "1px solid #dbe4ee", borderRadius: 18, padding: 14 }}>
      <div style={{ fontSize: 14, color: "#64748b", display: "flex", alignItems: "center", gap: 8 }}>{icon}{title}</div>
      <div style={{ marginTop: 8, fontSize: 18, fontWeight: 700 }}>{value}</div>
    </div>
  );
}

function LineRow({ item, changed }: { item: any; changed: any }) {
  return (
    <div style={{ border: "1px solid #dbe4ee", borderRadius: 18, padding: 12, marginBottom: 10 }}>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(10, minmax(0, 1fr))", gap: 8, fontSize: 14 }}>
        <div>第{item.line}爻</div>
        <div style={{ fontWeight: 700 }}>{item.symbol}</div>
        <div>{item.relation}</div>
        <div>{item.element}</div>
        <div>{item.branch}</div>
        <div>{item.god}</div>
        <div>{item.strength.level}</div>
        <div>{item.isWorld ? "世" : item.isResponse ? "应" : item.empty ? "空" : ""}</div>
        <div>{item.moving ? "动" : "静"}</div>
        <div>→ {changed.relation}{changed.element}</div>
      </div>
      <div style={{ fontSize: 13, color: "#64748b", marginTop: 8 }}>伏神：{changed.fushen}｜飞神：{changed.feishen}｜{changed.transform}｜{changed.advance}</div>
    </div>
  );
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
  const [tab, setTab] = useState("summary");

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

  return (
    <div style={{ maxWidth: 1200, margin: "0 auto", padding: 20 }}>
      <div style={{ background: "#fff", border: "1px solid #dbe4ee", borderRadius: 24, padding: 20 }}>
        <div style={{ display: "flex", justifyContent: "space-between", gap: 16, flexWrap: "wrap" }}>
          <div>
            <div style={{ fontSize: 14, color: "#64748b", display: "flex", alignItems: "center", gap: 8 }}><BookOpen size={16} />专业排盘单导出版小程序</div>
            <div style={{ fontSize: 32, fontWeight: 800, marginTop: 8 }}>六爻专业排盘、大师断语与行动建议</div>
            <div style={{ fontSize: 14, color: "#64748b", marginTop: 10 }}>这一版把结果升级为更像真人断语的一整段判断，并补充行动建议、触发机制、阶段应期。</div>
          </div>
          <div style={{ padding: "6px 10px", borderRadius: 999, background: "#f8fafc", border: "1px solid #dbe4ee", fontSize: 12 }}>大师版</div>
        </div>
      </div>

      <div style={{ height: 16 }} />

      <div style={{ background: "#fff", border: "1px solid #dbe4ee", borderRadius: 24, padding: 20 }}>
        <div style={{ fontSize: 22, fontWeight: 700, marginBottom: 16 }}>输入问题并起卦</div>
        <div style={{ display: "grid", gridTemplateColumns: "1.1fr 1fr", gap: 16 }}>
          <div>
            <div style={{ fontSize: 14, color: "#64748b", marginBottom: 6 }}>问题</div>
            <textarea value={question} onChange={(e) => setQuestion(e.target.value)} placeholder="例如：我接下来三个月求财运势如何？这次考试能否顺利通过？" style={{ width: "100%", minHeight: 120, border: "1px solid #dbe4ee", borderRadius: 16, padding: 12, resize: "vertical" }} />
          </div>
          <div>
            <div style={{ fontSize: 14, color: "#64748b", marginBottom: 6 }}>可选：自定义起卦时间</div>
            <input type="datetime-local" value={customTime} onChange={(e) => setCustomTime(e.target.value)} style={{ width: "100%", border: "1px solid #dbe4ee", borderRadius: 16, padding: 12 }} />
            <div style={{ height: 16 }} />
            <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
              <button onClick={castNow} style={{ padding: "10px 14px", borderRadius: 14, border: "1px solid #0f172a", background: "#0f172a", color: "#fff", cursor: "pointer" }}><Clock3 size={16} style={{ marginRight: 6, verticalAlign: "middle" }} />起卦并断</button>
              <button onClick={reset} style={{ padding: "10px 14px", borderRadius: 14, border: "1px solid #dbe4ee", background: "#fff", cursor: "pointer" }}><RotateCcw size={16} style={{ marginRight: 6, verticalAlign: "middle" }} />重置</button>
              {reading && <button onClick={() => exportText(reading, question)} style={{ padding: "10px 14px", borderRadius: 14, border: "1px solid #dbe4ee", background: "#fff", cursor: "pointer" }}><Download size={16} style={{ marginRight: 6, verticalAlign: "middle" }} />导出TXT</button>}
              {reading && <button onClick={() => printHtml(reading, question)} style={{ padding: "10px 14px", borderRadius: 14, border: "1px solid #dbe4ee", background: "#fff", cursor: "pointer" }}><Printer size={16} style={{ marginRight: 6, verticalAlign: "middle" }} />打印排盘单</button>}
            </div>
          </div>
        </div>
      </div>

      {reading && (
        <>
          <div style={{ height: 16 }} />
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
            {[
              ["summary", "总结"],
              ["sheet", "排盘单"],
              ["chart", "排盘明细"],
              ["analysis", "专业分析"],
            ].map(([key, label]) => (
              <button key={key} onClick={() => setTab(key)} style={{ padding: "10px 14px", borderRadius: 14, border: tab === key ? "1px solid #0f172a" : "1px solid #dbe4ee", background: tab === key ? "#0f172a" : "#fff", color: tab === key ? "#fff" : "#111827", cursor: "pointer" }}>{label}</button>
            ))}
          </div>

          <div style={{ height: 16 }} />

          {tab === "summary" && (
            <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: 16 }}>
              <div style={{ background: "#fff", border: "1px solid #dbe4ee", borderRadius: 24, padding: 20 }}>
                <div style={{ fontSize: 22, fontWeight: 700, display: "flex", alignItems: "center", gap: 8 }}><Sparkles size={20} />大师断语</div>
                <div style={{ marginTop: 16, border: "1px solid #dbe4ee", borderRadius: 18, padding: 16, fontSize: 16, lineHeight: 1.95 }}>{reading.masterParagraph}</div>
                <div style={{ marginTop: 16, display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
                  <div style={{ background: "#f8fafc", border: "1px solid #dbe4ee", borderRadius: 18, padding: 16 }}>
                    <div style={{ fontSize: 14, color: "#64748b" }}>行动建议</div>
                    <div style={{ marginTop: 8, fontSize: 22, fontWeight: 800 }}>{reading.actionSuggestion}</div>
                    <div style={{ marginTop: 12, fontSize: 13, color: "#64748b" }}>{reading.triggerText}</div>
                  </div>
                  <div style={{ background: "#f8fafc", border: "1px solid #dbe4ee", borderRadius: 18, padding: 16 }}>
                    <div style={{ fontSize: 14, color: "#64748b" }}>阶段应期</div>
                    <div style={{ marginTop: 10, fontSize: 15, lineHeight: 1.8 }}>
                      <div>第一次变化：{reading.timingPrediction.stage1}</div>
                      <div>关键阶段：{reading.timingPrediction.stage2}</div>
                      <div>重点日期：{reading.timingPrediction.exactDateText}</div>
                    </div>
                  </div>
                </div>
              </div>

              <div style={{ background: "#fff", border: "1px solid #dbe4ee", borderRadius: 24, padding: 20 }}>
                <div style={{ fontSize: 22, fontWeight: 700, marginBottom: 12 }}>核心指标</div>
                <div style={{ display: "grid", gap: 12 }}>
                  <StatCard title="结论" value={reading.verdict} icon={<Sparkles size={16} />} />
                  <StatCard title="行动建议" value={reading.actionSuggestion} icon={<Activity size={16} />} />
                  <StatCard title="评分" value={String(reading.finalScore)} icon={<Activity size={16} />} />
                  <StatCard title="本卦 / 变卦" value={`${reading.origin.upper}${reading.origin.lower} → ${reading.changed.upper}${reading.changed.lower}`} icon={<ScrollText size={16} />} />
                </div>
              </div>
            </div>
          )}

          {tab === "sheet" && (
            <div style={{ background: "#fff", border: "1px solid #dbe4ee", borderRadius: 24, padding: 20 }}>
              <div style={{ display: "flex", justifyContent: "space-between", gap: 16, flexWrap: "wrap", borderBottom: "1px solid #dbe4ee", paddingBottom: 16 }}>
                <div>
                  <div style={{ fontSize: 28, fontWeight: 800 }}>六爻大师版排盘单</div>
                  <div style={{ fontSize: 14, color: "#64748b", marginTop: 8 }}>适合打印、存档、复盘</div>
                </div>
                <div style={{ fontSize: 14, color: "#64748b", textAlign: "right" }}>
                  <div>{reading.timing}</div>
                  <div>{reading.monthBranch}月 / {reading.dayStem}{reading.dayBranch}日</div>
                </div>
              </div>

              <div style={{ height: 16 }} />
              <div style={{ display: "grid", gridTemplateColumns: "repeat(4, minmax(0,1fr))", gap: 16 }}>
                <StatCard title="问题" value={question || "综合占问"} icon={<BookOpen size={16} />} />
                <StatCard title="类别" value={reading.category} icon={<ScrollText size={16} />} />
                <StatCard title="结论 / 评分" value={`${reading.verdict} / ${reading.finalScore}`} icon={<Sparkles size={16} />} />
                <StatCard title="行动建议" value={reading.actionSuggestion} icon={<CalendarClock size={16} />} />
              </div>

              <div style={{ height: 16 }} />
              <div style={{ display: "grid", gap: 16 }}>
                <div style={{ border: "1px solid #dbe4ee", borderRadius: 18, padding: 16 }}>
                  <div style={{ fontWeight: 700, marginBottom: 8 }}>大师断语</div>
                  <div style={{ fontSize: 16, lineHeight: 1.9 }}>{reading.masterParagraph}</div>
                </div>
                <div style={{ border: "1px solid #dbe4ee", borderRadius: 18, padding: 16 }}>
                  <div style={{ fontWeight: 700, marginBottom: 8 }}>触发机制</div>
                  <div>{reading.triggerText}</div>
                </div>
                <div style={{ border: "1px solid #dbe4ee", borderRadius: 18, padding: 16 }}>
                  <div style={{ fontWeight: 700, marginBottom: 8 }}>阶段应期</div>
                  <div>第一次变化：{reading.timingPrediction.stage1}</div>
                  <div>关键阶段：{reading.timingPrediction.stage2}</div>
                  <div>{reading.timingPrediction.exactDateText}</div>
                </div>
              </div>

              <div style={{ height: 16 }} />
              <div style={{ border: "1px solid #dbe4ee", borderRadius: 18, padding: 16 }}>
                <div style={{ fontWeight: 700, marginBottom: 12 }}>排盘表</div>
                {reading.items.map((item: any, idx: number) => (
                  <LineRow key={item.line} item={item} changed={reading.changedItems[idx]} />
                ))}
              </div>
            </div>
          )}

          {tab === "chart" && (
            <div style={{ background: "#fff", border: "1px solid #dbe4ee", borderRadius: 24, padding: 20 }}>
              <div style={{ fontSize: 22, fontWeight: 700, marginBottom: 12 }}>排盘明细</div>
              {reading.items.map((item: any, idx: number) => (
                <LineRow key={item.line} item={item} changed={reading.changedItems[idx]} />
              ))}
            </div>
          )}

          {tab === "analysis" && (
            <div style={{ background: "#fff", border: "1px solid #dbe4ee", borderRadius: 24, padding: 20 }}>
              <div style={{ fontSize: 22, fontWeight: 700, marginBottom: 12 }}>专业分析</div>
              <div style={{ display: "grid", gap: 16 }}>
                <div style={{ border: "1px solid #dbe4ee", borderRadius: 18, padding: 16, background: "#f8fafc" }}>{reading.summary}</div>
                <div style={{ border: "1px solid #dbe4ee", borderRadius: 18, padding: 16 }}>{reading.useGodText}</div>
                <div style={{ border: "1px solid #dbe4ee", borderRadius: 18, padding: 16 }}>{reading.worldText}</div>
                <div style={{ border: "1px solid #dbe4ee", borderRadius: 18, padding: 16 }}>{reading.monthDayText}</div>
                <div style={{ border: "1px solid #dbe4ee", borderRadius: 18, padding: 16 }}>{reading.changedText}</div>
                {reading.advancedAdvice.map((item: string, idx: number) => (
                  <div key={idx} style={{ border: "1px solid #dbe4ee", borderRadius: 18, padding: 16, background: "#f8fafc" }}>{idx + 1}. {item}</div>
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
