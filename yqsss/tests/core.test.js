// ============================================
// core 层单元测试（计划书 §6.5-5）
// ============================================
// 覆盖：设计令牌 / 等级映射 / 纯规则 / 抽签核心 / 存储适配器 / 视图模型。
// 运行：npm test

import { describe, it, expect } from 'vitest';
import { createRequire } from 'node:module';

// core 层采用「双出口」，此处按 Node 侧（CommonJS）方式导入，
// 与浏览器侧共享同一份源码。
const require = createRequire(import.meta.url);

const TokensCore = require('../js/core/tokens.js');
const LevelsCore = require('../js/core/levels.js');
const RulesCore = require('../js/core/rules.js');
const LotteryCore = require('../js/core/lottery.js');
const StorageAdapter = require('../js/adapter/storage.js');
const ViewModel = require('../js/ui/view-model.js');
const { FORTUNES, SCENE_FORTUNES, PREMIUM_FORTUNES } = require('../js/core/fortunes.js');

describe('模板：设计令牌 tokens.js', () => {
  it('品牌金与 tailwind.config.js 保持一致', () => {
    expect(TokensCore.colors.gold400).toBe('#FFD133');
    expect(TokensCore.colors.gold500).toBe('#FFC107');
    expect(TokensCore.colors.gold600).toBe('#D4A005');
  });

  it('签文等级主色与重构前一致', () => {
    expect(TokensCore.colors.fortuneRed).toBe('#C41E3A');
    expect(TokensCore.colors.fortuneGold).toBe('#D4A017');
    expect(TokensCore.colors.fortuneGreen).toBe('#2E7D32');
    expect(TokensCore.colors.fortuneBlue).toBe('#1565C0');
  });

  it('字体/圆角/字号/间距令牌齐备', () => {
    expect(TokensCore.fonts.brush).toContain('KaiTi');
    expect(TokensCore.radius.full).toBe('9999px');
    expect(TokensCore.fontSize.sm).toBe('0.875rem');
    expect(TokensCore.spacing['1.5']).toBe('0.375rem');
  });
});

describe('等级映射 levels.js', () => {
  it('等级 -> 样式类', () => {
    expect(LevelsCore.getLevelClass('上上签')).toBe('level-上上签');
    expect(LevelsCore.getLevelClass('天赐签')).toBe('level-上上签');
    expect(LevelsCore.getLevelClass('未知等级')).toBe('level-中平签');
  });

  it('等级 -> 主色（未知等级回退 #666666）', () => {
    expect(LevelsCore.getLevelColor('上吉签')).toBe('#D4A017');
    expect(LevelsCore.getLevelColor('中平签')).toBe('#2E7D32');
    expect(LevelsCore.getLevelColor('未知等级')).toBe('#666666');
  });

  it('高级签判定', () => {
    expect(LevelsCore.isPremiumFortune({ level: '天赐签' })).toBe(true);
    expect(LevelsCore.isPremiumFortune({ level: '上上签' })).toBe(false);
    expect(LevelsCore.isPremiumFortune(null)).toBe(false);
  });

  it('场景 / 维度文案', () => {
    expect(LevelsCore.getSceneName('exam')).toBe('考试通关');
    expect(LevelsCore.getSceneName(undefined)).toBe('日常好运');
    expect(LevelsCore.getDimensionIcon('career')).toBe('💼');
    expect(LevelsCore.getDimensionIcon('nope')).toBe('✨');
    expect(LevelsCore.getDimensionName('wealth')).toBe('财运提示');
    expect(LevelsCore.getDimensionName('nope')).toBe('nope');
  });
});

