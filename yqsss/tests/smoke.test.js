// ============================================
// 经典脚本装载冒烟测试（计划书 §6.5-5 补充）
// ============================================
// 目的：验证「拆分 core / adapter / ui 之后，index.html 按真实顺序装载脚本」
// 仍然能在浏览器语义下正常协同工作。
//
// 做法：解析 index.html 中真实的 <script src> 顺序，在 node:vm 沙箱中
// 按序执行（沙箱提供最小 document / localStorage 桩），
// 然后跑通「登录 -> 抽签 -> 历史分组 -> 深度解签」全链路。
//
// 为什么必须按 index.html 的顺序装载：经典脚本之间靠全局词法绑定互相引用，
// 顺序错了就会拿到 undefined。本测试即为该约束的回归防护。

import { describe, it, expect, beforeAll } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(fileURLToPath(new URL('..', import.meta.url)));
const readText = (rel) => fs.readFileSync(path.join(ROOT, rel), 'utf8');

// 期望的脚本装载顺序 —— 与计划书「§五 依赖关系」严格一致
const EXPECTED_SCRIPTS = [
  'js/core/tokens.js',
  'js/core/levels.js',
  'js/core/rules.js',
  'js/core/fortunes.js',
  'js/core/lottery.js',
  'js/adapter/storage.js',
  'js/ui/view-model.js',
  'js/auth.js',
  'js/storage.js',
  'js/lottery.js',
  'js/poster.js',
  'js/ad.js',
  'js/app.js',
];

function parseScriptSrcs(html) {
  return [...html.matchAll(/<script\s+src="([^"]+)"\s*>\s*<\/script>/g)].map(m => m[1]);
}

function parseCssHrefs(html) {
  return [...html.matchAll(/<link\s+rel="stylesheet"\s+href="([^"]+)"\s*>/g)].map(m => m[1]);
}

// ---------- 最小 DOM 桩（仅供模块定义期与 init 期使用） ----------
function createElementStub() {
  return {
    style: {},
    dataset: {},
    classList: { add() {}, remove() {}, toggle() {}, contains: () => false },
    children: [],
    innerHTML: '',
    textContent: '',
    className: '',
    isConnected: true,
    offsetWidth: 0,
    appendChild() {},
    removeChild() {},
    remove() {},
    setAttribute() {},
    getAttribute: () => null,
    addEventListener() {},
    removeEventListener() {},
    querySelector: () => null,
    querySelectorAll: () => [],
    closest: () => null,
    getBoundingClientRect: () => ({ left: 0, top: 0, width: 0, height: 0 }),
  };
}

function createDocumentStub() {
  return {
    getElementById: () => null,
    querySelector: () => null,
    querySelectorAll: () => [],
    createElement: () => createElementStub(),
    addEventListener() {},
    removeEventListener() {},
    body: { appendChild() {}, removeChild() {} },
    documentElement: { style: {} },
  };
}

function createLocalStorageStub() {
  const map = new Map();
  return {
    getItem: (k) => (map.has(k) ? map.get(k) : null),
    setItem: (k, v) => { map.set(k, String(v)); },
    removeItem: (k) => { map.delete(k); },
    clear: () => map.clear(),
    key: (i) => [...map.keys()][i] ?? null,
    get length() { return map.size; },
  };
}

// ============================================
// 沙箱：整个测试文件只装载一次（经典脚本的 const 不可重复声明）
// ============================================
const sandbox = {
  console,
  setTimeout,
  clearTimeout,
  setInterval,
  clearInterval,
  document: createDocumentStub(),
  localStorage: createLocalStorageStub(),
  navigator: { userAgent: 'vitest-smoke' },
  location: { href: 'http://localhost/', origin: 'http://localhost' },
  confirm: () => false,
  alert: () => {},
  // 下面这些挂在全局对象上，等价于浏览器里的 window.*
  // （app.js 装载期会调用 window.addEventListener 注册全局错误处理）
  addEventListener() {},
  removeEventListener() {},
  dispatchEvent: () => true,
  requestAnimationFrame: (cb) => setTimeout(cb, 0),
  cancelAnimationFrame: (id) => clearTimeout(id),
  scrollTo() {},
  innerWidth: 375,
  innerHeight: 667,
  devicePixelRatio: 2,
};

/** 在沙箱内求值（用于读取 const 形成的全局词法绑定） */
function evalInContext(code) {
  return vm.runInContext(code, sandbox);
}

beforeAll(() => {
  vm.createContext(sandbox);
  // 经典脚本里会调用 window.addEventListener(...)，把 window 指向全局对象本身
  evalInContext('globalThis.window = globalThis;');

  for (const rel of EXPECTED_SCRIPTS) {
    vm.runInContext(readText(rel), sandbox, { filename: rel });
  }
});

