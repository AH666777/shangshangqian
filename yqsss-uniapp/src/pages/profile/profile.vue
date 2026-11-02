<template>
  <view class="page-root">
    <view class="top-bar">
      <view class="back-btn" @click="goHome">← 返回首页</view>
      <text class="page-title">👤 个人主页</text>
      <view class="back-btn" style="color: rgba(255,255,255,0.4);" @click="handleLogout">退出</view>
    </view>

    <!-- 用户信息卡 -->
    <view class="profile-card">
      <text class="profile-avatar">{{ avatar }}</text>
      <text class="profile-name">{{ nickname }}</text>
      <text class="bonus-tip">本地用户</text>
      <view class="profile-stats">
        <view>
          <text class="stat-value">{{ stats.totalDraws }}</text>
          <text class="stat-label">累计抽签</text>
        </view>
        <view>
          <text class="stat-value">{{ stats.todayDraws }}</text>
          <text class="stat-label">今日抽签</text>
        </view>
        <view>
          <text class="stat-value">{{ stats.drawDays }}</text>
          <text class="stat-label">抽签天数</text>
        </view>
      </view>
      <text v-if="createdAtText" class="bonus-tip" style="margin-top: 20rpx;">{{ createdAtText }}</text>
    </view>

    <!-- 成就入口 -->
    <view class="ach-entry" @click="goAchievement">
      <text class="ach-entry-icon">🏆</text>
      <view class="ach-entry-body">
        <text class="ach-entry-title">我的成就</text>
        <text class="ach-entry-sub">已解锁 {{ unlockedCount }} / {{ totalCount }} 项</text>
      </view>
      <text class="ach-entry-arrow">→</text>
    </view>

    <!-- 每日抽签记录 -->
    <view class="top-bar" style="margin-top: 40rpx;">
      <text class="bonus-title">📜 每日抽签记录</text>
      <view class="back-btn" style="color: rgba(255,255,255,0.4);" @click="clearAll">清空</view>
    </view>

    <view v-if="groups.length === 0" class="empty-tip">暂无抽签记录，快去摇一签吧~</view>

    <view v-for="g in groups" :key="g.label">
      <text class="history-group-title">{{ g.label }}</text>
      <view v-for="(item, idx) in g.items" :key="idx" class="history-item">
        <view class="history-item-head">
          <text class="history-item-title">{{ item.title }}</text>
          <text class="history-item-time">{{ item.time }}</text>
        </view>
        <text class="history-item-poem">{{ item.poem }}</text>
      </view>
    </view>

    <!-- 协议入口 -->
    <view class="legal-links">
      <text @click="openAgreement('terms')">用户协议</text>
      <text @click="openAgreement('privacy')">隐私政策</text>
    </view>
  </view>
</template>

<script>
import Auth from '../../modules/auth.js';
import Storage from '../../modules/storage.js';
import Achievement from '../../modules/achievement.js';
import RulesCore from '../../core/rules.js';

export default {
  data() {
    return {
      stats: { totalDraws: 0, todayDraws: 0, drawDays: 0 },
      groups: [],
      createdAtText: '',
      unlockedCount: 0,
      totalCount: 0,
    };
  },

  computed: {
    nickname() {
      return Auth.getNickname();
    },
    avatar() {
      return RulesCore.getAvatarEmoji(Auth.getNickname());
    },
  },

  onShow() {
    if (!Auth.isLoggedIn()) {
      uni.reLaunch({ url: '/pages/index/index' });
      return;
    }
    this.load();
  },

  methods: {
    load() {
      this.stats = Auth.getProfileStats();

      // 成就进度：同步判定一次，保证从别处解锁后回到本页能看到最新数字。
      // silent：这里只刷新数字，解锁弹窗统一由结果页展示。
      Achievement.evaluate({ silent: true });
      this.unlockedCount = Achievement.getUnlockedCount();
      this.totalCount = Achievement.getTotalCount();

      const user = Auth.getUser();
      if (user && user.createdAt) {
        const d = new Date(user.createdAt);
        this.createdAtText = `注册于 ${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
      }

      const grouped = Storage.getGroupedHistory();
      this.groups = Object.keys(grouped).map((label) => ({
        label,
        items: grouped[label].map((r) => ({
          title: r.title,
          poem: r.poem,
          time: RulesCore.splitDateTime(r.createdAt).time,
        })),
      }));
    },

    goAchievement() {
      uni.navigateTo({ url: '/pages/achievement/achievement' });
    },

    openAgreement(type) {
      uni.navigateTo({ url: `/pages/agreement/agreement?type=${type}` });
    },

    goHome() {
      uni.reLaunch({ url: '/pages/index/index' });
    },

    clearAll() {
      uni.showModal({
        title: '提示',
        content: '确定要清空所有抽签记录吗？',
        success: (res) => {
          if (!res.confirm) return;
          Storage.clearHistory();
          this.load();
          uni.showToast({ title: '记录已清空', icon: 'none' });
        },
      });
    },

    handleLogout() {
      uni.showModal({
        title: '提示',
        content: '确定要退出登录吗？（历史记录保留在本地）',
        success: (res) => {
          if (!res.confirm) return;
          Auth.logout();
          uni.showToast({ title: '已退出登录', icon: 'none' });
          uni.reLaunch({ url: '/pages/index/index' });
        },
      });
    },
  },
};
</script>
