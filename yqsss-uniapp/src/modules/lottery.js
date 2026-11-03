// ============================================
// 一键上上签 - 抽签门面（uni-app 版）
// ============================================
// 与 H5 版逻辑完全一致，仅将模块包装改为 ESM。
// 本文件不持有业务规则，只做：注入签文库与权益 -> 调 core -> 落盘。

import LotteryCore from '../core/lottery.js';
import LevelsCore from '../core/levels.js';
import RulesCore from '../core/rules.js';
import FORTUNE_DATA from '../core/fortunes.js';
import Storage from './storage.js';
import Achievement from './achievement.js';

const { FORTUNES, SCENE_FORTUNES, PREMIUM_FORTUNES } = FORTUNE_DATA;

const Lottery = {
  currentFortune: null,
  currentScene: 'daily',
  isDrawing: false,

  // 等级映射（来自 core/levels.js，供海报页等直接读取）
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
  draw(scene) {
    this.currentScene = scene || 'daily';

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

    // 方案 A：深度解签按「每次抽签」计费。
    // 出签即清除上一签的解锁状态，因此每支新签默认锁住深度解签，需重新看广告。
    if (Storage.isFeatureUnlocked('deepAnalysis')) {
      Storage.lockFeature('deepAnalysis');
    }

    // 落盘：自增今日计数 + 写入历史记录
    Storage.incrementTodayCount();
    Storage.saveRecord(result.fortune, this.currentScene);

    // 深度解签的「使用」事件不在这里记：出签只是抽签，还没展示深度解读。
    // 计数改由结果页在实际展示深度解签时完成（见 pages/result/result.vue），
    // 否则 first_deep / deep_10 会随抽签次数自动达成，与用户是否真看无关。

    // 成就判定：放在落盘之后——此时统计已自增、记录已入历史，数据最准。
    // 判定同步且轻量，内部静默失败，不会拖慢或打断出签。
    // 新解锁的成就进入待展示队列，由结果页 onShow 取走弹窗。
    Achievement.evaluate();

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

  // ========== 五维解读 -> 有序数组 ==========
  buildAnalysisItems(fortune) {
    if (!fortune || !fortune.analysis) return [];
    return LevelsCore.DIMENSION_ORDER
      .filter((dim) => fortune.analysis[dim])
      .map((dim) => ({
        dim,
        icon: LevelsCore.getDimensionIcon(dim),
        name: LevelsCore.getDimensionName(dim),
        text: fortune.analysis[dim],
      }));
  },

  // ========== 场景列表（首页渲染用） ==========
  getScenes() {
    return [
      { key: 'daily', name: '日常好运', icon: '💫', desc: '每日好运' },
      { key: 'exam', name: '考试通关', icon: '📚', desc: '逢考必过' },
      { key: 'work', name: '开工大吉', icon: '💼', desc: '事业顺利' },
      { key: 'festival', name: '节日祈福', icon: '🎊', desc: '佳节好礼' },
    ];
  },
};

export default Lottery;
