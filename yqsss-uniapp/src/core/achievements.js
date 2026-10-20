// ============================================
// 一键上上签 - 成就定义与判定（纯逻辑，平台无关）
// ============================================
// 对应 ACHIEVEMENT_PLAN.md 阶段一：成就定义表。
//
// 约束：本文件只放「纯数据 + 纯函数」，不引用 uni / Storage / Auth / DOM，
// 保持平台无关，便于 Node 直接 import 做单测（见 smoke/achievements.test.mjs）。
//
// 判定模型：
//   buildSummary(输入)  -> 汇总指标（一次遍历算出全部中间量）
//   evaluate(summary)   -> 每个成就的 { current, target, unlocked }
//   findNewlyUnlocked() -> 与已解锁集合做差集，得到本次新解锁

import LevelsCore from './levels.js';

// ---------- 普通签四级（成就「集签有成」的判定集合） ----------
export const COMMON_LEVELS = ['上上签', '上吉签', '中平签', '蓄力签'];

// 历史数据兼容：早期版本把该等级写作「下吉签」，UI 已中性化为「蓄力签」，
// 但用户设备上已落盘的旧记录仍是旧名，统计时统一归一化，否则「集签有成」永远集不齐。
// 别名表本身放在 levels.js（等级元数据的归属地），这里只做转出。
export function normalizeLevel(level) {
  return LevelsCore.normalizeLevel(level);
}

// ---------- 稀有度元数据 ----------
export const TIERS = {
  bronze: { key: 'bronze', label: '铜', badge: '🥉', color: '#CD7F32' },
  silver: { key: 'silver', label: '银', badge: '🥈', color: '#C0C0C0' },
  gold: { key: 'gold', label: '金', badge: '🥇', color: '#FFD133' },
  diamond: { key: 'diamond', label: '钻', badge: '💎', color: '#7ED8F5' },
};

// ---------- 成就墙分区 ----------
export const CATEGORY_GROUPS = [
  { key: 'A', title: '积累之路', desc: '抽得越多，走得越远' },
  { key: 'B', title: '签运时刻', desc: '记录每一次好签' },
  { key: 'C', title: '场景探索', desc: '在不同场景留下足迹' },
  { key: 'D', title: '时段彩蛋', desc: '特定时刻的惊喜' },
  { key: 'E', title: '权益玩法', desc: '解锁更多玩法' },
  { key: 'F', title: '进阶挑战', desc: '坚持与分享' },
  { key: 'G', title: '彩蛋奇遇', desc: '一些没什么用但很好玩的记录' },
];

// ---------- 时段口径（本地时间，与 records 表 UTC+8 的 hour 语义一致） ----------
// 晨起：05:00–08:00（含 05 点整，不含 08 点整）
// 深夜：22:00–05:00（含 22 点整，不含次日 05 点整）
const MORNING_START_HOUR = 5;
const MORNING_END_HOUR = 8;
const NIGHT_START_HOUR = 22;
const NIGHT_END_HOUR = 5;

// 凌晨（0–4 点，含 0 不含 4）：「夜猫子本猫」用，比深夜档更窄
const OWL_START_HOUR = 0;
const OWL_END_HOUR = 4;

// 相邻两次抽签间隔小于该值视为「手速惊人」
const QUICK_SUCCESSION_MS = 60 * 1000;

// ---------- 连续自然日工具 ----------
// 判「相邻自然日」而非时间戳差值：跨时区、跨零点都不会算错。
function isNextDay(prevKey, curKey) {
  const prev = new Date(`${prevKey}T00:00:00`);
  prev.setDate(prev.getDate() + 1);
  const cur = new Date(`${curKey}T00:00:00`);
  return prev.getTime() === cur.getTime();
}

// 一个日期集合里最长的一段「连续自然日」有多长
function longestConsecutiveDays(daySet) {
  const days = Array.from(daySet).sort();
  let longest = 0;
  let run = 0;
  let prevDay = null;
  days.forEach((day) => {
    run = (prevDay && isNextDay(prevDay, day)) ? run + 1 : 1;
    prevDay = day;
    if (run > longest) longest = run;
  });
  return longest;
}

