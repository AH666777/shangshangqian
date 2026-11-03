// ============================================
// 一键上上签 - 成就判定 / 解锁 / 同步（uni-app 版）
// ============================================
// 对应 ACHIEVEMENT_PLAN.md 阶段一（判定）+ 阶段三（云端同步）。
//
// 分层约定：
//   core/achievements.js  —— 纯数据与纯判定，不认识存储
//   本文件                —— 负责取上下文、持久化、弹窗队列、云端同步
//
// 依赖方向：achievement -> storage / auth / core，**不反向依赖**。
// 因此判定钩子写在 modules/lottery.js draw() 里（抽签落盘之后），
// 而不是写在 storage.js saveRecord() 里——后者会与 storage -> achievement 形成环。

import StorageAdapter from '../adapter/storage.js';
import Storage from './storage.js';
import Auth from './auth.js';
import {
  ACHIEVEMENTS,
  TIERS,
  buildSummary,
  evaluate,
  findNewlyUnlocked,
  groupByCategory,
} from '../core/achievements.js';

const Achievement = {
  // 早期版本用全局单键存成就，换账号会互相看到。
  // 现在按 uid 分键；这个旧键只在首次读取时用于迁移，迁移完就不再读。
  LEGACY_KEY: 'yqsss_achievements',
  GUEST_UID: 'local',

  // 本次待展示的解锁列表（结果页消费后清空）
  _pending: [],
  _unlockListeners: [],

  // ========== 上下文：把各数据源拼成一份快照 ==========
  // 本地历史最多 500 条，属近似值；云端 records 才是全量（计划书 §5.4）。
  // 这里以本地为准——判定时机在抽签后，必须即时、不能等网络。
  // 连续天数类指标（streakDays / chargeDayStreak / firstLevel）由 Auth 持久化在
  // stats 里，不依赖历史记录，所以 500 条上限不会让它们算错。
  _context() {
    return {
      records: Storage.getHistory(),
      stats: Auth.getProfileStats(),
      events: Storage.getFeatureEvents(),
      features: {
        premiumFortunes: Storage.isFeatureUnlocked('premiumFortunes'),
        unlimitedDraws: Storage.isFeatureUnlocked('unlimitedDraws'),
      },
      isWechatLogin: Auth.isWechatLogin(),
    };
  },

  // ========== 存储 key（按用户隔离） ==========
  _uid() {
    return Auth.getUserId() || this.GUEST_UID;
  },

  _storageKey() {
    // openid 只含字母数字，但昵称登录生成的是 user_<时间戳>_<随机>，
    // 这里统一过滤一次，避免任何字符让 key 变得不可预期。
    return `yqsss_achievements_${String(this._uid()).replace(/[^a-zA-Z0-9_-]/g, '_')}`;
  },

  // 读取当前用户的解锁表，必要时自动迁移。
  // 迁移来源有两个，取并集、互不覆盖：
  //   ① LEGACY_KEY         —— 老版本的全局单键
  //   ② 游客态的 key        —— 游客期间解锁的成就，登录后并入正式账号（宁可多算不可丢进度）
  getUnlockedMap() {
    const key = this._storageKey();
    const current = StorageAdapter.get(key, null);
    if (current && typeof current === 'object') return current;

    const legacy = StorageAdapter.get(this.LEGACY_KEY, null);
    const guest = this._uid() !== this.GUEST_UID
      ? StorageAdapter.get(`yqsss_achievements_${this.GUEST_UID}`, null)
      : null;

    const migrated = { ...(legacy || {}), ...(guest || {}) };
    if (Object.keys(migrated).length > 0) {
      StorageAdapter.set(key, migrated);
      // 迁移完必须删源：同一份成就应该只归属一个账号。
      // 不删的话，任何「之后才登录的新账号」都会把这份历史成就继承过去。
      if (legacy) StorageAdapter.remove(this.LEGACY_KEY);
      if (guest) StorageAdapter.remove(`yqsss_achievements_${this.GUEST_UID}`);
    }
    return migrated;
  },

  _saveUnlockedMap(map) {
    StorageAdapter.set(this._storageKey(), map);
  },

  isUnlocked(id) {
    const map = this.getUnlockedMap();
    return typeof map[id] === 'number';
  },

  getUnlockedCount() {
    return Object.keys(this.getUnlockedMap()).length;
  },

  getTotalCount() {
    return ACHIEVEMENTS.length;
  },

  // ========== 判定并解锁 ==========
  // 返回本次新解锁的成就数组（已落盘的才算数）。
  // options.silent = true 时既不入弹窗队列也不通知订阅者——用于成就墙 / 个人主页
  // 这类「只刷新数字」的场景，避免用户从成就页返回结果页时又弹一次已经看过的提示。
  // 整段静默失败：成就是锦上添花的功能，绝不能影响抽签主流程。
  evaluate(options) {
    const silent = !!(options && options.silent);
    let fresh = [];
    try {
      const summary = buildSummary(this._context());
      const map = this.getUnlockedMap();
      fresh = findNewlyUnlocked(summary, map);

      if (fresh.length > 0) {
        const now = Date.now();
        fresh.forEach((item) => { map[item.id] = now; });
        this._saveUnlockedMap(map);
        if (!silent) {
          this._pending = this._pending.concat(fresh);
          this._emitUnlock(fresh);
        }
        // 不 await：解锁上报不能拖住当前交互。
        // 上报失败不要紧——下次 syncWithCloud 会做全量对账把它补上去。
        this._pushToCloud(fresh.map((item) => item.id));
      }
    } catch (e) {
      console.warn('[成就] 判定失败，已静默跳过:', e);
      return [];
    }
    return fresh;
  },

  // ========== 解锁通知（供结果页实时弹窗） ==========
  // 抽签场景走 takePending()——判定发生在页面跳转前，订阅者还没挂载。
  // 页内解锁场景（看广告解锁权益）走 onUnlock()——此时页面已在，来不及等 onShow。
  onUnlock(fn) {
    this._unlockListeners.push(fn);
  },

  _emitUnlock(list) {
    this._unlockListeners.forEach((fn) => {
      try { fn(list); } catch (e) { /* 单个订阅者出错不影响其他 */ }
    });
  },

  // ========== 弹窗队列 ==========
  // 结果页 onShow 时取走；取走即清空，避免返回上一页后重复弹出。
  takePending() {
    const list = this._pending;
    this._pending = [];
    return list;
  },

  // ========== 成就墙数据 ==========
  // 返回按分区打包好的列表，每项带 unlocked / unlockedAt / 进度。
  getWall() {
    const summary = buildSummary(this._context());
    const map = this.getUnlockedMap();
    const items = evaluate(summary);
    return groupByCategory(items, map);
  },

  getTierMeta(tier) {
    return TIERS[tier] || TIERS.bronze;
  },

  // ========== 云端同步（阶段三） ==========
  _cloudAvailable() {
    return typeof uniCloud !== 'undefined' && typeof uniCloud.callFunction === 'function';
  },

  // 上报已解锁的成就 id。云函数侧做了「查重 + 只补缺失」，重复调用幂等。
  // 身份由 token 决定，不再往请求里塞 openid（服务端会拒绝跨账号的 openid）。
  async _pushToCloud(ids) {
    if (!ids || ids.length === 0) return false;
    if (!Auth.isWechatLogin() || !this._cloudAvailable()) return false;
    if (!await Auth.ensureCloudSession()) return false;

    try {
      await uniCloud.callFunction({
        name: 'yqsss-auth',
        data: { action: 'unlockAchievement', token: Auth.getCloudToken(), achievementIds: ids },
      });
      return true;
    } catch (e) {
      // 上报失败不回滚本地解锁状态，由下次 syncWithCloud 对账补齐
      return false;
    }
  },

  // 与云端双向对账。
  //
  // 为什么必须双向：上报只发生在「新解锁」的瞬间。一旦那时云函数还没部署、
  // 网络不通、或者用户还是游客身份，上报就丢了——而本地已标记解锁，
  // findNewlyUnlocked 之后不会再返回它。单向同步会让成就永久停留在本地。
  //
  // 合并口径取并集（计划书 §5.5），解锁时间取两端较早的一个，
  // 避免「事后补算」把时间刷成今天。
  async syncWithCloud() {
    if (!Auth.isWechatLogin() || !this._cloudAvailable()) return { merged: 0, pushed: 0 };
    if (!await Auth.ensureCloudSession()) return { merged: 0, pushed: 0 };

    let list = [];
    try {
      const res = await uniCloud.callFunction({
        name: 'yqsss-auth',
        data: { action: 'getAchievements', token: Auth.getCloudToken() },
      });
      const body = (res && res.result) || {};
      if (body.code !== 0 || !Array.isArray(body.list)) return { merged: 0, pushed: 0 };
      list = body.list;
    } catch (e) {
      return { merged: 0, pushed: 0 };
    }

    const map = this.getUnlockedMap();
    const cloudIds = new Set();
    let merged = 0;

    list.forEach((item) => {
      const id = item && item.achievementId;
      if (!id) return;
      cloudIds.add(id);
      const remoteAt = typeof item.unlockedAt === 'number' ? item.unlockedAt : Date.now();
      if (typeof map[id] !== 'number') {
        map[id] = remoteAt;
        merged += 1;
      } else if (remoteAt < map[id]) {
        map[id] = remoteAt;
      }
    });

    // 本地有、云端没有的 -> 补报。这是修复单向同步数据丢失的关键一步。
    const missing = Object.keys(map).filter((id) => !cloudIds.has(id));

    this._saveUnlockedMap(map);
    if (missing.length > 0) await this._pushToCloud(missing);

    return { merged, pushed: missing.length };
  },

  // ========== 清空（仅供调试 / 账号注销） ==========
  // 只清当前用户，不动其他账号，也不删云端。
  reset() {
    this._pending = [];
    StorageAdapter.remove(this._storageKey());
  },
};

export default Achievement;