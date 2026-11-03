'use strict';
// ============================================
// yqsss-auth 云函数安全与一致性回归测试（P0）
// ============================================
// 目的：不依赖真实 uniCloud / 微信接口，直接在本地验证
//   1. 越权（IDOR）：无 token、篡改 token、跨账号 openid 一律被拒
//   2. 积分：updateStats 不再接受客户端写入 points
//   3. 统计：计数只增不减，天数不得大于总次数
//   4. 并发首登：openid 唯一索引下只落一条档案
//   5. 记录落库：非法 scene 归一为 daily，字段长度受限
//
// 运行：node smoke/cloud-auth.test.cjs
// 做法：用 Module._load 钩子把 got 换成假实现，用内存数组冒充 uniCloud 数据库，
//       index.js 本身不做任何改动。

const assert = require('assert');
const path = require('path');
const crypto = require('crypto');
const Module = require('module');

const FN_PATH = path.join(__dirname, '../uniCloud-alipay/cloudfunctions/yqsss-auth/index.js');
const TEST_SECRET = 'secret_for_test_only';

// ---------- 内存数据库（模拟 uniCloud database API） ----------
function createFakeDb() {
  const store = { users: [], records: [], achievements: [] };
  let seq = 0;

  const clone = (value) => JSON.parse(JSON.stringify(value));

  function match(doc, cond) {
    return Object.keys(cond).every((key) => {
      const expected = cond[key];
      if (expected && expected.__op === 'in') return expected.values.includes(doc[key]);
      return doc[key] === expected;
    });
  }

  function collection(name) {
    const rows = store[name];

    return {
      where(cond) {
        const pick = () => rows.filter((doc) => match(doc, cond));
        const api = {
          limit() { return api; },
          async get() { return { data: clone(pick()) }; },
          async update(patch) {
            const hit = pick();
            hit.forEach((doc) => Object.assign(doc, clone(patch)));
            return { updated: hit.length };
          },
        };
        return api;
      },

      doc(id) {
        return {
          async update(patch) {
            const doc = rows.find((row) => row._id === id);
            if (doc) Object.assign(doc, clone(patch));
            return { updated: doc ? 1 : 0 };
          },
        };
      },

      async add(input) {
        const list = Array.isArray(input) ? input : [input];

        // 模拟唯一索引：users.openid、achievements(openid, achievementId)
        if (name === 'users') {
          list.forEach((doc) => {
            if (rows.some((row) => row.openid === doc.openid)) {
              const err = new Error('E11000 duplicate key error: idx_openid');
              err.code = 11000;
              throw err;
            }
          });
        }
        if (name === 'achievements') {
          list.forEach((doc) => {
            if (rows.some((row) => row.openid === doc.openid && row.achievementId === doc.achievementId)) {
              const err = new Error('E11000 duplicate key error: idx_openid_achievement');
              err.code = 11000;
              throw err;
            }
          });
        }

        const ids = list.map((doc) => {
          const id = `${name}_${++seq}`;
          rows.push({ _id: id, ...clone(doc) });
          return id;
        });
        return { id: ids[0], ids };
      },
    };
  }

  const db = {
    collection,
    command: { in: (values) => ({ __op: 'in', values }) },
  };
  return { db, store };
}

// ---------- 假微信接口 ----------
const fakeGot = async (url, options) => {
  const code = options && options.searchParams && options.searchParams.js_code;
  if (!code || code === 'bad_code') {
    return { body: { errcode: 40029, errmsg: 'invalid code' } };
  }
  return { body: { openid: `openid_${code}`, unionid: '' } };
};

// ---------- 装载被测函数 ----------
const { db, store } = createFakeDb();
global.uniCloud = { database: () => db };

const originalLoad = Module._load;
Module._load = function patchedLoad(request, parent, isMain) {
  if (request === 'got') return fakeGot;
  return originalLoad.call(this, request, parent, isMain);
};

process.env.WX_APPID = 'wx_test_appid';
process.env.WX_APPSECRET = TEST_SECRET;
delete process.env.AUTH_TOKEN_SECRET;

/* eslint-disable import/no-dynamic-require */
const authFn = require(FN_PATH);

