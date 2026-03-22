"use client";

import { useMemo, useState } from "react";
import { Activity, BookOpen, CalendarClock, Clock3, Download, Printer, RotateCcw, ScrollText, Sparkles } from "lucide-react";

const lineMap = {
  6: { yin: true, moving: true, symbol: "━ ━", changed: 7 },
  7: { yin: false, moving: false, symbol: "━━━", changed: 7 },
  8: { yin: true, moving: false, symbol: "━ ━", changed: 8 },
  9: { yin: false, moving: true, symbol: "━━━", changed: 8 },
} as const;

const trigramMap: Record<string, string> = { "111":"乾","110":"兑","101":"离","100":"震","011":"巽","010":"坎","001":"艮","000":"坤" };
const trigramElements: Record<string, string> = { 乾:"金",兑:"金",离:"火",震:"木",巽:"木",坎:"水",艮:"土",坤:"土" };
const sixGods = ["青龙","朱雀","勾陈","腾蛇","白虎","玄武"];
const sixRelations = ["兄弟","子孙","妻财","官鬼","父母"] as const;
const fiveElements = ["木","火","土","金","水"] as const;
const heavenlyStems = ["甲","乙","丙","丁","戊","己","庚","辛","壬","癸"];
const earthlyBranches = ["子","丑","寅","卯","辰","巳","午","未","申","酉","戌","亥"];
const branchElements: Record<string,string> = { 子:"水",丑:"土",寅:"木",卯:"木",辰:"土",巳:"火",午:"火",未:"土",申:"金",酉:"金",戌:"土",亥:"水" };
const branchClash: Record<string,string> = { 子:"午",丑:"未",寅:"申",卯:"酉",辰:"戌",巳:"亥",午:"子",未:"丑",申:"寅",酉:"卯",戌:"辰",亥:"巳" };
const branchCombine: Record<string,string> = { 子:"丑",丑:"子",寅:"亥",卯:"戌",辰:"酉",巳:"申",午:"未",未:"午",申:"巳",酉:"辰",戌:"卯",亥:"寅" };
const generates: Record<string,string> = { 木:"火",火:"土",土:"金",金:"水",水:"木" };
const controls: Record<string,string> = { 木:"土",土:"水",水:"火",火:"金",金:"木" };
const seasonSupport: Record<string,string[]> = { 木:["寅","卯"],火:["巳","午"],土:["辰","戌","丑","未"],金:["申","酉"],水:["亥","子"] };
const categoryConfig: Record<string,{ useGod:string[]; focus:string }> = {
  求财:{ useGod:["妻财","子孙"], focus:"看财爻与世爻" },
  感情:{ useGod:["官鬼","妻财"], focus:"看世应与对方星" },
  考试:{ useGod:["父母","官鬼"], focus:"看父母与官鬼" },
  工作:{ useGod:["官鬼","父母"], focus:"看职位与流程" },
  健康:{ useGod:["官鬼","子孙"], focus:"仅作文化体验" },
  综合:{ useGod:["世爻"], focus:"先看世应和整体卦势" },
};

