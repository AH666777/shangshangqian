'use strict';
// ============================================
// 一键上上签 - 认证云函数（支付宝云版）
// ============================================
// 作用：
//   1. wxLogin：前端拿 code，云函数用 AppSecret 换 openid，按 openid 读写 users 表
//   2. getProfile：按 openid 拉取最新用户档案
//   3. updateStats：抽签后回传统计（totalDraws / drawDays / streakDays / lastDrawDate / points）
//   4. saveRecord：写入一条抽签记录（成就系统与跨设备历史的统计数据源）
//   5. unlockAchievement：写入已解锁的成就（幂等，重复上报不会重复落库）
//   6. getAchievements：拉取该用户全部已解锁成就
//
// 注意：目标平台是微信小程序，但云空间跑在支付宝云上，
// 因此云函数环境里没有自动注入 AppSecret，必须手动在「云函数配置 → 环境变量」
// 里设置 WX_APPID 和 WX_APPSECRET（本地调试读同目录 .env）。
//
// WX_APPID 必须与 project.config.json / src/manifest.json 的 appid 一致（wx5a7366b5deaa5ac8），
// 否则换取 openid 时会返回 40029 invalid code。

const got = require('got');
const db = uniCloud.database();
const usersCollection = db.collection('users');
const recordsCollection = db.collection('records');
const achievementsCollection = db.collection('achievements');
const dbCmd = db.command;

// ---------- 合法成就 id 白名单 ----------
// 只放行前端真实定义的成就 id，防止构造请求往 achievements 表里写脏数据
// （比如任意字符串）污染库。数据源是 src/core/achievements.js 的 ACHIEVEMENTS[].id。
//
// ⚠️ 新增 / 删除成就时**必须同步维护这份清单**。
// smoke/achievements.test.mjs 里有一条断言会比对两者，出现漂移会直接测试失败。
const VALID_ACHIEVEMENT_IDS = new Set([
  'first_draw',
  'draw_10',
  'draw_50',
  'draw_100',
  'draw_365',
  'days_3',
  'days_7',
  'days_30',
  'first_best',
  'best_10',
  'first_premium',
  'premium_5',
  'collect_levels',
  'first_charge',
  'scenes_4',
  'exam_10',
  'work_10',
  'festival_5',
  'morning_draw',
  'night_draw',
  'day_5',
  'first_deep',
  'premium_unlock',
  'unlimited_unlock',
  'wechat_login',
  'deep_10',
  'poster_1',
  'poster_5',
  'streak_3',
  'streak_7',
  'streak_30',
  'charge_day_3',
  'charge_day_7',
  'charge_day_30',
  'charge_draw_3',
  'swing_day',
  'no_koi',
  'versailles',
  'loyal_scene',
  'all_in_one_day',
  'mid_master',
  'charge_master',
  'owl',
  'symmetric_time',
  'on_the_dot',
  'month_start',
  'weekend_warrior',
  'speed_run',
  'collector',
]);