describe('纯规则 rules.js', () => {
  it('escapeHtml 转义全部危险字符', () => {
    expect(RulesCore.escapeHtml(`<b>"x"&'y'</b>`))
      .toBe('&lt;b&gt;&quot;x&quot;&amp;&#39;y&#39;&lt;/b&gt;');
    expect(RulesCore.escapeHtml(null)).toBe('');
    expect(RulesCore.escapeHtml(undefined)).toBe('');
  });

  it('日期工具（跨月回退正确）', () => {
    expect(RulesCore.dateKey(new Date(2026, 8, 13))).toBe('2026-09-13');
    expect(RulesCore.shiftDateKey('2026-03-01', -1)).toBe('2026-02-28');
    expect(RulesCore.shiftDateKey('2026-01-01', -1)).toBe('2025-12-31');
  });

  it('localISO 使用本地时间而非 UTC', () => {
    const iso = RulesCore.localISO(new Date(2026, 8, 13, 8, 5, 30));
    expect(iso).toBe('2026-09-13T08:05:30');
  });

  it('splitDateTime 截取到 HH:mm', () => {
    expect(RulesCore.splitDateTime('2026-09-13T08:05:30')).toEqual({ date: '2026-09-13', time: '08:05' });
    expect(RulesCore.splitDateTime('')).toEqual({ date: '', time: '' });
  });

  it('getWeekdayLabel 处理今天/昨天/具体日期', () => {
    const now = new Date(2026, 8, 13, 10, 0, 0); // 2026-09-13 是周日
    expect(RulesCore.getWeekdayLabel('2026-09-13', now)).toBe('周日');
    expect(RulesCore.getWeekdayLabel('今天', now)).toBe('周日');
    expect(RulesCore.getWeekdayLabel('昨天', now)).toBe('周六');
  });

  it('getAvatarEmoji 对同一昵称稳定可复现', () => {
    const a = RulesCore.getAvatarEmoji('测试用户');
    expect(RulesCore.getAvatarEmoji('测试用户')).toBe(a);
    expect(typeof a).toBe('string');
    expect(a.length).toBeGreaterThan(0);
    expect(RulesCore.getAvatarEmoji('')).toBeTruthy();
  });

  it('weightedRandom 按权重落点（注入 rng 保证确定性）', () => {
    const items = [{ id: 'a', probability: 1 }, { id: 'b', probability: 3 }];
    expect(RulesCore.weightedRandom(items, 'probability', () => 0).id).toBe('a');
    expect(RulesCore.weightedRandom(items, 'probability', () => 0.99).id).toBe('b');
    expect(RulesCore.weightedRandom(items, 'probability', () => 0.3).id).toBe('b');
  });

  it('buildFortunePool 按场景筛选并受权益影响', () => {
    const base = [{ id: 1, scenes: ['daily'] }, { id: 2, scenes: ['exam'] }];
    const sceneF = { daily: [{ id: 3 }] };
    const premium = [{ id: 'p1' }];

    const locked = RulesCore.buildFortunePool({
      scene: 'daily', fortunes: base, sceneFortunes: sceneF, premiumFortunes: premium, premiumUnlocked: false,
    });
    expect(locked.map(f => f.id)).toEqual([1, 3]);

    const unlocked = RulesCore.buildFortunePool({
      scene: 'daily', fortunes: base, sceneFortunes: sceneF, premiumFortunes: premium, premiumUnlocked: true,
    });
    expect(unlocked.map(f => f.id)).toEqual([1, 3, 'p1']);
    expect(unlocked[2].probability).toBe(RulesCore.PREMIUM_PROBABILITY);
  });

  it('每日次数：后台设置 > 无限权益 > 默认值', () => {
    expect(RulesCore.getDailyLimit({})).toBe(3);
    expect(RulesCore.getDailyLimit({ unlimitedUnlocked: true })).toBe(999);
    expect(RulesCore.getDailyLimit({ setting: { daily_limit: 8 } })).toBe(8);
    expect(RulesCore.getDailyLimit({ setting: { daily_limit: 8 }, unlimitedUnlocked: true })).toBe(8);
  });

  it('剩余次数与可抽判断', () => {
    expect(RulesCore.getRemainingDraws(3, 0)).toBe(3);
    expect(RulesCore.getRemainingDraws(3, 5)).toBe(0);
    expect(RulesCore.canDraw(0)).toBe(false);
    expect(RulesCore.canDraw(1)).toBe(true);
  });

  it('incrementTodayCount 为纯函数（不修改入参）', () => {
    const record = { date: '2026-09-13', count: 2 };
    const r1 = RulesCore.incrementTodayCount(record, '2026-09-13');
    expect(r1.count).toBe(3);
    expect(record.count).toBe(2); // 入参未被改写

    expect(RulesCore.incrementTodayCount(record, '2026-09-14').count).toBe(1);
    expect(RulesCore.incrementTodayCount(null, '2026-09-13').count).toBe(1);
  });

  it('getTodayCount 忽略过期记录', () => {
    expect(RulesCore.getTodayCount({ date: '2026-09-13', count: 2 }, '2026-09-13')).toBe(2);
    expect(RulesCore.getTodayCount({ date: '2026-09-12', count: 2 }, '2026-09-13')).toBe(0);
    expect(RulesCore.getTodayCount(null, '2026-09-13')).toBe(0);
  });

  it('buildRecord / normalizeRecord 兼容两种命名', () => {
    const rec = RulesCore.buildRecord(
      { id: 7, level: '上上签', title: '标题', poem: '诗句' }, 'exam', '2026-09-13T08:05:30'
    );
    expect(rec).toEqual({
      fortuneId: 7, level: '上上签', title: '标题', poem: '诗句', scene: 'exam', createdAt: '2026-09-13T08:05:30',
    });

    expect(RulesCore.normalizeRecord({ fortune_id: 9, level: '蓄力签', title: 'T', created_at: '2026-09-13T01:02:03' }))
      .toEqual({ fortuneId: 9, level: '蓄力签', title: 'T', poem: '', scene: 'daily', createdAt: '2026-09-13T01:02:03' });
  });

  it('groupByDate 按 今天 → 昨天 → 更早 排列', () => {
    const records = [
      { createdAt: '2026-09-01T10:00:00', level: '上上签', title: '旧' },
      { createdAt: '2026-09-13T10:00:00', level: '上上签', title: '今' },
      { createdAt: '2026-09-12T10:00:00', level: '中平签', title: '昨' },
    ];
    const grouped = RulesCore.groupByDate(records, '2026-09-13', '2026-09-12');
    expect(Object.keys(grouped)).toEqual(['今天', '昨天', '2026-09-01']);
    expect(grouped['今天'][0].title).toBe('今');
    expect(grouped['昨天'][0].title).toBe('昨');
  });

  it('buildDeepAnalysis 优先使用自带 deepAnalysis', () => {
    expect(RulesCore.buildDeepAnalysis({ deepAnalysis: '自带全文' }, '日常好运')).toBe('自带全文');
    expect(RulesCore.buildDeepAnalysis(null, '日常好运')).toBe('');
  });

  it('buildDeepAnalysis 为普通签文合成完整文案', () => {
    const fortune = {
      level: '上吉签', title: '步步高升',
      poem: '一行\n二行',
      analysis: { career: '稳步上升', love: '情投意合' },
      lucky: { color: '金色', number: '8', direction: '正东' },
    };
    const text = RulesCore.buildDeepAnalysis(fortune, '开工大吉');
    expect(text).toContain('「步步高升」为一支上吉签');
    expect(text).toContain('开工大吉');
    expect(text).toContain('一行，二行');         // 换行替换为中文逗号
    expect(text).toContain('事业方面，稳步上升');
    expect(text).toContain('幸运数字为「8」');
    expect(text).toContain('行动指引');
  });

  it('buildDeepAnalysis 对缺字段签文给出默认值', () => {
    const text = RulesCore.buildDeepAnalysis({ level: '蓄力签', title: '静待时机' }, '日常好运');
    expect(text).toContain('顺其自然');
    expect(text).toContain('金色');
    expect(text).toContain('「8」');
  });

  it('buildAnalysisItems 保序输出', () => {
    const items = RulesCore.buildAnalysisItems({ career: 'a', love: 'b' });
    expect(items.map(i => i.dim)).toEqual(['career', 'love']);
    expect(items[0].index).toBe(0);
    expect(RulesCore.buildAnalysisItems(null)).toEqual([]);
  });
});

