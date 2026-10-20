// 成就系统冒烟测试：直接 import 真实源码 src/core/achievements.js
// （不同于 smoke/test.mjs——那一份 import 的是 smoke/ 下的副本，副本已与 src 不同步。）
//
// 运行：node smoke/achievements.test.mjs

import { readFileSync } from 'node:fs';

import {
  ACHIEVEMENTS,
  TIERS,
  CATEGORY_GROUPS,
  COMMON_LEVELS,
  normalizeLevel,
  buildSummary,
  evaluate,
  findNewlyUnlocked,
  groupByCategory,
} from '../src/core/achievements.js';

let fail = 0;
const ok = (cond, msg) => {
  if (!cond) { fail++; console.log('  FAIL:', msg); }
};

// ============================================
// 1. 定义表完整性
// ============================================
ok(ACHIEVEMENTS.length === 49, `成就总数应为 49，实际 ${ACHIEVEMENTS.length}`);

const ids = ACHIEVEMENTS.map((a) => a.id);
ok(new Set(ids).size === ids.length, '成就 id 无重复');

ACHIEVEMENTS.forEach((a) => {
  ok(typeof a.id === 'string' && a.id.length > 0, `${a.id} 有 id`);
  ok(typeof a.name === 'string' && a.name.length > 0, `${a.id} 有名称`);
  ok(typeof a.icon === 'string' && a.icon.length > 0, `${a.id} 有图标`);
  ok(typeof a.desc === 'string' && a.desc.length > 0, `${a.id} 有条件说明`);
  ok(!!TIERS[a.tier], `${a.id} 稀有度 ${a.tier} 合法`);
  ok(CATEGORY_GROUPS.some((g) => g.key === a.group), `${a.id} 分区 ${a.group} 合法`);
  ok(typeof a.target === 'number' && a.target >= 1, `${a.id} 阈值 >= 1`);
  ok(typeof a.value === 'function', `${a.id} 有 value 函数`);
});

// 分组计数（对应计划书 A~F 档）
const groupCount = {};
ACHIEVEMENTS.forEach((a) => { groupCount[a.group] = (groupCount[a.group] || 0) + 1; });
ok(groupCount.A === 8, `A 档 8 个，实际 ${groupCount.A}`);
ok(groupCount.B === 6, `B 档 6 个，实际 ${groupCount.B}`);
ok(groupCount.C === 4, `C 档 4 个，实际 ${groupCount.C}`);
ok(groupCount.D === 3, `D 档 3 个，实际 ${groupCount.D}`);
ok(groupCount.E === 4, `E 档 4 个，实际 ${groupCount.E}`);
ok(groupCount.F === 6, `F 档 6 个，实际 ${groupCount.F}`);
ok(groupCount.G === 18, `G 档 18 个，实际 ${groupCount.G}`);

// ============================================
// 2. 空上下文：不应有任何成就达成
// ============================================
const emptySummary = buildSummary({});
ok(emptySummary.totalDraws === 0 && emptySummary.streakDays === 0, '空上下文统计为 0');
ok(evaluate(emptySummary).every((i) => !i.unlocked), '空上下文无任何成就达成');
ok(evaluate(emptySummary).every((i) => i.current === 0), '空上下文所有进度为 0');

// 完全不传参也不应抛错
ok(evaluate(buildSummary()).every((i) => !i.unlocked), 'buildSummary() 无参可用');

// ============================================
// 3. 构造上下文的辅助函数
// ============================================
// 每个成就对应一个「可控指标」，按指标名与数值造一份上下文，
// 用于对该成就做「恰好达标 / 差一个」的边界验证。
const SCENE_KEYS = ['daily', 'exam', 'work', 'festival'];

// 2026-03-01 是周日（已核对：2026-01-01 周四，+59 天 = 周日），
// 因此 03-01 / 03-07 / 03-08 是周末，03-01 同时是月初。
const WEEKEND_SAT = '2026-03-07';