describe('index.html 资源引用与装载顺序', () => {
  const html = readText('index.html');

  it('脚本顺序与依赖关系一致（顺序错误会导致全局变量 undefined）', () => {
    expect(parseScriptSrcs(html)).toEqual(EXPECTED_SCRIPTS);
  });

  it('样式表顺序为 tailwind -> tokens -> style', () => {
    expect(parseCssHrefs(html)).toEqual([
      'css/tailwind.css',
      'css/tokens.css',
      'css/style.css',
    ]);
  });

  it('所有被引用的资源文件真实存在', () => {
    const refs = [...parseScriptSrcs(html), ...parseCssHrefs(html)];
    expect(refs.length).toBeGreaterThan(10);
    for (const rel of refs) {
      expect(fs.existsSync(path.join(ROOT, rel)), `缺少文件: ${rel}`).toBe(true);
    }
  });

  it('页面不再引用已删除的 js/data/fortunes.js', () => {
    expect(html).not.toContain('js/data/');
    expect(fs.existsSync(path.join(ROOT, 'js/data'))).toBe(false);
  });
});

describe('沙箱装载全部脚本', () => {
  it('core / adapter / ui 层全局对象均可用', () => {
    for (const name of ['TokensCore', 'LevelsCore', 'RulesCore', 'LotteryCore', 'StorageAdapter', 'ViewModel']) {
      expect(evalInContext(`typeof ${name}`), `缺少全局: ${name}`).toBe('object');
    }
  });

  it('业务门面全局对象均可用（对外 API 未变更）', () => {
    for (const name of ['Lottery', 'Storage', 'Auth', 'AdSDK', 'Toast', 'Router', 'Poster']) {
      expect(evalInContext(`typeof ${name}`), `缺少全局: ${name}`).toBe('object');
    }
  });

  it('签文库通过全局词法绑定可被抽签门面访问', () => {
    expect(evalInContext('FORTUNES.length')).toBeGreaterThan(0);
    // daily（日常好运）复用通用签文库，SCENE_FORTUNES 只含三个专属场景
    expect(evalInContext('Object.keys(SCENE_FORTUNES).length')).toBe(3);
    expect(evalInContext('PREMIUM_FORTUNES.length')).toBeGreaterThan(0);
  });

  it('Storage 的读写已改经 StorageAdapter（沙箱中命中 localStorage 后端）', () => {
    expect(evalInContext('StorageAdapter._resolve().name')).toBe('localStorage');

    evalInContext('Storage.set("__probe__", { ok: 1 })');
    expect(evalInContext('Storage.get("__probe__").ok')).toBe(1);
    evalInContext('Storage.remove("__probe__")');
    expect(evalInContext('Storage.get("__probe__", null)')).toBe(null);
  });

  it('init() 可在无完整 DOM 的环境下安全执行', () => {
    expect(() => evalInContext('init()')).not.toThrow();
  });
});