function detectCategory(text:string){
  const t=text.trim();
  if(!t) return "综合";
  if (/(财|收入|钱|投资|副业|奖金|生意|求财|财运)/.test(t)) return "求财";
  if (/(感情|恋爱|婚|复合|对象|暧昧)/.test(t)) return "感情";
  if (/(考试|学习|成绩|论文|面试|申请)/.test(t)) return "考试";
  if (/(工作|offer|升职|职场|项目|领导)/.test(t)) return "工作";
  if (/(健康|身体|失眠|情绪|恢复)/.test(t)) return "健康";
  return "综合";
}
function hashSeed(input:string){ let h=1779033703 ^ input.length; for(let i=0;i<input.length;i++){ h=Math.imul(h ^ input.charCodeAt(i),3432918353); h=(h<<13)|(h>>>19);} return (h>>>0)||1; }
function mulberry32(a:number){ return function(){ let t=(a+=0x6d2b79f5); t=Math.imul(t^(t>>>15),t|1); t^=t+Math.imul(t^(t>>>7),t|61); return ((t^(t>>>14))>>>0)/4294967296;};}
function seededLine(rand:()=>number):6|7|8|9{ const tosses=Array.from({length:3},()=>rand()<0.5?2:3); return tosses.reduce((a,b)=>a+b,0) as 6|7|8|9; }
function relation(self:string, other:string){ const a=fiveElements.indexOf(self as any); const b=fiveElements.indexOf(other as any); return sixRelations[(b-a+5)%5]; }
function generatedBy(el:string){ return Object.keys(generates).find(k=>generates[k]===el)||""; }
function controlledBy(el:string){ return Object.keys(controls).find(k=>controls[k]===el)||""; }
function elementInteract(a:string,b:string){ if(a===b) return "同类"; if(generates[a]===b) return "生"; if(generates[b]===a) return "受生"; if(controls[a]===b) return "克"; if(controls[b]===a) return "受克"; return "平"; }
function getBinary(lines:number[]){ return lines.map(n => lineMap[n as 6|7|8|9].yin ? 0 : 1); }
function getTrigram(lines:number[]){ const bits=getBinary(lines); return { lower:trigramMap[bits.slice(0,3).join("")], upper:trigramMap[bits.slice(3,6).join("")] }; }
function getChangedLines(lines:number[]){ return lines.map(n => lineMap[n as 6|7|8|9].changed); }
function timeCast(question:string, dt:Date){ const seed=hashSeed(`${question}|${dt.getFullYear()}-${dt.getMonth()+1}-${dt.getDate()} ${dt.getHours()}:${dt.getMinutes()}`); const rand=mulberry32(seed); return Array.from({length:6},()=>seededLine(rand)); }
function pickMonthBranch(dt:Date){ return earthlyBranches[dt.getMonth()%12]; }
function pickDayBranch(dt:Date){ const dayNum=Math.floor(dt.getTime()/86400000); return earthlyBranches[((dayNum%12)+12)%12]; }
function pickDayStem(dt:Date){ const dayNum=Math.floor(dt.getTime()/86400000); return heavenlyStems[((dayNum%10)+10)%10]; }
function getEmptyBranches(dayStem:string){ const idx=heavenlyStems.indexOf(dayStem); return [earthlyBranches[(idx+10)%12], earthlyBranches[(idx+11)%12]]; }
function getSixGodOrder(dayStem:string){ const s=heavenlyStems.indexOf(dayStem)%6; return Array.from({length:6},(_,i)=>sixGods[(s+i)%6]); }
function formatShortDate(date:Date|null){ if(!date) return ""; const y=date.getFullYear(); const m=String(date.getMonth()+1).padStart(2,"0"); const d=String(date.getDate()).padStart(2,"0"); return `${y}-${m}-${d}`; }
function formatTime(dt:Date){ return `${dt.getFullYear()}-${String(dt.getMonth()+1).padStart(2,"0")}-${String(dt.getDate()).padStart(2,"0")} ${String(dt.getHours()).padStart(2,"0")}:${String(dt.getMinutes()).padStart(2,"0")}`; }

function buildLines(lines:number[], dt:Date){
  const trigram=getTrigram(lines);
  const palace=trigramElements[trigram.lower];
  const branchSeed=trigram.lower.charCodeAt(0)+trigram.upper.charCodeAt(0);
  const world=(branchSeed%6)+1;
  let response=world+3; if(response>6) response-=6;
  const empties=getEmptyBranches(pickDayStem(dt));
  const gods=getSixGodOrder(pickDayStem(dt));
  return lines.map((line,i)=> {
    const element=trigramElements[i<3?trigram.lower:trigram.upper];
    const branch=earthlyBranches[(branchSeed+i*2)%12];
    return {
      line:i+1, raw:line, symbol:lineMap[line as 6|7|8|9].symbol, moving:lineMap[line as 6|7|8|9].moving,
      relation:relation(palace,element), element, branch, god:gods[i], empty:empties.includes(branch),
      isWorld:i+1===world, isResponse:i+1===response, hiddenGod:i%2===0 ? relation(palace, generatedBy(element)||element) : "—"
    };
  });
}

