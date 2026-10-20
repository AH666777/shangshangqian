<template>
  <view class="page-root">
    <view class="top-bar">
      <view class="back-btn" @click="goBack">← 返回</view>
      <text class="page-title">🏆 我的成就</text>
      <view style="width: 96rpx;"></view>
    </view>

    <!-- 总览 -->
    <view class="summary-card">
      <text class="summary-count">{{ unlockedCount }} / {{ totalCount }}</text>
      <text class="summary-label">已解锁成就</text>
      <view class="summary-bar">
        <view class="summary-bar-fill" :style="{ width: percent + '%' }"></view>
      </view>
      <text class="summary-tip">每支签、每个场景、每个时段，都可能藏着一枚成就</text>
    </view>

    <!-- 分区列表 -->
    <view v-for="g in groups" :key="g.key" class="group-block">
      <view class="group-head">
        <text class="group-title">{{ g.title }}</text>
        <text class="group-progress">{{ groupDone(g) }} / {{ g.items.length }}</text>
      </view>
      <text class="group-desc">{{ g.desc }}</text>

      <view
        v-for="item in g.items"
        :key="item.id"
        class="ach-item"
        :class="{ locked: !item.unlocked }"
      >
        <view class="ach-icon" :class="{ 'ach-icon-locked': !item.unlocked }">
          <text>{{ item.unlocked ? item.icon : '🔒' }}</text>
        </view>

        <view class="ach-body">
          <view class="ach-head">
            <text class="ach-name">{{ item.name }}</text>
            <text class="ach-tier">{{ tierMeta(item.tier).badge }}</text>
          </view>
          <text class="ach-desc">{{ item.desc }}</text>

          <!-- 未解锁：进度条；已解锁：达成时间 -->
          <view v-if="!item.unlocked" class="ach-progress-row">
            <view class="ach-bar">
              <view class="ach-bar-fill" :style="{ width: progressPercent(item) + '%' }"></view>
            </view>
            <text class="ach-progress-text">{{ item.display }} / {{ item.target }}</text>
          </view>
          <text v-else class="ach-date">{{ formatDate(item.unlockedAt) }}</text>
        </view>
      </view>
    </view>

    <text class="tip-note">成就基于本机记录统计，换设备登录后会自动合并云端进度</text>
  </view>
</template>

<script>
import Achievement from '../../modules/achievement.js';

export default {
  data() {
    return {
      groups: [],
      unlockedCount: 0,
      totalCount: 0,
    };
  },

  computed: {
    percent() {
      if (!this.totalCount) return 0;
      return Math.round((this.unlockedCount / this.totalCount) * 100);
    },
  },

  onShow() {
    this.load();
  },

  methods: {
    load() {
      // 每次进入重新判定一次：权益类成就可能在别处刚解锁。
      // silent：本页只刷新数字，不往结果页的弹窗队列里塞内容。
      Achievement.evaluate({ silent: true });
      this.groups = Achievement.getWall();
      this.unlockedCount = Achievement.getUnlockedCount();
      this.totalCount = Achievement.getTotalCount();
    },

    tierMeta(tier) {
      return Achievement.getTierMeta(tier);
    },

    groupDone(group) {
      return group.items.filter((item) => item.unlocked).length;
    },

    progressPercent(item) {
      if (!item.target) return 0;
      return Math.min(100, Math.round((item.display / item.target) * 100));
    },

    formatDate(ts) {
      if (!ts) return '已达成';
      const d = new Date(ts);
      const p = (n) => String(n).padStart(2, '0');
      return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())} 达成`;
    },

    goBack() {
      uni.navigateBack();
    },
  },
};
</script>

<style scoped>
.summary-card {
  background: linear-gradient(135deg, #2d1b4e, #1a0a2e);
  border: 2rpx solid rgba(212, 160, 23, 0.25);
  border-radius: 28rpx;
  padding: 36rpx 32rpx;
  text-align: center;
  margin-bottom: 32rpx;
}
.summary-count { font-size: 56rpx; font-weight: bold; color: #FFD133; display: block; }
.summary-label { font-size: 24rpx; color: rgba(255,255,255,0.5); display: block; margin-top: 8rpx; }
.summary-bar {
  height: 12rpx;
  background: rgba(255,255,255,0.08);
  border-radius: 999rpx;
  margin: 24rpx 0 16rpx;
  overflow: hidden;
}
.summary-bar-fill {
  height: 100%;
  background: linear-gradient(90deg, #D4A017, #FFC107);
  border-radius: 999rpx;
}
.summary-tip { font-size: 22rpx; color: rgba(255,255,255,0.35); }

.group-block { margin-bottom: 36rpx; }
.group-head { display: flex; align-items: baseline; justify-content: space-between; }
.group-title { font-size: 30rpx; font-weight: bold; color: #FFD133; letter-spacing: 2rpx; }
.group-progress { font-size: 24rpx; color: rgba(255,255,255,0.45); }
.group-desc { font-size: 22rpx; color: rgba(255,255,255,0.3); display: block; margin: 6rpx 0 16rpx; }

.ach-item {
  display: flex;
  align-items: center;
  background: rgba(255, 255, 255, 0.06);
  border: 1rpx solid rgba(212, 160, 23, 0.18);
  border-radius: 20rpx;
  padding: 24rpx;
  margin-bottom: 16rpx;
}
.ach-item.locked {
  background: rgba(255, 255, 255, 0.03);
  border-color: rgba(255, 255, 255, 0.08);
}
.ach-icon {
  width: 88rpx;
  height: 88rpx;
  border-radius: 50%;
  background: rgba(255, 193, 7, 0.14);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 42rpx;
  margin-right: 24rpx;
  flex-shrink: 0;
}
.ach-icon-locked { background: rgba(255, 255, 255, 0.05); }
.ach-body { flex: 1; }
.ach-head { display: flex; align-items: center; justify-content: space-between; }
.ach-name { font-size: 28rpx; font-weight: bold; color: #fff; }
.ach-item.locked .ach-name { color: rgba(255, 255, 255, 0.45); }
.ach-tier { font-size: 24rpx; }
.ach-desc { font-size: 22rpx; color: rgba(255, 255, 255, 0.5); display: block; margin-top: 6rpx; }
.ach-item.locked .ach-desc { color: rgba(255, 255, 255, 0.25); }

.ach-progress-row { display: flex; align-items: center; margin-top: 12rpx; }
.ach-bar {
  flex: 1;
  height: 8rpx;
  background: rgba(255, 255, 255, 0.1);
  border-radius: 999rpx;
  overflow: hidden;
  margin-right: 16rpx;
}
.ach-bar-fill { height: 100%; background: #D4A017; border-radius: 999rpx; }
.ach-progress-text { font-size: 20rpx; color: rgba(255, 255, 255, 0.4); }
.ach-date { font-size: 20rpx; color: #FFD133; display: block; margin-top: 12rpx; }
</style>