// ---------- 北京时间工具 ----------
// 云函数运行在 UTC，用户在中国，日期/时段判定必须换算到 UTC+8，
// 否则「深夜祈愿」「连续天数」这类按自然日统计的逻辑会整体偏移 8 小时。
const BJ_OFFSET_MS = 8 * 3600 * 1000;
function bjDateKey(ts) {
  const d = new Date(ts + BJ_OFFSET_MS);
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}-${String(d.getUTCDate()).padStart(2, '0')}`;
}
function bjHour(ts) {
  return new Date(ts + BJ_OFFSET_MS).getUTCHours();
}

// ---------- 工具：从环境变量取 AppID / AppSecret ----------
function getWxCreds() {
  const appid = process.env.WX_APPID;
  const secret = process.env.WX_APPSECRET;
  if (!appid || !secret) {
    throw new Error('云函数未配置 WX_APPID / WX_APPSECRET，请在云函数配置里加环境变量');
  }
  return { appid, secret };
}

// ---------- 工具：按 openid 查用户，不存在则创建 ----------
async function upsertUserByOpenid(openid, unionid = '') {
  const existed = await usersCollection.where({ openid }).limit(1).get();
  if (existed.data && existed.data.length > 0) {
    const u = existed.data[0];
    // 更新最后登录时间
    await usersCollection.doc(u._id).update({
      lastLoginAt: Date.now(),
      unionid: unionid || u.unionid || '',
    });
    return { user: { ...u, lastLoginAt: Date.now() }, isNew: false };
  }

  const newDoc = {
    openid,
    unionid,
    nickname: '微信用户',
    avatar: '',
    loginType: 'wechat',
    points: 0,
    totalDraws: 0,
    drawDays: 0,
    lastDrawDate: '',
    createdAt: Date.now(),
    lastLoginAt: Date.now(),
  };
  const addRes = await usersCollection.add(newDoc);
  return { user: { _id: addRes.id, ...newDoc }, isNew: true };
}

// ============================================
// 主入口
// ============================================
exports.main = async (event = {}, context = {}) => {
  const action = event.action;

  // --------- action 1：code 换 openid 并落库 ---------
  if (action === 'wxLogin') {
    const code = event.code;
    if (!code) {
      return { code: 1001, message: '缺少 code' };
    }
    try {
      const { appid, secret } = getWxCreds();
      const url = 'https://api.weixin.qq.com/sns/jscode2session';
      const resp = await got(url, {
        method: 'GET',
        searchParams: { appid, secret, js_code: code, grant_type: 'authorization_code' },
        responseType: 'json',
        timeout: { request: 8000 },
      });
      const wxBody = resp.body || {};
      if (!wxBody.openid) {
        return { code: 1002, message: '微信返回错误: ' + (wxBody.errmsg || '未知') };
      }
      const { user, isNew } = await upsertUserByOpenid(wxBody.openid, wxBody.unionid || '');
      return {
        code: 0,
        isNew,
        user,
      };
    } catch (e) {
      return { code: 1099, message: 'wxLogin 异常: ' + (e.message || String(e)) };
    }
  }

  // --------- action 2：按 openid 拉取最新用户档案 ---------
  if (action === 'getProfile') {
    const openid = event.openid;
    if (!openid) return { code: 3001, message: '缺少 openid' };
    const res = await usersCollection.where({ openid }).limit(1).get();
    if (!res.data || res.data.length === 0) {
      return { code: 3002, message: '用户不存在' };
    }
    return { code: 0, user: res.data[0] };
  }

  // --------- action 3：抽签后回传统计 ---------
  // 前端每次抽签后调用。以客户端统计为准整体覆盖，避免多端累加错乱。
  if (action === 'updateStats') {
    const openid = event.openid;
    if (!openid) return { code: 4001, message: '缺少 openid' };

    const stats = event.stats || {};
    const patch = {};
    if (typeof stats.totalDraws === 'number') patch.totalDraws = stats.totalDraws;
    if (typeof stats.drawDays === 'number') patch.drawDays = stats.drawDays;
    if (typeof stats.streakDays === 'number') patch.streakDays = stats.streakDays;
    if (typeof stats.lastDrawDate === 'string') patch.lastDrawDate = stats.lastDrawDate;
    if (typeof stats.points === 'number') patch.points = stats.points;

    if (Object.keys(patch).length === 0) {
      return { code: 4002, message: '没有需要更新的字段' };
    }

    try {
      await usersCollection.where({ openid }).update(patch);
      return { code: 0 };
    } catch (e) {
      return { code: 4099, message: 'updateStats 异常: ' + (e.message || String(e)) };
    }
  }

  // --------- action 4：写入一条抽签记录 ---------
  // 日期与小时在服务端按北京时间计算，不信任客户端传值。
  if (action === 'saveRecord') {
    const openid = event.openid;
    if (!openid) return { code: 5001, message: '缺少 openid' };

    try {
      const now = Date.now();
      const doc = {
        openid,
        level: event.level || '',
        scene: event.scene || 'daily',
        title: event.title || '',
        dateKey: bjDateKey(now),
        hour: bjHour(now),
        createdAt: now,
      };
      await recordsCollection.add(doc);
      return { code: 0, record: doc };
    } catch (e) {
      return { code: 5099, message: 'saveRecord 异常: ' + (e.message || String(e)) };
    }
  }

  // --------- action 5：上报已解锁成就 ---------
  // 前端解锁后批量上报。写前先查已存在的 id，只补写缺失的，保证重复调用幂等。
  if (action === 'unlockAchievement') {
    const openid = event.openid;
    if (!openid) return { code: 6001, message: '缺少 openid' };

    const ids = Array.isArray(event.achievementIds)
      ? event.achievementIds
      : (event.achievementId ? [event.achievementId] : []);

    // 只接受白名单内的 id，避免构造请求写入脏数据
    const validIds = ids.filter((id) => typeof id === 'string' && VALID_ACHIEVEMENT_IDS.has(id));
    if (validIds.length === 0) return { code: 6002, message: '没有合法的 achievementId' };
    const rejected = ids.length - validIds.length;

    try {
      const now = Date.now();
      const existed = await achievementsCollection
        .where({ openid, achievementId: dbCmd.in(validIds) })
        .limit(1000)
        .get();
      const done = new Set((existed.data || []).map((doc) => doc.achievementId));
      const missing = validIds.filter((id) => !done.has(id));

      if (missing.length > 0) {
        await achievementsCollection.add(
          missing.map((achievementId) => ({ openid, achievementId, unlockedAt: now }))
        );
      }
      return { code: 0, added: missing.length, skipped: done.size, rejected };
    } catch (e) {
      return { code: 6099, message: 'unlockAchievement 异常: ' + (e.message || String(e)) };
    }
  }

  // --------- action 6：拉取已解锁成就 ---------
  // 前端登录时调用，与本地列表取并集合并（计划书 §5.5）。
  if (action === 'getAchievements') {
    const openid = event.openid;
    if (!openid) return { code: 6101, message: '缺少 openid' };

    try {
      const res = await achievementsCollection.where({ openid }).limit(1000).get();
      const list = (res.data || []).map((doc) => ({
        achievementId: doc.achievementId,
        unlockedAt: doc.unlockedAt || 0,
      }));
      return { code: 0, list };
    } catch (e) {
      return { code: 6199, message: 'getAchievements 异常: ' + (e.message || String(e)) };
    }
  }

  return { code: 0, message: 'yqsss-auth is alive' };
};
