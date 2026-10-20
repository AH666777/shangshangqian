<template>
  <view class="page-root">
    <view class="top-bar">
      <view class="back-btn" @click="goHome">← 返回首页</view>
      <text class="page-title">📜 历史签文</text>
      <view class="back-btn" style="color: rgba(255,255,255,0.4);" @click="clearAll">清空</view>
    </view>

    <view v-if="groups.length === 0" class="empty-tip">暂无签文记录，快去摇一签吧~</view>

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
  </view>
</template>

<script>
import Storage from '../../modules/storage.js';
import RulesCore from '../../core/rules.js';

export default {
  data() {
    return {
      groups: [],
    };
  },

  onShow() {
    this.load();
  },

  methods: {
    load() {
      const grouped = Storage.getGroupedHistory();
      this.groups = Object.keys(grouped).map((label) => ({
        label,
        items: grouped[label].map((r) => ({
          title: r.title,
          poem: r.poem,
          level: r.level,
          time: RulesCore.splitDateTime(r.createdAt).time,
        })),
      }));
    },

    goHome() {
      uni.reLaunch({ url: '/pages/index/index' });
    },

    clearAll() {
      uni.showModal({
        title: '提示',
        content: '确定要清空所有历史签文记录吗？',
        success: (res) => {
          if (!res.confirm) return;
          Storage.clearHistory();
          this.load();
          uni.showToast({ title: '历史记录已清空', icon: 'none' });
        },
      });
    },
  },
};
</script>