describe('抽签核心 core/lottery.js', () => {
  const fortunes = [{ id: 1, scenes: ['daily'], probability: 1, level: '上上签', title: '甲', poem: 'p' }];
  const base = {
    scene: 'daily',
    fortunes,
    sceneFortunes: {},
    premiumFortunes: [],
    premiumUnlocked: false,
  };

  it('次数用尽时返回 limit_reached', () => {
    const r = LotteryCore.draw({ ...base, todayCount: 3, dailyLimit: 3 });
    expect(r).toEqual({
      success: false, reason: 'limit_reached', message: '今日免费次数已用完', remainingDraws: 0,
    });
  });

  it('签池为空时返回 no_fortunes', () => {
    const r = LotteryCore.draw({ ...base, fortunes: [], todayCount: 0, dailyLimit: 3 });
    expect(r.success).toBe(false);
    expect(r.reason).toBe('no_fortunes');
  });

  it('成功抽签并正确推进计数', () => {
    const r = LotteryCore.draw({ ...base, todayCount: 1, dailyLimit: 3, rng: () => 0 });
    expect(r.success).toBe(true);
    expect(r.fortune.id).toBe(1);
    expect(r.todayCount).toBe(2);
    expect(r.dailyLimit).toBe(3);
    expect(r.remainingDraws).toBe(1);
  });

  it('解锁后可抽到高级签文', () => {
    const premium = [{ id: 'p1', level: '天赐签', title: '天赐', poem: 'p' }];
    const locked = LotteryCore.getFortunePool('daily', { ...base, premiumFortunes: premium });
    expect(locked.map(f => f.id)).toEqual([1]);

    const unlocked = LotteryCore.getFortunePool('daily', { ...base, premiumFortunes: premium, premiumUnlocked: true });
    expect(unlocked.map(f => f.id)).toEqual([1, 'p1']);
  });

  it('draw 不产生副作用（不落盘，纯函数）', () => {
    const opts = { ...base, todayCount: 0, dailyLimit: 3, rng: () => 0 };
    const snapshot = JSON.stringify(opts);
    LotteryCore.draw(opts);
    expect(JSON.stringify(opts)).toBe(snapshot);
  });
});