// ============================================
// 成就清单（31 个，A~F 档）
// ============================================
// 每个成就：
//   id      唯一标识（落盘与上报用，一经发布不可改，否则老用户进度丢失）
//   name    展示名（合规：中性鼓励式，不承诺结果）
//   icon    图标
//   desc    达成条件说明
//   tier    稀有度
//   group   分区（成就墙分组）
//   target  达成阈值
//   value   从 summary 取当前进度（纯函数）
//
// 注：ACHIEVEMENT_PLAN.md 正文写「共 30 个」，而 A~F 档清单逐条计数为 31 个，
//     本表以清单为准。G 档「彩蛋奇遇」为后加的搞怪成就（见 ACHIEVEMENT_FUN_PROPOSAL.md）。
//     当前合计：A8 + B6 + C4 + D3 + E4 + F6 + G18 = 49 个。
//
// 已知互斥：`no_koi`（从未抽到高级签）与 B 档 `first_premium` / `premium_5` 互斥，
// 属刻意设计——它是个「非酋挑战」，抽到高级签即清零。

export const ACHIEVEMENTS = [
  // ---------- A 档·积累类 ----------
  {
    id: 'first_draw', name: '初问苍穹', icon: '🏮', tier: 'bronze', group: 'A',
    desc: '完成第一次抽签', target: 1,
    value: (sum) => sum.totalDraws,
  },
  {
    id: 'draw_10', name: '小试牛刀', icon: '✨', tier: 'bronze', group: 'A',
    desc: '累计抽签 10 次', target: 10,
    value: (sum) => sum.totalDraws,
  },
  {
    id: 'draw_50', name: '虔诚祈愿', icon: '🙏', tier: 'silver', group: 'A',
    desc: '累计抽签 50 次', target: 50,
    value: (sum) => sum.totalDraws,
  },
  {
    id: 'draw_100', name: '签不离手', icon: '📜', tier: 'gold', group: 'A',
    desc: '累计抽签 100 次', target: 100,
    value: (sum) => sum.totalDraws,
  },
  {
    id: 'draw_365', name: '签途老友', icon: '🏆', tier: 'diamond', group: 'A',
    desc: '累计抽签 365 次', target: 365,
    value: (sum) => sum.totalDraws,
  },
  {
    id: 'days_3', name: '三日之约', icon: '📅', tier: 'silver', group: 'A',
    desc: '累计 3 天抽签', target: 3,
    value: (sum) => sum.drawDays,
  },
  {
    id: 'days_7', name: '七日打卡', icon: '🗓️', tier: 'gold', group: 'A',
    desc: '累计 7 天抽签', target: 7,
    value: (sum) => sum.drawDays,
  },
  {
    id: 'days_30', name: '月度香客', icon: '🌙', tier: 'diamond', group: 'A',
    desc: '累计 30 天抽签', target: 30,
    value: (sum) => sum.drawDays,
  },

  // ---------- B 档·签运类 ----------
  {
    id: 'first_best', name: '鸿运当头', icon: '🌟', tier: 'silver', group: 'B',
    desc: '首次抽到「上上签」', target: 1,
    value: (sum) => sum.bestCount,
  },
  {
    id: 'best_10', name: '吉星高照', icon: '⭐', tier: 'gold', group: 'B',
    desc: '累计抽到「上上签」10 次', target: 10,
    value: (sum) => sum.bestCount,
  },
  {
    id: 'first_premium', name: '锦鲤附体', icon: '🐟', tier: 'diamond', group: 'B',
    desc: '首次抽到任意高级签', target: 1,
    value: (sum) => sum.premiumCount,
  },
  {
    id: 'premium_5', name: '天选之人', icon: '👑', tier: 'diamond', group: 'B',
    desc: '累计抽到高级签 5 次', target: 5,
    value: (sum) => sum.premiumCount,
  },
  {
    id: 'collect_levels', name: '集签有成', icon: '🎴', tier: 'gold', group: 'B',
    desc: '集齐普通四级签（上上 / 上吉 / 中平 / 蓄力）', target: 4,
    value: (sum) => sum.commonKinds,
  },
  {
    id: 'first_charge', name: '蓄力待发', icon: '💪', tier: 'bronze', group: 'B',
    desc: '抽到「蓄力签」1 次', target: 1,
    value: (sum) => sum.chargeCount,
  },

  // ---------- C 档·场景类 ----------
  {
    id: 'scenes_4', name: '四方祈愿', icon: '🧭', tier: 'silver', group: 'C',
    desc: '四个场景各抽签至少 1 次', target: 4,
    value: (sum) => sum.sceneKinds,
  },
  {
    id: 'exam_10', name: '学业精进', icon: '📚', tier: 'bronze', group: 'C',
    desc: '在「考试通关」场景抽签 10 次', target: 10,
    value: (sum) => sum.sceneCounts.exam,
  },
  {
    id: 'work_10', name: '事业腾达', icon: '💼', tier: 'bronze', group: 'C',
    desc: '在「开工大吉」场景抽签 10 次', target: 10,
    value: (sum) => sum.sceneCounts.work,
  },
  {
    id: 'festival_5', name: '佳节同庆', icon: '🎊', tier: 'bronze', group: 'C',
    desc: '在「节日祈福」场景抽签 5 次', target: 5,
    value: (sum) => sum.sceneCounts.festival,
  },

  // ---------- D 档·时段彩蛋 ----------
  {
    id: 'morning_draw', name: '晨起问签', icon: '🌅', tier: 'bronze', group: 'D',
    desc: '在 05:00–08:00 之间抽签', target: 1,
    value: (sum) => sum.morningCount,
  },
  {
    id: 'night_draw', name: '深夜祈愿', icon: '🌃', tier: 'bronze', group: 'D',
    desc: '在 22:00–05:00 之间抽签', target: 1,
    value: (sum) => sum.nightCount,
  },
  {
    id: 'day_5', name: '一日五签', icon: '⚡', tier: 'silver', group: 'D',
    desc: '单日抽签达到 5 次', target: 5,
    value: (sum) => sum.maxDayDraws,
  },

  // ---------- E 档·权益与玩法 ----------
  // 说明：「深度解签」权益按「每次抽签」计费，出签即被 lockFeature 清除，
  // 因此不能用 isFeatureUnlocked('deepAnalysis') 判定「是否解锁过」，
  // 改为读持久化事件计数 events.deepAnalysis（见 modules/storage.js countFeatureEvent）。
  {
    id: 'first_deep', name: '一探究竟', icon: '🔍', tier: 'bronze', group: 'E',
    desc: '首次解锁深度解签', target: 1,
    value: (sum) => sum.deepAnalysisCount,
  },
  {
    id: 'premium_unlock', name: '锦上添花', icon: '🎁', tier: 'silver', group: 'E',
    desc: '解锁高级签文权益', target: 1,
    value: (sum) => (sum.premiumUnlocked ? 1 : 0),
  },
  {
    id: 'unlimited_unlock', name: '祈愿无限', icon: '♾️', tier: 'silver', group: 'E',
    desc: '解锁无限抽签权益', target: 1,
    value: (sum) => (sum.unlimitedUnlocked ? 1 : 0),
  },
  {
    id: 'wechat_login', name: '正式入门', icon: '✅', tier: 'bronze', group: 'E',
    desc: '完成微信登录', target: 1,
    value: (sum) => (sum.wechatLogin ? 1 : 0),
  },

  // ---------- F 档·进阶（埋点 + 连续天数） ----------
  // 注：计划书 F 档表未给稀有度，此处按 A 档天数梯度对齐作为假定：
  //     3 天=银 / 7 天=金 / 30 天=钻。如需调整只改 tier 字段。
  {
    id: 'deep_10', name: '慧眼识珠', icon: '👁️', tier: 'silver', group: 'F',
    desc: '累计解锁深度解签 10 次', target: 10,
    value: (sum) => sum.deepAnalysisCount,
  },
  {
    id: 'poster_1', name: '妙笔生花', icon: '🎨', tier: 'bronze', group: 'F',
    desc: '首次生成分享海报', target: 1,
    value: (sum) => sum.posterCount,
  },
  {
    id: 'poster_5', name: '广结善缘', icon: '🤝', tier: 'silver', group: 'F',
    desc: '累计生成分享海报 5 次', target: 5,
    value: (sum) => sum.posterCount,
  },
  {
    id: 'streak_3', name: '连续三日', icon: '🔥', tier: 'silver', group: 'F',
    desc: '连续 3 天抽签', target: 3,
    value: (sum) => sum.streakDays,
  },
  {
    id: 'streak_7', name: '连续七日', icon: '🔥', tier: 'gold', group: 'F',
    desc: '连续 7 天抽签', target: 7,
    value: (sum) => sum.streakDays,
  },
  {
    id: 'streak_30', name: '风雨无阻', icon: '🔥', tier: 'diamond', group: 'F',
    desc: '连续 30 天抽签', target: 30,
    value: (sum) => sum.streakDays,
  },

  // ---------- G 档·彩蛋奇遇（搞怪 / 抽象） ----------
  // 设计约束：只用已有数据源（records / stats / events），除 stats.firstLevel 外不新增埋点；
  // 名称保持中性自嘲，不承诺结果，避开命理与「必过 / 转运」类表述（计划书 §5.3）。

  // --- 连击型：连续抽到最差签（项目无「下下签」，最差等级为「蓄力签」） ---
  {
    id: 'charge_day_3', name: '蓄力三连日', icon: '😮‍💨', tier: 'silver', group: 'G',
    desc: '连续 3 个自然日，每天都至少抽到 1 次蓄力签', target: 3,
    value: (sum) => sum.chargeDayStreak,
  },
  {
    id: 'charge_day_7', name: '七日蓄力', icon: '🧘', tier: 'diamond', group: 'G',
    desc: '连续 7 个自然日，每天都至少抽到 1 次蓄力签', target: 7,
    value: (sum) => sum.chargeDayStreak,
  },
  {
    id: 'charge_day_30', name: '整月蓄力', icon: '🪨', tier: 'diamond', group: 'G',
    desc: '连续 30 个自然日，每天都至少抽到 1 次蓄力签', target: 30,
    value: (sum) => sum.chargeDayStreak,
  },
  {
    id: 'charge_draw_3', name: '蓄力连击', icon: '🥲', tier: 'gold', group: 'G',
    desc: '连续 3 次抽签都是蓄力签，中间没被别的等级打断', target: 3,
    value: (sum) => sum.chargeDrawStreak,
  },
  {
    id: 'swing_day', name: '起起落落', icon: '🎢', tier: 'bronze', group: 'G',
    desc: '同一天里既抽到上上签，又抽到蓄力签', target: 1,
    value: (sum) => sum.swingDayCount,
  },

  // --- 其他搞怪型 ---
  {
    id: 'no_koi', name: '我不是锦鲤', icon: '🐟', tier: 'silver', group: 'G',
    desc: '累计抽签 50 次，一次高级签都没抽到（抽到即清零重来）', target: 50,
    value: (sum) => sum.noKoiRun,
  },
  {
    id: 'versailles', name: '凡尔赛本赛', icon: '🤫', tier: 'gold', group: 'G',
    desc: '人生第一支签就是上上签', target: 1,
    value: (sum) => (sum.firstRecordBest ? 1 : 0),
  },
  {
    id: 'loyal_scene', name: '专一至极', icon: '🎯', tier: 'silver', group: 'G',
    desc: '连续 10 次都抽同一个场景', target: 10,
    value: (sum) => sum.sameSceneStreak,
  },
  {
    id: 'all_in_one_day', name: '一日游四景', icon: '🗺️', tier: 'gold', group: 'G',
    desc: '同一天里四个场景各抽了一签', target: 4,
    value: (sum) => sum.maxSceneKindsInDay,
  },
  {
    id: 'mid_master', name: '人间清醒', icon: '😐', tier: 'silver', group: 'G',
    desc: '累计抽到「中平签」20 次', target: 20,
    value: (sum) => sum.midCount,
  },
  {
    id: 'charge_master', name: '蓄力大师', icon: '🔋', tier: 'gold', group: 'G',
    desc: '累计抽到「蓄力签」20 次', target: 20,
    value: (sum) => sum.chargeCount,
  },
  {
    id: 'owl', name: '夜猫子本猫', icon: '🦉', tier: 'silver', group: 'G',
    desc: '在凌晨 00:00–04:00 抽签 5 次', target: 5,
    value: (sum) => sum.owlCount,
  },
  {
    id: 'symmetric_time', name: '对称时刻', icon: '⏰', tier: 'gold', group: 'G',
    desc: '在时分相同的时刻抽签（11:11、22:22、03:03…）', target: 1,
    value: (sum) => sum.symmetricTimeCount,
  },
  {
    id: 'on_the_dot', name: '整点仪式', icon: '🕐', tier: 'bronze', group: 'G',
    desc: '在整点（分钟为 00）抽签 3 次', target: 3,
    value: (sum) => sum.onTheDotCount,
  },
  {
    id: 'month_start', name: '月初仪式感', icon: '📆', tier: 'bronze', group: 'G',
    desc: '在某个月的 1 号抽过签', target: 1,
    value: (sum) => sum.monthStartCount,
  },
  {
    id: 'weekend_warrior', name: '周末签友', icon: '🎈', tier: 'bronze', group: 'G',
    desc: '在周末抽签 5 次', target: 5,
    value: (sum) => sum.weekendCount,
  },
  {
    id: 'speed_run', name: '手速惊人', icon: '💨', tier: 'silver', group: 'G',
    desc: '两次抽签间隔不到 60 秒', target: 1,
    value: (sum) => sum.quickSuccessionCount,
  },
  {
    id: 'collector', name: '签文收藏家', icon: '🗂️', tier: 'gold', group: 'G',
    desc: '抽到过 20 种不同标题的签文', target: 20,
    value: (sum) => sum.distinctTitles,
  },
];

