"use client";

import { useMemo, useState } from "react";
import {
  AlertTriangle,
  BarChart3,
  BookOpen,
  CalendarClock,
  Clock3,
  Download,
  Printer,
  RefreshCw,
  ScrollText,
  ShieldAlert,
  Sparkles,
} from "lucide-react";

type LineValue = 6 | 7 | 8 | 9;
type StrengthLevel = "旺" | "相" | "平" | "休" | "囚";

type LineMeta = {
  line: number;
  raw: LineValue;
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
  strength: {
    score: number;
    level: StrengthLevel;
  };
};

const lineMap: Record<LineValue, { yin: boolean; moving: boolean; symbol: string; changed: 7 | 8 }> = {
  6: { yin: true, moving: true, symbol: "━ ━", changed: 7 },
  7: { yin: false, moving: false, symbol: "━━━", changed: 7 },
  8: { yin: true, moving: false, symbol: "━ ━", changed: 8 },
  9: { yin: false, moving: true, symbol: "━━━", changed: 8 },
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

const generates: Record<string, string> = {
  木: "火",
  火: "土",
  土: "金",
  金: "水",
  水: "木",
};

const categoryConfig: Record<string, { useGod: string[]; focus: string; risk: string }> = {
  求财: { useGod: ["妻财", "子孙"], focus: "看财爻与世爻是否承接", risk: "兄弟旺、财弱、动而受克" },
  感情: { useGod: ["官鬼", "妻财"], focus: "看世应关系与对方星", risk: "世应冲克、用神空破" },
  考试: { useGod: ["父母", "官鬼"], focus: "看父母爻、官鬼爻、世爻状态", risk: "父母弱、世弱、临冲破" },
  工作: { useGod: ["官鬼", "父母"], focus: "看职位、流程、沟通承接", risk: "官鬼空破、应不接世" },
  综合: { useGod: ["世爻"], focus: "先看世应和整体格局", risk: "避免单点判断过重" },
};

function detectCategory(text: string): string {
  const t = text.trim();
  if (!t) return "综合";
  if (/(财|收入|钱|奖金|投资|副业|生意|求财|财运)/.test(t)) return "求财";
  if (/(感情|恋爱|婚|复合|对象|暧昧)/.test(t)) return "感情";
  if (/(考试|学习|成绩|论文|面试|申请)/.test(t)) return "考试";
  if (/(工作|offer|升职|职场|项目|领导)/.test(t)) return "工作";
  return "综合";
}

function hashSeed(input: string): number {
  let h = 1779033703 ^ input.length;
  for (let i = 0; i < input.length; i += 1) {
    h = Math.imul(h ^ input.charCodeAt(i), 3432918353);
    h = (h << 13) | (h >>> 19);
  }
  return (h >>> 0) || 1;
}

function mulberry32(seed: number): () => number {
  return function random() {
    let t = (seed += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function seededLine(rand: () => number): LineValue {
  const toss1 = rand() < 0.5 ? 2 : 3;
  const toss2 = rand() < 0.5 ? 2 : 3;
  const toss3 = rand() < 0.5 ? 2 : 3;
  return (toss1 + toss2 + toss3) as LineValue;
}

function relation(selfElement: string, otherElement: string): string {
  const a = fiveElements.indexOf(selfElement as (typeof fiveElements)[number]);
  const b = fiveElements.indexOf(otherElement as (typeof fiveElements)[number]);
  return sixRelations[(b - a + 5) % 5];
}

function generatedBy(element: string): string {
  const keys = Object.keys(generates);
  for (let i = 0; i < keys.length; i += 1) {
    if (generates[keys[i]] === element) return keys[i];
  }
  return "";
}

function getBinary(lines: number[]): number[] {
  return lines.map((n) => (lineMap[n as LineValue].yin ? 0 : 1));
}

function getTrigram(lines: number[]): { lower: string; upper: string } {
  const bits = getBinary(lines);
  return {
    lower: trigramMap[bits.slice(0, 3).join("")],
    upper: trigramMap[bits.slice(3, 6).join("")],
  };
}

function getChangedLines(lines: number[]): number[] {
  return lines.map((n) => lineMap[n as LineValue].changed);
}

function pickMonthBranch(dt: Date): string {
  return earthlyBranches[dt.getMonth() % 12];
}

function pickDayBranch(dt: Date): string {
  const dayNum = Math.floor(dt.getTime() / 86400000);
  return earthlyBranches[((dayNum % 12) + 12) % 12];
}

function pickDayStem(dt: Date): string {
  const dayNum = Math.floor(dt.getTime() / 86400000);
  return heavenlyStems[((dayNum % 10) + 10) % 10];
}

function getEmptyBranches(dayStem: string): string[] {
  const idx = heavenlyStems.indexOf(dayStem);
  return [earthlyBranches[(idx + 10) % 12], earthlyBranches[(idx + 11) % 12]];
}

function getSixGodOrder(dayStem: string): string[] {
  const startIndex = heavenlyStems.indexOf(dayStem) % 6;
  return Array.from({ length: 6 }, (_, i) => sixGods[(startIndex + i) % 6]);
}

function formatDateTime(dt: Date): string {
  const y = dt.getFullYear();
  const m = String(dt.getMonth() + 1).padStart(2, "0");
  const d = String(dt.getDate()).padStart(2, "0");
  const hh = String(dt.getHours()).padStart(2, "0");
  const mm = String(dt.getMinutes()).padStart(2, "0");
  return `${y}-${m}-${d} ${hh}:${mm}`;
}

function formatShortDate(dt: Date | null): string {
  if (!dt) return "";
  const y = dt.getFullYear();
  const m = String(dt.getMonth() + 1).padStart(2, "0");
  const d = String(dt.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function timeCast(question: string, dt: Date): number[] {
  const seed = hashSeed(`${question}|${dt.getFullYear()}-${dt.getMonth() + 1}-${dt.getDate()} ${dt.getHours()}:${dt.getMinutes()}`);
  const rand = mulberry32(seed);
  return Array.from({ length: 6 }, () => seededLine(rand));
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
      raw: line as LineValue,
      symbol: lineMap[line as LineValue].symbol,
      moving: lineMap[line as LineValue].moving,
      relation: relation(palace, element),
      element,
      branch,
      god: gods[i],
      empty: empties.includes(branch),
      isWorld: i + 1 === world,
      isResponse: i + 1 === response,
      hiddenGod: i % 2 === 0 ? relation(palace, generatedBy(element) || element) : "—",
      strength: { score: 50, level: "平" },
    };
  });
}

function scoreLineStrength(item: LineMeta, monthBranch: string, dayBranch: string): { score: number; level: StrengthLevel } {
  let score = 50;
  if (branchElements[monthBranch] === item.element) score += 14;
  if (branchElements[dayBranch] === item.element) score += 8;
  if (item.moving) score += 8;
  if (item.empty) score -= 12;
  if (branchClash[item.branch] === monthBranch) score -= 10;
  if (branchClash[item.branch] === dayBranch) score -= 8;
  if (branchCombine[item.branch] === monthBranch || branchCombine[item.branch] === dayBranch) score += 6;
  if (item.isWorld) score += 4;
  if (item.isResponse) score += 2;

  let level: StrengthLevel = "平";
  if (score >= 82) level = "旺";
  else if (score >= 66) level = "相";
  else if (score >= 46) level = "平";
  else if (score >= 30) level = "休";
  else level = "囚";

  return { score, level };
}

function getNearestBranchDay(targetBranch: string, baseDate: Date): Date | null {
  const start = new Date(baseDate.getTime());
  start.setHours(0, 0, 0, 0);
  const baseDayNum = Math.floor(start.getTime() / 86400000);
  for (let i = 0; i < 14; i += 1) {
    const branch = earthlyBranches[((baseDayNum + i) % 12 + 12) % 12];
    if (branch === targetBranch) {
      const d = new Date(start.getTime());
      d.setDate(start.getDate() + i);
      return d;
    }
  }
  return null;
}

function buildTimingPrediction(useGod: LineMeta | null, movingCount: number, baseDate: Date) {
  if (!useGod) {
    return {
      stage1: movingCount >= 2 ? "3~7天内先见动静" : "7天左右先见端倪",
      stage2: "7~14天为关键变化段",
      exact: "无明确对应日，建议观察近期变化节点。",
      short: "应期不集中，但已有动象",
    };
  }

  const nearest = getNearestBranchDay(useGod.branch, baseDate);

  if (useGod.strength.level === "旺" || useGod.strength.level === "相") {
    return {
      stage1: movingCount > 0 ? "3~7天先出现变化" : "7~10天先见眉目",
      stage2: "7~14天进入关键判断期",
      exact: nearest ? `${useGod.branch}日重点观察，约在 ${formatShortDate(nearest)} 前后。` : `${useGod.branch}日重点观察。`,
      short: "节奏偏快，容易先动后定",
    };
  }

  if (useGod.strength.level === "平") {
    return {
      stage1: "5~10天开始转动",
      stage2: "2周左右更能看清走向",
      exact: nearest ? `${useGod.branch}日较关键，约在 ${formatShortDate(nearest)} 前后。` : `${useGod.branch}日较关键。`,
      short: "节奏中等，需观察二次变化",
    };
  }

  return {
    stage1: "短期不快，先看是否松动",
    stage2: "2~4周后更可能出现转机",
    exact: nearest ? `${useGod.branch}日可作观察点，约在 ${formatShortDate(nearest)} 前后。` : `${useGod.branch}日可作观察点。`,
    short: "先拖后动，不宜过急",
  };
}

function buildReading(question: string, dt: Date, lines: number[]) {
  const category = detectCategory(question);
  const monthBranch = pickMonthBranch(dt);
  const dayBranch = pickDayBranch(dt);
  const dayStem = pickDayStem(dt);
  const origin = getTrigram(lines);
  const changed = getTrigram(getChangedLines(lines));

  const items = buildLines(lines, dt).map((item) => ({
    ...item,
    strength: scoreLineStrength(item, monthBranch, dayBranch),
  }));

  const changedItems = buildLines(getChangedLines(lines), dt).map((item, idx) => ({
    ...item,
    strength: scoreLineStrength(item, monthBranch, dayBranch),
    transform: items[idx].element === item.element ? "回头平" : generatedBy(items[idx].element) === item.element ? "回头生" : "回头克",
  }));

  const world = items.find((x) => x.isWorld) || null;
  const response = items.find((x) => x.isResponse) || null;
  const movingLines = items.filter((x) => x.moving);
  const useTargets = categoryConfig[category]?.useGod || ["世爻"];
  const useGodCandidates = items.filter((x) => useTargets.includes(x.relation)).sort((a, b) => b.strength.score - a.strength.score);
  const useGod = useGodCandidates[0] || null;

  const interactionNotes: string[] = [];
  items.forEach((x) => {
    if (branchClash[x.branch] === dayBranch) interactionNotes.push(`${x.line}爻逢日冲`);
    if (branchClash[x.branch] === monthBranch) interactionNotes.push(`${x.line}爻逢月冲`);
    if (branchCombine[x.branch] === dayBranch || branchCombine[x.branch] === monthBranch) interactionNotes.push(`${x.line}爻逢合`);
  });

  let score = 50;
  if (useGod) score += (useGod.strength.score - 50) * 0.6;
  if (world) score += (world.strength.score - 50) * 0.25;
  if (response) score += (response.strength.score - 50) * 0.15;
  if (interactionNotes.some((x) => x.includes("月冲"))) score -= 8;
  if (interactionNotes.some((x) => x.includes("逢合"))) score += 4;

  const finalScore = Math.max(0, Math.min(100, Math.round(score)));

  let verdict = "中性";
  if (finalScore >= 72) verdict = "偏顺";
  else if (finalScore >= 56) verdict = "中性";
  else if (finalScore >= 42) verdict = "偏弱";
  else verdict = "不利";

  let action = "谨慎推进";
  if (finalScore >= 72) action = "可推进";
  else if (interactionNotes.some((x) => x.includes("冲")) || (useGod && ["休", "囚"].includes(useGod.strength.level))) action = "暂缓";
  else if (interactionNotes.some((x) => x.includes("合"))) action = "观望";

  const timing = buildTimingPrediction(useGod, movingLines.length, dt);

  let summary = "当前条件不算稳定，事情能动，但不适合急推。";
  if (verdict === "偏顺") summary = "当前整体条件偏正向，可以主动推进。";
  if (verdict === "偏弱") summary = "当前阻力偏多，宜放慢节奏，先看变化。";
  if (verdict === "不利") summary = "当前不宜强推，越急越容易出偏差。";

  const detailText = `${summary} ${movingLines.length >= 3 ? "局内动象较多，中途容易反复和调整。" : movingLines.length === 0 ? "短期更适合观察，不像立刻成局的走势。" : "事情会先出现变化，再慢慢定下来。"} 时间上看，${timing.short}。`;

  return {
    category,
    timingText: formatDateTime(dt),
    monthBranch,
    dayBranch,
    dayStem,
    origin,
    changed,
    items,
    changedItems,
    finalScore,
    verdict,
    action,
    timing,
    summary: detailText,
    focus: categoryConfig[category]?.focus || "先看世应和整体格局",
    risk: categoryConfig[category]?.risk || "避免单点判断过重",
    useGodText: useGod ? `重点参考位在第 ${useGod.line} 爻 ${useGod.relation}，旺衰 ${useGod.strength.level}。` : "当前用神不集中，需结合整体结构判断。",
    worldText: world && response ? `世爻在第 ${world.line} 爻，旺衰 ${world.strength.level}；应爻在第 ${response.line} 爻，旺衰 ${response.strength.level}。` : "世应信息不足，当前以整体卦势判断。",
    triggerText: interactionNotes.some((x) => x.includes("冲"))
      ? "真正的变化点在外部节奏被打破之后。"
      : interactionNotes.some((x) => x.includes("合"))
      ? "当前更像被牵住，等条件松开才会往前走。"
      : movingLines.length > 0
      ? "局内已有动象，后续变化会逐步放大。"
      : "当前更适合等待条件变化，不宜硬推。",
    interactionNotes,
  };
}

function exportText(reading: ReturnType<typeof buildReading>, question: string) {
  const text = [
    `问题：${question || "综合占问"}`,
    `起局时间：${reading.timingText}`,
    `类别：${reading.category}`,
    `结论：${reading.verdict}`,
    `建议：${reading.action}`,
    `摘要：${reading.summary}`,
    `应期：${reading.timing.stage1}；${reading.timing.stage2}`,
    `重点日期：${reading.timing.exact}`,
  ].join("\n");

  const blob = new Blob([text], { type: "text/plain;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `六爻结果_${reading.timingText.replace(/[: ]/g, "-")}.txt`;
  a.click();
  URL.revokeObjectURL(url);
}

function printReport(reading: ReturnType<typeof buildReading>, question: string) {
  const html = `
    <html>
      <head>
        <meta charset="utf-8" />
        <title>六爻分析单</title>
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; padding: 24px; color: #111827; }
          .box { border: 1px solid #d1d5db; border-radius: 14px; padding: 14px; margin-bottom: 12px; }
        </style>
      </head>
      <body>
        <h1>六爻分析单</h1>
        <div class="box"><strong>问题</strong><div>${question || "综合占问"}</div></div>
        <div class="box"><strong>结论</strong><div>${reading.verdict} / ${reading.action}</div></div>
        <div class="box"><strong>摘要</strong><div>${reading.summary}</div></div>
        <div class="box"><strong>应期</strong><div>${reading.timing.stage1}；${reading.timing.stage2}</div></div>
      </body>
    </html>
  `;
  const win = window.open("", "_blank");
  if (!win) return;
  win.document.open();
  win.document.write(html);
  win.document.close();
  win.focus();
  setTimeout(() => win.print(), 300);
}

function MetricCard(props: { title: string; value: string; hint?: string }) {
  return (
    <div style={{ padding: 16, borderRadius: 18, background: "#f8fafc", border: "1px solid #e5edf5" }}>
      <div style={{ fontSize: 13, color: "#6b7280" }}>{props.title}</div>
      <div style={{ marginTop: 8, fontSize: 22, fontWeight: 800 }}>{props.value}</div>
      {props.hint ? <div style={{ marginTop: 8, fontSize: 12, color: "#6b7280", lineHeight: 1.6 }}>{props.hint}</div> : null}
    </div>
  );
}

function SectionTitle(props: { icon: any; title: string; sub?: string }) {
  return (
    <div style={{ display: "flex", alignItems: "flex-start", gap: 12 }}>
      <div
        style={{
          width: 40,
          height: 40,
          borderRadius: 12,
          background: "#f4f7fb",
          border: "1px solid #e5edf5",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        {props.icon}
      </div>
      <div>
        <div style={{ fontSize: 20, fontWeight: 700 }}>{props.title}</div>
        {props.sub ? <div style={{ fontSize: 13, color: "#6b7280", marginTop: 3 }}>{props.sub}</div> : null}
      </div>
    </div>
  );
}

function LineRow(props: { item: LineMeta; changed: LineMeta & { transform: string } }) {
  const { item, changed } = props;
  return (
    <div style={{ border: "1px solid #e7edf5", borderRadius: 18, padding: 14, marginBottom: 12, background: "#ffffff" }}>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(5, minmax(0, 1fr))", gap: 8, fontSize: 14 }}>
        <div>
          <b>爻位</b>
          <div style={{ marginTop: 4 }}>第{item.line}爻</div>
        </div>
        <div>
          <b>结构</b>
          <div style={{ marginTop: 4 }}>{item.symbol}</div>
        </div>
        <div>
          <b>关系</b>
          <div style={{ marginTop: 4 }}>{item.relation} / {item.element}</div>
        </div>
        <div>
          <b>地支</b>
          <div style={{ marginTop: 4 }}>{item.branch} / {item.god}</div>
        </div>
        <div>
          <b>变化</b>
          <div style={{ marginTop: 4 }}>{item.moving ? "动" : "静"} → {changed.relation}</div>
        </div>
      </div>
      <div style={{ marginTop: 10, fontSize: 12, color: "#6b7280" }}>
        旺衰：{item.strength.level}｜标记：{item.isWorld ? "世 " : ""}{item.isResponse ? "应 " : ""}{item.empty ? "空" : ""}｜伏神：{item.hiddenGod}｜变向：{changed.transform}
      </div>
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

  const tone = reading ? statusTone(reading.action) : null;

  return (
    <div style={{ minHeight: "100vh", background: "linear-gradient(180deg, #f6f8fb 0%, #eef3f8 100%)", padding: 24 }}>
      <div style={{ maxWidth: 1240, margin: "0 auto" }}>
        <div style={{ background: "rgba(255,255,255,0.92)", border: "1px solid #e4ebf3", borderRadius: 28, padding: 24, boxShadow: "0 10px 30px rgba(15,23,42,0.04)" }}>
          <div style={{ display: "flex", justifyContent: "space-between", gap: 16, flexWrap: "wrap", alignItems: "flex-start" }}>
            <div>
              <div style={{ display: "inline-flex", alignItems: "center", gap: 8, padding: "8px 12px", borderRadius: 999, background: "#f7fafc", border: "1px solid #e6edf5", fontSize: 12, color: "#64748b" }}>
                <BookOpen size={14} />
                专业排盘单导出版小程序
              </div>
              <div style={{ marginTop: 14, fontSize: 38, fontWeight: 900, letterSpacing: "-0.04em", color: "#0f172a" }}>六爻</div>
            </div>
            <div style={{ padding: "10px 14px", borderRadius: 16, background: "#0f172a", color: "#ffffff", fontSize: 12, fontWeight: 700 }}>付费版</div>
          </div>
        </div>

        <div style={{ height: 18 }} />

        <div style={{ display: "grid", gridTemplateColumns: "1.3fr 0.9fr", gap: 18 }}>
          <div style={{ background: "#ffffff", border: "1px solid #e4ebf3", borderRadius: 28, padding: 22, boxShadow: "0 10px 26px rgba(15,23,42,0.03)" }}>
            <SectionTitle icon={<ScrollText size={18} color="#0f172a" />} title="问题输入" sub="输入问题后，系统会按当前时间或自定义时间起局。" />
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
            <SectionTitle icon={<Clock3 size={18} color="#0f172a" />} title="参数设置" sub="可以直接使用当前时间，也可以自定义时间。" />
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
                <button
                  onClick={() => {
                    if (reading) exportText(reading, question);
                  }}
                  disabled={!reading}
                  style={{ padding: "12px 14px", borderRadius: 16, border: "1px solid #dde7f0", background: reading ? "#fff" : "#f8fafc", color: reading ? "#111827" : "#9ca3af", cursor: reading ? "pointer" : "not-allowed" }}
                >
                  <Download size={15} style={{ marginRight: 6, verticalAlign: "middle" }} />
                  导出
                </button>
                <button
                  onClick={() => {
                    if (reading) printReport(reading, question);
                  }}
                  disabled={!reading}
                  style={{ padding: "12px 14px", borderRadius: 16, border: "1px solid #dde7f0", background: reading ? "#fff" : "#f8fafc", color: reading ? "#111827" : "#9ca3af", cursor: reading ? "pointer" : "not-allowed" }}
                >
                  <Printer size={15} style={{ marginRight: 6, verticalAlign: "middle" }} />
                  打印
                </button>
              </div>
            </div>
          </div>
        </div>

        {reading && tone ? (
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

            {tab === "overview" ? (
              <div style={{ display: "grid", gridTemplateColumns: "1.65fr 1fr", gap: 18 }}>
                <div style={{ background: "#ffffff", border: "1px solid #e4ebf3", borderRadius: 28, padding: 24, boxShadow: "0 10px 26px rgba(15,23,42,0.03)" }}>
                  <SectionTitle icon={<Sparkles size={18} color="#0f172a" />} title="结论概览" sub="先看结论，再决定要不要继续下钻。" />
                  <div style={{ marginTop: 18, padding: 18, borderRadius: 24, border: `1px solid ${tone.bd}`, background: tone.bg }}>
                    <div style={{ fontSize: 13, color: tone.tx, opacity: 0.85 }}>建议动作</div>
                    <div style={{ marginTop: 8, fontSize: 32, fontWeight: 900, color: tone.tx }}>{reading.action}</div>
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
                        <CalendarClock size={16} />
                        节奏提示
                      </div>
                      <div style={{ marginTop: 10, fontSize: 14, color: "#475569", lineHeight: 1.8 }}>{reading.timing.short}</div>
                    </div>
                  </div>
                </div>

                <div style={{ display: "grid", gap: 16 }}>
                  <div style={{ background: "#ffffff", border: "1px solid #e4ebf3", borderRadius: 28, padding: 20, boxShadow: "0 10px 26px rgba(15,23,42,0.03)" }}>
                    <SectionTitle icon={<BarChart3 size={18} color="#0f172a" />} title="核心指标" />
                    <div style={{ marginTop: 16, display: "grid", gap: 12 }}>
                      <MetricCard title="当前结论" value={reading.verdict} />
                      <MetricCard title="建议动作" value={reading.action} />
                      <MetricCard title="评分" value={String(reading.finalScore)} />
                      <MetricCard title="卦象" value={`${reading.origin.upper}${reading.origin.lower} → ${reading.changed.upper}${reading.changed.lower}`} />
                    </div>
                  </div>

                  <div style={{ background: "#ffffff", border: "1px solid #e4ebf3", borderRadius: 28, padding: 20, boxShadow: "0 10px 26px rgba(15,23,42,0.03)" }}>
                    <SectionTitle icon={<AlertTriangle size={18} color="#0f172a" />} title="关键节点" />
                    <div style={{ marginTop: 16, display: "grid", gap: 12 }}>
                      <MetricCard title="第一次变化" value={reading.timing.stage1} />
                      <MetricCard title="关键阶段" value={reading.timing.stage2} />
                      <MetricCard title="重点日期" value={reading.timing.exact} />
                    </div>
                  </div>
                </div>
              </div>
            ) : null}

            {tab === "timing" ? (
              <div style={{ display: "grid", gridTemplateColumns: "1.1fr 1fr", gap: 18 }}>
                <div style={{ background: "#ffffff", border: "1px solid #e4ebf3", borderRadius: 28, padding: 24 }}>
                  <SectionTitle icon={<CalendarClock size={18} color="#0f172a" />} title="节奏判断" sub="只展示时间和推进节奏。" />
                  <div style={{ marginTop: 18, display: "grid", gap: 14 }}>
                    <MetricCard title="阶段一" value={reading.timing.stage1} />
                    <MetricCard title="阶段二" value={reading.timing.stage2} />
                    <MetricCard title="重点日期" value={reading.timing.exact} />
                  </div>
                </div>

                <div style={{ background: "#ffffff", border: "1px solid #e4ebf3", borderRadius: 28, padding: 24 }}>
                  <SectionTitle icon={<ShieldAlert size={18} color="#0f172a" />} title="环境说明" sub="什么时候更容易出现真正变化。" />
                  <div style={{ marginTop: 18, padding: 18, borderRadius: 22, border: "1px solid #e5edf5", background: "#fbfdff", fontSize: 16, lineHeight: 1.9 }}>
                    {reading.triggerText}
                  </div>
                  <div style={{ marginTop: 16, padding: 18, borderRadius: 22, border: "1px solid #e5edf5", background: "#fbfdff", lineHeight: 1.8 }}>
                    月建：{reading.monthBranch}｜日辰：{reading.dayStem}{reading.dayBranch}
                  </div>
                </div>
              </div>
            ) : null}

            {tab === "details" ? (
              <div style={{ background: "#ffffff", border: "1px solid #e4ebf3", borderRadius: 28, padding: 24 }}>
                <SectionTitle icon={<ScrollText size={18} color="#0f172a" />} title="排盘明细" sub="保留专业信息，但降低视觉噪音。" />
                <div style={{ marginTop: 18 }}>
                  {reading.items.map((item, idx) => (
                    <LineRow key={item.line} item={item} changed={reading.changedItems[idx]} />
                  ))}
                </div>
              </div>
            ) : null}

            {tab === "analysis" ? (
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 18 }}>
                <div style={{ background: "#ffffff", border: "1px solid #e4ebf3", borderRadius: 28, padding: 24 }}>
                  <SectionTitle icon={<ShieldAlert size={18} color="#0f172a" />} title="分析摘要" />
                  <div style={{ marginTop: 18, display: "grid", gap: 14 }}>
                    <div style={{ padding: 18, borderRadius: 20, background: "#f8fafc", border: "1px solid #e5edf5", lineHeight: 1.8 }}>{reading.useGodText}</div>
                    <div style={{ padding: 18, borderRadius: 20, background: "#f8fafc", border: "1px solid #e5edf5", lineHeight: 1.8 }}>{reading.worldText}</div>
                    <div style={{ padding: 18, borderRadius: 20, background: "#f8fafc", border: "1px solid #e5edf5", lineHeight: 1.8 }}>
                      盘面信号：{reading.interactionNotes.length > 0 ? reading.interactionNotes.join("、") : "当前未见明显合冲主导，仍以旺衰和世应为主。"}
                    </div>
                  </div>
                </div>

                <div style={{ background: "#ffffff", border: "1px solid #e4ebf3", borderRadius: 28, padding: 24 }}>
                  <SectionTitle icon={<Sparkles size={18} color="#0f172a" />} title="判断依据" />
                  <div style={{ marginTop: 18, display: "grid", gap: 14 }}>
                    <div style={{ padding: 18, borderRadius: 20, background: "#f8fafc", border: "1px solid #e5edf5", lineHeight: 1.8 }}>判断主轴：{reading.focus}</div>
                    <div style={{ padding: 18, borderRadius: 20, background: "#f8fafc", border: "1px solid #e5edf5", lineHeight: 1.8 }}>风险点：{reading.risk}</div>
                    <div style={{ padding: 18, borderRadius: 20, background: "#f8fafc", border: "1px solid #e5edf5", lineHeight: 1.8 }}>基本结论：先看用神，再看世爻，再看应爻与动变。</div>
                  </div>
                </div>
              </div>
            ) : null}
          </>
        ) : null}
      </div>
    </div>
  );
}