describe('存储适配器 adapter/storage.js', () => {
  it('可切换后端并完成 JSON 读写', () => {
    StorageAdapter.use(StorageAdapter.MemoryStorageBackend);
    StorageAdapter.MemoryStorageBackend._map.clear();

    expect(StorageAdapter.get('missing', 'DEF')).toBe('DEF');
    StorageAdapter.set('k', { a: 1 });
    expect(StorageAdapter.get('k')).toEqual({ a: 1 });
    expect(StorageAdapter.getItem('k')).toBe('{"a":1}');

    StorageAdapter.remove('k');
    expect(StorageAdapter.get('k', null)).toBe(null);
  });

  it('JSON 损坏时回退默认值而非抛错', () => {
    StorageAdapter.use(StorageAdapter.MemoryStorageBackend);
    StorageAdapter.setItem('bad', '{not json');
    expect(StorageAdapter.get('bad', 'FALLBACK')).toBe('FALLBACK');
  });

  it('use() 忽略非法后端', () => {
    StorageAdapter.use(StorageAdapter.MemoryStorageBackend);
    StorageAdapter.use({});
    expect(StorageAdapter._resolve().name).toBe('memory');
  });
});

describe('视图模型 ui/view-model.js', () => {
  it('buildLuckyHtml 转义并包含三类幸运信息', () => {
    const html = ViewModel.buildLuckyHtml({ color: '<红色>', number: '8', direction: '正东' });
    expect(html).toContain('&lt;红色&gt;');
    expect(html).toContain('🔢 8');
    expect(html).toContain('🧭 正东');
    expect(ViewModel.buildLuckyHtml(null)).toBe('');
  });

  it('hasAnalysis 与 buildAnalysisListHtml', () => {
    expect(ViewModel.hasAnalysis(null)).toBe(false);
    expect(ViewModel.hasAnalysis({})).toBe(false);
    expect(ViewModel.hasAnalysis({ career: 'x' })).toBe(true);

    const html = ViewModel.buildAnalysisListHtml({ career: '稳步上升' });
    expect(html).toContain('analysis-card');
    expect(html).toContain('事业提示');
    expect(html).toContain('稳步上升');
    expect(ViewModel.buildAnalysisListHtml({})).toBe('');
  });

  it('buildHistoryListHtml 输出关键结构与转义后的内容', () => {
    const grouped = {
      今天: [{ level: '上上签', title: '<script>', poem: 'a\nb', scene: 'daily', createdAt: '2026-09-13T08:05:30' }],
    };
    const html = ViewModel.buildHistoryListHtml(grouped);
    expect(html).toContain('history-item');
    expect(html).toContain('level-上上签');
    expect(html).toContain('2026-09-13 08:05');
    expect(html).toContain('&lt;script&gt;');   // XSS 已转义
    expect(html).toContain('a b');              // 诗句换行替换为空格
    expect(html).toContain('日常好运');
    expect(ViewModel.buildHistoryListHtml({})).toBe('');
  });

  it('buildProfileHistoryHtml 输出日期分组、星期与签数', () => {
    const now = new Date(2026, 8, 13, 10, 0, 0);
    const grouped = {
      今天: [{ level: '中平签', title: '甲', createdAt: '2026-09-13T09:00:00' }],
      昨天: [{ level: '蓄力签', title: '乙', createdAt: '2026-09-12T09:00:00' }],
    };
    const html = ViewModel.buildProfileHistoryHtml(grouped, now);
    expect(html).toContain('profile-date-group');
    expect(html).toContain('今天');
    expect(html).toContain('周日');
    expect(html).toContain('昨天');
    expect(html).toContain('周六');
    expect(html).toContain('1签');
    expect(html).toContain('#2E7D32'); // 中平签圆点色来自 levels.js
    expect(ViewModel.buildProfileHistoryHtml({}, now)).toBe('');
  });

  it('getAvatarEmoji 与 rules 保持一致', () => {
    expect(ViewModel.getAvatarEmoji('小明')).toBe(RulesCore.getAvatarEmoji('小明'));
  });
});

