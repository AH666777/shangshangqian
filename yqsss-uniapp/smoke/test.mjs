// 临时冒烟测试：验证 ESM 化后的 core 模块可正常 import 且行为正确。
import LotteryCore from './lottery.js';
import LevelsCore from './levels.js';
import RulesCore from './rules.js';
import TokensCore from './tokens.js';
import FORTUNE_DATA from './fortunes.js';

const { FORTUNES, SCENE_FORTUNES, PREMIUM_FORTUNES } = FORTUNE_DATA;

let fail = 0;
const ok = (cond, msg) => {
  if (!cond) { fail++; console.log('  FAIL:', msg); }
};

// 1. 基础数据装载
ok(Array.isArray(FORTUNES) && FORTUNES.length > 0, 'FORTUNES 非空');
ok(SCENE_FORTUNES && typeof SCENE_FORTUNES === 'object', 'SCENE_FORTUNES 存在');
ok(TokensCore && LevelsCore && RulesCore, '依赖模块均加载');
console.log(`签文库: ${FORTUNES.length} 条 / 场景签: ${Object.keys(SCENE_FORTUNES).join(',')} / 高级签: ${PREMIUM_FORTUNES ? PREMIUM_FORTUNES.length : 0} 条`);

// 2. 四个场景各抽 500 次，全部应成功且结果合法
const scenes = ['daily', 'exam', 'work', 'festival'];
for (const scene of scenes) {
  const pool = LotteryCore.getFortunePool(scene, {
    fortunes: FORTUNES,
    sceneFortunes: SCENE_FORTUNES,
    premiumFortunes: PREMIUM_FORTUNES,
    premiumUnlocked: false,
  });
  ok(pool.length > 0, `${scene} 签文池非空`);

  for (let i = 0; i < 500; i++) {
    const r = LotteryCore.draw({
      scene,
      fortunes: FORTUNES,
      sceneFortunes: SCENE_FORTUNES,
      premiumFortunes: PREMIUM_FORTUNES,
      premiumUnlocked: false,
      todayCount: 0,
      dailyLimit: 3,
    });
    ok(r.success === true, `${scene} 第 ${i} 次抽签成功`);
    ok(r.fortune && r.fortune.title && r.fortune.level, `${scene} 结果含 title/level`);
  }
}

// 3. 有限次数校验
const limited = LotteryCore.draw({
  scene: 'daily',
  fortunes: FORTUNES,
  sceneFortunes: SCENE_FORTUNES,
  premiumFortunes: PREMIUM_FORTUNES,
  premiumUnlocked: false,
  todayCount: 3,
  dailyLimit: 3,
});
ok(limited.success === false, '次数用尽时拒绝抽签');
console.log('次数用尽返回:', JSON.stringify(limited));

// 4. 高级签解锁后应能抽到高级签
const premiumPool = LotteryCore.getFortunePool('daily', {
  fortunes: FORTUNES,
  sceneFortunes: SCENE_FORTUNES,
  premiumFortunes: PREMIUM_FORTUNES,
  premiumUnlocked: true,
});
ok(premiumPool.length >= FORTUNES.length, '解锁后签池变大');

// 5. 深度解签文案
const sample = FORTUNES[0];
const deep = RulesCore.buildDeepAnalysis(sample, '日常好运');
ok(typeof deep === 'string' && deep.length > 20, '深度解签文案非空');
ok(!deep.includes('五行'), '深度解签已去除「五行」术语');

// 6. 等级/维度命名（合规）
ok(LevelsCore.getSceneName('daily') === '日常好运', '场景名已中性化');
ok(LevelsCore.DIMENSION_NAMES.wealth === '财运提示', '维度名已中性化');
ok(LevelsCore.getLevelClass('蓄力签') === 'level-蓄力签', '蓄力签样式类正确');
ok(LevelsCore.getLevelClass('下吉签') === 'level-蓄力签', '旧等级名向后兼容');

// 7. 记录归一化与分组
const rec = RulesCore.buildRecord(sample, 'daily');
ok(rec.title && rec.poem && rec.createdAt, '记录字段完整');
const grouped = RulesCore.groupByDate([rec], RulesCore.dateKey(), RulesCore.shiftDateKey(RulesCore.dateKey(), -1));
ok(Object.keys(grouped).length > 0, '分组可用');

console.log(fail === 0 ? '\n✅ 全部通过' : `\n❌ 失败 ${fail} 项`);
process.exit(fail === 0 ? 0 : 1);