// ============================================
// 汇总指标
// ============================================
// 一次遍历算出全部中间量，避免 31 个成就各自扫一遍记录（本地历史最多 500 条）。
//
// 输入：
//   records        抽签记录数组（本地最多 500 条，或云端全量）
//   stats          Auth.getProfileStats() 的统计字段
//   events         持久化权益事件计数 { deepAnalysis, poster }
//   features       当前权益开关 { premiumFortunes, unlimitedDraws }
//   isWechatLogin  是否微信登录
export function buildSummary(input) {
  const {
    records = [],
    stats = {},
    events = {},
    features = {},
    isWechatLogin = false,
  } = input || {};

  const levelCounts = {};
  const sceneCounts = { daily: 0, exam: 0, work: 0, festival: 0 };
  const dayCounts = {};
  const daySceneMap = {};   // dateKey -> Set(该日抽过的场景)
  const dayLevelMap = {};   // dateKey -> Set(该日抽到的等级)
  const chargeDaySet = new Set();  // 抽到过蓄力签的自然日
  const titleSet = new Set();
  const timestamps = [];

  let morningCount = 0;
  let nightCount = 0;
  let owlCount = 0;
  let symmetricTimeCount = 0;
  let onTheDotCount = 0;
  let monthStartCount = 0;
  let weekendCount = 0;

  // 连续同场景 / 连续蓄力签：都取「最大同值游程」，与扫描方向无关，
  // 因此本地历史是 unshift（新在前）还是 append（旧在前）都不影响结果。
  let sameSceneStreak = 0;
  let sceneRun = 0;
  let prevScene = null;
  let chargeDrawStreak = 0;
  let chargeRun = 0;

  (records || []).forEach((raw) => {
    const record = raw || {};

    const level = normalizeLevel(record.level);
    if (level) levelCounts[level] = (levelCounts[level] || 0) + 1;

    const scene = record.scene || 'daily';
    sceneCounts[scene] = (sceneCounts[scene] || 0) + 1;

    if (record.title) titleSet.add(record.title);

    // 本地记录的 createdAt 是 RulesCore.localISO() 产出的本地时间字符串，
    // 云端记录的 dateKey/hour 由云函数按 UTC+8 算好；此处统一按本地串解析，
    // 不再做二次时区换算，避免与云端口径不一致（计划书 §5.2）。
    const createdAt = String(record.createdAt || '');
    const parts = createdAt.split('T');
    const dayKey = parts[0] || '';
    if (dayKey) dayCounts[dayKey] = (dayCounts[dayKey] || 0) + 1;

    const hour = parseInt(String(parts[1] || '').slice(0, 2), 10);
    const minute = parseInt(String(parts[1] || '').slice(3, 5), 10);
    const hasHour = !Number.isNaN(hour);
    const hasMinute = !Number.isNaN(minute);

    if (hasHour) {
      if (hour >= MORNING_START_HOUR && hour < MORNING_END_HOUR) morningCount += 1;
      if (hour >= NIGHT_START_HOUR || hour < NIGHT_END_HOUR) nightCount += 1;
      if (hour >= OWL_START_HOUR && hour < OWL_END_HOUR) owlCount += 1;
      // 对称时刻：11:11 / 22:22 / 03:03 …
      if (hasMinute && hour === minute) symmetricTimeCount += 1;
    }
    if (hasMinute && minute === 0) onTheDotCount += 1;

    if (dayKey) {
      if (!daySceneMap[dayKey]) daySceneMap[dayKey] = new Set();
      daySceneMap[dayKey].add(scene);

      if (!dayLevelMap[dayKey]) dayLevelMap[dayKey] = new Set();
      if (level) dayLevelMap[dayKey].add(level);

      // 月初：YYYY-MM-DD 的「日」段为 01
      if (dayKey.slice(-2) === '01') monthStartCount += 1;

      // 周末：按本地日期构造，避免 UTC 偏移
      const dateParts = dayKey.split('-');
      const weekday = new Date(
        Number(dateParts[0]), Number(dateParts[1]) - 1, Number(dateParts[2])
      ).getDay();
      if (weekday === 0 || weekday === 6) weekendCount += 1;

      if (level === '蓄力签') chargeDaySet.add(dayKey);
    }

    sceneRun = scene === prevScene ? sceneRun + 1 : 1;
    prevScene = scene;
    if (sceneRun > sameSceneStreak) sameSceneStreak = sceneRun;

    chargeRun = level === '蓄力签' ? chargeRun + 1 : 0;
    if (chargeRun > chargeDrawStreak) chargeDrawStreak = chargeRun;

    const ts = new Date(createdAt).getTime();
    timestamps.push(Number.isNaN(ts) ? null : ts);
  });

  // 相邻两次抽签间隔不足 60 秒的次数（数组相邻即时间相邻）
  let quickSuccessionCount = 0;
  for (let i = 1; i < timestamps.length; i += 1) {
    const prev = timestamps[i - 1];
    const cur = timestamps[i];
    if (prev == null || cur == null) continue;
    if (Math.abs(cur - prev) < QUICK_SUCCESSION_MS) quickSuccessionCount += 1;
  }

  let premiumCount = 0;
  LevelsCore.PREMIUM_LEVELS.forEach((level) => {
    premiumCount += levelCounts[level] || 0;
  });

  let maxDayDraws = 0;
  Object.keys(dayCounts).forEach((day) => {
    if (dayCounts[day] > maxDayDraws) maxDayDraws = dayCounts[day];
  });

  let maxSceneKindsInDay = 0;
  Object.keys(daySceneMap).forEach((day) => {
    if (daySceneMap[day].size > maxSceneKindsInDay) maxSceneKindsInDay = daySceneMap[day].size;
  });

  // 同一天里既抽到上上签又抽到蓄力签的天数
  let swingDayCount = 0;
  Object.keys(dayLevelMap).forEach((day) => {
    const levels = dayLevelMap[day];
    if (levels.has('上上签') && levels.has('蓄力签')) swingDayCount += 1;
  });

  // 首签等级：优先读持久化的 stats.firstLevel。
  // 本地历史只留最近 500 条，用户抽满 500 次后最早那条会被截断，
  // 只看 records 会判错，因此由 Auth 在首次抽签时落一份 firstLevel。
  const list = records || [];
  const oldest = list.length ? list[list.length - 1] : null;
  const firstLevel = stats.firstLevel
    ? normalizeLevel(stats.firstLevel)
    : (oldest ? normalizeLevel(oldest.level) : '');

  return {
    totalDraws: stats.totalDraws || 0,
    drawDays: stats.drawDays || 0,
    streakDays: stats.streakDays || 0,

    bestCount: levelCounts['上上签'] || 0,
    premiumCount,
    chargeCount: levelCounts['蓄力签'] || 0,
    midCount: levelCounts['中平签'] || 0,
    commonKinds: COMMON_LEVELS.filter((level) => (levelCounts[level] || 0) > 0).length,

    sceneCounts,
    sceneKinds: ['daily', 'exam', 'work', 'festival']
      .filter((scene) => (sceneCounts[scene] || 0) > 0).length,
    maxSceneKindsInDay,
    sameSceneStreak,

    morningCount,
    nightCount,
    owlCount,
    maxDayDraws,
    symmetricTimeCount,
    onTheDotCount,
    monthStartCount,
    weekendCount,
    quickSuccessionCount,
    distinctTitles: titleSet.size,

    // 连击型（抽到最差签）
    // chargeDayStreak 优先读 stats 的持久化值——它由 Auth 逐次累加，不受
    // 本地历史 500 条上限影响；老用户没有该字段时才回退到按记录回算。
    chargeDayStreak: stats.chargeDayStreak || longestConsecutiveDays(chargeDaySet),
    chargeDrawStreak,
    swingDayCount,

    // 「我不是锦鲤」进度：从未抽到高级签时按累计次数推进，一旦抽到立刻归零
    noKoiRun: premiumCount === 0 ? (stats.totalDraws || 0) : 0,
    firstRecordBest: firstLevel === '上上签',

    deepAnalysisCount: events.deepAnalysis || 0,
    posterCount: events.poster || 0,

    premiumUnlocked: !!features.premiumFortunes,
    unlimitedUnlocked: !!features.unlimitedDraws,
    wechatLogin: !!isWechatLogin,
  };
}