function scoreLineStrength(item:any, monthBranch:string, dayBranch:string){
  let score=50; const monthElement=branchElements[monthBranch]; const dayElement=branchElements[dayBranch];
  if(seasonSupport[item.element]?.includes(monthBranch)) score+=22;
  if(monthElement===item.element) score+=10;
  if(monthElement===generatedBy(item.element)) score+=12;
  if(monthElement===controlledBy(item.element)) score-=16;
  if(dayElement===item.element) score+=8;
  if(dayElement===generatedBy(item.element)) score+=6;
  if(dayElement===controlledBy(item.element)) score-=8;
  if(item.moving) score+=10; if(item.isWorld) score+=4; if(item.isResponse) score+=2; if(item.empty) score-=10;
  if(branchClash[item.branch]===monthBranch || branchClash[item.branch]===dayBranch) score-=8;
  if(branchCombine[item.branch]===monthBranch || branchCombine[item.branch]===dayBranch) score+=6;
  let level="平"; if(score>=82) level="旺"; else if(score>=66) level="相"; else if(score>=30 && score<46) level="休"; else if(score<30) level="囚";
  return { score, level };
}

function analyzeInteractions(items:any[], monthBranch:string, dayBranch:string){
  const notes:string[]=[];
  items.forEach(item=>{
    if(branchClash[item.branch]===dayBranch) notes.push(`${item.line}爻逢日冲`);
    if(branchClash[item.branch]===monthBranch) notes.push(`${item.line}爻逢月冲`);
    if(branchCombine[item.branch]===dayBranch || branchCombine[item.branch]===monthBranch) notes.push(`${item.line}爻逢合`);
  });
  return Array.from(new Set(notes));
}

function analyzeSixChongLiuHe(origin:any){
  const pair=`${origin.upper}${origin.lower}`;
  const sixChongPairs=["乾坤","坎离","震巽","艮兑"];
  const liuhePairs=["乾巽","坤震","坎兑","离艮"];
  if(sixChongPairs.includes(pair) || sixChongPairs.includes(`${origin.lower}${origin.upper}`)) return { type:"六冲", text:"六冲卦气偏动，事多反复、变化快。" };
  if(liuhePairs.includes(pair) || liuhePairs.includes(`${origin.lower}${origin.upper}`)) return { type:"六合", text:"六合卦气偏合，事多有牵连、缓和、黏性。" };
  return { type:"普通", text:"本卦不以六冲六合为主，需回到世应与用神。" };
}

function findUseGod(category:string, lineItems:any[]){
  const cfg=categoryConfig[category] || categoryConfig["综合"];
  const targets=cfg.useGod;
  const filtered=lineItems.filter((x:any)=>targets.includes(x.relation));
  const sorted=[...filtered].sort((a:any,b:any)=>b.strength.score-a.strength.score);
  return { targets, all:filtered, best:sorted[0]||null };
}

function getNearestBranchDay(targetBranch:string, baseDate:Date){
  const start=new Date(baseDate); start.setHours(0,0,0,0);
  const baseDayNum=Math.floor(start.getTime()/86400000);
  for(let i=0;i<14;i++){ const branch=earthlyBranches[((baseDayNum+i)%12+12)%12]; if(branch===targetBranch){ const d=new Date(start); d.setDate(start.getDate()+i); return d; } }
  return null;
}

function buildTimingPrediction(useGod:any, movingLines:any[], baseDate:Date){
  if(!useGod?.best){
    let rangeText="大致在 1~2 周内会有变化";
    if(movingLines.length===0) rangeText="短期变化不明显，可能在 2~4 周内才有动静";
    if(movingLines.length>=3) rangeText="变化较多，可能反复，在 1~3 周内逐渐显现";
    return { shortText:"应期不集中，但已有动象", fullText:`当前用神不明确，但卦中已有动象，${rangeText}。`, exactDateText:"无明确对应日，建议观察近期变化节点。", rangeText };
  }
  const targetBranch=useGod.best.branch;
  const nearestDay=getNearestBranchDay(targetBranch, baseDate);
  const level=useGod.best.strength.level;
  let speedText="时间不会特别快";
  let rangeText="大致在一月内慢慢显形";
  if(["旺","相"].includes(level)){ speedText="应期偏快"; rangeText=movingLines.length===0 ? "大致在 7~14 天内见眉目" : "大致在 3~7 天内先见动静"; }
  else if(level==="平"){ speedText="应期中等"; rangeText=movingLines.length===0 ? "大致在 2~4 周内见分晓" : "大致在 1~2 周内会先有变化"; }
  else { speedText="应期偏慢"; rangeText=movingLines.length===0 ? "大致在 1~2 个月内缓慢推进" : "大致先拖一拖，再在 2~4 周内见转机"; }
  let movingText="事情会按正常节奏推进";
  if(movingLines.length===0) movingText="卦静为主，多半不会立刻见事";
  else if(movingLines.length===1) movingText="动象单纯，往往较快见应";
  else if(movingLines.length===2) movingText="动象不算少，常见先动后明";
  else movingText="动象较多，常常先动后定，中间会有反复";
  const exactDateText=nearestDay ? `${targetBranch}日是最近的重点应期，约在 ${formatShortDate(nearestDay)} 前后。` : `${targetBranch}日是重点应期。`;
  const nearDayText=nearestDay ? `最近可重点留意 ${targetBranch}日（约 ${formatShortDate(nearestDay)}）前后。` : `可重点留意 ${targetBranch}日附近。`;
  return {
    shortText: nearestDay ? `${speedText}，重点看 ${targetBranch}日（约 ${formatShortDate(nearestDay)}）前后` : `${speedText}，重点看 ${targetBranch}日前后`,
    fullText:`应期上看，${speedText}。${rangeText}。用神落${targetBranch}，${nearDayText}${movingText}。`,
    exactDateText, rangeText, targetBranch, nearestDay:nearestDay ? formatShortDate(nearestDay) : ""
  };
}

