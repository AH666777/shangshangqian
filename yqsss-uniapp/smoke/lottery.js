// ============================================
// 一键上上签 - 抽签核心（平台无关纯逻辑）
// ============================================
// 计划书 §6.5-1：抽签流程不再直接读写 Storage，
// 而是由调用方（js/lottery.js 门面）注入签文库与次数，核心只负责「算出结果」。
//
// 依赖：core/levels.js、core/rules.js
// 约束：不引用 Storage / Auth / DOM / wx / uni。
//
// 双出口：浏览器为全局 `LotteryCore`；Node/Vitest 用 require 取同一对象。

// uni-app（ESM）：直接 import 依赖模块。
import __LevelsForLottery from './levels.js';
import __RulesForLottery from './rules.js';

const LotteryCore = {
  // 供外部复用的等级映射
  LEVEL_CLASS: __LevelsForLottery.LEVEL_CLASS,
  LEVEL_COLOR: __LevelsForLottery.LEVEL_COLOR,
  PREMIUM_LEVELS: __LevelsForLottery.PREMIUM_LEVELS,

  // ========== 场景 -> 签文池 ==========
  getFortunePool(scene, options) {
    const {
      fortunes = [],
      sceneFortunes = {},
      premiumFortunes = [],
      premiumUnlocked = false,
    } = options || {};

    return __RulesForLottery.buildFortunePool({
      scene,
      fortunes,
      sceneFortunes,
      premiumFortunes,
      premiumUnlocked,
    });
  },

  // ========== 执行一次抽签（纯计算，不落盘） ==========
  // 返回：
  //   失败 { success:false, reason:'limit_reached'|'no_fortunes', message, remainingDraws? }
  //   成功 { success:true, fortune, todayCount, dailyLimit, remainingDraws }
  // 调用方负责：自增今日计数、写入历史记录。
  draw(options) {
    const {
      scene = 'daily',
      fortunes = [],
      sceneFortunes = {},
      premiumFortunes = [],
      premiumUnlocked = false,
      todayCount = 0,
      dailyLimit = __RulesForLottery.DEFAULT_DAILY_LIMIT,
      rng = Math.random,
    } = options || {};

    const remaining = __RulesForLottery.getRemainingDraws(dailyLimit, todayCount);

    if (!__RulesForLottery.canDraw(remaining)) {
      return {
        success: false,
        reason: 'limit_reached',
        message: '今日免费次数已用完',
        remainingDraws: 0,
      };
    }

    const pool = this.getFortunePool(scene, {
      fortunes,
      sceneFortunes,
      premiumFortunes,
      premiumUnlocked,
    });

    if (pool.length === 0) {
      return {
        success: false,
        reason: 'no_fortunes',
        message: '签文数据异常，请刷新页面',
      };
    }

    const fortune = __RulesForLottery.weightedRandom(pool, 'probability', rng);
    const nextCount = todayCount + 1;

    return {
      success: true,
      fortune,
      todayCount: nextCount,
      dailyLimit,
      remainingDraws: __RulesForLottery.getRemainingDraws(dailyLimit, nextCount),
    };
  },
};

// uni-app（ESM）出口。
export default LotteryCore;
