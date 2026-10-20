// 成就系统集成测试：走真实调用路径（Lottery.draw -> Storage.saveRecord -> Achievement.evaluate）
// 覆盖「纯函数单测」验不到的接线问题：存储 key、模块依赖、弹窗队列、连续天数。
//
// 说明：这里用最小的 uni 存储桩件驱动真实的 UniStorageBackend，
// 而不是让 StorageAdapter 降级到内存后端——目的是覆盖生产实际走的那条分支。
//
// 运行：node smoke/achievement-flow.test.mjs

const store = new Map();
globalThis.uni = {
  getStorageSync: (k) => (store.has(k) ? store.get(k) : ''),
  setStorageSync: (k, v) => { store.set(k, String(v)); },
  removeStorageSync: (k) => { store.delete(k); },
};
// 不注入 uniCloud：云同步分支应自动跳过，不能因此报错

const { default: StorageAdapter } = await import('../src/adapter/storage.js');
const { default: Storage } = await import('../src/modules/storage.js');
const { default: Auth } = await import('../src/modules/auth.js');
const { default: Lottery } = await import('../src/modules/lottery.js');
const { default: Achievement } = await import('../src/modules/achievement.js');

let fail = 0;
const ok = (cond, msg) => {
  if (!cond) { fail++; console.log('  FAIL:', msg); }
};

const EVENTS_KEY = 'yqsss_feature_events';
// 成就按 uid 分键存储，这里跟随当前登录用户取实际 key
const unlockedKey = () => Achievement._storageKey();

// ---------- 环境自检 ----------
ok(StorageAdapter.getItem('__probe__') === null, 'uni 存储桩件可用');
Auth.init();
Auth.login('成就测试用户');
ok(Auth.isLoggedIn(), '登录成功');

// ============================================
// 1. 首次抽签 -> 自动解锁「初问苍穹」
// ============================================
const draw1 = Lottery.draw('daily');
ok(draw1.success === true, '首次抽签成功');
ok(Achievement.isUnlocked('first_draw'), '抽签后自动解锁「初问苍穹」');

// 注意：draw() 抽到的签是随机的，若首签抽到「上上签」会同时解锁「鸿运当头」和
// 「凡尔赛本赛」（后者读 Auth 落盘的 stats.firstLevel），抽到「蓄力签」会解锁
// 「蓄力待发」——一次抽签解锁多个成就是正确行为，因此这里只断言
// 「至少 1 条且必含 first_draw」，并把其余项限定在已知可能的集合内。
const EXTRA_ON_FIRST_DRAW = ['first_best', 'first_charge', 'versailles'];
const pending1 = Achievement.takePending();
ok(pending1.length >= 1, `弹窗队列至少 1 条新解锁，实际 ${pending1.length}`);
ok(pending1.some((i) => i.id === 'first_draw'), '弹窗队列包含「初问苍穹」');
ok(
  pending1.every((i) => i.id === 'first_draw' || EXTRA_ON_FIRST_DRAW.includes(i.id)),
  `首签额外解锁项应在预期集合内，实际 ${pending1.map((i) => i.id).join(',')}`
);
ok(Achievement.takePending().length === 0, 'takePending 取走后清空，不会重复弹');

// 落盘验证：读真实存储 key（按 uid 分键）
const rawMap = StorageAdapter.get(unlockedKey(), {});
ok(typeof rawMap.first_draw === 'number', `解锁状态落到 ${unlockedKey()}`);

// ============================================
// 2. 幂等：再抽一次不会重复解锁、也不重复弹窗
// ============================================
Lottery.draw('daily');
const pending2 = Achievement.takePending();
ok(!pending2.some((i) => i.id === 'first_draw'), '已解锁成就不会二次入队');

// ============================================
// 2.5 首次抽签等级落盘（凡尔赛本赛的抗截断字段）
// ============================================
const savedStats = StorageAdapter.get(Auth.KEYS.STATS, {});
ok(!!savedStats.firstLevel, '首次抽签后 stats.firstLevel 已落盘');
// 再抽一次不应被覆盖
const firstLevelBefore = savedStats.firstLevel;
Lottery.draw('daily');
ok(Auth.getProfileStats().firstLevel === firstLevelBefore, '后续抽签不会覆盖 firstLevel');
Achievement.takePending();
ok(!Achievement.isUnlocked('first_deep'), '未解锁深度解签时，「一探究竟」应未达成');
Storage.countFeatureEvent('deepAnalysis');
Achievement.evaluate();
ok(Achievement.isUnlocked('first_deep'), '深度解签计数 1 次后解锁「一探究竟」');
ok(!Achievement.isUnlocked('deep_10'), '仅 1 次时「慧眼识珠」（10 次）仍未达成');