function buildPlainSummary(verdict:string, category:string, useGod:any, world:any, response:any, movingLines:any[], interactions:string[], timingPrediction:any){
  const useGodWeak=!!useGod?.best && ["休","囚"].includes(useGod.best.strength.level);
  const useGodStrong=!!useGod?.best && ["旺","相"].includes(useGod.best.strength.level);
  const worldWeak=!!world && ["休","囚"].includes(world.strength.level);
  const worldStrong=!!world && ["旺","相"].includes(world.strength.level);
  const hasChong=interactions.some(x=>x.includes("冲"));
  const hasPo=interactions.some(x=>x.includes("破"));
  const hasHe=interactions.some(x=>x.includes("合"));
  const movingMany=movingLines.length>=3;
  let sentence="这件事还不稳定，需要再观察一下。";
  if(verdict==="吉" && useGodStrong && worldStrong) sentence="这件事整体是能成的，可以主动去推进。";
  else if(useGodStrong && worldWeak) sentence="机会是有的，但你现在状态不太够，容易接不住。";
  else if(useGodWeak && worldWeak) sentence="这件事比较难成，条件和人都不太给力。";
  else if(verdict==="凶") sentence="这件事不太顺，越强推越容易出问题。";
  let full=sentence;
  if(useGodWeak) full+=" 用神偏弱";
  if(useGodStrong) full+=" 用神有力";
  if(worldWeak) full+="，你这边也偏弱";
  if(worldStrong) full+="，你这边状态不错";
  if(movingMany) full+="，变化比较多";
  if(hasChong) full+="，有冲";
  if(hasPo) full+="，有破";
  if(hasHe) full+="，被合住";
  full+="。";
  if(movingMany) full+="过程不会一条线走完，中间会反复。";
  if(hasChong || hasPo) full+="中途容易出现变化或被打断。";
  let triggerText="";
  if(hasChong) triggerText="一般要等冲开的时候才会明显推进";
  else if(hasHe) triggerText="目前有被拖住的感觉，要等松开才会动";
  else if(hasPo) triggerText="往往在出问题或变化点时反而会有结果";
  else if(movingLines.length>0) triggerText="事情其实已经在动了，只是还没完全显现";
  else triggerText="需要等外部条件触发才会有明显变化";
  full+=` ${triggerText}。`;
  if(timingPrediction?.rangeText) full+=`时间上看，${timingPrediction.rangeText}。`;
  if(timingPrediction?.exactDateText) full+=timingPrediction.exactDateText;
  const action = ({
    求财: worldWeak || useGodWeak ? "先稳住，再慢慢推进。" : "可以尝试推进，但别贪快。",
    感情: response?.strength?.score && world?.strength?.score && response.strength.score > world.strength.score ? "先观察对方，再决定下一步。" : "顺其自然，不要强求。",
    考试: useGodWeak ? "先补基础，不要急着冲。" : "按节奏来，稳定发挥。",
    工作: worldWeak ? "先稳住局面，再找机会。" : "讲策略，不要硬顶。",
    健康: "以休息和检查为主，别硬扛。",
    综合: "顺势而行。",
  } as Record<string,string>)[category] || "顺势而行。";
  full += ` 建议：${action}`;
  return { finalText: full };
}

