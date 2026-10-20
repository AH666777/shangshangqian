// ============================================
// 一键上上签 - 数据存储门面（uni-app 版）
// ============================================
// 与 H5 版逻辑完全一致，仅将模块包装改为 ESM。
// 次数限制、分组排序等规则下沉到 core/rules.js；读写走 adapter。

import StorageAdapter from '../adapter/storage.js';
import RulesCore from '../core/rules.js';
import Auth from './auth.js';

const Storage = {
  KEYS: {
    TODAY_RECORD: 'yqsss_today',
    UNLOCKED_FEATURES: 'yqsss_features',
    SETTINGS: 'yqsss_settings',
    HISTORY_CACHE: 'yqsss_history_cache',
    // 权益事件累计计数：{ deepAnalysis: n, poster: n }
    // 「深度解签」权益按每次抽签计费、出签即被 lock，无法用 isFeatureUnlocked 判断「是否解锁过」，
    // 因此单独累计一份事件次数，供成就系统判定（成就「一探究竟 / 慧眼识珠」）。
    FEATURE_EVENTS: 'yqsss_feature_events',
  },

  // ========== 工具方法 ==========
  _today() {
    return RulesCore.dateKey();
  },

  // 本地时间戳（YYYY-MM-DDTHH:mm:ss）
  _localISO() {
    return RulesCore.localISO();
  },

  // ---------- 存储读写（统一走适配器） ----------
  get(key, defaultValue = null) {
    return StorageAdapter.get(key, defaultValue);
  },

  set(key, value) {
    StorageAdapter.set(key, value);
  },

  remove(key) {
    StorageAdapter.remove(key);
  },

  // ============================================
  // 抽签记录
  // ============================================

  // 保存一条抽签记录
  saveRecord(fortune, scene) {
    const record = RulesCore.buildRecord(fortune, scene);

    const cache = this.get(this.KEYS.HISTORY_CACHE, []);
    cache.unshift(record);
    // 只保留最近 500 条
    if (cache.length > 500) cache.length = 500;
    this.set(this.KEYS.HISTORY_CACHE, cache);

    // 更新用户统计（抽签天数由 Auth 按自然日自行判定）
    // 传入 fortune：Auth 会把「首次抽签等级」记一份，供成就「凡尔赛本赛」判定
    Auth.resetTodayIfNeeded();
    Auth.incrementStats(fortune);

    // 云端同步：统计回传 + 写入抽签记录。
    // 故意不 await——抽签结果不能等网络，同步失败也照常出签。
    Auth.syncStatsToCloud();
    Auth.pushRecordToCloud(fortune, scene);
  },

  // 获取分组历史记录（按日期倒序）
  getGroupedHistory() {
    const records = this.get(this.KEYS.HISTORY_CACHE, []);
    return this._groupByDate(records);
  },

  // 原始历史记录（未分组）
  getHistory() {
    return this.get(this.KEYS.HISTORY_CACHE, []);
  },

  // 清空历史
  clearHistory() {
    this.set(this.KEYS.HISTORY_CACHE, []);
  },

  // 按日期分组（规则见 core/rules.js groupByDate）
  _groupByDate(records) {
    const today = this._today();
    const yesterday = RulesCore.shiftDateKey(today, -1);
    return RulesCore.groupByDate(records, today, yesterday);
  },

  // ============================================
  // 今日抽签次数管理
  // ============================================

  getTodayCount() {
    const record = this.get(this.KEYS.TODAY_RECORD, null);
    return RulesCore.getTodayCount(record, this._today());
  },

  // 增加今日计数，返回自增后的计数
  incrementTodayCount() {
    const today = this._today();
    const record = this.get(this.KEYS.TODAY_RECORD, null);
    const { record: next, count } = RulesCore.incrementTodayCount(record, today);
    this.set(this.KEYS.TODAY_RECORD, next);
    return count;
  },

  // 减少今日计数（看广告奖励「额外次数」用，最低 0）
  decrementTodayCount() {
    const today = this._today();
    const current = this.getTodayCount();
    const next = Math.max(0, current - 1);
    this.set(this.KEYS.TODAY_RECORD, { date: today, count: next });
    return next;
  },

  // 获取每日限制次数（优先级：后台设置 > 无限抽签权益 > 默认值）
  getDailyLimit() {
    return RulesCore.getDailyLimit({
      setting: this.get(this.KEYS.SETTINGS, null),
      unlimitedUnlocked: this.isFeatureUnlocked('unlimitedDraws'),
    });
  },

  // 获取剩余次数
  getRemainingDraws() {
    return RulesCore.getRemainingDraws(this.getDailyLimit(), this.getTodayCount());
  },

  // 是否还能抽签
  canDraw() {
    return RulesCore.canDraw(this.getRemainingDraws());
  },

  // ============================================
  // 功能解锁管理
  // ============================================

  isFeatureUnlocked(feature) {
    const features = this.get(this.KEYS.UNLOCKED_FEATURES, {});
    return !!features[feature];
  },

  unlockFeature(feature) {
    const features = this.get(this.KEYS.UNLOCKED_FEATURES, {});
    features[feature] = true;
    this.set(this.KEYS.UNLOCKED_FEATURES, features);
  },

  lockFeature(feature) {
    const features = this.get(this.KEYS.UNLOCKED_FEATURES, {});
    delete features[feature];
    this.set(this.KEYS.UNLOCKED_FEATURES, features);
  },

  // ============================================
  // 权益事件累计计数（成就系统埋点）
  // ============================================
  // 与「权益开关」分开：开关会被 lockFeature 清除（按次计费），
  // 计数只增不减，用来回答「累计做过多少次」。

  getFeatureEvents() {
    return this.get(this.KEYS.FEATURE_EVENTS, {}) || {};
  },

  // 事件计数 +1，返回自增后的值
  countFeatureEvent(eventKey) {
    const events = this.getFeatureEvents();
    events[eventKey] = (events[eventKey] || 0) + 1;
    this.set(this.KEYS.FEATURE_EVENTS, events);
    return events[eventKey];
  },
};

export default Storage;