for (let i = 0; i < 9; i++) Storage.countFeatureEvent('deepAnalysis');
Achievement.evaluate();
ok(Achievement.isUnlocked('deep_10'), '累计 10 次后解锁「慧眼识珠」');
ok(StorageAdapter.get(EVENTS_KEY, {}).deepAnalysis === 10, `事件计数落到 ${EVENTS_KEY}`);

// ============================================
// 4. 权益开关 -> 成就「锦上添花 / 祈愿无限」
// ============================================
Storage.unlockFeature('premiumFortunes');
Storage.unlockFeature('unlimitedDraws');
Achievement.evaluate();
ok(Achievement.isUnlocked('premium_unlock'), '解锁高级签文权益后达成「锦上添花」');
ok(Achievement.isUnlocked('unlimited_unlock'), '解锁无限抽签权益后达成「祈愿无限」');

// ============================================
// 5. 海报埋点 -> 成就「妙笔生花」
// ============================================
Storage.countFeatureEvent('poster');
Achievement.evaluate();
ok(Achievement.isUnlocked('poster_1'), '生成海报后达成「妙笔生花」');

// ============================================
// 6. 连续天数 streakDays
// ============================================
// 直接驱动 Auth.incrementStats 连续三天（构造 lastDrawDate 为昨天 / 前天）
const today = new Date();
const iso = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
const y1 = new Date(today.getTime()); y1.setDate(y1.getDate() - 1);
const y9 = new Date(today.getTime()); y9.setDate(y9.getDate() - 9);

// 场景 A：上次抽签是昨天 -> 连续天数续上
StorageAdapter.set(Auth.KEYS.STATS, {
  totalDraws: 5, todayDraws: 1, drawDays: 3, streakDays: 2, lastDrawDate: iso(y1),
});
Auth.incrementStats();
ok(Auth.getProfileStats().streakDays === 3, `昨天有签 -> 连续天数 2->3，实际 ${Auth.getProfileStats().streakDays}`);

// 场景 B：上次抽签是 9 天前 -> 断签，重新起算为 1
StorageAdapter.set(Auth.KEYS.STATS, {
  totalDraws: 6, todayDraws: 1, drawDays: 4, streakDays: 7, lastDrawDate: iso(y9),
});
Auth.incrementStats();
ok(Auth.getProfileStats().streakDays === 1, `断签后连续天数归 1，实际 ${Auth.getProfileStats().streakDays}`);

// 场景 C：同一天再抽 -> 连续天数不变
StorageAdapter.set(Auth.KEYS.STATS, {
  totalDraws: 7, todayDraws: 1, drawDays: 4, streakDays: 1, lastDrawDate: iso(today),
});
Auth.incrementStats();
ok(Auth.getProfileStats().streakDays === 1, '同一天重复抽签不改变连续天数');

// 连续成就按 streakDays 判定
StorageAdapter.set(Auth.KEYS.STATS, {
  totalDraws: 30, todayDraws: 1, drawDays: 10, streakDays: 3, lastDrawDate: iso(today),
});
Achievement.evaluate();
ok(Achievement.isUnlocked('streak_3'), '连续 3 天达成「连续三日」');
ok(!Achievement.isUnlocked('streak_7'), '连续 3 天未达成「连续七日」');

// ============================================
// 7. 成就墙数据完整性
// ============================================
const wall = Achievement.getWall();
ok(wall.length === 7, `成就墙 7 个分区，实际 ${wall.length}`);
const wallCount = wall.reduce((n, g) => n + g.items.length, 0);
ok(wallCount === 49, `成就墙合计 49 项，实际 ${wallCount}`);
ok(Achievement.getTotalCount() === 49, '总数 49');
ok(Achievement.getUnlockedCount() >= 8, `已解锁数合理，实际 ${Achievement.getUnlockedCount()}`);
ok(wall.every((g) => g.items.every((i) => typeof i.unlockedAt === 'number')), '每项都有 unlockedAt 字段');

// ============================================
// 8. 无云环境下不报错（uniCloud 未注入）
// ============================================
let threw = false;
try {
  await Achievement.syncWithCloud();
  Achievement.evaluate();
} catch (e) {
  threw = true;
}
ok(!threw, '未接入云环境时静默降级，不抛异常');

// ============================================
// 9. 蓄力签连续天数持久化到 stats（不受 500 条历史上限影响）
// ============================================
// 场景：抽到蓄力签 -> chargeDayStreak=1；同一天再抽 -> 不变；
//       隔天再抽到蓄力签 -> 2；隔天抽到别的等级 -> 保持 2 不增长
StorageAdapter.set(Auth.KEYS.STATS, {
  totalDraws: 10, todayDraws: 0, drawDays: 3, streakDays: 3, lastDrawDate: iso(y9),
});
Auth.incrementStats({ level: '蓄力签' });
ok(Auth.getProfileStats().chargeDayStreak === 1, `首次抽到蓄力签 -> 连击 1，实际 ${Auth.getProfileStats().chargeDayStreak}`);