function buildReading(question:string, dt:Date, lines:number[]){
  const category=detectCategory(question);
  const monthBranch=pickMonthBranch(dt);
  const dayBranch=pickDayBranch(dt);
  const dayStem=pickDayStem(dt);
  const origin=getTrigram(lines);
  const changed=getTrigram(getChangedLines(lines));
  const baseItems=buildLines(lines,dt);
  const items=baseItems.map(x=>({ ...x, strength: scoreLineStrength(x, monthBranch, dayBranch) }));
  const changedBase=buildLines(getChangedLines(lines), dt);
  const changedItems=changedBase.map((x,idx)=>({ ...x, strength: scoreLineStrength(x, monthBranch, dayBranch), transform: elementInteract(x.element, baseItems[idx].element).includes("生") ? "回头生" : elementInteract(x.element, baseItems[idx].element).includes("克") ? "回头克" : "回头平", advance:"平", fushen:baseItems[idx].hiddenGod, feishen:baseItems[idx].relation }));
  const world=items.find(x=>x.isWorld);
  const response=items.find(x=>x.isResponse);
  const movingLines=items.filter(x=>x.moving);
  const useGod=findUseGod(category, items);
  const interactions=analyzeInteractions(items, monthBranch, dayBranch);
  const six=analyzeSixChongLiuHe(origin);
  const worldToResponse=world && response ? elementInteract(world.element, response.element) : "平";
  let score=50;
  const engineReasons:string[]=[];
  if(useGod.best){ score += (useGod.best.strength.score-50)*0.6; engineReasons.push(`用神最强点在第${useGod.best.line}爻，旺衰${useGod.best.strength.level}`); if(useGod.best.moving) engineReasons.push("用神发动"); if(useGod.best.empty) engineReasons.push("用神旬空"); }
  else engineReasons.push("用神不集中");
  if(world){ score += (world.strength.score-50)*0.25; engineReasons.push(`世爻${world.strength.level}`); }
  if(response){ score += (response.strength.score-50)*0.15; engineReasons.push(`应爻${response.strength.level}`); }
  if(worldToResponse==="生" || worldToResponse==="受生"){ score += 6; engineReasons.push("世应有生助"); }
  if(worldToResponse==="克" || worldToResponse==="受克"){ score -= 6; engineReasons.push("世应有克制"); }
  if(interactions.some(x=>x.includes("月冲") || x.includes("见破"))){ score -= 8; engineReasons.push("见月冲/破"); }
  if(interactions.some(x=>x.includes("逢合"))){ score += 4; engineReasons.push("有合象"); }
  if(six.type==="六冲"){ score -= 4; engineReasons.push("六冲卦"); }
  if(six.type==="六合"){ score += 4; engineReasons.push("六合卦"); }
  const finalScore=Math.max(0,Math.min(100,Math.round(score)));
  let verdict="中平"; if(finalScore>=72) verdict="吉"; else if(finalScore>=42 && finalScore<56) verdict="偏凶"; else if(finalScore<42) verdict="凶";
  const timingPrediction=buildTimingPrediction(useGod, movingLines, dt);
  const plainSummary=buildPlainSummary(verdict, category, useGod, world, response, movingLines, interactions, timingPrediction);
  return {
    category, timing:formatTime(dt), monthBranch, dayBranch, dayStem, origin, changed, items, changedItems, finalScore, verdict, engineReasons,
    summary:`你问的是“${question || category}”。本卦 ${origin.upper}${origin.lower}，变卦 ${changed.upper}${changed.lower}。以月建 ${monthBranch}、日辰 ${dayBranch} 参断，规则引擎评分为 ${finalScore} 分，当前判断：${verdict}。`,
    useGodText: useGod.best ? `本题用神取 ${useGod.targets.join("、")}。卦中最有力者为第 ${useGod.best.line} 爻 ${useGod.best.relation}，五行 ${useGod.best.element}，地支 ${useGod.best.branch}，旺衰 ${useGod.best.strength.level}（${useGod.best.strength.score} 分）。` : `本题用神取 ${useGod.targets.join("、")}。当前卦中没有明显主导用神，宜以世应、动变和整体格局为主。`,
    worldText: world && response ? `世爻在第 ${world.line} 爻，旺衰 ${world.strength.level}；应爻在第 ${response.line} 爻，旺衰 ${response.strength.level}。世应关系为“${worldToResponse}”。` : "世应信息不足，当前以整体卦势判断。",
    movingText: movingLines.length ? `动爻出现在 ${movingLines.map(x=>`${x.line}爻`).join("、")}。` : "本卦静爻为主，短期内大方向相对稳定。",
    monthDayText:`月建主大环境，日辰主眼前触发。${six.text}`,
    changedText: interactions.length ? `规则引擎捕捉到：${interactions.join("、")}。` : "未见明显合冲刑害破主导，仍以旺衰与世应为主。",
    advancedAdvice:[`判断主轴：${categoryConfig[category]?.focus || "先看世应用神。"}`,"先看用神，再看世爻，再看应爻与动变。","月建管背景，日辰管触发。"],
    plainSummary, timingPrediction
  };
}

