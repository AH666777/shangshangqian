<template>
  <view class="page-root">
    <!-- 顶部用户栏 -->
    <view class="user-bar">
      <view class="user-chip" @click="onProfileClick">
        <text class="avatar">{{ avatar }}</text>
        <text class="uname">{{ nickname }}</text>
      </view>
      <text class="scene-label">当前场景：{{ currentSceneName }}</text>
    </view>

    <!-- Logo -->
    <view class="logo">
      <text class="logo-emoji">🏮</text>
      <text class="logo-title">一键上上签</text>
      <text class="logo-sub">摇一摇，好运自然来</text>
    </view>

    <!-- 场景选择 -->
    <view>
      <text class="section-title">— 选择你的场景 —</text>
      <view class="scene-grid">
        <view
          v-for="s in scenes"
          :key="s.key"
          class="scene-card"
          :class="{ active: scene === s.key }"
          @click="selectScene(s.key)"
        >
          <text class="scene-icon">{{ s.icon }}</text>
          <text class="scene-name">{{ s.name }}</text>
          <text class="scene-desc">{{ s.desc }}</text>
        </view>
      </view>
    </view>

    <!-- 抽签按钮 -->
    <view class="btn-primary" @click="goShake">✨ 摇一支好运签 ✨</view>

    <!-- 今日信息 -->
    <view class="today-info">
      <text>今日免费 <text class="gold">{{ remaining }}</text> 次 · 明日额度自动重置</text>
      <view class="btn-ghost" @click="goHistory">📜 查看历史签文</view>
    </view>

    <!-- 好运加成（广告解锁入口，ADS_ENABLED=false 时隐藏） -->
    <view v-if="adsEnabled" class="bonus-card">
      <view class="bonus-head">
        <text class="bonus-title">🎁 好运加成</text>
        <text class="bonus-tip">看广告免费解锁</text>
      </view>

      <view class="bonus-row">
        <view class="bonus-label">
          🔮 高级签文库
          <text class="sub">锦鲤签 / 龙腾签 / 天赐签</text>
        </view>
        <text v-if="premiumUnlocked" class="bonus-done">✅ 已解锁</text>
        <view v-else class="btn-small" @click="unlockPremiumFortunes">📺 解锁</view>
      </view>

      <view class="bonus-row">
        <view class="bonus-label">
          ♾️ 无限抽签
          <text class="sub">每日不限次数</text>
        </view>
        <text v-if="unlimitedUnlocked" class="bonus-done">✅ 已解锁</text>
        <view v-else class="btn-small" @click="unlockUnlimitedDraws">📺 解锁</view>
      </view>
    </view>

    <!-- 合规声明（三平台审核要求，不可移除） -->
    <view class="footer">
      <text>本产品为<text class="strong">国风趣味娱乐小游戏</text>，签文与解读均为原创创作，仅供娱乐参考与心理暗示，</text>
      <text>不构成任何命运预测、投资、医疗、婚恋或法律建议，请勿据此做出任何决策。</text>
    </view>

    <!-- 协议入口（始终可见，无需登录，满足合规「显著位置」要求） -->
    <view class="legal-links">
      <text @click="openAgreement('terms')">用户协议</text>
      <text @click="openAgreement('privacy')">隐私政策</text>
    </view>

    <!-- 登录弹窗 -->
    <view v-if="showAuth" class="mask" @click="closeAuthModal">
      <view class="modal-card" @click.stop>
        <text class="modal-emoji">🏮</text>
        <text class="modal-title">欢迎来到上上签</text>
        <text class="modal-sub">登录后可保存签文与解锁权益</text>

        <!-- #ifdef MP-WEIXIN -->
        <button
          class="btn-wechat"
          hover-class="btn-wechat-hover"
          :loading="logining"
          :disabled="logining"
          @click="handleWechatLogin"
        >
          <text class="btn-ico">💬</text>
          <text>微信账号一键登录</text>
        </button>

        <view class="divider">
          <view class="divider-line"></view>
          <text class="divider-text">或使用昵称</text>
          <view class="divider-line"></view>
        </view>
        <!-- #endif -->

        <text class="modal-label">给自己取个名号</text>
        <input
          v-model="nicknameInput"
          class="modal-input"
          type="text"
          maxlength="20"
          placeholder="例如：云游散人"
          placeholder-class="ph"
        />
        <view class="btn-primary" @click="handleLogin">进入游戏</view>
        <text class="modal-link" @click="closeAuthModal">暂不登录，继续体验</text>
      </view>
    </view>
  </view>
</template>

<script>
import Lottery from '../../modules/lottery.js';
import Storage from '../../modules/storage.js';
import Auth from '../../modules/auth.js';
import AdSDK, { ADS_ENABLED } from '../../modules/ad.js';
import Achievement from '../../modules/achievement.js';
import RulesCore from '../../core/rules.js';

