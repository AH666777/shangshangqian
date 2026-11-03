'use strict';
// ============================================
// 一键上上签 - 认证云函数（支付宝云版）
// ============================================
// 作用：
//   1. wxLogin：前端拿 code，云函数用 AppSecret 换 openid，按 openid 读写 users 表，
//      并签发一枚 HMAC 登录凭证（token）
//   2. getProfile：拉取当前登录用户的最新档案
//   3. updateStats：抽签后回传统计（totalDraws / drawDays / streakDays / lastDrawDate）
//   4. saveRecord：写入一条抽签记录（成就系统与跨设备历史的统计数据源）
//   5. unlockAchievement：写入已解锁的成就（幂等，重复上报不会重复落库）
//   6. getAchievements：拉取该用户全部已解锁成就
//
// 身份模型（P0 安全改造）：
//   除 wxLogin 外的所有 action 都**不再信任客户端传入的 openid**，
//   只认 wxLogin 签发、服务端 HMAC 校验通过的 token。
//   这样即使拿到他人 openid，也无法读取或篡改他人档案、统计、记录、成就。
//
// 注意：目标平台是微信小程序，但云空间跑在支付宝云上，
// 因此云函数环境里没有自动注入 AppSecret，必须手动在「云函数配置 → 环境变量」
// 里设置 WX_APPID 和 WX_APPSECRET（本地调试读同目录 .env）。
//
// WX_APPID 必须与 project.config.json / src/manifest.json 的 appid 一致（wx5a7366b5deaa5ac8），
// 否则换取 openid 时会返回 40029 invalid code。

const crypto = require('crypto');
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

// 合法场景 key，与前端 core/scenes 的 key 对齐
const VALID_SCENES = new Set(['daily', 'exam', 'work', 'festival']);

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

// ============================================
// 登录凭证（HMAC-SHA256）
// ============================================
// 为什么要有它：openid 是「身份标识」，不是「凭证」。
// 客户端只要知道某人 openid 就能冒充他，所以服务端必须自己签发、自己校验。
//
// 格式：base64url(payload) + '.' + base64url(HMAC-SHA256(base64url(payload)))
// payload = { iss, openid, iat, exp }
//
// 密钥优先取 AUTH_TOKEN_SECRET；未配置时回退用 WX_APPSECRET，
// 好处是现有部署不用加配置就能立刻生效。
// 代价：重置 AppSecret 会让已签发的 token 一起失效，用户重新登录即可，可接受。
const TOKEN_ISSUER = 'yqsss-auth';
const TOKEN_TTL_MS = 7 * 24 * 3600 * 1000; // 7 天：微信登录可静默续期，没必要给长窗口

function getTokenSecret() {
  const secret = process.env.AUTH_TOKEN_SECRET || process.env.WX_APPSECRET;
  if (!secret) {
    throw new Error('云函数未配置 AUTH_TOKEN_SECRET / WX_APPSECRET，无法签发登录凭证');
  }
  return secret;
}

function b64urlEncode(input) {
  return Buffer.from(input)
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
}

function b64urlDecode(str) {
  const normalized = String(str).replace(/-/g, '+').replace(/_/g, '/');
  return Buffer.from(normalized, 'base64').toString('utf8');
}

function signPayload(payloadB64) {
  return b64urlEncode(crypto.createHmac('sha256', getTokenSecret()).update(payloadB64).digest());
}

function issueToken(openid) {
  const now = Date.now();
  const exp = now + TOKEN_TTL_MS;
  const payloadB64 = b64urlEncode(JSON.stringify({
    iss: TOKEN_ISSUER,
    openid,
    iat: now,
    exp,
  }));
  return { token: `${payloadB64}.${signPayload(payloadB64)}`, expiresAt: exp };
}