function exportText(reading:any, question:string){
  const text = [
    `问题：${question || "综合占问"}`,
    `起卦时间：${reading.timing}`,
    `类别：${reading.category}`,
    `月建/日辰：${reading.monthBranch}月 ${reading.dayStem}${reading.dayBranch}日`,
    `本卦/变卦：${reading.origin.upper}${reading.origin.lower} → ${reading.changed.upper}${reading.changed.lower}`,
    `规则引擎评分：${reading.finalScore}`,
    `自动结论：${reading.verdict}`,
    `应期：${reading.timingPrediction.shortText}`,
    `具体日期：${reading.timingPrediction.exactDateText}`,
    `时间范围：${reading.timingPrediction.rangeText}`,
    "",
    `总断：${reading.summary}`,
    `断语：${reading.plainSummary.finalText}`,
  ].join("\n");
  const blob=new Blob([text],{type:"text/plain;charset=utf-8"});
  const url=URL.createObjectURL(blob);
  const a=document.createElement("a");
  a.href=url; a.download=`六爻断卦结果_${reading.timing.replace(/[: ]/g,"-")}.txt`; a.click(); URL.revokeObjectURL(url);
}

function printHtml(reading:any, question:string){
  const html=`<html><head><meta charset="utf-8" /><title>六爻专业排盘单</title></head><body><h1>六爻专业排盘单</h1><p>问题：${question || "综合占问"}</p><p>${reading.plainSummary.finalText}</p></body></html>`;
  const w=window.open("","_blank"); if(!w) return; w.document.open(); w.document.write(html); w.document.close(); w.focus(); setTimeout(()=>w.print(),300);
}

function LineRow({ item, changed }:{ item:any; changed:any }){
  return (
    <div className="line">
      <div className="linegrid">
        <div>第{item.line}爻</div><div style={{fontWeight:700}}>{item.symbol}</div><div>{item.relation}</div><div>{item.element}</div><div>{item.branch}</div><div>{item.god}</div><div>{item.strength.level}</div><div>{item.isWorld?"世":item.isResponse?"应":item.empty?"空":""}</div><div>{item.moving?"动":"静"}</div><div>→ {changed.relation}{changed.element}</div>
      </div>
      <div className="small" style={{marginTop:8}}>伏神：{changed.fushen}｜飞神：{changed.feishen}｜{changed.transform}｜{changed.advance}</div>
    </div>
  );
}

function StatCard({ title, value, icon }:{ title:string; value:string; icon:React.ReactNode }){
  return <div className="stat"><div className="k" style={{display:"flex",alignItems:"center",gap:8}}>{icon}{title}</div><div className="v">{value}</div></div>;
}

function runSelfChecks(){
  console.assert(detectCategory("我这次考试能不能过")==="考试","分类：考试失败");
  console.assert(detectCategory("我最近财运如何")==="求财","分类：求财失败");
  console.assert(getChangedLines([6,7,8,9,7,8]).length===6,"变爻长度失败");
  console.assert(formatShortDate(new Date("2026-03-25T00:00:00"))==="2026-03-25","日期格式失败");
}
runSelfChecks();