// 以 2026-03-01 为基准偏移 i 天
function day(i) {
  const d = new Date(2026, 2, 1);
  d.setDate(d.getDate() + i);
  const p = (x) => String(x).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

function makeContext(metric, n) {
  const ctx = {
    records: [],
    stats: { totalDraws: 0, drawDays: 0, streakDays: 0 },
    events: {},
    features: {},
    isWechatLogin: false,
  };
  // time 为 'HH:mm:ss'
  const push = (level, scene, time, dateKey, title) => {
    ctx.records.push({ level, scene, createdAt: `${dateKey || '2026-03-01'}T${time}`, title });
  };

  switch (metric) {
    case 'totalDraws': ctx.stats.totalDraws = n; break;
    case 'drawDays': ctx.stats.drawDays = n; break;
    case 'streakDays': ctx.stats.streakDays = n; break;
    case 'bestCount': for (let i = 0; i < n; i++) push('上上签', 'daily', '12:00:00'); break;
    case 'premiumCount': for (let i = 0; i < n; i++) push('锦鲤签', 'daily', '12:00:00'); break;
    case 'chargeCount': for (let i = 0; i < n; i++) push('蓄力签', 'daily', '12:00:00'); break;
    case 'midCount': for (let i = 0; i < n; i++) push('中平签', 'daily', '12:00:00'); break;
    case 'commonKinds': for (let i = 0; i < n; i++) push(COMMON_LEVELS[i], 'daily', '12:00:00'); break;
    case 'sceneKinds': for (let i = 0; i < n; i++) push('上上签', SCENE_KEYS[i], '12:00:00'); break;
    case 'sceneExam': for (let i = 0; i < n; i++) push('上上签', 'exam', '12:00:00'); break;
    case 'sceneWork': for (let i = 0; i < n; i++) push('上上签', 'work', '12:00:00'); break;
    case 'sceneFestival': for (let i = 0; i < n; i++) push('上上签', 'festival', '12:00:00'); break;
    // 晨起时段：05:00–08:00
    case 'morningCount': for (let i = 0; i < n; i++) push('上上签', 'daily', '05:00:00'); break;
    // 深夜时段：22:00–05:00
    case 'nightCount': for (let i = 0; i < n; i++) push('上上签', 'daily', '23:00:00'); break;
    case 'maxDayDraws': for (let i = 0; i < n; i++) push('上上签', 'daily', '12:00:00', '2026-03-01'); break;
    case 'deepAnalysisCount': ctx.events.deepAnalysis = n; break;
    case 'posterCount': ctx.events.poster = n; break;
    case 'premiumUnlocked': ctx.features.premiumFortunes = n >= 1; break;
    case 'unlimitedUnlocked': ctx.features.unlimitedDraws = n >= 1; break;
    case 'wechatLogin': ctx.isWechatLogin = n >= 1; break;

    // ---- G 档：连击型 ----
    // 连续 n 个自然日，每天都抽到蓄力签
    case 'chargeDayStreak':
      for (let i = 0; i < n; i++) push('蓄力签', 'daily', '12:00:00', day(i));
      break;
    // 连续 n 次抽签都是蓄力签（数组中相邻）
    case 'chargeDrawStreak':
      for (let i = 0; i < n; i++) push('蓄力签', 'daily', '12:00:00', '2026-03-01');
      break;
    // n 天里每天都有上上签 + 蓄力签
    case 'swingDayCount':
      for (let i = 0; i < n; i++) {
        push('上上签', 'daily', '12:00:00', day(i));
        push('蓄力签', 'daily', '13:00:00', day(i));
      }
      break;

    // ---- G 档：其他搞怪 ----
    // 从未抽到高级签时按累计次数推进，抽到即归零
    case 'noKoiRun': ctx.stats.totalDraws = n; break;
    // 首签等级（不传 stats.firstLevel，走 records 兜底路径）
    case 'firstRecordBest':
      push(n >= 1 ? '上上签' : '中平签', 'daily', '12:00:00');
      break;
    case 'sameSceneStreak': for (let i = 0; i < n; i++) push('中平签', 'exam', '12:00:00'); break;
    case 'maxSceneKindsInDay':
      for (let i = 0; i < n; i++) push('中平签', SCENE_KEYS[i], '12:00:00', '2026-03-01');
      break;
    case 'owlCount': for (let i = 0; i < n; i++) push('上上签', 'daily', '02:00:00'); break;
    case 'symmetricTimeCount': for (let i = 0; i < n; i++) push('上上签', 'daily', '11:11:00'); break;
    case 'onTheDotCount': for (let i = 0; i < n; i++) push('上上签', 'daily', '12:00:00'); break;
    case 'monthStartCount': for (let i = 0; i < n; i++) push('上上签', 'daily', '12:00:00', '2026-03-01'); break;
    case 'weekendCount': for (let i = 0; i < n; i++) push('上上签', 'daily', '12:00:00', WEEKEND_SAT); break;
    // n 次「间隔 < 60s」需要 n+1 条相邻记录，每条间隔 30s
    case 'quickSuccessionCount':
      for (let i = 0; i <= n; i++) {
        const total = 30 * i;
        const mm = String(Math.floor(total / 60)).padStart(2, '0');
        const ss = String(total % 60).padStart(2, '0');
        push('中平签', 'daily', `12:${mm}:${ss}`, '2026-03-01');
      }
      break;
    case 'distinctTitles':
      for (let i = 0; i < n; i++) push('中平签', 'daily', '12:00:00', '2026-03-01', `T${i}`);
      break;
    default: throw new Error('未知指标: ' + metric);
  }
  return ctx;
}

const METRIC_OF = {
  first_draw: 'totalDraws', draw_10: 'totalDraws', draw_50: 'totalDraws',
  draw_100: 'totalDraws', draw_365: 'totalDraws',
  days_3: 'drawDays', days_7: 'drawDays', days_30: 'drawDays',
  first_best: 'bestCount', best_10: 'bestCount',
  first_premium: 'premiumCount', premium_5: 'premiumCount',
  collect_levels: 'commonKinds', first_charge: 'chargeCount',
  scenes_4: 'sceneKinds', exam_10: 'sceneExam', work_10: 'sceneWork', festival_5: 'sceneFestival',
  morning_draw: 'morningCount', night_draw: 'nightCount', day_5: 'maxDayDraws',
  first_deep: 'deepAnalysisCount', premium_unlock: 'premiumUnlocked',
  unlimited_unlock: 'unlimitedUnlocked', wechat_login: 'wechatLogin',
  deep_10: 'deepAnalysisCount', poster_1: 'posterCount', poster_5: 'posterCount',
  streak_3: 'streakDays', streak_7: 'streakDays', streak_30: 'streakDays',

  // G 档·连击型
  charge_day_3: 'chargeDayStreak', charge_day_7: 'chargeDayStreak', charge_day_30: 'chargeDayStreak',
  charge_draw_3: 'chargeDrawStreak',
  swing_day: 'swingDayCount',

  // G 档·其他搞怪
  no_koi: 'noKoiRun', versailles: 'firstRecordBest',
  loyal_scene: 'sameSceneStreak', all_in_one_day: 'maxSceneKindsInDay',
  mid_master: 'midCount', charge_master: 'chargeCount',
  owl: 'owlCount', symmetric_time: 'symmetricTimeCount', on_the_dot: 'onTheDotCount',
  month_start: 'monthStartCount', weekend_warrior: 'weekendCount',
  speed_run: 'quickSuccessionCount', collector: 'distinctTitles',
};

// ============================================
// 4. 逐成就边界验证：target 达标 / target-1 不达标
// ============================================
ACHIEVEMENTS.forEach((a) => {
  const metric = METRIC_OF[a.id];
  ok(!!metric, `${a.id} 已登记可控指标`);
  if (!metric) return;

  const atTarget = evaluate(buildSummary(makeContext(metric, a.target))).find((i) => i.id === a.id);
  ok(atTarget && atTarget.unlocked === true, `${a.id} 达到 ${a.target} 时解锁`);
  ok(atTarget && atTarget.current === a.target, `${a.id} 达标时 current 等于阈值`);

  // 布尔型成就（阈值 1）没有「差一个」的中间态，跳过
  if (a.target > 1) {
    const below = evaluate(buildSummary(makeContext(metric, a.target - 1))).find((i) => i.id === a.id);
    ok(below && below.unlocked === false, `${a.id} 差一个（${a.target - 1}）时不解锁`);
  }
});

// ============================================
// 5. 全量满足：除「已知互斥」外 48 个成就应全部解锁
// ============================================
// `no_koi`（从未抽到高级签）与 B 档 `first_premium` / `premium_5` 天然互斥，
// 全量上下文里既有高级签、又有 400 次抽签，因此它必然不解锁——属刻意设计。
const MUTUALLY_EXCLUSIVE = ['no_koi'];

const fullRecords = [];
// time 为 'HH:mm:ss'
const add = (level, scene, time, dayIdx, title) => {
  fullRecords.push({ level, scene, createdAt: `${day(dayIdx)}T${time}`, title });
};

// ① 连续 10 次同一场景（exam）+ 上上签 10 次 + exam 10 次
for (let i = 0; i < 10; i++) add('上上签', 'exam', '12:00:00', 0);
// ② work 12 次 / ③ festival 6 次
for (let i = 0; i < 12; i++) add('上吉签', 'work', '12:00:00', 1);
for (let i = 0; i < 6; i++) add('中平签', 'festival', '12:00:00', 1);
// ④ 中平签 20 次（人间清醒）
for (let i = 0; i < 20; i++) add('中平签', 'daily', '12:00:00', 2);
// ⑤ 蓄力签 20 + 3 次（蓄力大师 + 蓄力连击）
for (let i = 0; i < 23; i++) add('蓄力签', 'daily', '13:00:00', 2);
// ⑥ 连续 30 个自然日每天都抽到蓄力签（整月蓄力）
for (let i = 0; i < 30; i++) add('蓄力签', 'daily', '14:00:00', i);
// ⑦ 同一天集齐 4 个场景（day0 已有 exam，补齐另外三个）
add('上吉签', 'daily', '15:00:00', 0);
add('中平签', 'work', '15:00:00', 0);
add('蓄力签', 'festival', '15:00:00', 0);
// ⑧ 高级签 6 次
for (let i = 0; i < 6; i++) add('锦鲤签', 'daily', '16:00:00', 3);
// ⑨ 凌晨 0–4 点 5 次（夜猫子本猫），同时是整点
for (let i = 0; i < 5; i++) add('上上签', 'daily', '02:00:00', 4);
// ⑩ 晨起 05–08 三次（整点）
['05:00:00', '06:00:00', '07:00:00'].forEach((t) => add('上上签', 'daily', t, 5));
// ⑪ 对称时刻 11:11
add('上上签', 'daily', '11:11:00', 5);
// ⑫ 周末 5 次（day6 = 2026-03-07 周六）
for (let i = 0; i < 5; i++) add('上上签', 'daily', '12:00:00', 6);
// ⑬ 手速惊人：相邻两条间隔 30 秒
add('中平签', 'daily', '12:00:00', 8);
add('中平签', 'daily', '12:00:30', 8);
// ⑭ 签文收藏家：20 种不同标题
for (let i = 0; i < 20; i++) add('中平签', 'daily', '17:00:00', 9, `签文-${i}`);
// ⑮ 末条为最早的一支签且是上上签（凡尔赛本赛，走 records 兜底路径）
add('上上签', 'daily', '18:00:00', 10);

const fullSummary = buildSummary({
  records: fullRecords,
  stats: { totalDraws: 400, drawDays: 40, streakDays: 40 },
  events: { deepAnalysis: 12, poster: 6 },
  features: { premiumFortunes: true, unlimitedDraws: true },
  isWechatLogin: true,
});
const fullItems = evaluate(fullSummary);
const notUnlocked = fullItems.filter((i) => !i.unlocked).map((i) => i.id);
ok(
  notUnlocked.length === MUTUALLY_EXCLUSIVE.length
    && notUnlocked.every((id) => MUTUALLY_EXCLUSIVE.includes(id)),
  `全量上下文应只差互斥项 ${MUTUALLY_EXCLUSIVE.join(',')}，实际未解锁: ${notUnlocked.join(',') || '无'}`
);
console.log(`全量上下文解锁 ${fullItems.filter((i) => i.unlocked).length} / ${fullItems.length}`);

// ============================================
// 6. 时段口径
// ============================================
const hourSummary = (hour) => buildSummary({
  records: [{ level: '上上签', scene: 'daily', createdAt: `2026-03-01T${String(hour).padStart(2, '0')}:00:00` }],
});
ok(hourSummary(5).morningCount === 1, '05:00 计入晨起');
ok(hourSummary(7).morningCount === 1, '07:00 计入晨起');
ok(hourSummary(8).morningCount === 0, '08:00 不计入晨起（右开区间）');
ok(hourSummary(4).morningCount === 0, '04:00 不计入晨起');
ok(hourSummary(4).nightCount === 1, '04:00 计入深夜');
ok(hourSummary(22).nightCount === 1, '22:00 计入深夜');
ok(hourSummary(23).nightCount === 1, '23:00 计入深夜');
ok(hourSummary(5).nightCount === 0, '05:00 不计入深夜');

// ============================================
// 7. 旧等级名兼容（下吉签 -> 蓄力签）
// ============================================
ok(normalizeLevel('下吉签') === '蓄力签', '旧等级名「下吉签」归一化为「蓄力签」');
ok(normalizeLevel('上上签') === '上上签', '正常等级名不受影响');
const legacySummary = buildSummary({
  records: [
    { level: '上上签', scene: 'daily', createdAt: '2026-03-01T12:00:00' },
    { level: '上吉签', scene: 'daily', createdAt: '2026-03-01T12:00:00' },
    { level: '中平签', scene: 'daily', createdAt: '2026-03-01T12:00:00' },
    { level: '下吉签', scene: 'daily', createdAt: '2026-03-01T12:00:00' },
  ],
});
ok(legacySummary.commonKinds === 4, `含旧名时仍能集齐普通四级，实际 ${legacySummary.commonKinds}`);
ok(legacySummary.chargeCount === 1, '旧名「下吉签」计入蓄力签次数');

// ============================================
// 8. findNewlyUnlocked 差集与幂等
// ============================================
const s1 = buildSummary({ stats: { totalDraws: 1 } });
const fresh1 = findNewlyUnlocked(s1, {});
ok(fresh1.length === 1 && fresh1[0].id === 'first_draw', '首次抽签只解锁「初问苍穹」');
const fresh2 = findNewlyUnlocked(s1, { first_draw: Date.now() });
ok(fresh2.length === 0, '已解锁的成就不会重复上报');

// ============================================
// 9. 进度展示值不越界
// ============================================
const overSummary = buildSummary({ stats: { totalDraws: 999 } });
const over = evaluate(overSummary).find((i) => i.id === 'draw_10');
ok(over.display === 10 && over.current === 999, '超出阈值时 display 截断为阈值，current 保留真实值');

// ============================================
// 10. groupByCategory 分组完整
// ============================================
const wall = groupByCategory(evaluate(emptySummary), {});
ok(wall.length === CATEGORY_GROUPS.length, '分区数量与元数据一致');
ok(wall.reduce((n, g) => n + g.items.length, 0) === ACHIEVEMENTS.length, '分组后成就总数不丢失');
ok(wall.every((g) => g.items.length > 0), '每个分区都有成就');

// ============================================
// 11. 连击中断（连击型成就的核心边界）
// ============================================
const chargeDays = (idxs) => buildSummary({
  records: idxs.map((i) => ({ level: '蓄力签', scene: 'daily', createdAt: `${day(i)}T12:00:00` })),
});
ok(chargeDays([0, 1, 2]).chargeDayStreak === 3, '连续 3 天有蓄力签 -> 连击 3');
ok(chargeDays([0, 1, 3]).chargeDayStreak === 2, '中间断一天 -> 连击按最长段计为 2');
ok(chargeDays([0, 5, 6, 7]).chargeDayStreak === 3, '断签后重新起算 -> 连击 3');
ok(chargeDays([0]).chargeDayStreak === 1, '只有 1 天 -> 连击 1');

const chargeDraws = (levels) => buildSummary({
  records: levels.map((lv) => ({ level: lv, scene: 'daily', createdAt: '2026-03-01T12:00:00' })),
});
ok(chargeDraws(['蓄力签', '蓄力签', '蓄力签']).chargeDrawStreak === 3, '连续 3 次蓄力签 -> 连击 3');
ok(chargeDraws(['蓄力签', '上上签', '蓄力签', '蓄力签']).chargeDrawStreak === 2, '中间被别的等级打断 -> 连击 2');
ok(chargeDraws(['上上签']).chargeDrawStreak === 0, '没有蓄力签 -> 连击 0');

// 起起落落：同一天既有上上签又有蓄力签才算，跨天不算
const swingSame = buildSummary({
  records: [
    { level: '上上签', scene: 'daily', createdAt: '2026-03-01T12:00:00' },
    { level: '蓄力签', scene: 'daily', createdAt: '2026-03-01T13:00:00' },
  ],
});
ok(swingSame.swingDayCount === 1, '同一天上下签都抽到 -> 计 1 天');
const swingCross = buildSummary({
  records: [
    { level: '上上签', scene: 'daily', createdAt: '2026-03-01T12:00:00' },
    { level: '蓄力签', scene: 'daily', createdAt: '2026-03-02T13:00:00' },
  ],
});
ok(swingCross.swingDayCount === 0, '分属两天 -> 不计');

// ============================================
// 12. stats.firstLevel（凡尔赛本赛的抗截断路径）
// ============================================
const viaFirstLevel = buildSummary({
  stats: { firstLevel: '上上签' },
  records: [{ level: '中平签', scene: 'daily', createdAt: '2026-03-01T12:00:00' }],
});
ok(viaFirstLevel.firstRecordBest === true, 'stats.firstLevel 优先于 records 兜底（历史被截断也准）');
ok(buildSummary({ stats: { firstLevel: '下吉签' } }).firstRecordBest === false, '旧等级名「下吉签」不算上上签');
ok(buildSummary({ stats: { firstLevel: '蓄力签' } }).firstRecordBest === false, '首签是蓄力签不算');

// ============================================
// 13. 我不是锦鲤：抽到高级签即归零
// ============================================
ok(buildSummary({ stats: { totalDraws: 40 } }).noKoiRun === 40, '未抽到高级签时按累计次数推进');
ok(
  buildSummary({
    stats: { totalDraws: 40 },
    records: [{ level: '锦鲤签', scene: 'daily', createdAt: '2026-03-01T12:00:00' }],
  }).noKoiRun === 0,
  '抽到高级签后进度归零'
);

// ============================================
// 14. chargeDayStreak 优先读持久化 stats（防 500 条截断）
// ============================================
// Auth 逐次累加的 chargeDayStreak 是精确值，优先于按 records 回算的结果。
const chargeRecords = (idxs) => idxs.map((i) => ({
  level: '蓄力签', scene: 'daily', createdAt: `${day(i)}T12:00:00`,
}));
ok(
  buildSummary({ stats: { chargeDayStreak: 9 }, records: [] }).chargeDayStreak === 9,
  'stats.chargeDayStreak 优先于 records 回算'
);
ok(
  buildSummary({ stats: { chargeDayStreak: 2 }, records: chargeRecords([0, 1, 2, 3, 4]) })
    .chargeDayStreak === 2,
  'records 回算出 5 时仍以 stats 为准'
);
// 老用户没有该字段 -> 回退到按记录回算，不影响既有进度
ok(chargeDays([0, 1, 2]).chargeDayStreak === 3, 'stats 缺字段时回退到 records 回算');

// ============================================
// 15. 云函数成就 id 白名单与前端定义保持一致
// ============================================
// 白名单写在云函数里，新增/删除成就时两处都可能漏改，
// 这条断言把漂移变成测试失败而不是线上脏数据。
const cfPath = new URL('../uniCloud-alipay/cloudfunctions/yqsss-auth/index.js', import.meta.url);
const cfSource = readFileSync(cfPath, 'utf8');
const listMatch = cfSource.match(/VALID_ACHIEVEMENT_IDS\s*=\s*new Set\(\[([\s\S]*?)\]\)/);
ok(!!listMatch, '云函数中存在 VALID_ACHIEVEMENT_IDS 白名单');
if (listMatch) {
  const cloudIds = new Set(
    (listMatch[1].match(/'([a-z0-9_]+)'/g) || []).map((s) => s.slice(1, -1))
  );
  const frontIds = ACHIEVEMENTS.map((a) => a.id);
  const onlyInCloud = frontIds.filter((id) => !cloudIds.has(id));
  const onlyInFront = Array.from(cloudIds).filter((id) => !frontIds.includes(id));
  ok(onlyInCloud.length === 0, `云端白名单缺少成就: ${onlyInCloud.join(',') || '无'}`);
  ok(onlyInFront.length === 0, `云端白名单存在已废弃的成就: ${onlyInFront.join(',') || '无'}`);
  ok(cloudIds.size === frontIds.length, `白名单数量 ${cloudIds.size} 与前端 ${frontIds.length} 一致`);
}

console.log(fail === 0 ? '\n✅ 成就系统全部通过' : `\n❌ 失败 ${fail} 项`);
process.exit(fail === 0 ? 0 : 1);