// 返回 { ok: true, openid } 或 { ok: false, code, message }
function verifyToken(token) {
  if (typeof token !== 'string' || token.length === 0) {
    return { ok: false, code: 7001, message: '缺少登录凭证，请重新登录' };
  }

  const parts = token.split('.');
  if (parts.length !== 2 || !parts[0] || !parts[1]) {
    return { ok: false, code: 7002, message: '登录凭证格式非法' };
  }

  const payloadB64 = parts[0];
  const signature = parts[1];

  let expected;
  try {
    expected = signPayload(payloadB64);
  } catch (e) {
    return { ok: false, code: 7099, message: e.message || String(e) };
  }

  // 长度不等时 timingSafeEqual 会直接抛错，先比长度
  if (signature.length !== expected.length) {
    return { ok: false, code: 7002, message: '登录凭证校验失败' };
  }
  if (!crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expected))) {
    return { ok: false, code: 7002, message: '登录凭证校验失败' };
  }

  let payload;
  try {
    payload = JSON.parse(b64urlDecode(payloadB64));
  } catch (e) {
    return { ok: false, code: 7002, message: '登录凭证内容非法' };
  }

  if (!payload || payload.iss !== TOKEN_ISSUER || typeof payload.openid !== 'string' || !payload.openid) {
    return { ok: false, code: 7002, message: '登录凭证内容非法' };
  }
  if (typeof payload.exp !== 'number' || payload.exp <= Date.now()) {
    return { ok: false, code: 7003, message: '登录凭证已过期，请重新登录' };
  }

  return { ok: true, openid: payload.openid };
}

// 解析请求身份。除 wxLogin 外的 action 一律走这里，**不再读 event.openid**。
function resolveIdentity(event) {
  const checked = verifyToken(event && event.token);
  if (!checked.ok) return { error: { code: checked.code, message: checked.message } };

  // 显式拦截「拿自己的 token 夹带别人 openid」的构造请求，
  // 让越权尝试在日志里留下明确信号，而不是被静默忽略。
  const claimed = event.openid;
  if (typeof claimed === 'string' && claimed && claimed !== checked.openid) {
    return { error: { code: 7004, message: 'openid 与登录凭证不匹配，拒绝跨账号访问' } };
  }

  return { openid: checked.openid };
}

// ---------- 工具：按 openid 查用户，不存在则创建 ----------
// openid 上有唯一索引（users.index.json）。并发首登时两个请求可能同时判定「不存在」，
// 后插入的那个会撞唯一索引——此时回读既有档案即可，不能把登录整个判失败。
async function upsertUserByOpenid(openid, unionid = '') {
  const existed = await usersCollection.where({ openid }).limit(1).get();
  if (existed.data && existed.data.length > 0) {
    const u = existed.data[0];
    const now = Date.now();
    await usersCollection.doc(u._id).update({
      lastLoginAt: now,
      unionid: unionid || u.unionid || '',
    });
    return { user: { ...u, lastLoginAt: now }, isNew: false };
  }

  const now = Date.now();
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
    createdAt: now,
    lastLoginAt: now,
  };

  try {
    const addRes = await usersCollection.add(newDoc);
    return { user: { _id: addRes.id, ...newDoc }, isNew: true };
  } catch (e) {
    const again = await usersCollection.where({ openid }).limit(1).get();
    if (again.data && again.data.length > 0) {
      const u = again.data[0];
      const ts = Date.now();
      await usersCollection.doc(u._id).update({
        lastLoginAt: ts,
        unionid: unionid || u.unionid || '',
      });
      return { user: { ...u, lastLoginAt: ts }, isNew: false };
    }
    throw e;
  }
}

// ---------- 工具：数值清洗 ----------
// 统计由客户端上报（离线优先），服务端无法完全证伪，但至少要挡住
// 「负数 / 天文数字 / 天数大于总次数」这类一眼假的输入。
const MAX_COUNTER = 1000000;
function clampInt(value, max) {
  const n = Math.floor(value);
  if (!Number.isFinite(n) || n < 0) return 0;
  return Math.min(n, max);
}
function safeString(value, maxLen) {
  if (value === null || value === undefined) return '';
  return String(value).slice(0, maxLen);
}

