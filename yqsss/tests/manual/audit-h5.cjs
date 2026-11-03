// 临时审计脚本：在 vm 沙箱中按 index.html 顺序装载 H5 经典脚本，验证 3 个可疑缺陷
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const ROOT = 'C:/Users/Lenovo/OneDrive/Desktop/编程项目/独立开发项目/shangshangqian/yqsss';
const FILES = [
  'js/core/tokens.js', 'js/core/levels.js', 'js/core/rules.js',
  'js/core/fortunes.js', 'js/core/lottery.js', 'js/adapter/storage.js',
  'js/ui/view-model.js', 'js/auth.js', 'js/storage.js', 'js/lottery.js',
  'js/poster.js', 'js/ad.js',
];

const map = new Map();
const sandbox = {
  console,
  setTimeout, clearTimeout, setInterval, clearInterval,
  document: {
    getElementById: () => null, querySelector: () => null, querySelectorAll: () => [],
    createElement: () => ({ style: {}, classList: { add() {}, remove() {}, toggle() {} }, appendChild() {}, remove() {}, addEventListener() {}, querySelector: () => null }),
    addEventListener() {}, body: { appendChild() {}, removeChild() {} },
  },
  localStorage: {
    getItem: (k) => (map.has(k) ? map.get(k) : null),
    setItem: (k, v) => { map.set(k, String(v)); },
    removeItem: (k) => { map.delete(k); },
  },
  navigator: { userAgent: 'audit' },
  location: { href: 'http://localhost/' },
  confirm: () => false, alert: () => {},
  addEventListener() {}, removeEventListener() {}, dispatchEvent: () => true,
  requestAnimationFrame: (cb) => setTimeout(cb, 0), cancelAnimationFrame: () => {},
  scrollTo() {}, innerWidth: 375, innerHeight: 667,
};
vm.createContext(sandbox);
for (const f of FILES) {
  vm.runInContext(fs.readFileSync(path.join(ROOT, f), 'utf8'), sandbox, { filename: f });
}
const run = (code) => vm.runInContext(code, sandbox);

console.log('========== 缺陷 1：updateNickname 不更新用户档案索引 ==========');
run('Auth.login("张三")');
console.log('登录后 id =', run('Auth.getUserId()'));
run('Auth.updateNickname("李四")');
console.log('改名后 nickname =', run('Auth.getNickname()'));
run('Auth.logout()');
const reloginOld = run('Auth.login("张三")');
console.log('用旧名"张三"重新登录 isNew =', reloginOld.isNew, '-> 得到的昵称 =', run('Auth.getNickname()'));
run('Auth.logout()');
const reloginNew = run('Auth.login("李四")');
console.log('用新名"李四"重新登录 isNew =', reloginNew.isNew, '(true 表示同一人被当成新用户)');
console.log('结论：', reloginOld.isNew === false && reloginNew.isNew === true ? '确认存在身份分裂缺陷' : '未复现');

console.log('\n========== 缺陷 2：buildProfileHistoryHtml 未转义日期标签 ==========');
const html = run(`ViewModel.buildProfileHistoryHtml({ '<img src=x onerror=alert(1)>': [{ level: '上上签', title: 't', createdAt: '2026-01-01T10:00:00' }] })`);
console.log('输出中是否原样包含注入标签 =', html.includes('<img src=x onerror=alert(1)>'));
console.log('结论：', html.includes('<img src=x onerror=alert(1)>') ? '确认存在 HTML 注入点' : '未复现');

console.log('\n========== 缺陷 3：跨天后 todayDraws 未重置（仅在抽签时重置） ==========');
run('Storage.saveRecord(FORTUNES[0], "daily")');
console.log('抽签后 todayDraws =', run('Auth.getProfileStats().todayDraws'));
// 伪造「上次活跃日期为昨天」，模拟隔天打开应用
const yesterday = run('RulesCore.shiftDateKey(RulesCore.dateKey(), -1)');
map.set('yqsss_last_active_date', JSON.stringify(yesterday).slice(1, -1));
map.set('yqsss_last_active_date', yesterday);
run('Auth.resetTodayIfNeeded()');
console.log('隔天调用 resetTodayIfNeeded 后 todayDraws =', run('Auth.getProfileStats().todayDraws'));
console.log('（若仍为 1，说明只有在初始化/抽签时才重置，符合预期；若为 0 则正常）');