describe('签文库 core/fortunes.js 数据完整性', () => {
  it('通用签文库结构正确', () => {
    expect(FORTUNES.length).toBeGreaterThan(0);
    for (const f of FORTUNES) {
      expect(Array.isArray(f.scenes)).toBe(true);
      expect(typeof f.level).toBe('string');
      expect(typeof f.title).toBe('string');
      expect(typeof f.probability).toBe('number');
    }
  });

  it('场景专属签文库覆盖 exam / work / festival 三个专属场景', () => {
    // 说明：daily（日常好运）直接复用通用签文库 FORTUNES，故不在 SCENE_FORTUNES 中。
    expect(Object.keys(SCENE_FORTUNES).sort()).toEqual(['exam', 'festival', 'work']);
    for (const scene of ['exam', 'work', 'festival']) {
      expect(SCENE_FORTUNES[scene].length).toBeGreaterThan(0);
    }
  });

  it('高级签文均自带 deepAnalysis，且等级在 PREMIUM_LEVELS 内', () => {
    expect(PREMIUM_FORTUNES.length).toBeGreaterThan(0);
    for (const f of PREMIUM_FORTUNES) {
      expect(typeof f.deepAnalysis).toBe('string');
      expect(f.deepAnalysis.length).toBeGreaterThan(0);
      expect(LevelsCore.PREMIUM_LEVELS).toContain(f.level);
    }
  });

  it('所有签文的等级都能映射到样式类与主色', () => {
    const all = [...FORTUNES, ...Object.values(SCENE_FORTUNES).flat(), ...PREMIUM_FORTUNES];
    for (const f of all) {
      expect(LevelsCore.getLevelClass(f.level)).toMatch(/^level-/);
      expect(LevelsCore.getLevelColor(f.level)).toMatch(/^#/);
    }
  });

  it('每支通用/场景签的 scenes 合法、结构完整', () => {
    const validScenes = Object.keys(LevelsCore.SCENE_NAMES);
    const all = [...FORTUNES, ...Object.values(SCENE_FORTUNES).flat()];
    expect(all.length).toBeGreaterThan(0);
    for (const f of all) {
      expect(Array.isArray(f.scenes), `签文 ${f.id} 缺少 scenes`).toBe(true);
      for (const s of f.scenes) {
        expect(validScenes, `签文 ${f.id} 场景 ${s} 未登记`).toContain(s);
      }
      expect(typeof f.poem).toBe('string');
      expect(f.lucky && typeof f.lucky === 'object', `签文 ${f.id} 缺少 lucky`).toBe(true);
    }
  });
});

// ============================================
// 补充：结构完整性与边界（覆盖上文未触及的分支）
// ============================================

describe('设计令牌 tokens.js 结构完整性', () => {
  it('所有颜色值均为合法六位十六进制色', () => {
    const entries = Object.entries(TokensCore.colors);
    expect(entries.length).toBeGreaterThan(20);
    for (const [key, value] of entries) {
      expect(value, `colors.${key}`).toMatch(/^#[0-9A-F]{6}$/i);
    }
  });

  it('等级回退色已登记并被 levels.js 复用', () => {
    expect(TokensCore.colors.levelFallback).toBe('#666666');
  });

  it('字体 / 圆角 / 字号 / 间距均为非空字符串', () => {
    const groups = {
      fonts: TokensCore.fonts,
      radius: TokensCore.radius,
      fontSize: TokensCore.fontSize,
      spacing: TokensCore.spacing,
    };
    for (const [groupName, group] of Object.entries(groups)) {
      for (const [key, value] of Object.entries(group)) {
        expect(typeof value, `${groupName}.${key}`).toBe('string');
        expect(value.length, `${groupName}.${key}`).toBeGreaterThan(0);
      }
    }
  });
});

describe('等级映射 levels.js 补充', () => {
  it('所有高级等级统一映射到红色「上上签」徽章', () => {
    expect(LevelsCore.PREMIUM_LEVELS.length).toBeGreaterThan(0);
    for (const level of LevelsCore.PREMIUM_LEVELS) {
      expect(LevelsCore.getLevelClass(level)).toBe('level-上上签');
      expect(LevelsCore.getLevelColor(level)).toBe(TokensCore.colors.fortuneRed);
    }
  });

  it('四个场景均登记中文名称', () => {
    expect(LevelsCore.SCENE_NAMES).toEqual({
      daily: '日常好运',
      exam: '考试通关',
      work: '开工大吉',
      festival: '节日祈福',
    });
  });

  it('五维顺序固定为 事业→学业→财运→健康→情感，且图标/名称齐备', () => {
    expect(LevelsCore.DIMENSION_ORDER).toEqual(['career', 'study', 'wealth', 'health', 'love']);
    for (const dim of LevelsCore.DIMENSION_ORDER) {
      expect(LevelsCore.DIMENSION_ICONS[dim], `图标 ${dim}`).toBeTruthy();
      expect(LevelsCore.DIMENSION_NAMES[dim], `名称 ${dim}`).toBeTruthy();
    }
  });

  it('isPremiumFortune 对缺失/异常入参安全', () => {
    expect(LevelsCore.isPremiumFortune(undefined)).toBe(false);
    expect(LevelsCore.isPremiumFortune({})).toBe(false);
  });
});

describe('纯规则 rules.js 边界补充', () => {
  it('weightedRandom 在 rng 越界时回退首个元素', () => {
    const items = [{ id: 'a', probability: 1 }, { id: 'b', probability: 2 }];
    expect(RulesCore.weightedRandom(items, 'probability', () => 1).id).toBe('a');
  });

  it('getWeekdayLabel 对具体日期返回对应星期', () => {
    expect(RulesCore.getWeekdayLabel('2026-09-13')).toBe('周日');
    expect(RulesCore.getWeekdayLabel('2026-09-14')).toBe('周一');
  });

  it('groupByDate 多个「更早」日期按倒序排列', () => {
    const records = [
      { createdAt: '2026-08-01T10:00:00', title: 'A' },
      { createdAt: '2026-09-01T10:00:00', title: 'B' },
      { createdAt: '2026-09-13T10:00:00', title: 'C' },
      { createdAt: '2026-09-12T10:00:00', title: 'D' },
    ];
    const grouped = RulesCore.groupByDate(records, '2026-09-13', '2026-09-12');
    expect(Object.keys(grouped)).toEqual(['今天', '昨天', '2026-09-01', '2026-08-01']);
  });

  it('buildFortunePool 场景专属签与匹配的通用签合并，不匹配的排除', () => {
    const fortunes = [{ id: 1, scenes: ['exam'] }, { id: 2, scenes: ['daily'] }];
    const sceneFortunes = { exam: [{ id: 3 }] };
    const pool = RulesCore.buildFortunePool({ scene: 'exam', fortunes, sceneFortunes });
    expect(pool.map(f => f.id)).toEqual([1, 3]);
  });

  it('buildRecord 缺省 timestamp 时回退本地时间格式', () => {
    const rec = RulesCore.buildRecord({ level: '上上签', title: 'T' }, 'daily');
    expect(rec.poem).toBe('');
    expect(rec.scene).toBe('daily');
    expect(rec.createdAt).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}$/);
  });

  it('buildAnalysisItems 对空对象返回空数组', () => {
    expect(RulesCore.buildAnalysisItems({})).toEqual([]);
  });
});

