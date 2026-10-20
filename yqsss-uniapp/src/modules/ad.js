// ============================================
// 一键上上签 - 广告 SDK（uni-app 版）
// ============================================
// 与 H5 版保持同样的「自动降级」原则：
//   真实广告 SDK 未就绪时回退 Mock，绝不让 Promise 悬挂导致按钮无响应。
//
// uni-app 下激励视频用 uni.createRewardedVideoAd（微信/抖音等平台均支持）。
// 目前 rewardVideoUnitId 为空，即走 Mock 模式，方便先跑通产品逻辑。

import Storage from './storage.js';
import Achievement from './achievement.js';

// ============================================================
// 广告总开关（发布安全开关）
// ------------------------------------------------------------
// false = 隐藏全部「看广告解锁」入口，相关权益改为免费开放。
//
// 为什么 v1.0 必须关：
//   1) Mock 广告在审核视角属于「模拟广告行为」，是明确的驳回理由；
//   2) 微信流量主开通门槛为累计 UV ≥ 500，新小程序拿不到真实 adunit，
//      即便接了也无处可配，只能跑 Mock。
//
// 重新开启广告的前置条件（缺一不可）：
//   1) 小程序已完成认证 + ICP 备案；
//   2) 流量主已开通，并创建「激励视频」广告位取得 adunit-xxxxxxxx；
//   3) 下面 rewardVideoUnitId 填入真实 ID，platform 改为 'uni'；
//   4) 将本常量改为 true。
// ============================================================
export const ADS_ENABLED = false;

const AdSDK = {
  config: {
    // 广告单元 ID（接入真实广告时替换，如 'adunit-xxxxxxxx'）
    rewardVideoUnitId: '',
    enabled: ADS_ENABLED,
    // 'mock' | 'uni'
    platform: 'mock',
  },

  state: {
    isLoading: false,
    isReady: false,
    lastWatchTime: 0,
  },

  rewardedVideoAd: null,

  // ========== 初始化 ==========
  init(config = {}) {
    this.config = { ...this.config, ...config };

    // 广告未开启时不做任何初始化，也不打印日志
    if (!this.config.enabled) return;

    if (this.config.platform === 'uni') {
      this._initUniAd();
    } else {
      console.warn('[AdSDK] 已开启但运行在 Mock 模式，上线前必须替换为真实 adunit');
    }
  },

  _initUniAd() {
    try {
      if (typeof uni !== 'undefined' && typeof uni.createRewardedVideoAd === 'function' && this.config.rewardVideoUnitId) {
        this.rewardedVideoAd = uni.createRewardedVideoAd({ adUnitId: this.config.rewardVideoUnitId });
        this.rewardedVideoAd.onError((err) => console.warn('[AdSDK] 激励视频错误', err));
        this.state.isReady = true;
      }
    } catch (e) {
      console.warn('[AdSDK] 激励视频初始化失败，回退 Mock', e);
      this.rewardedVideoAd = null;
    }
  },

  _realAdReady() {
    return this.config.platform === 'uni' && !!this.rewardedVideoAd;
  },

  // ========== 显示激励视频 ==========
  showRewardVideo(rewardType) {
    return new Promise((resolve, reject) => {
      if (!this.config.enabled) {
        resolve({ type: rewardType, adEnabled: false });
        return;
      }

      // 真实广告未就绪 -> 回退 Mock（关键：避免 Promise 永不 settle）
      if (!this._realAdReady()) {
        if (this.config.platform !== 'mock') {
          console.warn('[AdSDK] 真实广告尚未就绪，自动回退到 Mock 模式');
        }
        this._showMockAd(rewardType, resolve, reject);
        return;
      }

      this._showUniAd(resolve, reject);
    });
  },

  // ========== uni 激励视频 ==========
  _showUniAd(resolve, reject) {
    const ad = this.rewardedVideoAd;

    const onClose = (res) => {
      ad.offClose(onClose);
      if (res && res.isEnded) {
        resolve({ success: true, adEnabled: true });
      } else {
        reject(new Error('广告未看完'));
      }
    };

    ad.onClose(onClose);
    ad.show().catch(() => {
      ad.load().then(() => ad.show()).catch(reject);
    });
  },

  // ========== Mock 广告（uni 弹窗模拟，3 秒倒计时） ==========
  _showMockAd(rewardType, resolve, reject) {
    let countdown = 3;

    uni.showLoading({ title: `广告 ${countdown}s`, mask: true });

    const timer = setInterval(() => {
      countdown--;
      if (countdown <= 0) {
        clearInterval(timer);
        uni.hideLoading();
        resolve({ success: true, type: rewardType, adEnabled: true });
      } else {
        uni.showLoading({ title: `广告 ${countdown}s`, mask: true });
      }
    }, 1000);
  },

  // ========== 广告奖励处理 ==========
  async watchAdForReward(rewardType) {
    try {
      const result = await this.showRewardVideo(rewardType);

      switch (rewardType) {
        case 'extra_draws':
          Storage.decrementTodayCount();
          uni.showToast({ title: '🎉 获得额外抽签次数', icon: 'none' });
          break;

        case 'premium_fortunes':
          Storage.unlockFeature('premiumFortunes');
          uni.showToast({ title: '🔮 高级签文已解锁', icon: 'none' });
          Achievement.evaluate();
          break;

        case 'deep_analysis':
          Storage.unlockFeature('deepAnalysis');
          // 该权益按「每次抽签」计费（出签即 lock），无法用 isFeatureUnlocked 判定「是否解锁过」，
          // 因此额外记一次累计事件，供成就「一探究竟 / 慧眼识珠」判定。
          Storage.countFeatureEvent('deepAnalysis');
          uni.showToast({ title: '📖 深度解签已解锁', icon: 'none' });
          // 解锁后立即判定，成就弹窗由结果页统一消费
          Achievement.evaluate();
          break;

        case 'unlimited_draws':
          Storage.unlockFeature('unlimitedDraws');
          uni.showToast({ title: '♾️ 无限抽签已解锁', icon: 'none' });
          Achievement.evaluate();
          break;

        default:
          break;
      }

      return result;
    } catch (e) {
      console.warn('广告观看失败:', e);
      uni.showToast({ title: '广告加载失败，请稍后再试', icon: 'none' });
      return null;
    }
  },
};

export default AdSDK;
