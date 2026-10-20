// ============================================
// 一键上上签 - 数据存储模块（门面）
// ============================================
// 计划书 §6.5-4：本文件不再直接调用 localStorage，
// 读写统一走 js/adapter/storage.js 的 StorageAdapter（后端可插拔，
// 小程序接入时替换为 wx.setStorageSync 即可）。
// 次数限制、分组排序等规则下沉到 js/core/rules.js。
//
// 对外 API 与重构前 100% 一致（app.js / ad.js / auth.js 无需改动）。

const Storage = {
  KEYS: {
    TODAY_RECORD: 'yqsss_today',
    UNLOCKED_FEATURES: 'yqsss_features',
    SETTINGS: 'yqsss_settings',
    HISTORY_CACHE: 'yqsss_history_cache',
  },

  // ========== 工具方法 ==========
  _today() {
    return RulesCore.dateKey();
  },

  // 本地时间戳（YYYY-MM-DDTHH:mm:ss）
  // 不使用 toISOString()：那是 UTC 时间，会导致「今天/昨天」分组与展示时间在
  // UTC+8 时区下偏移 8 小时。
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
    Auth.resetTodayIfNeeded();
    Auth.incrementStats();
  },

  // 获取分组历史记录（按日期倒序）
  getGroupedHistory() {
    const records = this.get(this.KEYS.HISTORY_CACHE, []);
    return this._groupByDate(records);
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
};
