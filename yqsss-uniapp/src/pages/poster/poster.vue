<template>
  <view class="page-root">
    <view class="top-bar">
      <view class="back-btn" @click="goBack">← 返回解签</view>
      <text class="page-title">分享海报</text>
      <view style="width: 96rpx;"></view>
    </view>

    <!-- 海报预览 -->
    <view class="poster-box">
      <image
        v-if="posterPath"
        class="poster-img"
        :src="posterPath"
        mode="widthFix"
        show-menu-by-longpress
      />
      <view v-else class="poster-loading">
        <text>海报生成中...</text>
      </view>
    </view>

    <view class="btn-primary" @click="save">💾 保存海报到相册</view>
    <text class="tip-note">保存后可长按图片存入相册（微信内请长按保存）</text>

    <!-- 离屏画布：仅用于生成图片，不参与可见布局 -->
    <canvas canvas-id="posterCanvas" id="posterCanvas" class="offscreen-canvas" />
  </view>
</template>

<script>
import Lottery from '../../modules/lottery.js';
import Storage from '../../modules/storage.js';
import Achievement from '../../modules/achievement.js';

// 画布逻辑尺寸（绘制坐标系）
const W = 375;
const H = 500;

export default {
  data() {
    return {
      posterPath: '',
      fortune: null,
      scene: 'daily',
    };
  },

  onLoad() {
    this.fortune = Lottery.getCurrentFortune();
    this.scene = Lottery.currentScene;

    if (!this.fortune) {
      uni.reLaunch({ url: '/pages/index/index' });
      return;
    }

    // 等待画布挂载后再绘制
    this.$nextTick(() => {
      setTimeout(() => this.render(), 100);
    });
  },

  methods: {
    goBack() {
      uni.navigateBack();
    },

    // ---------- 按宽度自动换行 ----------
    wrapText(ctx, text, maxWidth) {
      const chars = String(text || '').split('');
      const lines = [];
      let line = '';
      for (const ch of chars) {
        const test = line + ch;
        if (ctx.measureText(test).width > maxWidth && line) {
          lines.push(line);
          line = ch;
        } else {
          line = test;
        }
      }
      if (line) lines.push(line);
      return lines;
    },

    // ---------- 绘制海报 ----------
    render() {
      const f = this.fortune;
      const ctx = uni.createCanvasContext('posterCanvas', this);

      // 背景
      const bg = ctx.createLinearGradient(0, 0, 0, H);
      bg.addColorStop(0, '#2d1b4e');
      bg.addColorStop(0.5, '#1a0a2e');
      bg.addColorStop(1, '#0d0517');
      ctx.setFillStyle(bg);
      ctx.fillRect(0, 0, W, H);

      // 描金边框
      ctx.setStrokeStyle('rgba(212,160,23,0.6)');
      ctx.setLineWidth(2);
      ctx.strokeRect(14, 14, W - 28, H - 28);

      // 等级徽章
      ctx.setTextAlign('center');
      ctx.setFillStyle('rgba(255,193,7,0.15)');
      ctx.beginPath();
      ctx.arc(W / 2, 62, 34, 0, Math.PI * 2);
      ctx.fill();
      ctx.setFillStyle('#FFD133');
      ctx.setFontSize(20);
      ctx.fillText(f.level, W / 2, 68);

      // 签文标题
      ctx.setFillStyle('#FFD133');
      ctx.setFontSize(30);
      ctx.fillText(f.title, W / 2, 130);

      // 分隔线
      ctx.setStrokeStyle('rgba(212,160,23,0.35)');
      ctx.setLineWidth(1);
      ctx.beginPath();
      ctx.moveTo(60, 152);
      ctx.lineTo(W - 60, 152);
      ctx.stroke();

      // 签诗（自动换行）
      ctx.setFillStyle('rgba(255,255,255,0.85)');
      ctx.setFontSize(16);
      const poemLines = this.wrapText(ctx, f.poem, W - 100);
      let y = 190;
      poemLines.slice(0, 6).forEach((line) => {
        ctx.fillText(line, W / 2, y);
        y += 26;
      });

      // 幸运信息
      const lucky = f.lucky || {};
      ctx.setFillStyle('rgba(255,255,255,0.6)');
      ctx.setFontSize(13);
      const luckyText = `幸运色 ${lucky.color || '—'}   ·   幸运数字 ${lucky.number || '—'}   ·   有利方位 ${lucky.direction || '—'}`;
      ctx.fillText(luckyText, W / 2, 400);

      // 页脚（合规声明）
      ctx.setFillStyle('rgba(255,255,255,0.35)');
      ctx.setFontSize(11);
      ctx.fillText('国风趣味娱乐小游戏 · 内容仅供娱乐参考', W / 2, 440);
      ctx.fillText('不构成任何命运预测或决策建议', W / 2, 458);

      // 渲染完成 -> 导出图片
      ctx.draw(false, () => {
        setTimeout(() => this.exportImage(), 120);
      });
    },

    // ---------- 画布 -> 临时图片 ----------
    exportImage() {
      uni.canvasToTempFilePath(
        {
          canvasId: 'posterCanvas',
          x: 0,
          y: 0,
          width: W,
          height: H,
          destWidth: W * 2,
          destHeight: H * 2,
          success: (res) => {
            this.posterPath = res.tempFilePath;
            // 海报生成埋点：供成就「妙笔生花 / 广结善缘」判定
            Storage.countFeatureEvent('poster');
            // silent：本页自己用 toast 提示，不能再入队——否则用户点「返回解签」
            // 时结果页会再弹一次同一个成就的弹窗。
            const fresh = Achievement.evaluate({ silent: true });
            if (fresh.length > 0) {
              uni.showToast({ title: `🏆 解锁成就「${fresh[0].name}」`, icon: 'none' });
            }
          },
          fail: (err) => {
            console.error('[海报] 导出失败', err);
            uni.showToast({ title: '海报生成失败，请重试', icon: 'none' });
          },
        },
        this
      );
    },

    // ---------- 保存到相册 ----------
    // 微信端 saveImageToPhotosAlbum 属「隐私接口」，用户未同意《用户隐私保护指引》
    // 前会被静默拦截，因此必须先走 requirePrivacyAuthorize。
    save() {
      if (!this.posterPath) {
        uni.showToast({ title: '海报还未生成完成', icon: 'none' });
        return;
      }

      // #ifdef MP-WEIXIN
      this.saveWithPrivacyCheck();
      // #endif

      // #ifndef MP-WEIXIN
      this.doSave();
      // #endif
    },

    // ---------- 隐私授权（仅微信端） ----------
    saveWithPrivacyCheck() {
      // 低版本基础库无此 API，直接降级保存
      if (typeof uni.requirePrivacyAuthorize !== 'function') {
        this.doSave();
        return;
      }

      uni.requirePrivacyAuthorize({
        success: () => this.doSave(),
        fail: () => {
          uni.showModal({
            title: '需要你的授权',
            content: '保存图片前需先同意《用户隐私保护指引》，是否前往同意？',
            confirmText: '去查看',
            success: (r) => {
              if (r.confirm && typeof uni.openPrivacyContract === 'function') {
                uni.openPrivacyContract({});
              }
            },
          });
        },
      });
    },

    // ---------- 实际保存 ----------
    doSave() {
      uni.saveImageToPhotosAlbum({
        filePath: this.posterPath,
        success: () => uni.showToast({ title: '已保存到相册', icon: 'none' }),
        fail: (err) => {
          console.warn('[海报] 保存失败', err);
          const msg = (err && (err.errMsg || err.message)) || '';

          // 相册权限被拒：引导到设置页重新授权，而不是只让用户长按
          if (msg.includes('auth deny') || msg.includes('auth denied') || msg.includes('authorize')) {
            uni.showModal({
              title: '未开启相册权限',
              content: '保存海报需要「保存到相册」权限，是否前往设置开启？',
              confirmText: '去设置',
              success: (r) => {
                if (r.confirm) uni.openSetting({});
              },
            });
            return;
          }

          // 其他环境（如 H5 无此能力）：降级为长按保存
          uni.showModal({
            title: '提示',
            content: '当前环境不支持直接保存，请长按上方图片保存到相册',
            showCancel: false,
          });
        },
      });
    },
  },
};
</script>

<style scoped>
.poster-box {
  width: 100%;
  border-radius: 24rpx;
  overflow: hidden;
  border: 2rpx solid rgba(212, 160, 23, 0.3);
  background: #1a0a2e;
}
.poster-img { width: 100%; display: block; }
.poster-loading {
  height: 900rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  color: rgba(255, 255, 255, 0.4);
  font-size: 26rpx;
}
/* 离屏画布：移出可视区域，避免遮挡与布局跳动 */
.offscreen-canvas {
  position: fixed;
  left: -9999px;
  top: 0;
  width: 375px;
  height: 500px;
}
</style>
