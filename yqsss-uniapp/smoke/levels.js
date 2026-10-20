// ============================================
// 一键上上签 - 等级映射与展示元数据（纯逻辑）
// ============================================
// 计划书 §6.5-2：把 LEVEL_CLASS / LEVEL_COLOR / PREMIUM_LEVELS 拆到独立 levels.js，
// 作为「三端共享单一数据源」。
//
// 原位置：js/lottery.js 顶部（182 行版本）。
// 本文件不引用任何平台 API，只有常量与纯查询函数。
//
// 双出口：浏览器为全局 `LevelsCore`；Node/Vitest 用 require 取同一对象。

// uni-app（ESM）：直接 import tokens 模块。
import __TokensForLevels from './tokens.js';

const LevelsCore = {
  // 等级 -> 徽章样式类（新增等级时必须在此登记）
  // 合规（计划书 §1.6）：「下吉签」在 UI 上易被理解为负面运势判定，已中性化为「蓄力签」。
  // 旧名保留为别名，仅用于兼容用户设备上已存在的历史本地数据。
  LEVEL_CLASS: {
    '上上签': 'level-上上签',
    '上吉签': 'level-上吉签',
    '中平签': 'level-中平签',
    '蓄力签': 'level-蓄力签',
    '下吉签': 'level-蓄力签',
    '锦鲤签': 'level-上上签',
    '万能上上签': 'level-上上签',
    '定制好运签': 'level-上上签',
    '龙腾签': 'level-上上签',
    '福寿签': 'level-上上签',
    '天赐签': 'level-上上签',
  },

  // 等级 -> 主色（用于历史记录圆点、海报底色等）
  // 取值来自设计令牌，保证与 css 中的视觉一致。
  LEVEL_COLOR: {
    '上上签': __TokensForLevels.colors.fortuneRed,
    '锦鲤签': __TokensForLevels.colors.fortuneRed,
    '万能上上签': __TokensForLevels.colors.fortuneRed,
    '定制好运签': __TokensForLevels.colors.fortuneRed,
    '龙腾签': __TokensForLevels.colors.fortuneRed,
    '福寿签': __TokensForLevels.colors.fortuneRed,
    '天赐签': __TokensForLevels.colors.fortuneRed,
    '上吉签': __TokensForLevels.colors.fortuneGold,
    '中平签': __TokensForLevels.colors.fortuneGreen,
    '蓄力签': __TokensForLevels.colors.fortuneBlue,
    '下吉签': __TokensForLevels.colors.fortuneBlue,
  },

  // 高级签的等级集合（这些签文自带 deepAnalysis，且无五维 analysis）
  PREMIUM_LEVELS: ['锦鲤签', '万能上上签', '定制好运签', '龙腾签', '福寿签', '天赐签'],

  // 场景 -> 名称
  // 合规（计划书 §1.6）：「转运」属命理表述，改为中性的「日常好运」。
  SCENE_NAMES: {
    daily: '日常好运',
    exam: '考试通关',
    work: '开工大吉',
    festival: '节日祈福',
  },

  // 维度 -> 图标
  DIMENSION_ICONS: {
    career: '💼',
    study: '📚',
    wealth: '💰',
    health: '❤️',
    love: '💕',
  },

  // 维度 -> 名称
  // 合规（计划书 §1.6）：去掉「运势」表述，改为中性的「提示」，
  // 使五维卡片呈现为「生活提醒」而非「运势预测」。
  DIMENSION_NAMES: {
    career: '事业提示',
    study: '学业提示',
    wealth: '财运提示',
    health: '健康提示',
    love: '情感提示',
  },

  // 五维顺序（签约文 analysis 的渲染顺序）
  DIMENSION_ORDER: ['career', 'study', 'wealth', 'health', 'love'],

  // ========== 纯查询函数 ==========
  getLevelClass(level) {
    return this.LEVEL_CLASS[level] || 'level-中平签';
  },

  getLevelColor(level) {
    return this.LEVEL_COLOR[level] || __TokensForLevels.colors.levelFallback;
  },

  isPremiumFortune(fortune) {
    return !!fortune && this.PREMIUM_LEVELS.includes(fortune.level);
  },

  getSceneName(scene) {
    return this.SCENE_NAMES[scene] || '日常好运';
  },

  getDimensionIcon(dim) {
    return this.DIMENSION_ICONS[dim] || '✨';
  },

  getDimensionName(dim) {
    return this.DIMENSION_NAMES[dim] || dim;
  },
};

// uni-app（ESM）出口。
export default LevelsCore;