// ============================================
// 主入口
// ============================================
exports.main = async (event = {}, context = {}) => {
  const action = event.action;

  // --------- action 1：code 换 openid 并落库，签发登录凭证 ---------
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
      const { token, expiresAt } = issueToken(wxBody.openid);

      return {
        code: 0,
        isNew,
        user,
        token,
        expiresAt,
      };
    } catch (e) {
      return { code: 1099, message: 'wxLogin 异常: ' + (e.message || String(e)) };
    }
  }

  // --------- action 2：拉取当前登录用户的最新档案 ---------
  if (action === 'getProfile') {
    const identity = resolveIdentity(event);
    if (identity.error) return identity.error;

    const res = await usersCollection.where({ openid: identity.openid }).limit(1).get();
    if (!res.data || res.data.length === 0) {
      return { code: 3002, message: '用户不存在' };
    }
    return { code: 0, user: res.data[0] };
  }

  // --------- action 3：抽签后回传统计 ---------
  // 计数类字段取「服务端旧值 vs 客户端新值」的较大者：既避免多端重复累加，
  // 也挡住把数据改小来刷成就/掩盖行为的请求。
  //
  // ⚠️ points 不在此处接受。积分是服务端资产，客户端能写就等于能凭空造币。
  // 将来若要做积分，必须新增独立的服务端记账 action（带原因白名单与日上限）。
  if (action === 'updateStats') {
    const identity = resolveIdentity(event);
    if (identity.error) return identity.error;
    const openid = identity.openid;

    const stats = event.stats || {};
    const patch = {};
    if (typeof stats.totalDraws === 'number') patch.totalDraws = clampInt(stats.totalDraws, MAX_COUNTER);
    if (typeof stats.drawDays === 'number') patch.drawDays = clampInt(stats.drawDays, MAX_COUNTER);
    if (typeof stats.streakDays === 'number') patch.streakDays = clampInt(stats.streakDays, MAX_COUNTER);
    if (typeof stats.lastDrawDate === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(stats.lastDrawDate)) {
      patch.lastDrawDate = stats.lastDrawDate;
    }

    if (Object.keys(patch).length === 0) {
      return { code: 4002, message: '没有需要更新的字段' };
    }

    try {
      const current = await usersCollection.where({ openid }).limit(1).get();
      if (!current.data || current.data.length === 0) {
        return { code: 4003, message: '用户不存在，请重新登录' };
      }
      const old = current.data[0];
      const oldNum = (field) => (typeof old[field] === 'number' ? old[field] : 0);

      if (patch.totalDraws !== undefined) {
        patch.totalDraws = Math.max(oldNum('totalDraws'), patch.totalDraws);
      }
      const totalDraws = patch.totalDraws !== undefined ? patch.totalDraws : oldNum('totalDraws');

      if (patch.drawDays !== undefined) {
        patch.drawDays = Math.min(patch.drawDays, totalDraws);
      }
      const drawDays = patch.drawDays !== undefined ? patch.drawDays : oldNum('drawDays');

      if (patch.streakDays !== undefined) {
        patch.streakDays = Math.min(patch.streakDays, drawDays);
      }

      // 日期只允许前进，挡住「改回上周」让连续天数重新起算
      if (patch.lastDrawDate !== undefined && typeof old.lastDrawDate === 'string'
        && old.lastDrawDate && patch.lastDrawDate < old.lastDrawDate) {
        patch.lastDrawDate = old.lastDrawDate;
      }

      await usersCollection.doc(old._id).update(patch);
      return { code: 0 };
    } catch (e) {
      return { code: 4099, message: 'updateStats 异常: ' + (e.message || String(e)) };
    }
  }

  // --------- action 4：写入一条抽签记录 ---------
  // 日期与小时在服务端按北京时间计算，不信任客户端传值。
  if (action === 'saveRecord') {
    const identity = resolveIdentity(event);
    if (identity.error) return identity.error;
    const openid = identity.openid;

    try {
      const now = Date.now();
      const doc = {
        openid,
        level: safeString(event.level, 16),
        scene: VALID_SCENES.has(event.scene) ? event.scene : 'daily',
        title: safeString(event.title, 64),
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
    const identity = resolveIdentity(event);
    if (identity.error) return identity.error;
    const openid = identity.openid;

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
        try {
          await achievementsCollection.add(
            missing.map((achievementId) => ({ openid, achievementId, unlockedAt: now }))
          );
        } catch (e) {
          // 并发上报可能撞 (openid, achievementId) 唯一索引。
          // 只要最终所有 id 都在库里，这次调用就算成功，不把并发当故障。
          const after = await achievementsCollection
            .where({ openid, achievementId: dbCmd.in(validIds) })
            .limit(1000)
            .get();
          const doneNow = new Set((after.data || []).map((doc) => doc.achievementId));
          const stillMissing = validIds.filter((id) => !doneNow.has(id));
          if (stillMissing.length > 0) throw e;
        }
      }
      return { code: 0, added: missing.length, skipped: validIds.length - missing.length, rejected };
    } catch (e) {
      return { code: 6099, message: 'unlockAchievement 异常: ' + (e.message || String(e)) };
    }
  }

  // --------- action 6：拉取已解锁成就 ---------
  // 前端登录时调用，与本地列表取并集合并（计划书 §5.5）。
  if (action === 'getAchievements') {
    const identity = resolveIdentity(event);
    if (identity.error) return identity.error;

    try {
      const res = await achievementsCollection.where({ openid: identity.openid }).limit(1000).get();
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
