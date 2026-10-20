// ============================================
// 经典脚本约束测试（计划书 §6.5-5 补充）
// ============================================
// 本项目坚持「零打包器、零运行时依赖」：所有 js 通过 <script> 顺序装载，
// 彼此靠全局词法绑定协作。这套隐式约定一旦被破坏，线上会直接白屏且难以定位：
//   1. 误用 ESM 语法（import/export）→ 经典 <script> 装载 SyntaxError；
//   2. 共享模块漏写双出口 footer → Node 侧 require 拿不到，单测失效；
//   3. core 层混入平台 API → 无法「零改动」迁移到小程序。
//
// 本文件把这些约定固化为可回归的断言，与 smoke.test.js（运行期冒烟）
// 互补，形成「静态约束 + 运行期行为」双重防线。

import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(fileURLToPath(new URL('..', import.meta.url)));
const readText = (rel) => fs.readFileSync(path.join(ROOT, rel), 'utf8');

function collectJsFiles(dir) {
  const out = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, entry.name);
    if (entry.isDirectory()) out.push(...collectJsFiles(p));
    else if (entry.name.endsWith('.js')) out.push(p);
  }
  return out;
}

// 去掉注释后再做关键词检查，避免注释里的 "uni.scss" 等误报
function stripComments(code) {
  return code
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/(^|[^:])\/\/.*$/gm, '$1');
}

const JS_FILES = collectJsFiles(path.join(ROOT, 'js')).map((p) => ({
  rel: path.relative(ROOT, p).replace(/\\/g, '/'),
  text: fs.readFileSync(p, 'utf8'),
}));

// 需要「浏览器 + Node 双出口」的共享模块
const DUAL_EXPORT_FILES = [
  'js/core/tokens.js',
  'js/core/levels.js',
  'js/core/rules.js',
  'js/core/fortunes.js',
  'js/core/lottery.js',
  'js/adapter/storage.js',
  'js/ui/view-model.js',
];

// 必须保持平台无关（可零改动迁移到小程序）的纯逻辑层
const PLATFORM_FREE_FILES = [
  'js/core/tokens.js',
  'js/core/levels.js',
  'js/core/rules.js',
  'js/core/fortunes.js',
  'js/core/lottery.js',
];

describe('经典脚本约束：无打包器 / 无 ESM', () => {
  it('js/ 下所有脚本均不含 ESM import / export（否则 <script> 装载会 SyntaxError）', () => {
    expect(JS_FILES.length).toBeGreaterThan(10);
    for (const { rel, text } of JS_FILES) {
      expect(text, rel).not.toMatch(/^\s*import\s/m);
      expect(text, rel).not.toMatch(/^\s*export\s/m);
    }
  });

  it('共享模块均带双出口 footer（浏览器全局 + Node module.exports）', () => {
    for (const rel of DUAL_EXPORT_FILES) {
      const text = readText(rel);
      expect(text, `${rel} 缺少双出口守卫`).toMatch(
        /if \(typeof module !== 'undefined' && module\.exports\) \{[\s\S]*?module\.exports = [\s\S]*?\}/
      );
    }
  });

  it('核心层保持平台无关（不引用 document / window / localStorage / wx / uni）', () => {
    for (const rel of PLATFORM_FREE_FILES) {
      const code = stripComments(readText(rel));
      expect(code, `${rel} 引用了 document`).not.toMatch(/\bdocument\b/);
      expect(code, `${rel} 引用了 window`).not.toMatch(/\bwindow\b/);
      expect(code, `${rel} 引用了 localStorage`).not.toMatch(/\blocalStorage\b/);
      expect(code, `${rel} 引用了 wx.`).not.toMatch(/\bwx\./);
      expect(code, `${rel} 引用了 uni.`).not.toMatch(/\buni\./);
    }
  });
});

describe('index.html 装载契约', () => {
  const html = readText('index.html');
  const order = [...html.matchAll(/<script\s+src="([^"]+)"/g)].map((m) => m[1]);
  const idx = (rel) => order.indexOf(rel);

  it('引用到的脚本/样式文件全部真实存在', () => {
    const refs = [
      ...order,
      ...[...html.matchAll(/<link\s+rel="stylesheet"\s+href="([^"]+)"/g)].map((m) => m[1]),
    ];
    expect(refs.length).toBeGreaterThan(10);
    for (const rel of refs) {
      expect(fs.existsSync(path.join(ROOT, rel)), `缺少文件 ${rel}`).toBe(true);
    }
  });

  it('core / adapter / ui 均排在业务门面之前（依赖先行）', () => {
    expect(idx('js/core/levels.js')).toBeLessThan(idx('js/core/rules.js'));
    expect(idx('js/core/rules.js')).toBeLessThan(idx('js/core/lottery.js'));
    expect(idx('js/core/lottery.js')).toBeLessThan(idx('js/adapter/storage.js'));
    expect(idx('js/adapter/storage.js')).toBeLessThan(idx('js/ui/view-model.js'));
    // ui 层在依赖它的业务门面之前
    expect(idx('js/ui/view-model.js')).toBeLessThan(idx('js/storage.js'));
    expect(idx('js/ui/view-model.js')).toBeLessThan(idx('js/lottery.js'));
  });

  it('app.js 必须最后装载（负责 init 与事件绑定）', () => {
    expect(order[order.length - 1]).toBe('js/app.js');
  });
});
