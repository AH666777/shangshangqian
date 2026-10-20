// ============================================
// 一键上上签 - 认证模块 (本地存储)
// ============================================
// 计划书 §6.5-4：不再直接调用 localStorage，统一走 js/adapter/storage.js，
// 以便迁移到小程序（wx.getStorageSync）时零改动。

const Auth = {
  _user: null,
  _listeners: [],
  _initialized: false,

  KEYS: {
    USER: 'yqsss_user',
    STATS: 'yqsss_stats',
    USERS: 'yqsss_users',       // 昵称 -> 用户档案，保证同名登录复用同一身份
    LAST_ACTIVE: 'yqsss_last_active_date',
  },

  // ========== 本地日期（YYYY-MM-DD） ==========
  _today() {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  },

  // ========== 初始化（应用启动时调用一次） ==========
  init() {
    if (this._initialized) return this._user;

    const raw = StorageAdapter.getItem(this.KEYS.USER);
    if (raw) {
      try {
        this._user = JSON.parse(raw);
      } catch {
        this._user = null;
      }
    }

    this._initialized = true;
    return this._user;
  },

  // ========== 昵称登录（新用户自动注册） ==========
  login(nickname) {
    if (!nickname || !nickname.trim()) {
      return { success: false, message: '请输入昵称' };
    }

    const name = nickname.trim();

    // 检查是否已存在同名用户
    const existing = this._getUserByName(name);

    if (existing) {
      // 老用户登录
      this._user = existing;
    } else {
      // 新用户注册
      this._user = {
        id: 'user_' + Date.now() + '_' + Math.random().toString(36).substring(2, 8),
        nickname: name,
        createdAt: new Date().toISOString(),
      };
      this._saveUser(this._user);
    }

    this._save();
    this._notifyListeners(true, this._user);
    return { success: true, user: this._user, isNew: !existing };
  },

  // ========== 用户档案表（按昵称索引） ==========
  _getUsers() {
    return Storage.get(this.KEYS.USERS, {}) || {};
  },

  _saveUser(user) {
    const users = this._getUsers();
    users[user.nickname] = user;
    Storage.set(this.KEYS.USERS, users);
  },

  _getUserByName(nickname) {
    const users = this._getUsers();
    return users[nickname] || null;
  },

  _save() {
    try {
      StorageAdapter.setItem(this.KEYS.USER, JSON.stringify(this._user));
    } catch (e) {
      console.warn('用户数据保存失败:', e);
    }
  },

  // ========== 注销 ==========
  logout() {
    this._user = null;
    StorageAdapter.removeItem(this.KEYS.USER);
    this._notifyListeners(false, null);
    return { success: true };
  },

  // ========== 状态查询 ==========
  isLoggedIn() {
    return !!this._user;
  },

  getUser() {
    return this._user;
  },

  getUserId() {
    return this._user?.id || 'local';
  },

  getNickname() {
    return this._user?.nickname || '用户';
  },

  // ========== 更新昵称 ==========
  updateNickname(nickname) {
    if (!this._user || !nickname.trim()) return false;
    this._user.nickname = nickname.trim();
    this._save();
    this._notifyListeners(true, this._user);
    return true;
  },

  // ========== 获取用户统计 ==========
  getProfileStats() {
    const raw = StorageAdapter.getItem(this.KEYS.STATS);
    const stats = raw ? (() => { try { return JSON.parse(raw); } catch { return {}; } })() : {};

    return {
      totalDraws: stats.totalDraws || 0,
      todayDraws: stats.todayDraws || 0,
      drawDays: stats.drawDays || 0,
      lastDrawDate: stats.lastDrawDate || '',
    };
  },

  // ========== 增加统计数据 ==========
  // 抽签天数按「有抽签行为的自然日」累计：
  // 只要本次抽签的本地日期与上次不同，天数 +1。
  incrementStats() {
    const stats = this.getProfileStats();
    const today = this._today();

    stats.totalDraws += 1;
    stats.todayDraws += 1;
    if (stats.lastDrawDate !== today) {
      stats.drawDays += 1;
      stats.lastDrawDate = today;
    }

    try {
      StorageAdapter.setItem(this.KEYS.STATS, JSON.stringify(stats));
    } catch (e) {
      console.warn('统计数据保存失败:', e);
    }
  },

  // ========== 重置今日计数（跨天时调用） ==========
  resetTodayIfNeeded() {
    const today = this._today();
    const lastDate = StorageAdapter.getItem(this.KEYS.LAST_ACTIVE);

    if (lastDate !== today) {
      // 跨天了，重置今日抽签数
      const raw = StorageAdapter.getItem(this.KEYS.STATS);
      if (raw) {
        try {
          const stats = JSON.parse(raw);
          stats.todayDraws = 0;
          StorageAdapter.setItem(this.KEYS.STATS, JSON.stringify(stats));
        } catch { /* ignore */ }
      }
      StorageAdapter.setItem(this.KEYS.LAST_ACTIVE, today);
      return true; // 表示跨天了
    }
    return false;
  },

  // ========== 监听器 ==========
  onChange(fn) {
    this._listeners.push(fn);
  },

  _notifyListeners(loggedIn, user) {
    this._listeners.forEach(fn => {
      try { fn(loggedIn, user); } catch (e) { /* ignore */ }
    });
  },
};
