<template>
  <view class="page-root shake-wrap">
    <view class="back-btn" style="align-self: flex-start;" @click="goHome">← 返回</view>

    <!-- 签筒 -->
    <view class="barrel" :class="{ shaking: isShaking }" @click="doShake">
      <view class="barrel-body">
        <view class="sticks">
          <view v-for="i in 5" :key="i" class="stick" :style="stickStyle(i)"></view>
        </view>
      </view>
    </view>

    <text class="shake-hint">👆 点击签筒摇一摇</text>
    <text class="shake-hint" style="font-size: 24rpx; color: rgba(255,255,255,0.4);">📱 也可摇晃手机抽签</text>

    <!-- 抽签中遮罩 -->
    <view v-if="drawing" class="mask">
      <view style="text-align: center;">
        <text style="font-size: 90rpx; display: block; margin-bottom: 24rpx;">✨</text>
        <text class="page-title">正在抽取中...</text>
        <text class="modal-sub">好运正在赶来</text>
      </view>
    </view>
  </view>
</template>

<script>
import Lottery from '../../modules/lottery.js';
import Storage from '../../modules/storage.js';
import AdSDK, { ADS_ENABLED } from '../../modules/ad.js';
import Share from '../../modules/share.js';

export default {
  data() {
    return {
      scene: 'daily',
      drawing: false,
      isShaking: false,
      _accHandler: null,
      _lastShake: 0,
    };
  },

  onLoad(options) {
    if (options && options.scene) this.scene = options.scene;
    this.startAccelerometer();
  },

  onUnload() {
    this.stopAccelerometer();
  },

  // 启用右上角「···」菜单的转发 / 朋友圈分享
  onReady() {
    Share.enableShareMenu();
  },

  onShareAppMessage() {
    Storage.countFeatureEvent('share');
    return {
      title: '一键上上签 - 摇一摇，好运自然来',
      path: '/pages/index/index',
    };
  },

  onShareTimeline() {
    return {
      title: '一键上上签 · 摇一摇，好运自然来',
    };
  },

  methods: {
    stickStyle(i) {
      const angles = [-5, 3, -2, 6, -4];
      return `transform: rotate(${angles[(i - 1) % 5]}deg);`;
    },

    goHome() {
      uni.navigateBack();
    },

    // ---------- 摇一摇（加速度传感器，失败则仅保留点击抽签） ----------
    startAccelerometer() {
      if (typeof uni === 'undefined' || typeof uni.onAccelerometerChange !== 'function') return;
      try {
        uni.startAccelerometer({ interval: 'game' });
      } catch (e) {
        return;
      }
      this._accHandler = (res) => {
        // 三轴加速度模长，静止约 1（单位 g），抖动阈值 1.5
        const power = Math.sqrt(res.x * res.x + res.y * res.y + res.z * res.z);
        const now = Date.now();
        if (power > 1.5 && now - this._lastShake > 2000) {
          this._lastShake = now;
          this.doShake();
        }
      };
      uni.onAccelerometerChange(this._accHandler);
    },

    stopAccelerometer() {
      try {
        if (this._accHandler && typeof uni.offAccelerometerChange === 'function') {
          uni.offAccelerometerChange(this._accHandler);
        }
        if (typeof uni.stopAccelerometer === 'function') uni.stopAccelerometer();
      } catch (e) { /* ignore */ }
    },

    // ---------- 抽签 ----------
    doShake() {
      if (this.drawing) return;

      // 次数校验：不足时提示。广告关闭期间只做纯提示，不给「看广告补次数」入口。
      const remaining = Storage.getRemainingDraws();
      if (remaining <= 0) {
        if (ADS_ENABLED) {
          uni.showModal({
            title: '今日免费次数已用完',
            content: '观看一段广告即可获得额外抽签次数',
            confirmText: '看广告',
            success: async (r) => {
              if (!r.confirm) return;
              const res = await AdSDK.watchAdForReward('extra_draws');
              if (res) uni.showToast({ title: '已获得额外次数，请再摇一次', icon: 'none' });
            },
          });
        } else {
          uni.showModal({
            title: '今日免费次数已用完',
            content: '每日免费额度将于次日 0 点自动重置，明天再来试试手气吧',
            showCancel: false,
            confirmText: '知道了',
          });
        }
        return;
      }

      this.drawing = true;
      this.isShaking = true;
      this.stopAccelerometer();

      // 摇筒动画时长，随后出签
      setTimeout(() => {
        const result = Lottery.draw(this.scene);
        this.isShaking = false;

        if (!result.success) {
          this.drawing = false;
          uni.showToast({ title: result.message, icon: 'none' });
          return;
        }

        // 跳转到解签页
        uni.redirectTo({
          url: '/pages/result/result',
          complete: () => { this.drawing = false; },
        });
      }, 900);
    },
  },
};
</script>

<style scoped>
.shaking .barrel-body {
  animation: barrelShake 0.15s linear infinite;
}
@keyframes barrelShake {
  0% { transform: translateX(0) rotate(0deg); }
  25% { transform: translateX(-8rpx) rotate(-2deg); }
  75% { transform: translateX(8rpx) rotate(2deg); }
  100% { transform: translateX(0) rotate(0deg); }
}
</style>
