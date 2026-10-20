// ============================================
// 一键上上签 - 视图模型（纯 HTML/VM 构建器）
// ============================================
// 计划书 §6.5-3：把 app.js 中「拼 HTML 字符串」的展示逻辑抽离出来，
// 使 app.js 只保留 DOM 读写与事件绑定，业务/展示逻辑可独立单测。
//
// 约束：
//   1. 本文件只返回字符串 / 普通对象，绝不触碰 document。
//   2. 输出的 HTML 必须与原 app.js 逐字一致（含缩进与换行），
//      以保证迁移前后视觉零变化。
//
// 依赖：core/levels.js、core/rules.js
// 双出口：浏览器为全局 `ViewModel`；Node/Vitest 用 require 取同一对象。

const __LevelsForVM = (typeof module !== 'undefined' && module.exports)
  ? require('../core/levels.js')
  : LevelsCore;

const __RulesForVM = (typeof module !== 'undefined' && module.exports)
  ? require('../core/rules.js')
  : RulesCore;

const ViewModel = {
  escapeHtml: __RulesForVM.escapeHtml,
  getAvatarEmoji: __RulesForVM.getAvatarEmoji,

  // ========== 解签页：幸运信息 ==========
  buildLuckyHtml(lucky) {
    if (!lucky) return '';
    return `
      <span>🎨 ${__RulesForVM.escapeHtml(lucky.color)}</span>
      <span>🔢 ${__RulesForVM.escapeHtml(lucky.number)}</span>
      <span>🧭 ${__RulesForVM.escapeHtml(lucky.direction)}</span>
    `;
  },

  // 是否存在五维解读（高级签文只有 deepAnalysis，没有 analysis）
  hasAnalysis(analysis) {
    return !!(analysis && Object.keys(analysis).length);
  },

  // ========== 解签页：五维解读卡片列表 ==========
  buildAnalysisListHtml(analysis) {
    if (!this.hasAnalysis(analysis)) return '';
    return Object.entries(analysis).map(([dim, text], idx) => `
      <div class="analysis-card animate-slideUp" style="animation-delay: ${0.1 * idx}s">
        <div class="flex items-center gap-2 mb-1">
          <span class="text-lg">${__LevelsForVM.getDimensionIcon(dim)}</span>
          <span class="text-sm font-bold text-gold-400">${__LevelsForVM.getDimensionName(dim)}</span>
        </div>
        <p class="text-xs text-white/70 leading-relaxed">${__RulesForVM.escapeHtml(text)}</p>
      </div>
    `).join('');
  },

  // ========== 历史记录页：扁平列表 ==========
  buildHistoryListHtml(grouped) {
    const entries = Object.entries(grouped || {});
    let index = 0;

    return entries.map(([, items]) => {
      return items.map(item => {
        const { date, time } = __RulesForVM.splitDateTime(item.createdAt);
        const i = index++;
        return `
    <div class="history-item animate-slideUp" style="animation-delay: ${i * 0.05}s">
      <div class="flex items-center justify-between mb-1">
        <span class="text-xs text-white/50">${__RulesForVM.escapeHtml(date)} ${__RulesForVM.escapeHtml(time)}</span>
        <span class="text-xs px-2 py-0.5 rounded-full ${__LevelsForVM.getLevelClass(item.level)}" style="font-size: 10px;">${__RulesForVM.escapeHtml(item.level)}</span>
      </div>
      <div class="flex items-center gap-2">
        <span class="text-sm font-bold text-white/90">${__RulesForVM.escapeHtml(item.title)}</span>
        <span class="text-xs text-white/40">· ${__RulesForVM.escapeHtml(__LevelsForVM.getSceneName(item.scene))}</span>
      </div>
      <p class="text-xs text-white/50 mt-1 line-clamp-2">${__RulesForVM.escapeHtml((item.poem || '').replace(/\n/g, ' '))}</p>
    </div>
  `;
      }).join('');
    }).join('');
  },

  // ========== 个人主页：按日期分组的抽签历史 ==========
  buildProfileHistoryHtml(grouped, now = new Date()) {
    const entries = Object.entries(grouped || {});

    return entries.map(([dateLabel, records]) => {
      const weekday = __RulesForVM.getWeekdayLabel(dateLabel, now);

      const recordsHtml = records.map((item, idx) => {
        const { time } = __RulesForVM.splitDateTime(item.createdAt);
        return `
      <div class="flex items-center justify-between py-2 px-3 rounded-xl ${idx % 2 === 0 ? 'bg-white/[0.02]' : ''}">
        <div class="flex items-center gap-2 min-w-0">
          <span class="inline-block w-1.5 h-1.5 rounded-full flex-shrink-0" style="background: ${__LevelsForVM.getLevelColor(item.level)}"></span>
          <span class="text-sm text-white/80 truncate">${__RulesForVM.escapeHtml(item.title)}</span>
          <span class="text-xs text-white/30 flex-shrink-0">${__RulesForVM.escapeHtml(time)}</span>
        </div>
        <span class="text-xs px-2 py-0.5 rounded-full ${__LevelsForVM.getLevelClass(item.level)} flex-shrink-0 ml-2" style="font-size: 10px;">${__RulesForVM.escapeHtml(item.level)}</span>
      </div>
    `;
      }).join('');

      return `
      <div class="profile-date-group">
        <div class="flex items-center gap-2 mb-2 px-1">
          <span class="text-xs font-bold text-gold-400">${dateLabel}</span>
          <span class="text-xs text-white/30">${weekday}</span>
          <span class="flex-1 h-px bg-white/10"></span>
          <span class="text-xs text-white/30">${records.length}签</span>
        </div>
        <div class="space-y-0.5">
          ${recordsHtml}
        </div>
      </div>
    `;
    }).join('');
  },
};

// 双出口：浏览器（经典脚本）走全局词法绑定，Node/Vitest 走 CommonJS。
if (typeof module !== 'undefined' && module.exports) {
  module.exports = ViewModel;
}
