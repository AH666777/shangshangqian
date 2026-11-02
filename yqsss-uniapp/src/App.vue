<script>
import Auth from './modules/auth.js';
import AdSDK from './modules/ad.js';
import Achievement from './modules/achievement.js';

export default {
  onLaunch() {
    // 启动时恢复登录态
    Auth.init();

    // 成就云端对账：把「本地有、云端没有」的成就补报上去，
    // 同时把「云端有、本地没有」的合并进来。
    // 不 await——启动不能等网络，失败静默，下次冷启动会再对一次账。
    Achievement.syncWithCloud();

    // 广告初始化：当前为 Mock（跑通产品逻辑）。
    // 接入真实激励视频时改为 { platform: 'uni', rewardVideoUnitId: 'adunit-xxxxxxxx' }
    AdSDK.init({ platform: 'mock' });
  },
  onShow() {},
  onHide() {},
};
</script>

<style>
/* ============================================
   全局样式（国风深色主题）
   uni-app 中所有页面共享 App.vue 的 <style>
   ============================================ */
page {
  background: linear-gradient(180deg, #1a0a2e 0%, #2d1b4e 50%, #1a0a2e 100%);
  color: #ffffff;
  font-family: -apple-system, BlinkMacSystemFont, 'PingFang SC', 'STKaiti', 'KaiTi', serif;
  min-height: 100vh;
}

.page-root {
  min-height: 100vh;
  padding: 32rpx 32rpx 48rpx;
  box-sizing: border-box;
}

/* ---------- 顶部用户栏 ---------- */
.user-bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 32rpx;
}
.user-chip {
  display: flex;
  align-items: center;
  padding: 10rpx 24rpx;
  border-radius: 999rpx;
  background: rgba(255, 255, 255, 0.05);
  border: 1rpx solid rgba(255, 255, 255, 0.1);
}
.user-chip:active { background: rgba(255, 255, 255, 0.12); }
.avatar { font-size: 32rpx; margin-right: 8rpx; }
.uname { font-size: 24rpx; color: rgba(255, 255, 255, 0.7); }
.scene-label { font-size: 24rpx; color: rgba(255, 255, 255, 0.4); }

/* ---------- Logo ---------- */
.logo { text-align: center; margin: 40rpx 0 48rpx; }
.logo-emoji { font-size: 110rpx; display: block; margin-bottom: 16rpx; }
.logo-title {
  display: block;
  font-size: 68rpx;
  font-weight: bold;
  color: #FFD133;
  letter-spacing: 8rpx;
  text-shadow: 0 0 40rpx rgba(212, 160, 23, 0.5);
}
.logo-sub {
  display: block;
  font-size: 26rpx;
  color: rgba(255, 219, 102, 0.7);
  margin-top: 12rpx;
  letter-spacing: 2rpx;
}

/* ---------- 区块标题 ---------- */
.section-title {
  display: block;
  text-align: center;
  font-size: 24rpx;
  color: rgba(255, 255, 255, 0.6);
  margin-bottom: 20rpx;
  letter-spacing: 4rpx;
}

