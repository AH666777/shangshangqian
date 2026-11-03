// ============================================
// 一键上上签 - 认证模块（uni-app 版）
// ============================================
// 与 H5 版逻辑完全一致，仅将模块包装改为 ESM。
// 存储统一走 adapter，本文件不直接调用 uni.* 存储 API。
//
// 注：为避免与 storage.js 形成循环依赖，用户档案索引也直接走 StorageAdapter。

import StorageAdapter from '../adapter/storage.js';
import RulesCore from '../core/rules.js';
import LevelsCore from '../core/levels.js';

const Auth = {
  _user: null,
  _listeners: [],
  _initialized: false,

  KEYS: {
    USER: 'yqsss_user',
    STATS: 'yqsss_stats',
    USERS: 'yqsss_users',       // id -> 用户档案（微信用户按 openid 复用同一身份）
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

    const existing = this._getUserByName(name);

    if (existing) {
      this._user = existing;
    } else {
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

  // ========== 微信登录（uniCloud 云函数） ==========
  // 流程：uni.login() 取 code → 云函数 yqsss-auth 换 openid → 按 openid 读写 users 表。
  // 云函数返回的是云端真实档案（含 _id、points 等），前端只做缓存；
  // 同时返回一枚服务端签发的 token，后续所有云端调用只带它，不再传 openid。
  async loginWithWechat() {
    const session = await this._requestWxSession();
    if (!session.ok) {
      return { success: false, message: session.message };
    }

    // 云端真实档案写到本地，作为离线缓存。
    // 本地 id 用 'wx_' + openid，跨设备复用同一身份。
    const remote = session.body.user;
    const uid = 'wx_' + remote.openid;
    this._user = {
      id: uid,
      _id: remote._id || '',
      openid: remote.openid,
      unionid: remote.unionid || '',
      nickname: remote.nickname || '微信用户',
      avatar: remote.avatar || '',
      loginType: 'wechat',
      points: remote.points || 0,
      totalDraws: remote.totalDraws || 0,
      createdAt: remote.createdAt ? new Date(remote.createdAt).toISOString() : new Date().toISOString(),
      lastLoginAt: remote.lastLoginAt ? new Date(remote.lastLoginAt).toISOString() : '',
      token: session.body.token,
      tokenExpiresAt: session.body.expiresAt || 0,
    };

    this._saveUser(this._user);
    this._save();
    this._notifyListeners(true, this._user);
    return { success: true, user: this._user, isNew: !!session.body.isNew };
  },

  // ---------- 与云函数换取一次登录会话（不改变当前用户） ----------
  async _requestWxSession() {
    if (!this._cloudAvailable()) {
      return { ok: false, message: '当前环境未接入云函数，请改用昵称登录' };
    }

    const code = await this._wxLoginCode();
    if (!code) {
      return { ok: false, message: '获取微信凭证失败' };
    }

    let result = {};
    try {
      const res = await uniCloud.callFunction({
        name: 'yqsss-auth',
        data: { action: 'wxLogin', code },
      });
      result = (res && res.result) || {};
    } catch (e) {
      return { ok: false, message: '云函数调用失败，请确认已上传部署' };
    }

    if (result.code !== 0 || !result.user || !result.user.openid) {
      return { ok: false, message: result.message || '微信登录失败' };
    }
    // 旧版云函数（未升级）不会返回 token，这里必须显式失败——
    // 否则后续请求会持续收到 7001，用户只会看到「同步失败」而无从排查。
    if (!result.token) {
      return { ok: false, message: '云函数版本过旧，未返回登录凭证，请重新上传部署 yqsss-auth' };
    }
    return { ok: true, body: result };
  },

  // ---------- 登录凭证是否仍在有效期内 ----------
  // 提前 1 分钟判过期，避免请求发出时刚好跨过 exp。
  _tokenValid() {
    const token = this._user && this._user.token;
    const exp = this._user && this._user.tokenExpiresAt;
    return !!token && typeof exp === 'number' && exp - 60000 > Date.now();
  },

  // 供其他模块取用的凭证；没有则返回空串。
  getCloudToken() {
    return (this._user && this._user.token) || '';
  },

  // ---------- 确保云端会话可用（必要时静默续期） ----------
  // 微信登录的 code 可以随时重新获取，续期对用户完全无感：
  // 不弹窗、不改变身份、不通知 UI 监听器。
  async ensureCloudSession() {
    if (!this.isWechatLogin() || !this._cloudAvailable()) return false;
    if (this._tokenValid()) return true;

    const session = await this._requestWxSession();
    if (!session.ok) return false;

    const remote = session.body.user;
    this._user.token = session.body.token;
    this._user.tokenExpiresAt = session.body.expiresAt || 0;
    this._user._id = remote._id || this._user._id || '';
    // 积分以服务端为准（服务端已禁止客户端写入），顺手同步一次
    this._user.points = remote.points || 0;
    this._save();
    this._saveUser(this._user);
    return true;
  },

  // ========== 云端同步：统计回传 ==========
  // 抽签后调用，把本地统计回传 users 表（服务端只取较大值，且拒绝 points）。
  // 静默失败——网络异常不能影响本地抽签体验，失败不影响继续使用。
  async syncStatsToCloud() {
    if (!this.isWechatLogin() || !this._cloudAvailable()) return false;
    if (!await this.ensureCloudSession()) return false;

    const stats = this.getProfileStats();
    try {
      await uniCloud.callFunction({
        name: 'yqsss-auth',
        data: {
          action: 'updateStats',
          token: this.getCloudToken(),
          stats: {
            totalDraws: stats.totalDraws,
            drawDays: stats.drawDays,
            streakDays: stats.streakDays,
            lastDrawDate: stats.lastDrawDate,
          },
        },
      });
      return true;
    } catch (e) {
      return false;
    }
  },

  // ========== 云端同步：写入抽签记录 ==========
  // 与统计回传分开，便于后期单独关闭或调整上报粒度。
  async pushRecordToCloud(fortune, scene) {
    if (!this.isWechatLogin() || !this._cloudAvailable()) return false;
    if (!fortune) return false;
    if (!await this.ensureCloudSession()) return false;

    try {
      await uniCloud.callFunction({
        name: 'yqsss-auth',
        data: {
          action: 'saveRecord',
          token: this.getCloudToken(),
          level: fortune.level || '',
          scene: scene || 'daily',
          title: fortune.title || '',
        },
      });
      return true;
    } catch (e) {
      return false;
    }
  },

  // ---------- 云函数环境检测（H5 或未关联云空间时为 false） ----------
  _cloudAvailable() {
    return typeof uniCloud !== 'undefined' && typeof uniCloud.callFunction === 'function';
  },

  // ---------- 取微信临时登录凭证 code ----------
  _wxLoginCode() {
    return new Promise((resolve) => {
      uni.login({
        provider: 'weixin',
        success: (res) => resolve(res && res.code ? res.code : ''),
        fail: () => resolve(''),
      });
    });
  },

  // ========== 用户档案表（以 id 为主键，兼容早期按昵称索引的数据） ==========
  _getUsers() {
    return StorageAdapter.get(this.KEYS.USERS, {}) || {};
  },

  _saveUser(user) {
    const users = this._getUsers();
    users[user.id] = user;
    // 清理早期以昵称为 key 写入的同一条记录，避免重复占位
    if (users[user.nickname] && users[user.nickname].id === user.id) {
      delete users[user.nickname];
    }
    StorageAdapter.set(this.KEYS.USERS, users);
  },

  _getUserById(id) {
    const hit = this._getUsers()[id];
    return hit && hit.id === id ? hit : null;
  },

  _getUserByName(nickname) {
    const users = this._getUsers();
    const direct = users[nickname];
    if (direct && direct.nickname === nickname) return direct;
    return Object.values(users).find(u => u && u.nickname === nickname) || null;
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
    return this._user?.nickname || '游客';
  },

  // 是否为微信登录（区别于昵称登录的本地身份）
  isWechatLogin() {
    return this._user?.loginType === 'wechat';
  },

  // ========== 更新昵称 ==========
  updateNickname(nickname) {
    if (!this._user || !nickname.trim()) return false;
    this._user.nickname = nickname.trim();
    // 档案表以 id 为主键，需同步写回，否则下次按 id 取回的仍是旧昵称
    this._saveUser(this._user);
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
      streakDays: stats.streakDays || 0,
      lastDrawDate: stats.lastDrawDate || '',
      // 首次抽签的等级，只写一次。成就「凡尔赛本赛」用——
      // 本地历史只留最近 500 条，抽满 500 次后最早那条会被截断，只看 records 会判错。
      firstLevel: stats.firstLevel || '',
      // 连续「每天都抽到蓄力签」的天数。成就「蓄力三连日/七日蓄力/整月蓄力」用。
      // 同样持久化而非按 records 回算——整月蓄力要跨 30 天，按记录算会被 500 条上限截断。
      chargeDayStreak: stats.chargeDayStreak || 0,
      lastChargeDate: stats.lastChargeDate || '',
    };
  },

  // ========== 增加统计数据 ==========
  // 抽签天数按「有抽签行为的自然日」累计。
  // fortune 可选：用于记录「首次抽签等级」与「蓄力签连续天数」，不传则两者不变。
  incrementStats(fortune) {
    const stats = this.getProfileStats();
    const today = this._today();
    const yesterday = RulesCore.shiftDateKey(today, -1);

    // 只在从未记录过时写入，之后无论抽到什么都不再改
    if (!stats.firstLevel && fortune && fortune.level) {
      stats.firstLevel = fortune.level;
    }

    // 蓄力签连续天数：同一天不重复累加；上次抽到蓄力签恰好是昨天则续上，否则从 1 重新起算
    if (fortune && fortune.level && LevelsCore.normalizeLevel(fortune.level) === '蓄力签') {
      if (stats.lastChargeDate !== today) {
        stats.chargeDayStreak = stats.lastChargeDate === yesterday
          ? (stats.chargeDayStreak || 0) + 1
          : 1;
        stats.lastChargeDate = today;
      }
    }

    stats.totalDraws += 1;
    stats.todayDraws += 1;
    if (stats.lastDrawDate !== today) {
      stats.drawDays += 1;

      // 连续天数：只有「上次抽签恰好是昨天」才续上，否则从 1 重新起算。
      // 按自然日字符串相邻判定（而非时间戳差值），避免跨时区与跨零点误差。
      stats.streakDays = stats.lastDrawDate === yesterday ? (stats.streakDays || 0) + 1 : 1;

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
      const raw = StorageAdapter.getItem(this.KEYS.STATS);
      if (raw) {
        try {
          const stats = JSON.parse(raw);
          stats.todayDraws = 0;
          StorageAdapter.setItem(this.KEYS.STATS, JSON.stringify(stats));
        } catch { /* ignore */ }
      }
      StorageAdapter.setItem(this.KEYS.LAST_ACTIVE, today);
      return true;
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

export default Auth;