export default {
  data() {
    return {
      scenes: Lottery.getScenes(),
      scene: 'daily',
      remaining: 0,
      premiumUnlocked: false,
      unlimitedUnlocked: false,
      showAuth: false,
      nicknameInput: '',
      logining: false,
      adsEnabled: ADS_ENABLED,
    };
  },

  computed: {
    nickname() {
      return Auth.isLoggedIn() ? Auth.getNickname() : '未登录';
    },
    avatar() {
      return Auth.isLoggedIn() ? RulesCore.getAvatarEmoji(Auth.getNickname()) : '👤';
    },
    currentSceneName() {
      return Lottery.getSceneName(this.scene);
    },
  },

  onLoad() {
    this.refreshState();
  },

  // 从摇签页返回后刷新次数与权益状态
  onShow() {
    this.refreshState();
  },

  // 启用右上角「···」菜单的转发 / 朋友圈分享
  onReady() {
    uni.showShareMenu({ menus: ['shareAppMessage', 'shareTimeline'] });
  },

  // 转发给好友
  onShareAppMessage() {
    Storage.countFeatureEvent('share');
    Achievement.evaluate({ silent: true });
    return {
      title: '一键上上签 - 摇一摇，好运自然来',
      path: '/pages/index/index',
    };
  },

  // 分享到朋友圈
  onShareTimeline() {
    return {
      title: '一键上上签 · 摇一摇，好运自然来',
    };
  },

  methods: {
    refreshState() {
      this.remaining = Storage.getRemainingDraws();
      this.premiumUnlocked = Storage.isFeatureUnlocked('premiumFortunes');
      this.unlimitedUnlocked = Storage.isFeatureUnlocked('unlimitedDraws');
    },

    selectScene(key) {
      this.scene = key;
    },

    goShake() {
      uni.navigateTo({ url: `/pages/shake/shake?scene=${this.scene}` });
    },

    goHistory() {
      uni.navigateTo({ url: '/pages/history/history' });
    },

    openAgreement(type) {
      uni.navigateTo({ url: `/pages/agreement/agreement?type=${type}` });
    },

    onProfileClick() {
      if (Auth.isLoggedIn()) {
        uni.navigateTo({ url: '/pages/profile/profile' });
      } else {
        this.showAuth = true;
      }
    },

    // 微信一键登录：uni.login 取 code → 云函数换 openid
    async handleWechatLogin() {
      if (this.logining) return;
      this.logining = true;
      uni.showLoading({ title: '登录中...', mask: true });
      try {
        const res = await Auth.loginWithWechat();
        uni.hideLoading();
        if (!res.success) {
          uni.showToast({ title: res.message, icon: 'none' });
          return;
        }
        this.showAuth = false;
        uni.showToast({ title: res.isNew ? '欢迎加入' : '欢迎回来', icon: 'none' });
        // 登录成功后与云端双向对账成就（合并云端 + 补报本地），失败不影响进入主页
        await Achievement.syncWithCloud();
        uni.navigateTo({ url: '/pages/profile/profile' });
      } catch (e) {
        uni.hideLoading();
        uni.showToast({ title: '登录失败，请重试', icon: 'none' });
      } finally {
        this.logining = false;
      }
    },

    closeAuthModal() {
      this.showAuth = false;
    },

    handleLogin() {
      const res = Auth.login(this.nicknameInput);
      if (!res.success) {
        uni.showToast({ title: res.message, icon: 'none' });
        return;
      }
      this.showAuth = false;
      this.nicknameInput = '';
      uni.showToast({ title: res.isNew ? '欢迎加入' : '欢迎回来', icon: 'none' });
      uni.navigateTo({ url: '/pages/profile/profile' });
    },

    async unlockPremiumFortunes() {
      await AdSDK.watchAdForReward('premium_fortunes');
      this.refreshState();
    },

    async unlockUnlimitedDraws() {
      await AdSDK.watchAdForReward('unlimited_draws');
      this.refreshState();
    },
  },
};
</script>

<style scoped>
/* 注：placeholder 样式 .ph 必须放在 App.vue 全局 <style> 里，
   小程序原生 placeholder 无法继承 scoped 样式。 */

/* 微信一键登录（品牌绿） */
.btn-wechat {
  width: 100%;
  height: 88rpx;
  margin-top: 24rpx;
  border-radius: 44rpx;
  border: none;
  background: linear-gradient(135deg, #07c160, #06ad56);
  color: #ffffff;
  font-size: 30rpx;
  line-height: 1;
  display: flex;
  align-items: center;
  justify-content: center;
}
.btn-wechat::after { border: none; }
.btn-wechat-hover { opacity: 0.85; }

.btn-ico { margin-right: 12rpx; }

/* 分割线 */
.divider {
  display: flex;
  align-items: center;
  margin: 28rpx 0 8rpx;
}
.divider-line {
  flex: 1;
  height: 2rpx;
  background: rgba(255, 255, 255, 0.15);
}
.divider-text {
  padding: 0 20rpx;
  font-size: 24rpx;
  color: rgba(255, 255, 255, 0.45);
}
</style>