describe('全链路冒烟：登录 -> 抽签 -> 历史 -> 深度解签', () => {
  it('登录后抽签成功并写入历史（今天分组）', async () => {
    const login = evalInContext('Auth.login("冒烟测试用户")');
    expect(login.success).toBe(true);
    expect(evalInContext('Auth.isLoggedIn()')).toBe(true);

    expect(evalInContext('Storage.getRemainingDraws()')).toBe(3);

    const result = await evalInContext('Lottery.draw("daily")');
    expect(result.success).toBe(true);
    expect(result.fortune).toBeTruthy();
    expect(result.todayCount).toBe(1);
    expect(result.remainingDraws).toBe(2);

    const grouped = evalInContext('Storage.getGroupedHistory()');
    expect(Object.keys(grouped)).toContain('今天');
    expect(grouped['今天']).toHaveLength(1);
    expect(grouped['今天'][0].scene).toBe('daily');
    expect(evalInContext('Storage.getTodayCount()')).toBe(1);
  });

  it('历史记录页模板可正常渲染该记录', () => {
    const html = evalInContext('ViewModel.buildHistoryListHtml(Storage.getGroupedHistory())');
    expect(typeof html).toBe('string');
    expect(html).toContain('history-item');
  });

  it('个人主页模板可按日期分组渲染', () => {
    const html = evalInContext('ViewModel.buildProfileHistoryHtml(Storage.getGroupedHistory())');
    expect(html).toContain('profile-date-group');
    expect(html).toContain('今天');
  });

  it('深度解签对当前签文产出非空文案', () => {
    const text = evalInContext('Lottery.buildDeepAnalysis(Lottery.getCurrentFortune(), Lottery.currentScene)');
    expect(typeof text).toBe('string');
    expect(text.length).toBeGreaterThan(10);
  });

  it('次数用尽后返回 limit_reached，且不写入历史', async () => {
    const second = await evalInContext('Lottery.draw("daily")');
    const third = await evalInContext('Lottery.draw("daily")');
    expect(second.success).toBe(true);
    expect(third.success).toBe(true);
    expect(evalInContext('Storage.getRemainingDraws()')).toBe(0);

    const fourth = await evalInContext('Lottery.draw("daily")');
    expect(fourth.success).toBe(false);
    expect(fourth.reason).toBe('limit_reached');

    expect(evalInContext('Storage.getTodayCount()')).toBe(3);
    expect(evalInContext('Storage.getGroupedHistory()["今天"].length')).toBe(3);
  });

  it('看广告奖励可回退次数并解锁高级签文', async () => {
    // 关闭广告开关 -> AdSDK 走「未启用，直接发奖」分支，
    // 避免在单测里等待 3 秒 Mock 倒计时。
    evalInContext('AdSDK.config.enabled = false');

    const reward = await evalInContext('AdSDK.watchAdForReward("extra_draws")');
    expect(reward).toBeTruthy();
    expect(reward.type).toBe('extra_draws');
    expect(reward.adEnabled).toBe(false);
    expect(evalInContext('Storage.getRemainingDraws()')).toBe(1);

    await evalInContext('AdSDK.watchAdForReward("premium_fortunes")');
    expect(evalInContext('Storage.isFeatureUnlocked("premiumFortunes")')).toBe(true);

    const poolLen = evalInContext('Lottery._getFortunePool("daily").length');
    expect(poolLen).toBeGreaterThan(0);
  });

  it('等级映射与场景名称门面转发正常', () => {
    expect(evalInContext('Lottery.getLevelClass("上上签")')).toBe('level-上上签');
    expect(evalInContext('Lottery.getLevelColor("上吉签")')).toBe('#D4A017');
    expect(evalInContext('Lottery.getSceneName("exam")')).toBe('考试通关');
    expect(evalInContext('Lottery.getDimensionIcon("career")')).toBe('💼');
  });

  it('其余三个场景均可完成抽签并落到历史', async () => {
    // 先解锁无限抽签，避免受每日次数限制影响
    await evalInContext('AdSDK.watchAdForReward("unlimited_draws")');
    expect(evalInContext('Storage.getDailyLimit()')).toBe(999);

    for (const scene of ['exam', 'work', 'festival']) {
      const r = await evalInContext(`Lottery.draw("${scene}")`);
      expect(r.success, `场景 ${scene} 抽签失败`).toBe(true);
      expect(r.fortune).toBeTruthy();
    }
    const scenes = evalInContext('Storage.getGroupedHistory()["今天"].map(r => r.scene)');
    expect(scenes).toContain('exam');
    expect(scenes).toContain('work');
    expect(scenes).toContain('festival');
  });

  it('渲染函数在无完整 DOM 环境下调用不抛错', () => {
    expect(() => evalInContext('Toast.show("冒烟")')).not.toThrow();
    expect(() => evalInContext('renderHistory()')).not.toThrow();
    expect(() => evalInContext('renderProfilePage()')).not.toThrow();
    expect(() => evalInContext('updateUserBar()')).not.toThrow();
    expect(() => evalInContext('updateRemainDisplay()')).not.toThrow();
  });
});

// ============================================
// 回归：审计报告 P1-4 / P1-5
// ============================================
describe('回归：改名身份一致性与模板转义', () => {
  it('改名后按新昵称可登回同一档案，旧昵称不再指向该身份（P1-4）', () => {
    const first = evalInContext('Auth.login("回归-原昵称")');
    expect(first.success).toBe(true);
    const uid = first.user.id;

    expect(evalInContext('Auth.updateNickname("回归-新昵称")')).toBe(true);
    evalInContext('Auth.logout()');

    // 新昵称：必须复用同一 id，不得被判为新用户
    const byNew = evalInContext('Auth.login("回归-新昵称")');
    expect(byNew.isNew).toBe(false);
    expect(byNew.user.id).toBe(uid);

    evalInContext('Auth.logout()');

    // 旧昵称：改名后已释放，应作为新用户注册，而不是登回改名后的那个人
    const byOld = evalInContext('Auth.login("回归-原昵称")');
    expect(byOld.user.id).not.toBe(uid);
  });

  it('个人主页日期标签经 HTML 转义（P1-5）', () => {
    const html = evalInContext(
      'ViewModel.buildProfileHistoryHtml({ "<img src=x onerror=alert(1)>": '
      + '[{ level: "上上签", title: "t", createdAt: "2026-03-01T12:00:00" }] })'
    );
    expect(html).not.toContain('<img');
    expect(html).toContain('&lt;img');
  });
});
