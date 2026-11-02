# 🏮 一键上上签

> 一个零后端、即开即用的国风抽签小游戏 H5。摇一摇签筒，抽一支属于你的上上签。
>
> 项目标识：`shangshangqian`　|　中文品牌：一键上上签
>
> 多端版本（uni-app / 微信小程序）与项目总览见 [根目录 README](../README.md)。

[![Status](https://img.shields.io/badge/status-ready--to--deploy-brightgreen)]()
[![HTML5](https://img.shields.io/badge/HTML5-E34F26?logo=html5&logoColor=white)]()
[![JavaScript](https://img.shields.io/badge/JavaScript-Vanilla-F7DF1E?logo=javascript&logoColor=black)]()
[![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-3.4-38B2AC?logo=tailwindcss&logoColor=white)]()
[![License](https://img.shields.io/badge/license-MIT-blue)]()

---

## 📖 项目简介

「一键上上签」是一款**纯前端**的国风抽签小游戏。用户选择抽签场景（日常好运 / 考试通关 / 开工大吉 / 节日祈福），摇动签筒或点击抽签，即可获得一支带完整解签的签文，并可一键生成精美海报分享。

项目遵循 **零依赖运行时、零后端、零构建步骤** 的极简原则：

- 数据全部存于浏览器 `LocalStorage`，无需服务器与数据库即可完整运行
- 源码即产物，双击 `index.html` 即可本地预览，也可以直接部署到任意静态托管

> **适用场景**：节日互动营销、社交裂变拉新、个人娱乐小工具、国风主题活动的 H5 落地页。

---

## ✨ 功能特性

| 模块 | 功能 | 状态 |
| --- | --- | --- |
| 🎲 **抽签** | 四大抽签场景切换（日常 / 考试 / 开工 / 节日） | ✅ 已完成 |
| | 60 支签文（通用 42 + 场景专属 12 + 高级 6） | ✅ 已完成 |
| | 加权随机 + 场景签优先（无场景专属签时自动回退通用库） | ✅ 已完成 |
| | 摇一摇抽签（`DeviceMotion`，iOS 13+ 手势授权） | ✅ 已完成 |
| | 点击签筒抽签（无重力感应设备的兜底方案） | ✅ 已完成 |
| | 签筒摇动动画 + 撒花粒子特效 | ✅ 已完成 |
| 📜 **解签** | 五维提示详解（事业 / 学业 / 财运 / 健康 / 情感） | ✅ 已完成 |
| | 🔮 深度解签（看广告解锁，普通签与高级签均有内容） | ✅ 已完成 |
| | 幸运色 / 幸运数字 / 有利方位 | ✅ 已完成 |
| 🖼️ **海报** | 一键生成 3:4 精美签文海报（`html2canvas`，**按需加载**） | ✅ 已完成 |
| | 保存链路：系统分享 → 长按保存（微信 / iOS） → 直接下载 | ✅ 已完成 |
| 👤 **用户** | 昵称登录 / 登出，同名昵称自动复用同一身份 | ✅ 已完成 |
| | 个人中心（累计抽签 / 今日抽签 / 抽签天数） | ✅ 已完成 |
| 📜 **历史** | 历史签文记录，按「今天 / 昨天 / 日期」倒序分组，最多 500 条 | ✅ 已完成 |
| 💰 **商业化** | 每日免费 3 次 + 看广告得额外次数 | ✅ 已完成 |
| | 看广告解锁高级签文库 / 无限抽签（首页「好运加成」卡片） | ✅ 已完成 |
| 🔌 **广告 SDK** | Mock 模式可直接演示；微信 / H5 原生广告留好接入点，未接入时**自动回退 Mock** | ✅ 已完成 |
| 📱 **PWA** | Web App Manifest + 独立窗口启动 | ⚠️ 仅 Manifest，未接入 Service Worker |
| 🗄️ **会员后端** | Supabase Schema 已备好（`supabase_schema.sql`） | ⏸️ 预留未接入 |

---

## 🛠️ 技术栈

| 层次 | 选型 | 说明 |
| --- | --- | --- |
| 结构 | 原生 HTML5 | 单页 6 大区块（`page-home` / `shake` / `result` / `poster` / `history` / `profile`） |
| 样式 | Tailwind CSS 3.4（CLI 构建） | 自定义国风主题写在 `tailwind.config.js` |
| 交互 | 原生 JavaScript（ES6+，无框架） | 全局对象式模块拆分，无需打包器 |
| 存储 | LocalStorage | 用 try/catch 封装，降级访问不报错 |
| 绘图 | html2canvas 1.4.1 | **点击「保存海报」时才动态加载**，三 CDN 兜底 |
| 后端 | 无（可选 Supabase） | 会员系统 Schema 已就绪 |

> **为什么不用框架？** 项目目标是「一个文件丢上去就能跑」。无构建、无依赖、无运行时，也让首屏体积和心智负担降到最低。

---

## 📁 项目结构

```
yqsss/
├── index.html                  # 唯一入口：6 个页面区块 + 弹窗（登录 / 抽签中 / Toast）
├── manifest.json               # PWA 清单（图标指向 assets/icon.svg）
├── robots.txt                  # 允许全站抓取
├── vercel.json                 # Vercel 部署配置（纯静态 + SPA 回退）
├── .vercelignore               # 部署忽略清单（构建配置、README、SQL 不对外暴露）
├── .gitignore
├── package.json                # 仅 devDependencies（Tailwind + Vitest），无运行时依赖
├── package-lock.json
├── tailwind.config.js          # 主题：国风配色 / 字体 / 动画
├── supabase_schema.sql         # 会员系统建表脚本（预留，当前未接入）
│
├── css/
│   ├── tailwind-input.css      # Tailwind 源文件（@tailwind 指令）
│   ├── tailwind.css            # 构建产物（勿手工修改）
│   └── style.css               # 自定义样式 + 关键帧动画（shake / stickShake / particle）
│
├── js/
│   ├── core/                   # 纯逻辑层（平台无关，可零改动迁移到小程序）
│   │   ├── tokens.js           # 设计令牌（颜色 / 字体 / 圆角 / 字号 / 间距）
│   │   ├── levels.js           # 等级映射 / 场景 / 维度元数据
│   │   ├── rules.js            # 纯规则：加权随机、次数限制、日期工具、深度解签文案
│   │   ├── fortunes.js         # 签文库：FORTUNES / SCENE_FORTUNES / PREMIUM_FORTUNES
│   │   └── lottery.js          # 抽签核心：签池构建 + 纯函数 draw()（不落盘）
│   ├── adapter/
│   │   └── storage.js          # 存储适配器：get/set/remove，LocalStorage 仅一种后端实现
│   ├── ui/
│   │   └── view-model.js       # 视图模型：拼 HTML 字符串（纯函数，不触碰 document）
│   ├── auth.js                 # 用户模块：登录注册、统计、跨天重置
│   ├── storage.js              # 存储门面：次数限制、历史记录、权益解锁（走 adapter）
│   ├── lottery.js              # 抽签门面：注入签文库与次数，转发 core/lottery.js
│   ├── poster.js               # 海报模块：DOM 渲染、按需加载 html2canvas、保存/分享
│   ├── ad.js                   # 广告 SDK：Mock 演示 + 微信/H5 接入点（未接入自动回退）
│   └── app.js                  # 主控：路由、事件绑定、页面渲染、全局错误处理
│
├── tests/                      # Vitest 自动化测试（npm test）
│   ├── core.test.js            # core 层纯逻辑单测（令牌/等级/规则/抽签/存储/视图模型）
│   ├── smoke.test.js           # 经典脚本冒烟：node:vm 按 index.html 顺序装载并跑通全链路
│   ├── classic-script.test.js  # 经典脚本静态约束：无 ESM、双出口 footer、core 层平台无关
│   └── build.test.js           # 构建产物一致性：class ↔ tailwind.css / style.css
│
└── assets/
    └── icon.svg                # PWA 应用图标（内置调色板为矢量图）
```

**样式与脚本加载顺序**（严格依赖，改动需谨慎）：

```html
<!-- <head> -->
<link rel="stylesheet" href="css/tailwind.css">   <!-- 1. Tailwind 工具类（构建产物） -->
<link rel="stylesheet" href="css/tokens.css">     <!-- 2. 设计令牌 CSS 变量 -->
<link rel="stylesheet" href="css/style.css">      <!-- 3. 自定义样式（可覆盖工具类） -->

<!-- </body> 前 -->
<script src="js/core/tokens.js"></script>        <!-- 设计令牌（无依赖） -->
<script src="js/core/levels.js"></script>        <!-- 等级映射（依赖 tokens） -->
<script src="js/core/rules.js"></script>         <!-- 纯规则（无依赖） -->
<script src="js/core/fortunes.js"></script>      <!-- 签文库（无依赖） -->
<script src="js/core/lottery.js"></script>       <!-- 抽签核心（依赖 levels/rules） -->
<script src="js/adapter/storage.js"></script>    <!-- 存储适配器（无依赖） -->
<script src="js/ui/view-model.js"></script>      <!-- 视图模型（依赖 levels/rules） -->
<script src="js/auth.js"></script>               <!-- 用户模块（依赖 storage 适配器） -->
<script src="js/storage.js"></script>            <!-- 存储门面（依赖 auth / 适配器 / rules） -->
<script src="js/lottery.js"></script>            <!-- 抽签门面（依赖 core 层 / storage） -->
<script src="js/poster.js"></script>             <!-- 海报模块（依赖 lottery） -->
<script src="js/ad.js"></script>                 <!-- 广告 SDK（依赖 storage） -->
<script src="js/app.js"></script>                <!-- 主控：最后加载，负责 init() 与事件绑定 -->
```

> 脚本顺序是**硬依赖**（经典脚本靠全局词法绑定互相引用），已被 `tests/smoke.test.js`
> 与 `tests/classic-script.test.js` 固化为回归断言：顺序错误或误用 ESM 语法都会在 CI 中失败。

> `html2canvas` **不在** HTML 中引入，`Poster._loadLib()` 会在用户首次保存海报时按序尝试 jsDelivr → unpkg → cdnjs。

---

## 🚀 快速开始

### 方式一：直接打开（最快）

```bash
# 克隆或下载项目后
cd yqsss
# 直接双击 index.html 即可
# 或使用任意静态服务器（推荐，避免 file:// 限制）
npx serve -p 5173
```

> ⚠️ 部分浏览器在 `file://` 协议下会限制 `LocalStorage` 与 `devicemotion`。**推荐用本地服务器**调试。

### 方式二：构建样式（修改了 Tailwind 配置或类名后）

```bash
cd yqsss
npm install          # 仅安装 tailwindcss 开发依赖

npm run build:css    # 一次性构建（压缩输出）
npm run watch:css    # 开发模式：监听文件变化并自动重建
```

> **务必在改动 `index.html` 的类名或 `tailwind.config.js` 之后重新构建**，否则新增的样式类不会出现在 `css/tailwind.css` 中。

### 环境要求

| 项目 | 要求 |
| --- | --- |
| 浏览器 | Chrome / Edge / Safari / Firefox 近两年版本 |
| 本地服务器 | 任意静态服务器（`npx serve`、`python -m http.server` 均可） |
| 构建环境 | Node.js ≥ 14（仅在需要重新构建 Tailwind 时使用） |

---

## 📱 使用方法

### 1. 抽一支签

1. 首页选择抽签场景：**💫 日常好运 / 📚 考试通关 / 💼 开工大吉 / 🎊 节日祈福**
2. 点击「🎋 摇一支好运签」进入摇签页
3. **两种抽签方式**：
   - 📱 **摇一摇**：手持手机左右晃动（总重力加速度 > 15，2 秒防抖）
   - 👆 **点击签筒**：无重力感应设备时的兜底方式
4. 自动跳转解签页，展示签文等级、签诗、幸运信息与五维提示

> **iOS 13+ 用户**：系统要求设备运动权限必须由用户手势触发，因此首次点击「摇一支好运签」时会弹出授权框。若误点「拒绝」，点击签筒依然可以抽签。

### 2. 解锁深度解签

解签页底部会展示「🔮 解锁深度解签」入口，观看广告后：

- **普通签**：由五维解读、签诗、幸运信息实时组合成完整行动指引
- **高级签**：直接展示签文自带的深度解读全文

解锁状态**永久有效**（存于 LocalStorage），后续抽签直接展示。

### 3. 保存 / 分享海报

1. 解签页点击「🖼️ 生成分享海报」
2. 海报页点击「💾 保存海报到相册」，随后按环境自动分流：

| 环境 | 行为 |
| --- | --- |
| 支持 Web Share API（安卓 Chrome / 新版 Safari） | 直接拉起系统分享面板，可「存储图像」或发送给好友 |
| 微信内置浏览器 / iOS | 海报渲染为 `<img>`，提示**长按图片保存到相册** |
| 桌面浏览器 | 直接下载 `一键上上签_时间戳.png` |

> 微信内无法通过 `download` 属性下载图片，**长按保存是唯一可行路径**，因此海报图片区域已单独放开长按限制。

### 4. 历史与个人中心

- 首页「📜 查看历史签文」→ 按「今天 / 昨天 / 具体日期」倒序分组，最多保留 500 条，支持一键清空
- 首页右上角头像 → 个人中心，查看累计抽签次数、今日抽签次数、抽签天数

### 5. 获得更多抽签次数

| 途径 | 次数 |
| --- | --- |
| 每日免费额度 | 3 次（每日 0 点自动重置） |
| 看广告得额外次数 | +1 次 / 次（无上限） |
| 解锁「♾️ 无限抽签」 | 每日不限次数 |

解锁入口统一放在首页「🎁 好运加成」卡片中。

---

## ⚙️ 配置说明

### Tailwind 主题（`tailwind.config.js`）

```js
colors: {
  'fortune-red':  '#C41E3A',   // 上上签主色
  'fortune-dark': '#1a0a2e',   // 深紫夜色背景
  'gold': { 400: '#FFC107', 500: '#D4A017', /* ... */ },
}
fontFamily: {
  brush:   ['STKaiti', 'KaiTi', '楷体', 'serif'],   // 签诗书法体
  display: ['STXingkai', 'Xingkai', '行楷', 'serif'], // 标题体
}
```

> **动画约定**：`tailwind.config.js` 中只保留页面真正使用 `animate-xxx` 工具类的动画（`float` / `pop` / `slideUp` / `fadeIn` / `spin-slow` / `bounce-gentle`）。
> 因为是**自定义 CSS 直接引用**关键帧，所以 `shake`、`stickShake`、`particle` 定义在 `css/style.css` 中 —— Tailwind 只会为「已使用的工具类」输出 `@keyframes`，写在配置里而未被工具类引用时会**静默丢失**。

### 手动调试开关

在浏览器控制台执行：

```js
// 重置所有数据
localStorage.clear();
location.reload();

// 强制解锁全部权益（无需看广告）
Storage.unlockFeature('deepAnalysis');
Storage.unlockFeature('premiumFortunes');
Storage.unlockFeature('unlimitedDraws');
renderUnlockEntries();

// 查看当前统计
Auth.getProfileStats();
```

### 权益解锁 API（`js/storage.js`）

| 方法 | 说明 |
| --- | --- |
| `Storage.unlockFeature(name)` | 解锁权益（`deepAnalysis` / `premiumFortunes` / `unlimitedDraws`） |
| `Storage.isFeatureUnlocked(name)` | 查询是否已解锁 |
| `Storage.lockFeature(name)` | **撤销**解锁（锁回未解锁状态） |

### 接入真实激励视频广告（`js/ad.js`）

```js
AdSDK.config = {
  enabled: true,
  platform: 'wechat',   // 'mock' | 'wechat' | 'web'
  adUnitId: 'adunit-xxxxxxxx',
};
AdSDK.init();
```

代码已实现 **自动降级**：当 `platform` 指定为 `wechat` / `web` 但对应 SDK 尚未就绪时，会自动回退 Mock 模式并打印警告，**不会出现按钮点击无响应**的情况。

### 接入 Supabase 会员系统（可选）

1. 在 Supabase SQL Editor 中执行 `supabase_schema.sql`
2. 前端引入 `@supabase/supabase-js`，将会员数据从 LocalStorage 迁移到云端

> 当前 `supabase_schema.sql` 属于**预留资产，代码未引用**。若确定不做会员体系，可安全删除该文件。

---

## 💾 数据存储

所有数据存于 `LocalStorage`，键名统一以 `yqsss_` 前缀：

| 键名 | 内容 | 说明 |
| --- | --- | --- |
| `yqsss_user` | 当前登录用户 | `{ id, nickname, createdAt }` |
| `yqsss_users` | 用户档案索引 | `{ [昵称]: 用户对象 }`，保证同名昵称复用同一身份 |
| `yqsss_stats` | 统计 | `{ totalDraws, todayDraws, drawDays, lastDrawDate }` |
| `yqsss_last_active_date` | 最后活跃日期 | 用于跨天重置今日抽签数 |
| `yqsss_today` | 今日抽签记录 | `{ date, count }` |
| `yqsss_history` | 历史签文 | 数组，最多 500 条 |
| `yqsss_unlocked_features` | 已解锁权益 | `{ deepAnalysis, premiumFortunes, unlimitedDraws }` |
| `yqsss_settings` | 预留配置 | 可设置 `{ daily_limit: N }` 覆盖每日免费次数 |

**时间戳格式**：历史记录使用 `Storage._localISO()` 生成**本地时间** `YYYY-MM-DDTHH:mm:ss`。

> 不使用 `Date.toISOString()`：它返回 UTC 时间，会在 UTC+8 时区下导致「今天 / 昨天」分组与展示时间偏移 8 小时。

---

## 🎯 抽签规则与解锁体系

### 签文库构成（共 60 支）

| 分类 | 数量 | 等级分布 | 权重 |
| --- | --- | --- | --- |
| `FORTUNES` 通用签文 | 42 | 上上签 10 / 上吉签 14 / 中平签 13 / 蓄力签 5 | 10 ~ 35 |
| `SCENE_FORTUNES` 场景专属 | 12 | 考试通关 4 / 开工大吉 4 / 节日祈福 4 | 10 ~ 35 |
| `PREMIUM_FORTUNES` 高级签文 | 6 | 锦鲤签 / 万能上上签 / 定制好运签 / 龙腾签 / 福寿签 / 天赐签 各 1 | 固定 5 |

### 抽签池构建逻辑（`Lottery._getFortunePool`）

```
依据当前场景过滤通用签（签文 scenes 需包含该场景）
  ├─ 若存在场景专属签 → 使用场景专属签
  └─ 否则             → 回退到通用签
若已解锁 premiumFortunes → 额外并入 6 支高级签（权重 5）
```

> 高级签单支中签率约 `5 / 1440 ≈ 0.35%`，整体约 2%。

### 等级 → 配色映射

等级与配色集中在 `Lottery.LEVEL_CLASS` 与 `Lottery.LEVEL_COLOR` 中维护：

| 等级 | 徽章样式 | 主色 |
| --- | --- | --- |
| 上上签 / 锦鲤签 / 万能上上签 / 定制好运签 / 龙腾签 / 福寿签 / 天赐签 | `level-上上签` | `#C41E3A` 朱红 |
| 上吉签 | `level-上吉签` | `#D4A017` 鎏金 |
| 中平签 | `level-中平签` | `#2E7D32` 竹青 |
| 蓄力签 | `level-蓄力签` | `#1565C0` 靛蓝 |

> **新增等级时只需在 `Lottery` 中登记一次**，结果页、历史记录、海报、个人中心会自动同步配色。

---

## 🧪 验证与测试

项目已接入 **Vitest**（计划书 §6.5-5：为 `core` 逻辑补单测，迁移后行为一致性有保障）。

```bash
npm install        # 首次：安装 tailwindcss + vitest（均为 devDependencies）
npm test           # 一次性跑完全部测试（vitest run）
npm run test:watch # 开发模式：监听改动并重跑
```

| 测试文件 | 类型 | 覆盖 |
| --- | --- | --- |
| `tests/core.test.js` | 单元测试 | 设计令牌结构、等级/场景/维度映射、纯规则（加权随机 / 次数限制 / 日期 / 历史分组 / 深度解签文案）、抽签核心 `draw()` 的纯函数性与分支、存储适配器后端与降级、视图模型 HTML 与 XSS 转义 |
| `tests/smoke.test.js` | 经典脚本冒烟 | 用 `node:vm` 按 `index.html` 真实顺序装载全部脚本，跑通「登录 → 抽签 → 历史分组 → 深度解签 → 次数限制 → 广告奖励」全链路 |
| `tests/classic-script.test.js` | 静态约束 | 无 ESM 语法、共享模块双出口 footer、core 层平台无关（不引用 `document`/`window`/`localStorage`/`wx`/`uni`）、脚本装载顺序 |
| `tests/build.test.js` | 构建一致性 | 源码中用到的 class 必须存在于 `tailwind.css` / `style.css`（防止「改 class 忘重建」） |

> 这些测试正是本次「零风险重构」的安全网：`core/` 约 1200 行纯逻辑被断言为平台无关，
> 后续迁移到小程序时，只要这些测试保持绿色，就能确认行为未发生漂移。

手动回归建议路径（真机）：

1. 抽签 → 查看解签 → 生成海报 → 保存（分别在桌面浏览器与微信中验证）
2. 连续抽满 3 次 → 校验第 4 次被拦截 → 看广告 +1 次
3. 依次解锁三项权益，确认首页按钮切换为「✅ 已解锁」且功能生效
4. 修改系统时间至次日，确认今日次数重置、抽签天数 +1

---

## 🚢 部署指南

### Vercel（推荐，配置已就绪）

```bash
cd yqsss
npm i -g vercel
vercel --prod
```

`vercel.json` 已配置：`buildCommand: null`（无需构建）、`outputDirectory: "."`、SPA 回退、静态资源长缓存。

> Vercel 会**先匹配文件系统，再应用 rewrites**，因此 `/(.*) → /index.html` 的 SPA 回退不会影响 CSS / JS / 图片等静态资源。
> `.vercelignore` 已排除 `package.json`、`tailwind.config.js`、`README.md`、`supabase_schema.sql` 等非运行时文件。

### 其他平台

| 平台 | 操作 |
| --- | --- |
| GitHub Pages | 推送 `yqsss/` 内容到 Pages 分支 |
| Netlify | 直接拖拽 `yqsss/` 文件夹到 Deploy 面板 |
| Cloudflare Pages | 构建命令留空，输出目录填 `yqsss` |
| 虚拟主机 / OSS / COS | 直接上传 `yqsss/`（可排除 `node_modules`、`package*.json`、`supabase_schema.sql`） |

### 部署前检查清单

- [ ] 已执行 `npm run build:css`（若改动过类名或 Tailwind 配置）
- [ ] 已确认 `AdSDK.config.enabled` 与 `platform` 符合线上预期
- [ ] 已按需替换 `assets/icon.svg` 为品牌图标
- [ ] 已在真机（尤其微信 + iOS）验证海报保存链路

---

## 🔒 安全说明

| 项 | 现状 | 说明 |
| --- | --- | --- |
| XSS 注入 | ✅ 已加固 | 所有拼接进 `innerHTML` 的动态文本（历史记录、签文解读、幸运信息）统一经 `escapeHtml()` 转义 |
| 第三方脚本 | ✅ 已收敛 | `html2canvas` 按需加载，带 `crossOrigin` + `referrerPolicy`；三 CDN 兜底 |
| 敏感文件暴露 | ✅ 已隔离 | `.vercelignore` 排除 `README.md` 与 `supabase_schema.sql`，避免被公开下载 |
| 错误处理 | ✅ 已修复 | 全局 `error` / `unhandledrejection` 处理器改用 `Toast.show()`（此前引用不存在的 `App` 对象，处理器自身会抛错） |
| 用户输入 | ✅ 仅本地 | 昵称仅用于展示，通过 `textContent` 写入，不参与任何 DOM 结构拼接 |
| 数据隔离 | ⚠️ 无 | 无后端、无鉴权，所有数据存于本地，**清空浏览器数据即丢失** |
| 权益校验 | ⚠️ 可绕过 | 解锁状态存于 LocalStorage，用户可通过控制台自行修改（纯前端方案的固有限制） |

---

## 🩹 本次修复记录

### P0 · 功能性缺陷

| # | 问题 | 根因 | 修复 |
| --- | --- | --- | --- |
| 1 | **摇签筒完全没有动画** | `style.css` 以 `animation: shake` 引用关键帧，但 `@keyframes shake` 只写在 `tailwind.config.js` 中，而页面从未使用 `animate-shake` 工具类 → Tailwind 未输出该关键帧 | 将 `shake` / `stickShake` / `particle` 关键帧移入 `css/style.css` 显式声明 |
| 2 | **高级签解签内容错乱** | 深度签文只有 `deepAnalysis`、没有 `analysis` 字段，`renderResult()` 未做清空与隐藏，导致上一次抽签的五维解读**残留在页面上** | 无 `analysis` 时清空 `#analysis-list` 并整块隐藏 `#result-analysis` |
| 3 | **深度解签解锁后无任何内容** | 解锁逻辑只是隐藏广告横幅后重渲染，而渲染函数从未输出 `deepAnalysis` | 新增 `Lottery.buildDeepAnalysis()`，普通签由五维+幸运信息实时组合生成，高级签直接返回自带文案；新增 `#deep-analysis-wrap` 区块渲染 |
| 4 | **微信 / iOS 无法保存海报** | ① 未生成任何 `<img>`，只有 DOM 预览，「长按保存」无对象可长按；② 全局样式 `-webkit-touch-callout: none` 禁用了长按呼出菜单 | 新增 `#poster-image`，截图后渲染为 `<img>`；`.poster-image` 单独放开长按限制；`contextmenu` 拦截对其放行 |
| 5 | **iOS 摇一摇永远无效** | `DeviceMotionEvent.requestPermission()` 在 `devicemotion` 事件回调中调用，而非用户手势，授权框不会弹出 | 抽出 `requestMotionPermission()`，由 `goShake()`（用户点击）触发申请 |
| 6 | **按钮点击无响应** | 微信 / H5 广告为未实现的空函数，`Promise` 永不 settle，`await` 永久挂起 | `AdSDK` 检测真实 SDK 是否就绪，未就绪自动回退 Mock 模式 |
| 7 | **全局错误处理器自身抛错** | 引用了不存在的 `App.hideLoading()` / `App.toast()` | 改用 `Toast.show()` |

### P1 · 逻辑与数据正确性

| # | 问题 | 修复 |
| --- | --- | --- |
| 8 | 历史记录时间偏移 8 小时 | `createdAt` 由 `new Date().toISOString()`（UTC）改为 `Storage._localISO()`（本地时间） |
| 9 | 「抽签天数」永远不增长 | 原实现依赖启动时的跨天判断，导致同日首次抽签恒不计数；改为按 `lastDrawDate` 自然日累计 |
| 10 | 同名昵称重复注册 | 新增 `yqsss_users` 档案索引，同名昵称复用同一用户 id，`isNew` 判断恢复准确 |
| 11 | 历史分组顺序不稳定 | 显式按「今天 → 昨天 → 日期」倒序排序 |
| 12 | 高级签 / 无限抽签无解锁入口 | PREMIUM 签文库实际不可达；首页新增「🎁 好运加成」卡片，提供两项解锁入口 |
| 13 | 新增等级落回绿色中平签 | 龙腾签 / 福寿签 / 天赐签 未登记映射；收敛为 `Lottery.LEVEL_CLASS` / `LEVEL_COLOR` 单一数据源 |
| 14 | 场景标签从不更新 | `selectScene()` 补充更新 `#current-scene-label` |

### P2 · 性能与工程质量

| # | 优化 | 收益 |
| --- | --- | --- |
| 15 | `html2canvas` 改为按需动态加载 | 首屏减少约 200KB 阻塞脚本；同时移除 `document.write` 兜底方案 |
| 16 | 移除 `allowTaint: true` | 避免跨域图片污染画布导致 `toDataURL()` 抛 `SecurityError` |
| 17 | 海报截图结果缓存 + 新增 `Poster.save()` 统一入口 | 重复保存不再重复截图；保存按钮带 loading 态 |
| 18 | Mock 广告遮罩增加存活检测 | 遮罩被移除时清理定时器，避免内存泄漏与 Promise 悬挂 |
| 19 | 删除死代码 | 移除未使用的 `.poster-*` 样式约 100 行、`goPoster()`、`authTabMode`、重复的 `getLevelColor()`、未生成的 `glow` / `shake` / `particle` Tailwind 动画配置 |

### 冗余文件清理

| 路径 | 说明 |
| --- | --- |
| `shangshangqian/unpacked/` | 需求文档 `.docx` 的解包副本，原 `.docx` 已保留 |
| `shangshangqian/unpacked_plan/` | 同一文档的第二次解包（正文 MD5 与 `unpacked/` **完全一致**），纯冗余 |
| `shangshangqian/package-lock.json` | 空壳残留（无对应 `package.json`） |
| `yqsss/assets/images/`、`yqsss/assets/audio/` | 空目录 |

---

## ⚠️ 已知限制与改进方向

| 优先级 | 项 | 说明 |
| --- | --- | --- |
| 🔴 高 | **无 Service Worker** | 已有 Manifest，但无法离线访问；接入 SW 即可获得完整 PWA 能力 |
| 🔴 高 | **iOS 需 PNG 图标** | iOS 不支持 SVG `apple-touch-icon`，当前为内联 emoji SVG 占位，需补 180×180 PNG |
| 🟡 中 | **静态资源缓存无哈希** | `vercel.json` 对 CSS/JS 设为一年 `immutable`，但文件名无内容哈希，更新后用户需强制刷新 |
| 🟡 中 | **数据无用户隔离** | 统计与历史为浏览器级共享，切换昵称不隔离数据 |
| 🟡 中 | **权益校验可绕过** | 纯前端方案的固有限制，接入后端校验方可根治 |
| 🟢 低 | **未接入真实广告** | 目前为 Mock 广告，需替换为微信广告组件 / H5 广告 SDK |
| 🟢 低 | **无 ESLint / CI** | 单元测试（Vitest）已接入（`npm test`）；仍建议补 ESLint + GitHub Actions 流水线 |

---

## 🗺️ 路线图

- [x] 签文库构建与加权随机抽签
- [x] 摇一摇 / 点击抽签双通道
- [x] 五维解签 + 深度解签
- [x] 海报生成与多环境保存链路
- [x] 用户统计、历史记录
- [x] 商业化：次数限制、权益解锁入口、广告降级
- [x] XSS 加固与第三方脚本按需加载
- [ ] 服务端支持：Supabase 会员体系 + 云端签文记录（Schema 已就绪）
- [ ] PWA：Service Worker + PNG 图标，支持离线
- [ ] 数据分析埋点（抽签量、解锁转化率、海报分享率）
- [ ] 每日一签推送与签到积分体系
- [ ] 分享裂变：邀请好友得额外抽签次数
- [ ] 多语言（简体 / 繁体 / English）

---

## ❓ 常见问题

<details>
<summary><b>摇一摇没有反应？</b></summary>

1. **iOS 13+** 必须授权设备运动权限：点击「摇一支好运签」时弹出的授权框需选择「允许」。若已误点拒绝，可在 `设置 → Safari → 动作与方向` 重新开启，或直接**点击签筒**抽签。
2. 部分安卓浏览器需 HTTPS 环境才提供 `devicemotion`，本地调试请用 `http://localhost`。
3. 摇晃幅度不足：需总加速度 > 15（静止时约 9.8），请明显甩动手机。
</details>

<details>
<summary><b>抽到高级签但看不到五维解读？</b></summary>

这是**预期行为**。高级签（锦鲤签 / 万能上上签 / 定制好运签 / 龙腾签 / 福寿签 / 天赐签）不含五维 `analysis` 字段，而是以签文自带的 `deepAnalysis` 全文直出，属于更高级的签文形态。
</details>

<details>
<summary><b>微信里点击「保存海报」没反应？</b></summary>

微信内置浏览器不支持通过 `download` 属性下载图片。点击保存后，海报会渲染成一张图片，请**长按该图片 → 保存图片**。非微信环境会优先调用系统分享面板或直接下载。
</details>

<details>
<summary><b>海报生成很慢或失败？</b></summary>

首次保存需从 CDN 下载约 200KB 的 `html2canvas`（仅在首次保存时发生），随后会被浏览器缓存。若三个 CDN 均不可达，将提示「海报生成失败，请稍后重试」。
</details>

<details>
<summary><b>改了类名但样式没生效？</b></summary>

Tailwind 需要重新构建：`npm run build:css`。开发时建议开一个终端跑 `npm run watch:css`。
</details>

<details>
<summary><b>新增了一支签文，需要改哪些地方？</b></summary>

只需在 `js/data/fortunes.js` 中新增对象，并保证字段完整：

```js
{
  id: 43,                              // 全局唯一
  level: '上吉签',                      // 需在 Lottery.LEVEL_CLASS 中已登记
  title: '...',
  poem: '...',
  scenes: ['daily', 'work'],           // 通用签必填
  probability: 20,                     // 权重，数值越大越易抽中
  lucky: { color: '金色', number: '8', direction: '东南' },
  analysis: { career: '...', study: '...', wealth: '...', health: '...', love: '...' },
}
```

若新增了**新等级**，还需在 `js/lottery.js` 的 `LEVEL_CLASS` 与 `LEVEL_COLOR` 中登记，并在 `css/style.css` 中补一条 `.level-<新等级>` 样式。
</details>

<details>
<summary><b>数据会同步到云端吗？</b></summary>

不会。所有数据仅存于本机浏览器 `LocalStorage`，清除浏览器数据即全部丢失，也不支持多设备同步。
</details>

---

## 🤝 贡献指南

欢迎提交 Issue 与 Pull Request！

### 开发流程

```bash
# 1. Fork 并克隆仓库
git clone <your-fork-url>
cd yqsss

# 2. 安装开发依赖
npm install

# 3. 启动样式监听 + 本地服务器（两个终端）
npm run watch:css
npx serve -p 5173

# 4. 提交前请先构建一次样式
npm run build:css
```

### 代码规范

| 项 | 约定 |
| --- | --- |
| 缩进 | 2 空格 |
| 命名 | 函数 / 变量 `camelCase`；常量与模块对象 `PascalCase` / `UPPER_SNAKE_CASE` |
| 模块 | 使用全局对象式模块（`const Lottery = { ... }`），不引入打包器 |
| 注释 | 关键逻辑使用中文注释说明「为什么这样做」 |
| 存储键 | 统一 `yqsss_` 前缀，并在 `README.md` 的存储表中登记 |
| 动态 HTML | 任何拼接进 `innerHTML` 的内容必须经 `escapeHtml()` |

### 提交规范

```
<type>(<scope>): <subject>

feat(lottery): 新增节日专属签文库
fix(poster): 修复 iOS 长按无法保存海报
docs(readme): 补充部署说明
```

**类型**：`feat` / `fix` / `docs` / `style` / `refactor` / `perf` / `chore`

### 修改检查清单

- [ ] 已在真机（至少 iOS Safari + 微信）验证相关功能
- [ ] 若改动了类名 / `tailwind.config.js`，已执行 `npm run build:css`
- [ ] 若新增等级，已在 `Lottery.LEVEL_CLASS` / `LEVEL_COLOR` 与 `css/style.css` 中登记
- [ ] 若新增存储键，已更新 README 的存储表
- [ ] 未引入运行时依赖（如需引入，请在 PR 中说明理由）

---

## 📄 许可证

本项目基于 **MIT License** 开源，可自由用于个人与商业项目。

签文内容为原创创作，仅供娱乐参考，**不构成任何决策、投资或医疗建议**。

---

<div align="center">

**🏮 愿你抽到的每一签，都是上上签 🏮**

Made with ❤️ using Vanilla JS & Tailwind CSS

</div>
