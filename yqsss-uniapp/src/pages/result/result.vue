<template>
  <view class="page-root">
    <view class="top-bar">
      <view class="back-btn" @click="goHome">← 再来一签</view>
      <text class="page-title">解签</text>
      <view style="width: 96rpx;"></view>
    </view>

    <template v-if="fortune">
      <!-- 签文卡片 -->
      <view class="result-card">
        <text class="level-badge" :class="levelClass">{{ fortune.level }}</text>
        <text class="result-title">{{ fortune.title }}</text>
        <text class="result-poem">{{ fortune.poem }}</text>
        <view v-if="fortune.lucky" class="lucky-row">
          <text class="lucky-item">🌈 {{ fortune.lucky.color || '—' }}</text>
          <text class="lucky-item">🔢 {{ fortune.lucky.number || '—' }}</text>
          <text class="lucky-item">🧭 {{ fortune.lucky.direction || '—' }}</text>
        </view>
      </view>

      <!-- 五维解读（高级签无 analysis，自动隐藏） -->
      <view v-if="analysisItems.length" style="margin-top: 32rpx;">
        <text class="section-title">📖 签文解读</text>
        <view v-for="item in analysisItems" :key="item.dim" class="dim-card">
          <text class="dim-icon">{{ item.icon }}</text>
          <view class="dim-body">
            <text class="dim-name">{{ item.name }}</text>
            <text class="dim-text">{{ item.text }}</text>
          </view>
        </view>
        <!-- 合规：解读就近标注娱乐属性 -->
        <text class="tip-note">以上内容为娱乐性解读与心理暗示，仅供参考</text>
      </view>

      <!-- 深度解签（解锁后展示） -->
      <view v-if="deepUnlocked" style="margin-top: 32rpx;">
        <text class="section-title">🔮 深度解签</text>
        <view class="deep-card">
          <text class="deep-text">{{ deepText }}</text>
        </view>
      </view>

      <!-- 广告解锁入口（ADS_ENABLED=false 时隐藏，深度解签改由上方免费展示） -->
      <view v-else-if="adsEnabled" class="ad-banner">
        <text class="ad-banner-title">🔮 本签还有更详细的好运指引</text>
        <view class="btn-primary" style="margin: 0;" @click="unlockDeepAnalysis">📺 看广告解锁本签深度解签</view>
      </view>

      <!-- 操作按钮 -->
      <view style="margin-top: 32rpx;">
        <view class="btn-primary btn-red" @click="goPoster">🎨 生成分享海报</view>
        <button open-type="share" class="btn-share">📤 分享给好友</button>
        <view class="btn-ghost" @click="again">🔄 再摇一签</view>
      </view>
    </template>

    <!-- 成就解锁弹窗：抽签后由 Achievement.evaluate() 入队，本页 onShow 取走展示。
         放在结果页而不是抽签页——抽签页跳转太快，弹窗会被打断（计划书 §5.1）。 -->
    <view v-if="unlockedList.length" class="mask" @click="closeAchievementModal">
      <view class="modal-card" @click.stop>
        <text class="modal-emoji">{{ unlockedList[0].icon }}</text>
        <text class="modal-title">🏆 解锁新成就</text>
        <text class="ach-modal-name">{{ unlockedList[0].name }}</text>
        <text class="modal-sub">{{ unlockedList[0].desc }}</text>
        <text v-if="unlockedList.length > 1" class="modal-sub">同时达成 {{ unlockedList.length }} 项</text>
        <view class="btn-primary" @click="goAchievement">查看我的成就</view>
        <text class="modal-link" @click="closeAchievementModal">知道了</text>
      </view>
    </view>
  </view>
</template>

<script>
import Lottery from '../../modules/lottery.js';
import Storage from '../../modules/storage.js';
import Achievement from '../../modules/achievement.js';
import AdSDK, { ADS_ENABLED } from '../../modules/ad.js';
import Share from '../../modules/share.js';

export default {
  data() {
    return {
      fortune: null,
      scene: 'daily',
      deepUnlocked: false,
      unlockedList: [],
      adsEnabled: ADS_ENABLED,
    };
  },

  computed: {
    levelClass() {
      return this.fortune ? Lottery.getLevelClass(this.fortune.level) : '';
    },
    analysisItems() {
      return this.fortune ? Lottery.buildAnalysisItems(this.fortune) : [];
    },
    deepText() {
      return this.fortune ? Lottery.buildDeepAnalysis(this.fortune, this.scene) : '';
    },
  },

  onLoad() {
    this.fortune = Lottery.getCurrentFortune();
    this.scene = Lottery.currentScene;

    // 页内解锁（看广告解锁深度解签 / 高级签 / 无限抽签）时实时弹窗。
    // 此时 onShow 早已执行过，光靠 takePending() 拿不到，所以走订阅。
    Achievement.onUnlock(() => {
      this.unlockedList = Achievement.takePending();
    });

    if (!this.fortune) {
      // 直接进入解签页且无签文时，回到首页
      uni.reLaunch({ url: '/pages/index/index' });
      return;
    }
    this.refreshUnlock();
  },

  onShow() {
    this.refreshUnlock();
    // 取走待展示的解锁列表（取走即清空，返回上一页不会重复弹）。
    // onLoad 在本页 scene 未就绪时也可能先跑，统一放在 onShow 消费最稳。
    this.unlockedList = Achievement.takePending();
  },

  // 启用右上角「···」菜单的转发 / 朋友圈分享
  onReady() {
    Share.enableShareMenu();
  },

  // 转发给好友：以当前签文为卖点，落地到首页引导对抽签
  onShareAppMessage() {
    // 分享即埋点，供成就「广结善缘」判定（silent：不弹窗，避免打断分享）
    Storage.countFeatureEvent('share');
    Achievement.evaluate({ silent: true });
    const f = this.fortune;
    return {
      title: f ? `我抽到了「${f.title}」（${f.level}），你也来摇一签~` : '一键上上签 - 摇一摇，好运自然来',
      path: '/pages/index/index',
    };
  },

  // 分享到朋友圈（仅支持 title / query，不支持 imageUrl）
  onShareTimeline() {
    const f = this.fortune;
    return {
      title: f ? `一键上上签 · 我摇到了「${f.title}」` : '一键上上签',
      query: '',
    };
  },

  methods: {
    refreshUnlock() {
      // 广告关闭期间深度解签免费全开，避免「有钩子但无解锁途径」的死路；
      // 广告恢复后自动切回「看广告解锁」逻辑，无需改动本行。
      this.deepUnlocked = ADS_ENABLED ? Storage.isFeatureUnlocked('deepAnalysis') : true;
    },
    goHome() {
      uni.reLaunch({ url: '/pages/index/index' });
    },
    again() {
      uni.redirectTo({ url: `/pages/shake/shake?scene=${this.scene}` });
    },
    goPoster() {
      uni.navigateTo({ url: '/pages/poster/poster' });
    },
    goAchievement() {
      this.unlockedList = [];
      uni.navigateTo({ url: '/pages/achievement/achievement' });
    },
    closeAchievementModal() {
      this.unlockedList = [];
    },
    async unlockDeepAnalysis() {
      const res = await AdSDK.watchAdForReward('deep_analysis');
      if (res) this.refreshUnlock();
    },
  },
};
</script>
