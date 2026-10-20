// ============================================
// 构建产物一致性测试
// ============================================
// 目的：防止「改了 HTML/JS 里的 class 但忘记重新构建 Tailwind」这一类回归
// （本项目历史上就因此出现过按钮样式失效的问题）。
//
// 做法：把 index.html 与 js/ 下所有文件中真正用到的 class 全部抽出来，
// 逐一确认它们存在于 css/tailwind.css（Tailwind 工具类）或 css/style.css（自定义类）
// 之中。任何一个都不允许凭空消失。
//
// 注意：本测试读取的是构建产物，若失败请先执行 `npm run build:css`。

import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(fileURLToPath(new URL('..', import.meta.url)));
const readText = (rel) => fs.readFileSync(path.join(ROOT, rel), 'utf8');

const tailwindCss = readText('css/tailwind.css');
const styleCss = readText('css/style.css');
const html = readText('index.html');

function collectJsFiles(dir) {
  const out = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, entry.name);
    if (entry.isDirectory()) out.push(...collectJsFiles(p));
    else if (entry.name.endsWith('.js')) out.push(p);
  }
  return out;
}

// ---------- 类名抽取 ----------
function extractClassTokens(source) {
  const tokens = [];

  // class="..." / className = '...' / className = `...`
  const attrRe = /class(?:Name)?\s*=\s*(?:"([^"]*)"|'([^']*)'|`([^`]*)`)/g;
  let m;
  while ((m = attrRe.exec(source)) !== null) {
    tokens.push(...(m[1] ?? m[2] ?? m[3] ?? '').split(/\s+/));
  }

  // classList.add/remove/toggle('x')
  const listRe = /classList\.(?:add|remove|toggle)\(\s*(?:"([^"]*)"|'([^']*)')/g;
  while ((m = listRe.exec(source)) !== null) {
    tokens.push(...(m[1] ?? m[2] ?? '').split(/\s+/));
  }

  return tokens;
}

// 排除明显不是类名的片段（模板表达式、URL、纯数字、三元运算符残留等）
function isCandidateClass(token) {
  if (!token) return false;
  if (/[$`{}()=<>"'#%]/.test(token)) return false;
  // 类名必须以字母或 - 开头；这样可排除模板字符串里拆出来的 ":" "?" 等运算符
  if (!/^[a-zA-Z-]/.test(token)) return false;
  if (/^https?:/.test(token)) return false;
  if (/\.(js|css|html|json|png|jpe?g|svg)$/i.test(token)) return false;
  return true;
}

// 有意为之的例外：这些类名只作 DOM 标识使用，本身没有 CSS 规则。
// stick-1 ~ stick-5 标记签筒里每一根签，倾斜角度由行内 style 直接设置。
const KNOWN_UNSTYLED_CLASSES = new Set([
  'stick-1', 'stick-2', 'stick-3', 'stick-4', 'stick-5',
]);

// Tailwind 在 CSS 选择器中会把特殊字符做转义，这里按同样的规则还原
function toCssSelector(cls) {
  return '.' + cls.replace(/[!:/.[\]%(),#]/g, (ch) => '\\' + ch);
}

function isDefinedInCss(cls) {
  const escaped = toCssSelector(cls);
  if (tailwindCss.includes(escaped)) return true;
  if (styleCss.includes(escaped)) return true;
  // 少数不含特殊字符的类名可能以未转义形式出现
  if (tailwindCss.includes('.' + cls)) return true;
  if (styleCss.includes('.' + cls)) return true;
  return false;
}

const allSources = [
  { name: 'index.html', text: html },
  ...collectJsFiles(path.join(ROOT, 'js')).map((p) => ({
    name: path.relative(ROOT, p).replace(/\\/g, '/'),
    text: fs.readFileSync(p, 'utf8'),
  })),
];

const usedClasses = new Set();
for (const { text } of allSources) {
  // 对于 JS 源码，先把 Windows 路径等噪声排除在外
  for (const token of extractClassTokens(text)) {
    if (isCandidateClass(token)) usedClasses.add(token);
  }
}

describe('构建产物一致性（改 class 后必须 npm run build:css）', () => {
  it('抽取到的候选类名数量合理（防止抽取逻辑失效）', () => {
    expect(usedClasses.size).toBeGreaterThan(80);
  });

  it('index.html / js 中用到的每个 class 都存在于 tailwind.css 或 style.css', () => {
    const missing = [...usedClasses]
      .filter((cls) => !KNOWN_UNSTYLED_CLASSES.has(cls))
      .filter((cls) => !isDefinedInCss(cls))
      .sort();
    expect(missing, `以下 class 未出现在构建产物中，请执行 npm run build:css：\n${missing.join('\n')}`)
      .toEqual([]);
  });

  it('ui/view-model.js 输出的关键工具类全部已编译', () => {
    const critical = [
      // 历史记录卡片
      'animate-slideUp', 'text-xs', 'text-white/50', 'px-2', 'py-0.5',
      'rounded-full', 'flex', 'items-center', 'justify-between', 'mb-1',
      'gap-2', 'text-sm', 'font-bold', 'text-white/90', 'text-white/40',
      'mt-1', 'line-clamp-2',
      // 个人主页分组
      'py-2', 'px-3', 'rounded-xl', 'bg-white/[0.02]', 'min-w-0', 'w-1.5',
      'h-1.5', 'flex-shrink-0', 'text-white/80', 'truncate', 'text-white/30',
      'ml-2', 'mb-2', 'px-1', 'text-gold-400', 'flex-1', 'h-px', 'bg-white/10',
      'space-y-0.5',
      // 五维解读卡片
      'text-lg', 'text-white/70', 'leading-relaxed',
    ];
    const missing = critical.filter((cls) => !isDefinedInCss(cls));
    expect(missing, `缺失工具类：${missing.join(', ')}`).toEqual([]);
  });

  it('自定义语义类仍由 style.css 提供', () => {
    const semantic = [
      'history-item', 'profile-date-group', 'analysis-card',
      'level-上上签', 'level-上吉签', 'level-中平签', 'level-蓄力签', 'level-下吉签',
    ];
    const missing = semantic.filter((cls) => !styleCss.includes('.' + cls));
    expect(missing, `style.css 缺失：${missing.join(', ')}`).toEqual([]);
  });

  it('设计令牌 CSS 变量与 js/core/tokens.js 对应', () => {
    const tokensCss = readText('css/tokens.css');
    const requiredVars = [
      '--color-gold-500',
      '--color-fortune-red',
      '--color-bg-deep',
      '--radius-2xl',
      '--font-size-sm',
      '--space-1-5',
    ];
    const missing = requiredVars.filter((v) => !tokensCss.includes(v + ':'));
    expect(missing, `tokens.css 缺失变量：${missing.join(', ')}`).toEqual([]);

    const tokensJs = readText('js/core/tokens.js');
    expect(tokensJs).toContain('#FFC107');
    expect(tokensJs).toContain('#C41E3A');
  });
});
