// ============================================
// 一键上上签 - 纯规则函数（平台无关）
// ============================================
// 计划书 §6.5-1 / §6.5-4：把抽签规则的业务逻辑收敛为纯函数，
// 不依赖 Storage / Auth / DOM，便于单测与迁移到小程序。
//
// 本文件所有函数均为「输入 -> 输出」纯函数（随机数可注入，便于确定性测试）。
//
// 双出口：浏览器为全局 `RulesCore`；Node/Vitest 用 require 取同一对象。

const RulesCore = {
  // ---------- 业务常量（原散落在 storage.js / lottery.js 中） ----------
  DEFAULT_DAILY_LIMIT: 3,      // 默认每日免费次数
  UNLIMITED_DAILY_LIMIT: 999,  // 解锁「无限抽签」后的次数上限
  PREMIUM_PROBABILITY: 5,      // 高级签文进入签池时的出现权重

  WEEKDAY_LABELS: ['周日', '周一', '周二', '周三', '周四', '周五', '周六'],

  // ========== 安全 ==========
  // HTML 转义。历史记录等数据来自本地存储，可能被外部脚本篡改，
  // 凡拼进 innerHTML 的动态文本都必须先转义，避免 XSS。
  escapeHtml(value) {
    return String(value == null ? '' : value)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  },

  // ========== 日期工具 ==========
  // 本地日期（YYYY-MM-DD）。不使用 toISOString()：那是 UTC，跨时区会偏移。
  dateKey(date = new Date()) {
    const d = date instanceof Date ? date : new Date(date);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  },

  // 本地时间戳（YYYY-MM-DDTHH:mm:ss）
  localISO(date = new Date()) {
    const d = date instanceof Date ? date : new Date(date);
    const p = (n) => String(n).padStart(2, '0');
    return `${this.dateKey(d)}T${p(d.getHours())}:${p(d.getMinutes())}:${p(d.getSeconds())}`;
  },

  // 以 YYYY-MM-DD 为基准偏移若干天，返回新的 YYYY-MM-DD
  shiftDateKey(dateKey, deltaDays) {
    const d = new Date(`${dateKey}T00:00:00`);
    d.setDate(d.getDate() + deltaDays);
    return this.dateKey(d);
  },

  // 拆出 { date, time }，time 截取到 HH:mm
  splitDateTime(createdAt) {
    const s = createdAt || '';
    const parts = s.split('T');
    return {
      date: parts[0] || '',
      time: parts[1] ? parts[1].substring(0, 5) : '',
    };
  },

  // 分组标签 -> 星期文案
  getWeekdayLabel(dateLabel, now = new Date()) {
    if (dateLabel !== '今天' && dateLabel !== '昨天') {
      return this.WEEKDAY_LABELS[new Date(dateLabel).getDay()];
    }
    const d = new Date(now.getTime());
    if (dateLabel === '昨天') d.setDate(d.getDate() - 1);
    return this.WEEKDAY_LABELS[d.getDay()];
  },

  // ========== 头像 ==========
  getAvatarEmoji(name) {
    const emojis = ['😊', '🌟', '🎯', '💫', '🍀', '🌈', '🦊', '🐼', '🐱', '🦁', '🐯', '🐻', '🐰', '🐨', '🐵'];
    const s = name || '';
    let hash = 0;
    for (let i = 0; i < s.length; i++) {
      hash = s.charCodeAt(i) + ((hash << 5) - hash);
    }
    return emojis[Math.abs(hash) % emojis.length];
  },

  // ========== 加权随机算法 ==========
  // rng 可注入（默认 Math.random），便于单测构造确定性序列。
  weightedRandom(items, probKey = 'probability', rng = Math.random) {
    const totalWeight = items.reduce((sum, item) => sum + item[probKey], 0);
    let random = rng() * totalWeight;
    for (const item of items) {
      if (random < item[probKey]) return item;
      random -= item[probKey];
    }
    return items[0];
  },

  // ========== 签文池构建 ==========
  // 场景匹配的通用签文 + 场景专属签文 + （已解锁时）高级签文池
  buildFortunePool(options) {
    const {
      scene,
      fortunes = [],
      sceneFortunes = {},
      premiumFortunes = [],
      premiumUnlocked = false,
      premiumProbability = this.PREMIUM_PROBABILITY,
    } = options || {};

    const pool = [];

    fortunes.forEach(f => {
      if (f.scenes && f.scenes.includes(scene)) {
        pool.push(f);
      }
    });

    if (sceneFortunes[scene]) {
      sceneFortunes[scene].forEach(f => {
        pool.push(f);
      });
    }

    if (premiumUnlocked) {
      premiumFortunes.forEach(f => {
        pool.push({ ...f, probability: premiumProbability });
      });
    }

    return pool;
  },

  // ========== 每日次数 ==========
  // 优先级：后台下发设置 > 无限抽签权益 > 默认值
  getDailyLimit(options) {
    const {
      setting = null,
      unlimitedUnlocked = false,
      defaultLimit = this.DEFAULT_DAILY_LIMIT,
      unlimitedLimit = this.UNLIMITED_DAILY_LIMIT,
    } = options || {};

    if (setting && setting.daily_limit) return setting.daily_limit;
    if (unlimitedUnlocked) return unlimitedLimit;
    return defaultLimit;
  },

  getRemainingDraws(limit, count) {
    return Math.max(0, limit - count);
  },

  canDraw(remainingDraws) {
    return remainingDraws > 0;
  },

  // 今日记录自增（纯函数，返回新对象，不修改入参）
  incrementTodayCount(record, today) {
    if (record && record.date === today) {
      return { record: { date: today, count: record.count + 1 }, count: record.count + 1 };
    }
    return { record: { date: today, count: 1 }, count: 1 };
  },

  // 读取今日有效计数
  getTodayCount(record, today) {
    return record && record.date === today ? record.count : 0;
  },

  // ========== 历史记录 ==========
  // 构造一条待落盘的抽签记录
  buildRecord(fortune, scene, createdAt) {
    return {
      fortuneId: fortune.id || fortune.fortuneId || 0,
      level: fortune.level,
      title: fortune.title,
      poem: fortune.poem || '',
      scene: scene || 'daily',
      createdAt: createdAt || this.localISO(),
    };
  },

  // 把落盘记录归一化为展示用记录（兼容后端 snake_case）
  normalizeRecord(r) {
    return {
      fortuneId: r.fortune_id || r.fortuneId || 0,
      level: r.level,
      title: r.title,
      poem: r.poem || '',
      scene: r.scene || 'daily',
      createdAt: r.created_at || r.createdAt,
    };
  },

  // 按日期分组并排序：今天 → 昨天 → 更早日期（倒序）
  groupByDate(records, today, yesterday) {
    const groups = {};

    (records || []).forEach(r => {
      const date = (r.created_at || r.createdAt || '').split('T')[0];
      let label;
      if (date === today) label = '今天';
      else if (date === yesterday) label = '昨天';
      else label = date;

      if (!groups[label]) groups[label] = [];
      groups[label].push(this.normalizeRecord(r));
    });

    const sortKey = (label) => {
      if (label === '今天') return '9999-99-99';
      if (label === '昨天') return '9999-99-98';
      return label;
    };

    return Object.keys(groups)
      .sort((a, b) => sortKey(b).localeCompare(sortKey(a)))
      .reduce((acc, key) => {
        acc[key] = groups[key];
        return acc;
      }, {});
  },

  // ========== 深度解签文案 ==========
  // 高级签文自带 deepAnalysis；普通签文由五维解读 + 幸运信息组合生成，
  // 保证「看广告解锁深度解签」对每一种签文都有实际内容。
  // 注意：sceneName 由调用方传入（本函数不依赖 LevelsCore）。
  buildDeepAnalysis(fortune, sceneName) {
    if (!fortune) return '';
    if (fortune.deepAnalysis) return fortune.deepAnalysis;

    const a = fortune.analysis || {};
    const lucky = fortune.lucky || {};

    const parts = [];
    // 合规（计划书 §1.6）：「求签」属仪式化/宗教化表述，改为中性的「抽签」。
    parts.push(`「${fortune.title}」为一支${fortune.level}，本次抽签场景为${sceneName}。签诗云：${String(fortune.poem || '').replace(/\n/g, '，')}`);

    const dims = [
      ['career', '事业'],
      ['study', '学业'],
      ['wealth', '财运'],
      ['health', '健康'],
      ['love', '情感'],
    ];
    const summary = dims
      .filter(([key]) => a[key])
      .map(([key, label]) => `${label}方面，${a[key]}`)
      .join(' ');
    // 合规：原「综合五行运势」含命理术语（五行），改为中性表述。
    if (summary) parts.push(`综合提示：${summary}`);

    parts.push(
      `行动指引：参考幸运方位「${lucky.direction || '顺其自然'}」，多使用幸运色「${lucky.color || '金色'}」，` +
      `幸运数字为「${lucky.number || '8'}」。顺境时不骄不躁、把好运沉淀为长期积累，` +
      `逆境时稳扎稳打、静待时机，才能让这支签的提醒真正落地。`
    );

    return parts.join('\n\n');
  },

  // 五维解读 -> 有序数组（供渲染层使用）
  buildAnalysisItems(analysis) {
    if (!analysis) return [];
    return Object.entries(analysis).map(([dim, text], index) => ({ dim, text, index }));
  },
};

// uni-app（ESM）出口。
export default RulesCore;
