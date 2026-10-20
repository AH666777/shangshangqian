// ============================================
// 一键上上签 - 抽签门面（Facade）
// ============================================
// 计划书 §6.5-1：本文件不再持有业务规则，只做两件事：
//   1. 把「签文库 + 已解锁权益 + 今日次数」注入 core/lottery.js；
//   2. 把 core 算出的结果落盘（计数 + 历史记录）。
//
// 对外 API 与重构前 100% 一致（app.js / poster.js / ad.js 无需改动）。
// 真正的算法在 js/core/lottery.js 与 js/core/levels.js。

const Lottery = {
  currentFortune: null,
  currentScene: 'daily',
  isDrawing: false,

  // 等级映射（来自 core/levels.js，供 poster.js 等直接读取）
  LEVEL_CLASS: LotteryCore.LEVEL_CLASS,
  LEVEL_COLOR: LotteryCore.LEVEL_COLOR,
  PREMIUM_LEVELS: LotteryCore.PREMIUM_LEVELS,

  // ========== 加权随机算法（转发 core/rules.js） ==========
  _weightedRandom(items, probKey = 'probability') {
    return RulesCore.weightedRandom(items, probKey);
  },

  // ========== 根据场景获取签文池（注入签文库与权益） ==========
  _getFortunePool(scene) {
    return LotteryCore.getFortunePool(scene, {
      fortunes: FORTUNES,
      sceneFortunes: SCENE_FORTUNES,
      premiumFortunes: PREMIUM_FORTUNES,
      premiumUnlocked: Storage.isFeatureUnlocked('premiumFortunes'),
    });
  },

  // ========== 执行抽签 ==========
  async draw(scene) {
    this.currentScene = scene || 'daily';

    // 纯计算：core 只依赖入参，不读写存储
    const result = LotteryCore.draw({
      scene: this.currentScene,
      fortunes: FORTUNES,
      sceneFortunes: SCENE_FORTUNES,
      premiumFortunes: PREMIUM_FORTUNES,
      premiumUnlocked: Storage.isFeatureUnlocked('premiumFortunes'),
      todayCount: Storage.getTodayCount(),
      dailyLimit: Storage.getDailyLimit(),
    });

    if (!result.success) return result;

    this.currentFortune = result.fortune;

    // 落盘：自增今日计数 + 写入历史记录
    Storage.incrementTodayCount();
    Storage.saveRecord(result.fortune, this.currentScene);

    return result;
  },

  // ========== 获取当前签文 ==========
  getCurrentFortune() {
    return this.currentFortune;
  },

  // ========== 获取场景名称 ==========
  getSceneName(scene) {
    return LevelsCore.getSceneName(scene);
  },

  // ========== 获取签文等级对应的样式类 ==========
  getLevelClass(level) {
    return LevelsCore.getLevelClass(level);
  },

  // ========== 获取签文等级对应的主色 ==========
  getLevelColor(level) {
    return LevelsCore.getLevelColor(level);
  },

  // ========== 是否为高级签文 ==========
  isPremiumFortune(fortune) {
    return LevelsCore.isPremiumFortune(fortune);
  },

  // ========== 生成深度解签文案 ==========
  buildDeepAnalysis(fortune, scene) {
    const sceneName = this.getSceneName(scene || this.currentScene);
    return RulesCore.buildDeepAnalysis(fortune, sceneName);
  },

  // ========== 获取维度图标 ==========
  getDimensionIcon(dim) {
    return LevelsCore.getDimensionIcon(dim);
  },

  // ========== 获取维度名称 ==========
  getDimensionName(dim) {
    return LevelsCore.getDimensionName(dim);
  },
};