// ============================================
// 判定
// ============================================

// 全部成就的达成状态（成就墙渲染用）
export function evaluate(summary) {
  const target = summary || buildSummary();
  return ACHIEVEMENTS.map((achievement) => {
    const current = Math.max(0, achievement.value(target) || 0);
    return {
      id: achievement.id,
      name: achievement.name,
      icon: achievement.icon,
      desc: achievement.desc,
      tier: achievement.tier,
      group: achievement.group,
      target: achievement.target,
      current,
      // 进度条展示值：超过目标时按目标显示，避免出现「37/10」这类读数
      display: Math.min(current, achievement.target),
      unlocked: current >= achievement.target,
    };
  });
}

// 与已解锁集合取差集，得到本次新解锁的成就
export function findNewlyUnlocked(summary, unlockedMap) {
  const done = unlockedMap || {};
  return evaluate(summary).filter((item) => item.unlocked && !done[item.id]);
}

// 按分区打包（成就墙分组渲染用）
export function groupByCategory(items, unlockedMap) {
  const done = unlockedMap || {};
  return CATEGORY_GROUPS.map((group) => ({
    ...group,
    items: (items || []).filter((item) => item.group === group.key)
      .map((item) => ({ ...item, unlockedAt: done[item.id] || 0 })),
  }));
}

export default {
  ACHIEVEMENTS,
  TIERS,
  CATEGORY_GROUPS,
  COMMON_LEVELS,
  normalizeLevel,
  buildSummary,
  evaluate,
  findNewlyUnlocked,
  groupByCategory,
};