// ---------- 轻量断言器 ----------
let passed = 0;
let failed = 0;

async function it(name, fn) {
  try {
    await fn();
    passed += 1;
    console.log(`  ✅ ${name}`);
  } catch (e) {
    failed += 1;
    console.log(`  ❌ ${name}`);
    console.log(`     ${e.message}`);
  }
}

// ---------- 工具：自行签发 token（用于构造过期 / 篡改样本） ----------
function b64url(input) {
  return Buffer.from(input).toString('base64')
    .replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}
function forgeToken(payload, secret) {
  const body = b64url(JSON.stringify(payload));
  const sig = crypto.createHmac('sha256', secret).update(body).digest('base64')
    .replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  return `${body}.${sig}`;
}
function findUser(openid) {
  return store.users.find((row) => row.openid === openid) || null;
}

// ============================================
(async () => {
  console.log('\n=== yqsss-auth 安全回归 ===\n');

  let aliceToken = '';
  let bobToken = '';

  await it('wxLogin 成功并签发带过期时间的 token', async () => {
    const res = await authFn.main({ action: 'wxLogin', code: 'alice' });
    assert.strictEqual(res.code, 0, JSON.stringify(res));
    assert.ok(res.token && typeof res.token === 'string');
    assert.strictEqual(res.token.split('.').length, 2);
    assert.ok(res.expiresAt > Date.now(), 'expiresAt 应在未来');
    assert.strictEqual(res.user.openid, 'openid_alice');
    aliceToken = res.token;
  });

  await it('旧客户端只传 openid、不带 token → 7001 拒绝', async () => {
    const res = await authFn.main({ action: 'getProfile', openid: 'openid_alice' });
    assert.strictEqual(res.code, 7001, JSON.stringify(res));
  });

  await it('token 被篡改 → 7002 拒绝', async () => {
    const i = Math.floor(aliceToken.length / 2);
    const replacement = aliceToken[i] === 'a' ? 'b' : 'a';
    const tampered = aliceToken.slice(0, i) + replacement + aliceToken.slice(i + 1);
    const res = await authFn.main({ action: 'getProfile', token: tampered });
    assert.strictEqual(res.code, 7002, JSON.stringify(res));
  });

  await it('替换 payload 保留原签名 → 7002 拒绝', async () => {
    const [body, sig] = aliceToken.split('.');
    const payload = JSON.parse(Buffer.from(body.replace(/-/g, '+').replace(/_/g, '/'), 'base64').toString('utf8'));
    payload.openid = 'openid_bob';
    const forged = `${b64url(JSON.stringify(payload))}.${sig}`;
    const res = await authFn.main({ action: 'getProfile', token: forged });
    assert.strictEqual(res.code, 7002, JSON.stringify(res));
  });

  await it('token 过期 → 7003 拒绝', async () => {
    const expired = forgeToken({
      iss: 'yqsss-auth',
      openid: 'openid_alice',
      iat: Date.now() - 10000,
      exp: Date.now() - 1000,
    }, TEST_SECRET);
    const res = await authFn.main({ action: 'getProfile', token: expired });
    assert.strictEqual(res.code, 7003, JSON.stringify(res));
  });

  await it('自己的 token 夹带他人 openid → 7004 拒绝（IDOR tripwire）', async () => {
    const res = await authFn.main({
      action: 'getAchievements',
      token: aliceToken,
      openid: 'openid_bob',
    });
    assert.strictEqual(res.code, 7004, JSON.stringify(res));
  });

  await it('有效 token 只能读到自己名下的成就', async () => {
    const bobLogin = await authFn.main({ action: 'wxLogin', code: 'bob' });
    bobToken = bobLogin.token;

    const addAlice = await authFn.main({
      action: 'unlockAchievement',
      token: aliceToken,
      achievementIds: ['first_draw', 'draw_10'],
    });
    assert.strictEqual(addAlice.code, 0, JSON.stringify(addAlice));

    const addBob = await authFn.main({
      action: 'unlockAchievement',
      token: bobToken,
      achievementIds: ['first_draw'],
    });
    assert.strictEqual(addBob.code, 0, JSON.stringify(addBob));

    const aliceList = await authFn.main({ action: 'getAchievements', token: aliceToken });
    const bobList = await authFn.main({ action: 'getAchievements', token: bobToken });
    assert.deepStrictEqual(aliceList.list.map((x) => x.achievementId).sort(), ['draw_10', 'first_draw']);
    assert.deepStrictEqual(bobList.list.map((x) => x.achievementId), ['first_draw']);
  });

  await it('重复上报成就幂等，不产生重复行', async () => {
    await authFn.main({ action: 'unlockAchievement', token: aliceToken, achievementIds: ['first_draw'] });
    const rows = store.achievements.filter((row) => row.openid === 'openid_alice');
    assert.strictEqual(rows.length, 2, '仍应只有 first_draw 与 draw_10 两行');
  });

  await it('updateStats 忽略客户端传入的 points（不可凭空造币）', async () => {
    const res = await authFn.main({
      action: 'updateStats',
      token: aliceToken,
      stats: { totalDraws: 1, drawDays: 1, streakDays: 1, lastDrawDate: '2026-11-03', points: 999999 },
    });
    assert.strictEqual(res.code, 0, JSON.stringify(res));
    assert.strictEqual(findUser('openid_alice').points, 0, 'points 必须保持服务端原值');
  });

  await it('updateStats 计数只增不减，天数不得大于总次数', async () => {
    await authFn.main({
      action: 'updateStats',
      token: aliceToken,
      stats: { totalDraws: 10, drawDays: 8, streakDays: 5, lastDrawDate: '2026-11-03' },
    });

    await authFn.main({
      action: 'updateStats',
      token: aliceToken,
      stats: { totalDraws: 3, drawDays: 99, streakDays: 99, lastDrawDate: '2026-10-01' },
    });

    const user = findUser('openid_alice');
    assert.strictEqual(user.totalDraws, 10, 'totalDraws 不应被改小');
    assert.strictEqual(user.drawDays, 10, 'drawDays 应被收敛到 totalDraws');
    assert.strictEqual(user.streakDays, 10, 'streakDays 应被收敛到 drawDays');
    assert.strictEqual(user.lastDrawDate, '2026-11-03', '日期不应倒退');
  });

  await it('updateStats 拒绝非法日期格式', async () => {
    const res = await authFn.main({
      action: 'updateStats',
      token: aliceToken,
      stats: { lastDrawDate: 'not-a-date' },
    });
    assert.strictEqual(res.code, 4002, JSON.stringify(res));
  });

  await it('saveRecord 非法 scene 归一为 daily，字段长度受限', async () => {
    const res = await authFn.main({
      action: 'saveRecord',
      token: aliceToken,
      level: '上上签',
      scene: 'hacked_scene',
      title: 'x'.repeat(200),
    });
    assert.strictEqual(res.code, 0, JSON.stringify(res));
    assert.strictEqual(res.record.scene, 'daily');
    assert.strictEqual(res.record.title.length, 64);
    assert.ok(/^\d{4}-\d{2}-\d{2}$/.test(res.record.dateKey), 'dateKey 由服务端生成');
  });

  await it('并发首登只落一条用户档案（openid 唯一索引 + 冲突回读）', async () => {
    const [a, b] = await Promise.all([
      authFn.main({ action: 'wxLogin', code: 'carol' }),
      authFn.main({ action: 'wxLogin', code: 'carol' }),
    ]);
    assert.strictEqual(a.code, 0, JSON.stringify(a));
    assert.strictEqual(b.code, 0, JSON.stringify(b));

    const rows = store.users.filter((row) => row.openid === 'openid_carol');
    assert.strictEqual(rows.length, 1, `期望 1 条，实际 ${rows.length} 条`);
    assert.strictEqual([a.isNew, b.isNew].filter(Boolean).length, 1, '应恰好一方判定为新用户');
  });

  await it('未注册 action 仍返回存活探针', async () => {
    const res = await authFn.main({});
    assert.strictEqual(res.code, 0);
  });

  console.log(`\n结果：${passed} 通过 / ${failed} 失败\n`);
  process.exit(failed === 0 ? 0 : 1);
})();
