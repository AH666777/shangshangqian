# 🏮 一键上上签 · shangshangqian

> 国风趣味抽签应用。仓库标识 `shangshangqian`，中文品牌「一键上上签」。
>
> 摇一摇签筒，抽一支属于你的上上签。

---

## 📖 项目简介

「一键上上签」是一款以庙签文化为原型的趣味抽签应用。用户选择场景（日常好运 / 考试通关 / 开工大吉 / 节日祈福），摇动签筒或点击抽签获得签文，可查看解签、生成分享海报、留存历史记录并解锁成就。

产品同时维护两条技术路线，共用同一套纯逻辑内核：

- **H5 版**：零构建、零运行时依赖，可直接静态托管，适合活动落地页与社交裂变。
- **uni-app 版**：以微信小程序为主目标，一套代码可编译到 H5 / App / 多端小程序。

---

## 🧱 工程组成

| 目录 | 形态 | 技术栈 | 说明 |
| --- | --- | --- | --- |
| `yqsss/` | H5 子工程 | 原生 JavaScript + Tailwind CSS + Vitest | 双击 `index.html` 即可运行，无打包步骤 |
| `yqsss-uniapp/` | uni-app 子工程 | Vue 3 + uni-app + Vite | 微信小程序为主目标，含 `uniCloud-alipay` 云函数 |

### 目录结构

```
shangshangqian/
├── README.md                       # 本文件：项目总览与命名规约
├── project.config.json             # 微信开发者工具项目配置（appid）
├── yqsss/                          # H5 版（零构建，双击 index.html 即可运行）
└── yqsss-uniapp/                   # uni-app 版（微信小程序为主目标）
```

---

## 🏷️ 命名规约

项目曾以 `lottery_game` 作为仓库目录名。该名称把「抽签祈福」语义拉向「彩票 / 博彩」，既与品牌调性冲突，也容易在小程序与 App Store 审核中触发博彩类关键词风控。现统一为 `shangshangqian`。

### 重命名映射

| 位置 | 旧值 | 新值 |
| --- | --- | --- |
| 仓库根目录 | `lottery_game/` | `shangshangqian/` |
| 根 `project.private.config.json` | `"projectname": "lottery_game"` | `"projectname": "shangshangqian"` |
| `yqsss/package.json` | `"name": "yqsss"` | `"name": "shangshangqian"` |
| `yqsss-uniapp/package.json` | `"name": "uni-preset-vue"` | `"name": "shangshangqian-uniapp"` |
| `yqsss-uniapp/project.private.config.json` | `"projectname": "yqsss-uniapp"` | `"projectname": "shangshangqian-uniapp"` |

### 刻意保留的标识

以下标识**不含项目名语义**，改名会引入运行时风险或无意义改动，故保持不变：

| 标识 | 保留原因 |
| --- | --- |
| `lottery.js` / `Lottery` / `LotteryCore` | 「抽签算法」的领域概念，不是项目名。改名会破坏模块语义，并波及约 200 处导入与测试断言 |
| 本地存储键前缀 `yqsss_` | 已发布版本的数据键名。改名会导致存量用户的抽签历史、统计与已解锁权益全部读不到 |
| 云函数 `yqsss-auth` | 必须与 uniCloud 已部署的函数目录同名，改名需重新部署并同步云端环境变量 |
| 子目录 `yqsss/`、`yqsss-uniapp/` | 历史目录名，语义指向明确。改动会牵动 HBuilderX / 微信开发者工具的项目路径与全部文档引用 |

> 如需进一步把子目录改为 `h5/`、`uniapp/`，属于独立的结构调整，建议单独提交并重新导入 IDE 工程。

---

## 🚀 快速开始

### H5 版（零构建）

```bash
cd yqsss

# 方式一：直接双击 index.html（零依赖，开箱即用）
# 方式二：起一个静态服务器（推荐，避免 file:// 的跨域限制）
npx serve .
```

修改过 Tailwind 类名或主题后，需要重建样式：

```bash
cd yqsss
npm install
npm run build:css
```

### uni-app 版

```bash
cd yqsss-uniapp
npm install

# 微信小程序：开发（产物 dist/dev/mp-weixin）
npm run dev:mp-weixin

# 微信小程序：生产构建（产物 dist/build/mp-weixin）
npm run build:mp-weixin

# H5 预览
npm run dev:h5
```

构建完成后，用微信开发者工具导入 `yqsss-uniapp/`（项目配置中的 appid 为 `wx5a7366b5deaa5ac8`）；也可在 HBuilderX 中直接运行。

---

## 🧪 测试与验证

### H5 版（Vitest）

```bash
cd yqsss
npm test
```

当前覆盖 4 个测试文件、92 条用例：纯逻辑单元测试、按 `index.html` 真实顺序装载的经典脚本冒烟测试、脚本静态约束、Tailwind 类名构建一致性。

### uni-app 版（Node 冒烟）

```bash
cd yqsss-uniapp
node smoke/test.mjs                  # 四场景各抽 500 次 + 次数限制
node smoke/achievement-flow.test.mjs # 成就链路
node smoke/achievements.test.mjs     # 成就规则与云函数契约
```

> 修改 `src/core/` 后必须保证 H5 与 uni-app 两侧测试同时为绿：两套内核逻辑同源，任一侧漂移都会造成多端行为不一致。

---

## 📦 构建与部署

| 目标 | 方式 |
| --- | --- |
| H5 静态托管 | 将 `yqsss/` 直接部署到 Vercel / Netlify / Cloudflare Pages / OSS（`vercel.json` 已配好 SPA 回退） |
| 微信小程序 | `npm run build:mp-weixin` 后，用微信开发者工具导入 `dist/build/mp-weixin` 上传 |
| App / 其他小程序 | 使用对应的 `build:mp-*` / `build:app-*` 脚本，详见 `yqsss-uniapp/package.json` |

上线前请逐项确认 AppSecret、隐私指引、ICP 备案与云函数部署状态。

---

## 📄 许可证

MIT
