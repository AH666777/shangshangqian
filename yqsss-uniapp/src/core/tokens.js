// ============================================
// 一键上上签 - 设计令牌（Design Tokens）
// ============================================
// 计划书 §6.5-6：建立设计令牌（颜色/字号/间距）清单。
//
// 本文件是「颜色 / 字体 / 圆角 / 字号 / 间距」的单一数据源：
//   - 浏览器：经典 <script> 装载后可作为全局 `TokensCore` 直接引用；
//   - Node / Vitest：`require('./tokens.js')` 取到同一对象；
//   - 小程序迁移：本文件可直接映射为 uni.scss 变量表；
//   - CSS 侧清单见 css/tokens.css（与本文件一一对应）。
//
// 约束：本文件不引用任何平台 API（无 document / wx / uni），保持平台无关。
// 值严格取自 tailwind.config.js 与 css/style.css，不得擅自改动。

const TokensCore = {
  colors: {
    // ---------- 品牌金（对应 Tailwind gold-50 ~ gold-900） ----------
    gold50: '#FFF9E6',
    gold100: '#FFF3CC',
    gold200: '#FFE799',
    gold300: '#FFDB66',
    gold400: '#FFD133',
    gold500: '#FFC107',
    gold600: '#D4A005',
    gold700: '#A87F04',
    gold800: '#7C5E03',
    gold900: '#503C02',

    // ---------- 签文等级主色（对应 Tailwind fortune-*） ----------
    fortuneRed: '#C41E3A',
    fortuneGold: '#D4A017',
    fortuneGreen: '#2E7D32',
    fortuneBlue: '#1565C0',
    fortunePurple: '#7B1FA2',

    // ---------- 等级徽章渐变端点与文字色（对应 style.css .level-*） ----------
    levelTopGradientStart: '#FF6B35',
    levelTopGradientEnd: '#C41E3A',
    levelTopText: '#FFE0B2',
    levelGoodGradientStart: '#D4A017',
    levelGoodGradientEnd: '#FF8F00',
    levelGoodText: '#FFF8E1',
    levelMidGradientStart: '#2E7D32',
    levelMidGradientEnd: '#4CAF50',
    levelMidText: '#E8F5E9',
    levelLowGradientStart: '#1565C0',
    levelLowGradientEnd: '#42A5F5',
    levelLowText: '#E3F2FD',
    levelFallback: '#666666',

    // ---------- 页面背景（index.html body / 海报 / 弹窗） ----------
    bgDeep: '#1a0a2e',
    bgMid: '#2d1b4e',
    bgDeepest: '#0d0517',

    // ---------- 签筒 ----------
    barrelTop: '#8B4513',
    barrelMid: '#A0522D',
    barrelBottom: '#6B3410',
    barrelBorder: '#5C2D0E',
    stickA: '#F5DEB3',
    stickB: '#FAEBD7',

    // ---------- 中性色 ----------
    white: '#FFFFFF',
    black: '#000000',
  },

  // ---------- 字体（对应 Tailwind fontFamily.brush / fontFamily.display） ----------
  fonts: {
    brush: '"STKaiti", "KaiTi", "楷体", serif',
    display: '"PingFang SC", "Hiragino Sans GB", "Microsoft YaHei", sans-serif',
  },

  // ---------- 圆角（px 值供小程序 rpx 换算：1px = 2rpx） ----------
  radius: {
    sm: '0.125rem',
    md: '0.375rem',
    lg: '0.5rem',
    xl: '0.75rem',
    '2xl': '1rem',
    '3xl': '1.5rem',
    full: '9999px',
  },

  // ---------- 字号 ----------
  fontSize: {
    xs: '0.75rem',
    sm: '0.875rem',
    base: '1rem',
    lg: '1.125rem',
    xl: '1.25rem',
    '2xl': '1.5rem',
    '4xl': '2.25rem',
  },

  // ---------- 间距 ----------
  spacing: {
    '0.5': '0.125rem',
    '1': '0.25rem',
    '1.5': '0.375rem',
    '2': '0.5rem',
    '3': '0.75rem',
    '4': '1rem',
    '6': '1.5rem',
    '8': '2rem',
  },
};

// uni-app（ESM）出口：打包器直接 import 本模块。逻辑与原经典脚本版完全一致。
export default TokensCore;