/* ---------- 场景选择 ---------- */
.scene-grid {
  display: flex;
  flex-wrap: wrap;
  justify-content: space-between;
}
.scene-card {
  width: 48%;
  box-sizing: border-box;
  background: rgba(255, 255, 255, 0.05);
  border: 2rpx solid transparent;
  border-radius: 28rpx;
  padding: 28rpx 16rpx;
  text-align: center;
  margin-bottom: 20rpx;
}
.scene-card.active {
  border-color: #FFC107;
  background: rgba(255, 193, 7, 0.1);
}
.scene-icon { font-size: 52rpx; display: block; margin-bottom: 8rpx; }
.scene-name { font-size: 28rpx; font-weight: bold; color: #fff; display: block; }
.scene-desc { font-size: 22rpx; color: rgba(255, 255, 255, 0.5); display: block; margin-top: 4rpx; }

/* ---------- 按钮 ---------- */
.btn-primary {
  width: 100%;
  padding: 30rpx 0;
  margin: 24rpx 0;
  text-align: center;
  border-radius: 28rpx;
  background: linear-gradient(90deg, #D4A017, #FFC107, #D4A017);
  color: #1a0a2e;
  font-size: 34rpx;
  font-weight: bold;
  letter-spacing: 6rpx;
  box-shadow: 0 12rpx 32rpx rgba(255, 193, 7, 0.3);
}
.btn-primary:active { opacity: 0.85; }
.btn-red {
  background: linear-gradient(90deg, #C41E3A, #e03b52);
  color: #fff;
  box-shadow: 0 12rpx 32rpx rgba(196, 30, 58, 0.3);
}
.btn-ghost {
  width: 100%;
  padding: 24rpx 0;
  margin-top: 20rpx;
  text-align: center;
  border-radius: 28rpx;
  background: rgba(255, 255, 255, 0.08);
  border: 1rpx solid rgba(255, 255, 255, 0.18);
  color: rgba(255, 255, 255, 0.8);
  font-size: 30rpx;
  font-weight: bold;
  letter-spacing: 2rpx;
}
.btn-ghost:active { background: rgba(255, 255, 255, 0.16); }
.btn-small {
  display: inline-block;
  padding: 12rpx 28rpx;
  border-radius: 999rpx;
  background: #FFC107;
  color: #1a0a2e;
  font-size: 24rpx;
  font-weight: bold;
}
.btn-small:active { opacity: 0.85; }

/* 分享按钮（open-type="share" 的原生 button 需重置默认白底与边框） */
.btn-share {
  width: 100%;
  padding: 24rpx 0;
  margin-top: 20rpx;
  text-align: center;
  border-radius: 28rpx;
  background: rgba(255, 255, 255, 0.04);
  border: 1rpx solid rgba(212, 160, 23, 0.5);
  color: #FFD133;
  font-size: 30rpx;
  font-weight: bold;
  letter-spacing: 2rpx;
  line-height: 1.5;
}
.btn-share::after { border: none; }
.btn-share:active { background: rgba(212, 160, 23, 0.12); }

/* 协议入口（页脚） */
.legal-links {
  display: flex;
  justify-content: center;
  margin-top: 40rpx;
  padding-top: 24rpx;
  border-top: 1rpx solid rgba(255, 255, 255, 0.08);
}
.legal-links text {
  font-size: 24rpx;
  color: rgba(255, 255, 255, 0.5);
  margin: 0 12rpx;
}
.legal-links text:active { color: #FFD133; }

/* ---------- 今日信息 ---------- */
.today-info { text-align: center; font-size: 24rpx; color: rgba(255, 255, 255, 0.45); }
.gold { color: #FFD133; font-weight: bold; }

/* ---------- 好运加成卡片 ---------- */
.bonus-card {
  margin-top: 40rpx;
  background: rgba(255, 255, 255, 0.05);
  border: 1rpx solid rgba(212, 160, 23, 0.25);
  border-radius: 28rpx;
  padding: 28rpx;
}
.bonus-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 24rpx;
}
.bonus-title { font-size: 26rpx; font-weight: bold; color: #FFD133; letter-spacing: 2rpx; }
.bonus-tip { font-size: 22rpx; color: rgba(255, 255, 255, 0.35); }
.bonus-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 24rpx;
}
.bonus-row:last-child { margin-bottom: 0; }
.bonus-label { font-size: 26rpx; color: rgba(255, 255, 255, 0.65); flex: 1; }
.bonus-label .sub { display: block; font-size: 22rpx; color: rgba(255, 255, 255, 0.35); margin-top: 4rpx; }
.bonus-done { font-size: 24rpx; color: #FFD133; font-weight: bold; }

/* ---------- 合规页脚 ---------- */
.footer {
  margin-top: 48rpx;
  text-align: center;
  font-size: 20rpx;
  line-height: 1.9;
  color: rgba(255, 255, 255, 0.35);
}
.footer .strong { color: rgba(255, 255, 255, 0.5); font-weight: bold; }

/* ---------- 通用顶栏（子页） ---------- */
.top-bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 24rpx;
}
.back-btn {
  padding: 10rpx 24rpx;
  border-radius: 999rpx;
  background: rgba(255, 255, 255, 0.05);
  border: 1rpx solid rgba(255, 255, 255, 0.1);
  color: rgba(255, 255, 255, 0.6);
  font-size: 26rpx;
}
.back-btn:active { background: rgba(255, 255, 255, 0.14); }
.page-title { font-size: 34rpx; color: #FFD133; letter-spacing: 4rpx; }

/* ---------- 结果卡片 ---------- */
.result-card {
  background: linear-gradient(135deg, rgba(45, 27, 78, 0.9), rgba(26, 10, 46, 0.9));
  border: 2rpx solid rgba(212, 160, 23, 0.4);
  border-radius: 36rpx;
  padding: 44rpx 32rpx;
  text-align: center;
}
.level-badge {
  display: inline-block;
  padding: 8rpx 28rpx;
  border-radius: 999rpx;
  font-size: 26rpx;
  font-weight: bold;
  letter-spacing: 4rpx;
  margin-bottom: 20rpx;
}
.level-best { background: linear-gradient(135deg, #FF6B35, #C41E3A); color: #FFE0B2; }
.level-good { background: linear-gradient(135deg, #FFC107, #D4A017); color: #4A3200; }
.level-mid { background: linear-gradient(135deg, #43A047, #2E7D32); color: #E8F5E9; }
.level-charge { background: linear-gradient(135deg, #1565C0, #42A5F5); color: #E3F2FD; }

.result-title { font-size: 44rpx; font-weight: bold; color: #FFD133; letter-spacing: 6rpx; display: block; margin-bottom: 16rpx; }
.result-poem { font-size: 28rpx; color: rgba(255, 255, 255, 0.8); line-height: 1.9; display: block; margin-bottom: 24rpx; }
.lucky-row { display: flex; justify-content: center; }
.lucky-item { font-size: 24rpx; color: rgba(255, 255, 255, 0.6); margin: 0 16rpx; }

/* ---------- 五维解读 ---------- */
.dim-card {
  display: flex;
  align-items: flex-start;
  background: rgba(255, 255, 255, 0.05);
  border-radius: 20rpx;
  padding: 24rpx;
  margin-bottom: 16rpx;
}
.dim-icon { font-size: 36rpx; margin-right: 20rpx; }
.dim-body { flex: 1; }
.dim-name { font-size: 26rpx; color: #FFD133; font-weight: bold; display: block; margin-bottom: 6rpx; }
.dim-text { font-size: 26rpx; color: rgba(255, 255, 255, 0.75); line-height: 1.7; display: block; }

.deep-card {
  background: rgba(255, 193, 7, 0.08);
  border: 1rpx solid rgba(212, 160, 23, 0.3);
  border-radius: 20rpx;
  padding: 28rpx;
}
.deep-text { font-size: 26rpx; color: rgba(255, 255, 255, 0.8); line-height: 1.9; display: block; white-space: pre-wrap; }

.tip-note { text-align: center; font-size: 20rpx; color: rgba(255, 255, 255, 0.28); margin-top: 16rpx; }

.ad-banner {
  margin-top: 24rpx;
  background: linear-gradient(90deg, rgba(255, 193, 7, 0.2), rgba(255, 193, 7, 0.08));
  border: 1rpx solid rgba(212, 160, 23, 0.35);
  border-radius: 28rpx;
  padding: 32rpx;
  text-align: center;
}
.ad-banner-title { font-size: 28rpx; color: #FFD133; font-weight: bold; display: block; margin-bottom: 20rpx; }

/* ---------- 摇签页 ---------- */
.shake-wrap { display: flex; flex-direction: column; align-items: center; justify-content: center; padding-top: 80rpx; }
.barrel {
  width: 320rpx;
  height: 440rpx;
  position: relative;
  display: flex;
  align-items: flex-end;
  justify-content: center;
}
.barrel-body {
  width: 300rpx;
  height: 380rpx;
  background: linear-gradient(180deg, #8B4513, #A0522D, #6B3410);
  border: 8rpx solid #5C2D0E;
  border-radius: 24rpx 24rpx 60rpx 60rpx;
  display: flex;
  align-items: center;
  justify-content: center;
}
.sticks { display: flex; align-items: flex-end; }
.stick {
  width: 14rpx;
  height: 150rpx;
  background: #F5DEB3;
  border-radius: 8rpx 8rpx 0 0;
  margin: 0 5rpx;
}
.stick:nth-child(2) { background: #FAEBD7; }
.stick:nth-child(4) { background: #FAEBD7; }
.shake-hint { font-size: 28rpx; color: rgba(255, 255, 255, 0.7); margin-top: 48rpx; letter-spacing: 2rpx; }

/* ---------- 历史 / 个人中心 ---------- */
.history-group-title { font-size: 26rpx; color: #FFD133; margin: 24rpx 0 12rpx; display: block; }
.history-item {
  background: rgba(255, 255, 255, 0.05);
  border-radius: 20rpx;
  padding: 24rpx;
  margin-bottom: 16rpx;
}
.history-item-head { display: flex; align-items: center; justify-content: space-between; margin-bottom: 8rpx; }
.history-item-title { font-size: 28rpx; color: #fff; font-weight: bold; }
.history-item-time { font-size: 22rpx; color: rgba(255, 255, 255, 0.4); }
.history-item-poem { font-size: 24rpx; color: rgba(255, 255, 255, 0.6); line-height: 1.6; display: block; }
.empty-tip { text-align: center; font-size: 26rpx; color: rgba(255, 255, 255, 0.4); padding: 80rpx 0; }

.profile-card {
  background: linear-gradient(135deg, #2d1b4e, #1a0a2e);
  border: 2rpx solid rgba(212, 160, 23, 0.2);
  border-radius: 28rpx;
  padding: 40rpx;
  text-align: center;
}
.profile-avatar { font-size: 96rpx; display: block; margin-bottom: 16rpx; }
.profile-name { font-size: 36rpx; font-weight: bold; color: #fff; display: block; }
.profile-stats { display: flex; justify-content: space-around; margin-top: 32rpx; padding-top: 32rpx; border-top: 1rpx solid rgba(255, 255, 255, 0.1); }
.stat-value { font-size: 40rpx; font-weight: bold; color: #FFD133; display: block; }
.stat-label { font-size: 22rpx; color: rgba(255, 255, 255, 0.4); display: block; margin-top: 4rpx; }

/* ---------- 弹窗 ---------- */
.mask {
  position: fixed;
  left: 0; top: 0; right: 0; bottom: 0;
  background: rgba(0, 0, 0, 0.85);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 999;
  padding: 48rpx;
}
.modal-card {
  width: 100%;
  background: linear-gradient(180deg, #2d1b4e, #1a0a2e);
  border: 1rpx solid rgba(212, 160, 23, 0.3);
  border-radius: 40rpx;
  padding: 48rpx 40rpx;
  text-align: center;
}
.modal-emoji { font-size: 96rpx; display: block; margin-bottom: 16rpx; }
.modal-title { font-size: 36rpx; color: #FFD133; letter-spacing: 4rpx; display: block; }
.modal-sub { font-size: 24rpx; color: rgba(255, 255, 255, 0.4); display: block; margin-top: 8rpx; }
.modal-input {
  width: 100%;
  box-sizing: border-box;
  margin-top: 40rpx;
  padding: 26rpx 28rpx;
  background: rgba(255, 255, 255, 0.05);
  border: 1rpx solid rgba(255, 255, 255, 0.12);
  border-radius: 20rpx;
  color: #fff;
  font-size: 28rpx;
}
.modal-link { font-size: 26rpx; color: rgba(255, 255, 255, 0.35); margin-top: 24rpx; display: block; }

/* ---------- placeholder 修复 ----------
   小程序原生组件的 placeholder 无法继承 scoped 样式，必须放到全局 <style> 里。
   否则 placeholder 会用黑色默认文字，在紫色背景上几乎不可见，
   视觉上表现为"文字被折叠成一条线"。 */
.ph {
  color: rgba(255, 255, 255, 0.4);
  font-size: 28rpx;
  line-height: 1.4;
}

/* ---------- 成就解锁弹窗 ---------- */
.ach-modal-name {
  font-size: 40rpx;
  font-weight: bold;
  color: #fff;
  letter-spacing: 4rpx;
  display: block;
  margin-top: 12rpx;
}

/* ---------- 成就入口（个人主页） ---------- */
.ach-entry {
  display: flex;
  align-items: center;
  margin-top: 24rpx;
  background: linear-gradient(135deg, rgba(255, 193, 7, 0.12), rgba(255, 255, 255, 0.04));
  border: 1rpx solid rgba(212, 160, 23, 0.3);
  border-radius: 24rpx;
  padding: 28rpx 32rpx;
}
.ach-entry:active { background: rgba(255, 193, 7, 0.18); }
.ach-entry-icon { font-size: 48rpx; margin-right: 24rpx; }
.ach-entry-body { flex: 1; }
.ach-entry-title { font-size: 30rpx; font-weight: bold; color: #FFD133; display: block; }
.ach-entry-sub { font-size: 22rpx; color: rgba(255, 255, 255, 0.45); display: block; margin-top: 4rpx; }
.ach-entry-arrow { font-size: 32rpx; color: rgba(255, 255, 255, 0.4); }

/* ---------- input 上方的固定 label（替代会消失的 placeholder） ---------- */
.modal-label {
  display: block;
  text-align: left;
  margin-top: 40rpx;
  font-size: 24rpx;
  color: rgba(255, 255, 255, 0.5);
  letter-spacing: 2rpx;
}
</style>