export default function Page(){
  const [question,setQuestion]=useState("");
  const [customTime,setCustomTime]=useState("");
  const [lines,setLines]=useState<number[]>([]);
  const [castTime,setCastTime]=useState<Date|null>(null);
  const [tab,setTab]=useState("summary");
  const reading=useMemo(()=>{ if(!castTime || lines.length!==6) return null; return buildReading(question || "综合占问", castTime, lines); }, [question, castTime, lines]);

  const castNow=()=>{ const now=customTime ? new Date(customTime) : new Date(); if(Number.isNaN(now.getTime())) return; setCastTime(now); setLines(timeCast(question || "综合占问", now)); };
  const reset=()=>{ setQuestion(""); setCustomTime(""); setLines([]); setCastTime(null); };

  return (
    <div className="container">
      <div className="card">
        <div style={{display:"flex",alignItems:"flex-start",justifyContent:"space-between",gap:16,flexWrap:"wrap"}}>
          <div>
            <div className="subtle" style={{display:"flex",alignItems:"center",gap:8}}><BookOpen size={16}/>专业排盘单导出版小程序</div>
            <div style={{fontSize:32,fontWeight:800,marginTop:8}}>六爻专业排盘、自动应期与大师断语</div>
            <div className="subtle" style={{marginTop:10}}>这一版新增了自动应期推算，并把结果页升级成更清晰的结论优先布局。</div>
          </div>
          <div className="badge">Next.js 版</div>
        </div>
      </div>

      <div style={{height:16}} />
      <div className="card">
        <div style={{fontSize:22,fontWeight:700,marginBottom:16}}>输入问题并起卦</div>
        <div className="grid g2">
          <div>
            <div className="subtle" style={{marginBottom:6}}>问题</div>
            <textarea value={question} onChange={(e)=>setQuestion(e.target.value)} placeholder="例如：我接下来三个月求财运势如何？这次考试能否顺利通过？" />
          </div>
          <div>
            <div className="subtle" style={{marginBottom:6}}>可选：自定义起卦时间</div>
            <input type="datetime-local" value={customTime} onChange={(e)=>setCustomTime(e.target.value)} />
            <div style={{height:16}} />
            <div className="row">
              <button className="btn primary" onClick={castNow}><Clock3 size={16} style={{marginRight:6}}/>起卦并断</button>
              <button className="btn" onClick={reset}><RotateCcw size={16} style={{marginRight:6}}/>重置</button>
              {reading && <button className="btn" onClick={()=>exportText(reading,question)}><Download size={16} style={{marginRight:6}}/>导出TXT</button>}
              {reading && <button className="btn" onClick={()=>printHtml(reading,question)}><Printer size={16} style={{marginRight:6}}/>打印排盘单</button>}
            </div>
          </div>
        </div>
      </div>

      {reading && <>
        <div style={{height:16}} />
        <div className="row">
          <button className={`tab ${tab==="summary"?"active":""}`} onClick={()=>setTab("summary")}>总结</button>
          <button className={`tab ${tab==="sheet"?"active":""}`} onClick={()=>setTab("sheet")}>排盘单</button>
          <button className={`tab ${tab==="chart"?"active":""}`} onClick={()=>setTab("chart")}>排盘明细</button>
          <button className={`tab ${tab==="analysis"?"active":""}`} onClick={()=>setTab("analysis")}>专业分析</button>
        </div>

        <div style={{height:16}} />

        {tab==="summary" && <div className="grid g3">
          <div className="card" style={{gridColumn:"span 2"}}>
            <div style={{fontSize:22,fontWeight:700,display:"flex",alignItems:"center",gap:8}}><Sparkles size={20}/>大师断语</div>
            <div style={{height:16}} />
            <div className="note big">{reading.plainSummary.finalText}</div>
            <div style={{height:16}} />
            <div className="grid g2">
              <div className="note soft">
                <div className="subtle">自动应期</div>
                <div className="big" style={{marginTop:8}}>{reading.timingPrediction.fullText}</div>
                <div className="small" style={{marginTop:8}}>具体日期：{reading.timingPrediction.exactDateText}</div>
                <div className="small" style={{marginTop:4}}>时间范围：{reading.timingPrediction.rangeText}</div>
              </div>
              <div className="note soft">
                <div className="subtle">规则引擎摘要</div>
                <div className="big" style={{marginTop:8}}>{reading.engineReasons.join("、")}</div>
              </div>
            </div>
          </div>
          <div className="card">
            <div style={{fontSize:22,fontWeight:700,marginBottom:12}}>核心指标</div>
            <div className="grid">
              <StatCard title="结论" value={reading.verdict} icon={<Sparkles size={16} />} />
              <StatCard title="评分" value={String(reading.finalScore)} icon={<Activity size={16} />} />
              <StatCard title="应期" value={reading.timingPrediction.shortText} icon={<CalendarClock size={16} />} />
              <StatCard title="本卦 / 变卦" value={`${reading.origin.upper}${reading.origin.lower} → ${reading.changed.upper}${reading.changed.lower}`} icon={<ScrollText size={16} />} />
            </div>
          </div>
        </div>}

        {tab==="sheet" && <div className="card">
          <div style={{display:"flex",justifyContent:"space-between",gap:16,flexWrap:"wrap",borderBottom:"1px solid var(--border)",paddingBottom:16}}>
            <div><div style={{fontSize:28,fontWeight:800}}>六爻专业排盘单</div><div className="subtle" style={{marginTop:8}}>适合打印、存档、复盘</div></div>
            <div className="subtle" style={{textAlign:"right"}}><div>{reading.timing}</div><div>{reading.monthBranch}月 / {reading.dayStem}{reading.dayBranch}日</div></div>
          </div>
          <div style={{height:16}} />
          <div className="grid g4">
            <StatCard title="问题" value={question || "综合占问"} icon={<BookOpen size={16} />} />
            <StatCard title="类别" value={reading.category} icon={<ScrollText size={16} />} />
            <StatCard title="结论 / 评分" value={`${reading.verdict} / ${reading.finalScore}`} icon={<Sparkles size={16} />} />
            <StatCard title="应期" value={reading.timingPrediction.shortText} icon={<CalendarClock size={16} />} />
          </div>
          <div style={{height:16}} />
          <div className="grid">
            <div className="note"><div style={{fontWeight:700,marginBottom:8}}>大师断语</div><div className="big">{reading.plainSummary.finalText}</div></div>
            <div className="note"><div style={{fontWeight:700,marginBottom:8}}>用神</div><div>{reading.useGodText}</div></div>
            <div className="note"><div style={{fontWeight:700,marginBottom:8}}>世应</div><div>{reading.worldText}</div></div>
            <div className="note"><div style={{fontWeight:700,marginBottom:8}}>应期推算</div><div>{reading.timingPrediction.fullText}</div><div className="small" style={{marginTop:8}}>{reading.timingPrediction.exactDateText}</div><div className="small" style={{marginTop:4}}>{reading.timingPrediction.rangeText}</div></div>
            <div className="note"><div style={{fontWeight:700,marginBottom:8}}>动变与规则</div><div>{reading.movingText}</div><div className="small" style={{marginTop:8}}>{reading.changedText}</div></div>
          </div>
          <div style={{height:16}} />
          <div className="note">
            <div style={{fontWeight:700,marginBottom:12}}>排盘表</div>
            <div className="grid">
              {reading.items.map((item:any, idx:number)=><LineRow key={item.line} item={item} changed={reading.changedItems[idx]} />)}
            </div>
          </div>
        </div>}

        {tab==="chart" && <div className="card"><div style={{fontSize:22,fontWeight:700,marginBottom:12}}>排盘明细</div><div className="grid">{reading.items.map((item:any, idx:number)=><LineRow key={item.line} item={item} changed={reading.changedItems[idx]} />)}</div></div>}

        {tab==="analysis" && <div className="card"><div style={{fontSize:22,fontWeight:700,marginBottom:12}}>专业分析</div><div className="grid">
          <div className="note soft">{reading.summary}</div>
          <div className="note">{reading.monthDayText}</div>
          <div className="note"><div>{reading.timingPrediction.fullText}</div><div className="small" style={{marginTop:8}}>{reading.timingPrediction.exactDateText}</div><div className="small" style={{marginTop:4}}>{reading.timingPrediction.rangeText}</div></div>
          <div className="note">{reading.changedText}</div>
          {reading.advancedAdvice.map((item:string, idx:number)=><div key={idx} className="note soft">{idx+1}. {item}</div>)}
        </div></div>}
      </>}
    </div>
  );
}