Auth.incrementStats({ level: '蓄力签' });
ok(Auth.getProfileStats().chargeDayStreak === 1, '同一天再次抽到蓄力签不重复累加');

Auth.incrementStats({ level: '中平签' });
ok(Auth.getProfileStats().chargeDayStreak === 1, '同一天抽到别的等级不影响蓄力连击');

// 造一个「昨天抽到过蓄力签」的存档，再抽一次 -> 续到 2
StorageAdapter.set(Auth.KEYS.STATS, {
  totalDraws: 12, todayDraws: 0, drawDays: 4, streakDays: 4,
  lastDrawDate: iso(y1), chargeDayStreak: 1, lastChargeDate: iso(y1),
});
Auth.incrementStats({ level: '蓄力签' });
ok(Auth.getProfileStats().chargeDayStreak === 2, `昨天有蓄力签 -> 连击 1->2，实际 ${Auth.getProfileStats().chargeDayStreak}`);

// 断签：上次抽到蓄力签是 9 天前 -> 归 1
StorageAdapter.set(Auth.KEYS.STATS, {
  totalDraws: 13, todayDraws: 0, drawDays: 5, streakDays: 5,
  lastDrawDate: iso(y9), chargeDayStreak: 6, lastChargeDate: iso(y9),
});
Auth.incrementStats({ level: '蓄力签' });
ok(Auth.getProfileStats().chargeDayStreak === 1, `断签后蓄力连击归 1，实际 ${Auth.getProfileStats().chargeDayStreak}`);

// 旧等级名「下吉签」也要计入蓄力连击
StorageAdapter.set(Auth.KEYS.STATS, {
  totalDraws: 14, todayDraws: 0, drawDays: 6, streakDays: 6, lastDrawDate: iso(y9),
});
Auth.incrementStats({ level: '下吉签' });
ok(Auth.getProfileStats().chargeDayStreak === 1, '旧等级名「下吉签」同样计入蓄力连击');

// ============================================
// 10. 按用户隔离 + 旧数据迁移
// ============================================
// 场景 A：换账号后看不到上一个账号的成就
StorageAdapter.set(Auth.KEYS.STATS, {});
Auth.login('用户甲');
Achievement.evaluate();
const unlockedByA = Achievement.getUnlockedCount();
ok(unlockedByA > 0, `用户甲解锁了 ${unlockedByA} 项`);

Auth.logout();
Auth.login('用户乙');
ok(Achievement.getUnlockedCount() === 0, `换账号后成就隔离（用户乙看到 ${Achievement.getUnlockedCount()} 项）`);

// 场景 B：老版本全局单键的数据会自动迁移到当前账号，不丢进度
StorageAdapter.set(Achievement.LEGACY_KEY, { first_draw: 111, draw_10: 222 });
Auth.logout();
Auth.login('用户丙');
ok(Achievement.getUnlockedCount() === 2, `老版本全局成就迁移到新账号，实际 ${Achievement.getUnlockedCount()} 项`);
ok(Achievement.isUnlocked('first_draw'), '迁移后 first_draw 仍在');

// 场景 C：游客态解锁的成就，登录后并入正式账号（取并集）
Auth.logout();
Auth.login('游客甲');
StorageAdapter.set(`yqsss_achievements_local`, { collect_levels: 333 });
Auth.logout();
Auth.login('用户丁');
ok(Achievement.isUnlocked('collect_levels'), '游客期解锁的成就登录后并入正式账号');

// 场景 D：reset 只清当前账号，不影响别人
Auth.logout();
Auth.login('用户戊');
ok(Achievement.getUnlockedCount() === 0, '新账号初始无成就');
Auth.logout();
Auth.login('用户丙');
ok(Achievement.getUnlockedCount() === 2, '切回旧账号成就仍在');
Achievement.reset();
ok(Achievement.getUnlockedCount() === 0, 'reset 清空当前账号');
Auth.logout();
Auth.login('用户丁');
ok(Achievement.isUnlocked('collect_levels'), 'reset 未影响其他账号');

// ============================================
// 11. reset 清空
// ============================================
Achievement.reset();
ok(Achievement.getUnlockedCount() === 0, 'reset 后清空解锁记录');
ok(StorageAdapter.get(unlockedKey(), null) === null, 'reset 后存储 key 被移除');

console.log(`\n已解锁（reset 前）: ${wallCount} 项中达成 ${'[见上方断言]'}`);
console.log(fail === 0 ? '✅ 集成流程全部通过' : `❌ 失败 ${fail} 项`);
process.exit(fail === 0 ? 0 : 1);