describe('存储适配器 adapter/storage.js 后端行为', () => {
  it('localStorage 不可用时 _resolve() 自动回退内存后端', () => {
    const descriptor = Object.getOwnPropertyDescriptor(globalThis, 'localStorage');
    if (descriptor) delete globalThis.localStorage;
    StorageAdapter._backend = null;
    try {
      expect(StorageAdapter.LocalStorageBackend.available()).toBe(false);
      expect(StorageAdapter._resolve().name).toBe('memory');
    } finally {
      if (descriptor) Object.defineProperty(globalThis, 'localStorage', descriptor);
      StorageAdapter.use(StorageAdapter.MemoryStorageBackend);
    }
  });

  it('MemoryStorageBackend 直接读写并返回布尔值', () => {
    const backend = StorageAdapter.MemoryStorageBackend;
    backend._map.clear();
    expect(backend.getItem('x')).toBeNull();
    expect(backend.setItem('x', 123)).toBe(true);
    expect(backend.getItem('x')).toBe('123');
    backend.removeItem('x');
    expect(backend.getItem('x')).toBeNull();
  });

  it('setItem / remove 正确转发到当前后端', () => {
    StorageAdapter.use(StorageAdapter.MemoryStorageBackend);
    StorageAdapter.MemoryStorageBackend._map.clear();
    expect(StorageAdapter.setItem('s', 'v')).toBe(true);
    expect(StorageAdapter.getItem('s')).toBe('v');
    StorageAdapter.remove('s');
    expect(StorageAdapter.getItem('s')).toBeNull();
  });

  it('MemoryStorageBackend.available() 恒为 true（降级兜底可用）', () => {
    expect(StorageAdapter.MemoryStorageBackend.available()).toBe(true);
  });
});

describe('视图模型 ui/view-model.js 补充', () => {
  it('escapeHtml / getAvatarEmoji 与 rules 层为同一实现（避免双份逻辑漂移）', () => {
    expect(ViewModel.escapeHtml).toBe(RulesCore.escapeHtml);
    expect(ViewModel.getAvatarEmoji).toBe(RulesCore.getAvatarEmoji);
  });

  it('buildProfileHistoryHtml 偶数行加交错高亮背景', () => {
    const grouped = {
      今天: [
        { level: '上上签', title: 'A', createdAt: '2026-09-13T09:00:00' },
        { level: '中平签', title: 'B', createdAt: '2026-09-13T08:00:00' },
      ],
    };
    const html = ViewModel.buildProfileHistoryHtml(grouped, new Date(2026, 8, 13));
    expect(html).toContain('bg-white/[0.02]');
  });

  it('buildLuckyHtml 对缺失字段输出空字符串而非 undefined', () => {
    const html = ViewModel.buildLuckyHtml({});
    expect(html).not.toContain('undefined');
  });
});
