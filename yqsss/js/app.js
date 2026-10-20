// ============================================
// 一键上上签 - 主控逻辑
// ============================================

// ========== 说明 ==========
// 计划书 §6.5-3：本文件只保留「DOM 读写 + 事件绑定」。
// HTML 转义、模板拼接、日期分组等纯逻辑分别下沉到：
//   js/core/rules.js     —— escapeHtml / 日期工具 / 分组 / 深度解签
//   js/ui/view-model.js  —— 各页面列表与卡片的 HTML 构建
// 页面内需要的纯函数从 RulesCore / ViewModel 取用，保证视觉输出逐字不变。

// ========== Toast提示 ==========
const Toast = {
  timer: null,
  show(msg, duration = 2000) {
    const el = document.getElementById('toast');
    if (!el) return;
    clearTimeout(this.timer);
    el.textContent = msg;
    el.style.opacity = '1';
    this.timer = setTimeout(() => {
      el.style.opacity = '0';
    }, duration);
  },
};

// ========== 页面路由 ==========
const Router = {
  currentPage: 'home',
  previousPage: null,

  navigate(page) {
    this.previousPage = this.currentPage;

    // 隐藏所有页面
    document.querySelectorAll('.page').forEach(el => {
      el.classList.remove('active');
      el.classList.add('hidden');
    });

    // 显示目标页面
    const target = document.getElementById(`page-${page}`);
    if (target) {
      target.classList.remove('hidden');
      // 强制回流后添加active触发动画
      void target.offsetWidth;
      target.classList.add('active');
      this.currentPage = page;
    }

    // 滚动到顶部
    window.scrollTo(0, 0);
  },

  goBack() {
    if (this.previousPage) {
      this.navigate(this.previousPage);
    }
  },
};

// ========== 背景粒子 ==========
function initBgParticles() {
  const container = document.getElementById('bg-particles');
  if (!container) return;

  const colors = [
    'rgba(212,160,23,0.15)',
    'rgba(255,193,7,0.1)',
    'rgba(255,215,0,0.08)',
    'rgba(196,30,58,0.1)',
  ];

  for (let i = 0; i < 20; i++) {
    const particle = document.createElement('div');
    particle.className = 'bg-particle';
    const size = Math.random() * 6 + 2;
    particle.style.cssText = `
      width: ${size}px;
      height: ${size}px;
      background: ${colors[Math.floor(Math.random() * colors.length)]};
      left: ${Math.random() * 100}%;
      top: ${Math.random() * 100}%;
      animation-delay: ${Math.random() * 6}s;
      animation-duration: ${Math.random() * 4 + 4}s;
    `;
    container.appendChild(particle);
  }
}

// ========== 撒花特效 ==========
function spawnParticles(x, y, count = 20) {
  const colors = ['#FFC107', '#FF6B35', '#C41E3A', '#D4A017', '#FFD700', '#FF8F00'];

  for (let i = 0; i < count; i++) {
    const particle = document.createElement('div');
    particle.className = 'particle';
    const size = Math.random() * 8 + 4;
    const angle = Math.random() * Math.PI * 2;
    const distance = Math.random() * 120 + 60;
    const tx = Math.cos(angle) * distance;
    const ty = Math.sin(angle) * distance - 80;

    particle.style.cssText = `
      width: ${size}px;
      height: ${size}px;
      background: ${colors[Math.floor(Math.random() * colors.length)]};
      left: ${x}px;
      top: ${y}px;
      border-radius: ${Math.random() > 0.5 ? '50%' : '2px'};
      --tx: ${tx}px;
      --ty: ${ty}px;
      animation-delay: ${Math.random() * 0.3}s;
    `;

    document.body.appendChild(particle);
    setTimeout(() => particle.remove(), 1800);
  }
}

// ========== 首页：场景选择 ==========
let selectedScene = 'daily';

function selectScene(scene) {
  selectedScene = scene;

  // 更新按钮状态
  document.querySelectorAll('.scene-btn').forEach(btn => {
    btn.classList.toggle('scene-active', btn.dataset.scene === scene);
  });

  // 更新顶部场景提示
  const label = document.getElementById('current-scene-label');
  if (label) label.textContent = `当前场景：${Lottery.getSceneName(scene)}`;
}

// ========== 首页：更新剩余次数 ==========
function updateRemainDisplay() {
  const remain = Storage.getRemainingDraws();
  const el = document.getElementById('home-remain');
  if (el) {
    el.textContent = remain;
  }
}

// ========== 首页：权益解锁状态渲染 ==========
function renderUnlockEntries() {
  const premiumUnlocked = Storage.isFeatureUnlocked('premiumFortunes');
  const unlimitedUnlocked = Storage.isFeatureUnlocked('unlimitedDraws');

  const premiumBtn = document.getElementById('btn-unlock-premium');
  const premiumTag = document.getElementById('premium-unlocked-tag');
  const unlimitedBtn = document.getElementById('btn-unlock-unlimited');
  const unlimitedTag = document.getElementById('unlimited-unlocked-tag');

  if (premiumBtn) premiumBtn.classList.toggle('hidden', premiumUnlocked);
  if (premiumTag) premiumTag.classList.toggle('hidden', !premiumUnlocked);
  if (unlimitedBtn) unlimitedBtn.classList.toggle('hidden', unlimitedUnlocked);
  if (unlimitedTag) unlimitedTag.classList.toggle('hidden', !unlimitedUnlocked);
}

// ========== 页面跳转 ==========
function goHome() {
  Router.navigate('home');
  updateRemainDisplay();
  renderUnlockEntries();
}

function goShake() {
  // 检查是否有剩余次数
  if (!Storage.canDraw()) {
    showNoDrawsDialog();
    return;
  }
  // iOS 13+ 要求设备运动权限必须在用户手势中申请，
  // 这里由「摇一支好运签 / 再摇一签」的点击触发。
  requestMotionPermission();
  Router.navigate('shake');
  // 重置摇签页状态
  resetShakePage();
}

function goResult() {
  Router.navigate('result');
  renderResult();
}

function goHistory() {
  Router.navigate('history');
  renderHistory();
}

function goBackFromPoster() {
  Router.navigate('result');
}

// ========== 摇签页：状态重置 ==========
function resetShakePage() {
  const barrel = document.getElementById('barrel');
  const glow = document.getElementById('barrel-glow');
  if (barrel) barrel.classList.remove('shaking');
  if (glow) glow.classList.remove('visible');

  Lottery.isDrawing = false;

  // 显示移动端摇晃提示
  const mobileHint = document.getElementById('shake-hint-mobile');
  if (mobileHint) {
    const isMobile = /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
    mobileHint.style.display = isMobile ? 'block' : 'none';
  }
}

// ========== 摇签页：执行抽签 ==========
async function doShake() {
  if (Lottery.isDrawing) return;

  // 再次检查次数
  if (!Storage.canDraw()) {
    showNoDrawsDialog();
    return;
  }

  Lottery.isDrawing = true;

  const barrel = document.getElementById('barrel');
  const glow = document.getElementById('barrel-glow');
  const hint = document.getElementById('shake-hint');
  const modal = document.getElementById('drawing-modal');

  // 开始摇动动画
  if (barrel) barrel.classList.add('shaking');
  if (hint) hint.textContent = '✨ 好运正在赶来...';

  // 光效
  if (glow) {
    glow.classList.add('visible');
    setTimeout(() => glow.classList.remove('visible'), 1000);
  }

  // 撒花
  const barrelRect = document.getElementById('barrel-container')?.getBoundingClientRect();
  if (barrelRect) {
    spawnParticles(
      barrelRect.left + barrelRect.width / 2,
      barrelRect.top + barrelRect.height / 2,
      15
    );
  }

  // 模拟抽签等待
  setTimeout(() => {
    // 显示等待弹窗
    if (modal) modal.classList.remove('hidden');

    setTimeout(async () => {
      // 隐藏等待弹窗
      if (modal) modal.classList.add('hidden');

      // 停止动画
      if (barrel) barrel.classList.remove('shaking');
      if (hint) hint.textContent = '👆 点击签筒摇一摇';

      // 执行抽签
      const result = await Lottery.draw(selectedScene);

      if (result.success) {
        // 撒花
        if (barrelRect) {
          spawnParticles(
            barrelRect.left + barrelRect.width / 2,
            barrelRect.top + barrelRect.height / 2,
            30
          );
        }
        goResult();
      } else if (result.reason === 'limit_reached') {
        showNoDrawsDialog();
        goHome();
      } else {
        Toast.show(result.message || '抽签失败，请重试');
      }

      Lottery.isDrawing = false;
    }, 1200);
  }, 1800);
}

// ========== 解签页：渲染结果 ==========
function renderResult() {
  const fortune = Lottery.getCurrentFortune();
  if (!fortune) {
    Router.navigate('home');
    return;
  }

  // 等级标签
  const levelEl = document.getElementById('result-level');
  if (levelEl) {
    levelEl.textContent = fortune.level;
    levelEl.className = `inline-block px-4 py-1 rounded-full text-sm font-bold mb-3 tracking-wider ${Lottery.getLevelClass(fortune.level)}`;
  }

  // 标题
  const titleEl = document.getElementById('result-title');
  if (titleEl) titleEl.textContent = fortune.title;

  // 签诗
  const poemEl = document.getElementById('result-poem');
  if (poemEl) poemEl.textContent = fortune.poem;

  // 幸运信息（模板下沉到 ViewModel）
  const luckyEl = document.getElementById('result-lucky');
  if (luckyEl && fortune.lucky) {
    luckyEl.innerHTML = ViewModel.buildLuckyHtml(fortune.lucky);
  }

  // 五大维度
  // 高级签文只有 deepAnalysis 而没有 analysis，此时必须清空并隐藏整个板块，
  // 否则会残留上一支签文的解读内容（此前的显示错乱问题）。
  const analysisSection = document.getElementById('result-analysis');
  const analysisList = document.getElementById('analysis-list');
  const hasAnalysis = ViewModel.hasAnalysis(fortune.analysis);

  if (analysisList) {
    analysisList.innerHTML = ViewModel.buildAnalysisListHtml(fortune.analysis);
  }
  if (analysisSection) analysisSection.classList.toggle('hidden', !hasAnalysis);

  // 深度解签：已解锁展示全文，未解锁展示广告入口
  const deepUnlocked = Storage.isFeatureUnlocked('deepAnalysis');
  const deepWrap = document.getElementById('deep-analysis-wrap');
  const deepText = document.getElementById('deep-analysis-text');
  const adBanner = document.getElementById('ad-unlock-banner');

  if (deepText) {
    // 使用抽签时的实际场景（Lottery.currentScene），而非首页当前选中项
    deepText.textContent = deepUnlocked ? Lottery.buildDeepAnalysis(fortune, Lottery.currentScene) : '';
  }
  if (deepWrap) deepWrap.classList.toggle('hidden', !deepUnlocked);
  if (adBanner) adBanner.classList.toggle('hidden', deepUnlocked);

  // 更新剩余次数
  updateRemainDisplay();
}

// ========== 海报页：生成海报 ==========
function generatePoster() {
  const fortune = Lottery.getCurrentFortune();
  if (!fortune) return;

  // 必须先切到海报页再渲染：容器 display:none 时没有布局，
  // 会影响后续 html2canvas 截图尺寸。
  Router.navigate('poster');
  Poster.generate(fortune, Lottery.currentScene);
}

// ========== 海报页：保存海报 ==========
async function savePoster() {
  const btn = document.getElementById('btn-save-poster');
  const originText = btn ? btn.textContent : '';

  if (btn) {
    btn.disabled = true;
    btn.textContent = '⏳ 生成中...';
  }

  try {
    await Poster.save();
  } finally {
    if (btn) {
      btn.disabled = false;
      btn.textContent = originText;
    }
  }
}

// ========== 历史记录页（通用） ==========
function renderHistory() {
  const listEl = document.getElementById('history-list');
  const emptyEl = document.getElementById('history-empty');
  const grouped = Storage.getGroupedHistory();

  if (!listEl) return;

  // grouped 是对象 { "今天": [...], "昨天": [...], "date": [...] }
  const entries = Object.entries(grouped);

  if (entries.length === 0) {
    listEl.innerHTML = '';
    if (emptyEl) emptyEl.classList.remove('hidden');
    return;
  }

  if (emptyEl) emptyEl.classList.add('hidden');

  // 展平 + 模板拼接下沉到 ViewModel（纯函数，可单测）
  listEl.innerHTML = ViewModel.buildHistoryListHtml(grouped);
}

function clearHistory() {
  if (confirm('确定要清空所有历史签文记录吗？')) {
    Storage.remove(Storage.KEYS.HISTORY_CACHE);
    renderHistory();
    Toast.show('历史记录已清空');
  }
}

// ========== 次数不足弹窗 ==========
function showNoDrawsDialog() {
  const overlay = document.createElement('div');
  overlay.className = 'fixed inset-0 z-[80] bg-black/80 backdrop-blur-sm flex items-center justify-center';
  overlay.innerHTML = `
    <div class="bg-gradient-to-b from-[#2d1b4e] to-[#1a0a2e] border-2 border-gold-500/40 rounded-3xl p-6 mx-4 text-center max-w-sm w-full animate-pop">
      <div class="text-5xl mb-3">🎯</div>
      <h3 class="text-lg font-bold text-gold-400 mb-2">今日免费次数已用完</h3>
      <p class="text-white/60 text-sm mb-4">看一小段广告即可获得额外抽签机会</p>
      <div class="flex flex-col gap-2">
        <button id="btn-watch-ad-draw" class="w-full py-3 bg-gradient-to-r from-gold-500 to-gold-400 rounded-2xl text-[#1a0a2e] font-bold tracking-wider hover:scale-[1.02] active:scale-95 transition-all duration-300">
          📺 看广告，再抽一次
        </button>
        <button id="btn-close-dialog" class="w-full py-3 rounded-2xl bg-white/10 border border-white/20 text-white/70 hover:bg-white/20 hover:text-white text-sm transition-all">
          明天再来
        </button>
      </div>
    </div>
  `;
  document.body.appendChild(overlay);

  overlay.querySelector('#btn-watch-ad-draw').addEventListener('click', async () => {
    overlay.remove();
    const result = await AdSDK.watchAdForReward('extra_draws');
    if (result) {
      updateRemainDisplay();
      // 自动进入摇签页
      setTimeout(() => goShake(), 500);
    }
  });

  overlay.querySelector('#btn-close-dialog').addEventListener('click', () => {
    overlay.remove();
    goHome();
  });

  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) {
      overlay.remove();
    }
  });
}

// ========== 深度解签解锁 ==========
async function unlockDeepAnalysis() {
  try {
    const result = await AdSDK.watchAdForReward('deep_analysis');
    if (result) {
      // 重新渲染结果（会展示深度解签全文并隐藏广告入口）
      renderResult();
    }
  } catch (e) {
    // 给出明确提示，避免被全局 unhandledrejection 误报为「操作未能完成」。
    console.error('[unlockDeepAnalysis]', e);
    Toast.show('深度解签解锁失败，请稍后再试');
  }
}

// ========== 高级签文库解锁 ==========
async function unlockPremiumFortunes() {
  if (Storage.isFeatureUnlocked('premiumFortunes')) {
    Toast.show('高级签文库已解锁，快去摇一摇吧~');
    return;
  }
  try {
    const result = await AdSDK.watchAdForReward('premium_fortunes');
    if (result) {
      renderUnlockEntries();
      updateRemainDisplay();
    }
  } catch (e) {
    console.error('[unlockPremiumFortunes]', e);
    Toast.show('高级签文解锁失败，请稍后再试');
  }
}

// ========== 无限抽签解锁 ==========
async function unlockUnlimitedDraws() {
  if (Storage.isFeatureUnlocked('unlimitedDraws')) {
    Toast.show('已解锁无限抽签，畅快摇到底~');
    return;
  }
  try {
    const result = await AdSDK.watchAdForReward('unlimited_draws');
    if (result) {
      renderUnlockEntries();
      updateRemainDisplay();
    }
  } catch (e) {
    console.error('[unlockUnlimitedDraws]', e);
    Toast.show('无限抽签解锁失败，请稍后再试');
  }
}

// ========== 用户昵称登录弹窗 ==========
function showAuthModal() {
  const modal = document.getElementById('auth-modal');
  if (modal) modal.classList.remove('hidden');
  clearAuthErrors();
}

function closeAuthModal() {
  const modal = document.getElementById('auth-modal');
  if (modal) modal.classList.add('hidden');
  clearAuthErrors();
}

function clearAuthErrors() {
  const errEl = document.getElementById('login-error');
  if (errEl) { errEl.textContent = ''; errEl.classList.add('hidden'); }
}

function handleLoginSubmit(event) {
  event.preventDefault();
  const nickname = (document.getElementById('login-nickname')?.value || '');
  const btn = document.getElementById('btn-login-submit');
  const errEl = document.getElementById('login-error');

  const showError = (msg) => {
    if (errEl) {
      errEl.textContent = msg;
      errEl.classList.remove('hidden');
    } else {
      Toast.show(msg);
    }
  };

  if (!nickname.trim()) {
    showError('请输入昵称');
    return;
  }

  if (btn) {
    btn.disabled = true;
    btn.textContent = '进入中...';
  }

  try {
    const result = Auth.login(nickname);
    if (result.success) {
      closeAuthModal();
      Toast.show(result.isNew ? '欢迎加入 🎉' : '欢迎回来 🎉');
      setTimeout(() => showProfilePage(), 300);
    } else {
      showError(result.message);
    }
  } finally {
    if (btn) {
      btn.disabled = false;
      btn.textContent = '进入游戏';
    }
  }
}

function handleLogout() {
  if (confirm('确定要退出登录吗？\n（历史记录保留在本地）')) {
    Auth.logout();
    Toast.show('已退出登录');
    goHome();
  }
}

// ========== 顶部按钮：点击登录或进入个人主页 ==========
function handleProfileClick() {
  if (Auth.isLoggedIn()) {
    showProfilePage();
  } else {
    showAuthModal();
  }
}

// ========== 个人主页 ==========
function showProfilePage() {
  if (!Auth.isLoggedIn()) {
    showAuthModal();
    return;
  }
  Router.navigate('profile');
  renderProfilePage();
}

function renderProfilePage() {
  if (!Auth.isLoggedIn()) return;

  const nickname = Auth.getNickname();
  const stats = Auth.getProfileStats();
  const user = Auth.getUser();

  // 用户基本信息
  const avatarEl = document.getElementById('profile-avatar');
  const nicknameEl = document.getElementById('profile-nickname');
  const emailEl = document.getElementById('profile-email');
  const createdAtEl = document.getElementById('profile-created-at');

  if (nicknameEl) nicknameEl.textContent = nickname;
  if (emailEl) emailEl.textContent = '本地用户';
  if (avatarEl) avatarEl.textContent = ViewModel.getAvatarEmoji(nickname);
  if (createdAtEl && user?.createdAt) {
    const d = new Date(user.createdAt);
    createdAtEl.textContent = `注册于 ${d.toLocaleDateString('zh-CN')}`;
  }

  // 统计数据
  const totalDrawsEl = document.getElementById('profile-total-draws');
  const todayDrawsEl = document.getElementById('profile-today-draws');
  const totalDaysEl = document.getElementById('profile-total-days');

  if (totalDrawsEl) totalDrawsEl.textContent = stats.totalDraws;
  if (todayDrawsEl) todayDrawsEl.textContent = stats.todayDraws;
  if (totalDaysEl) totalDaysEl.textContent = stats.drawDays;

  // 按日期分组的抽签历史
  renderProfileHistory();
}

function renderProfileHistory() {
  const listEl = document.getElementById('profile-history-list');
  const emptyEl = document.getElementById('profile-history-empty');
  const grouped = Storage.getGroupedHistory();

  if (!listEl) return;

  // grouped 是对象 { "今天": [...], "昨天": [...], "dayLabel": [...] }
  const entries = Object.entries(grouped);

  if (entries.length === 0) {
    listEl.innerHTML = '';
    if (emptyEl) emptyEl.classList.remove('hidden');
    return;
  }

  if (emptyEl) emptyEl.classList.add('hidden');

  // 分组模板与星期推导下沉到 ViewModel（纯函数，可单测）
  listEl.innerHTML = ViewModel.buildProfileHistoryHtml(grouped);
}

// ========== 更新顶部用户栏 ==========
function updateUserBar() {
  const iconEl = document.getElementById('user-avatar-icon');
  const nameEl = document.getElementById('user-display-name');

  if (Auth.isLoggedIn()) {
    const nickname = Auth.getNickname();
    if (nameEl) nameEl.textContent = nickname;
    if (iconEl) iconEl.textContent = ViewModel.getAvatarEmoji(nickname);
  } else {
    if (nameEl) nameEl.textContent = '未登录';
    if (iconEl) iconEl.textContent = '👤';
  }
}

// ========== iOS 13+ 设备运动权限申请 ==========
// 必须在用户手势（点击）中调用，否则授权框不会弹出。
let motionPermissionRequested = false;

function requestMotionPermission() {
  if (motionPermissionRequested) return;

  if (typeof DeviceMotionEvent === 'undefined' ||
    typeof DeviceMotionEvent.requestPermission !== 'function') {
    // 安卓 / 桌面浏览器无需授权
    motionPermissionRequested = true;
    return;
  }

  motionPermissionRequested = true;
  DeviceMotionEvent.requestPermission()
    .then(state => {
      if (state !== 'granted') {
        const hint = document.getElementById('shake-hint-mobile');
        if (hint) hint.textContent = '📱 未获得运动权限，请点击签筒抽签';
      }
    })
    .catch(err => console.warn('[摇一摇] 权限申请失败:', err));
}

// ========== 监听设备摇晃 ==========
function initShakeListener() {
  if (typeof DeviceMotionEvent === 'undefined') return;

  let lastShakeTime = 0;
  const SHAKE_THRESHOLD = 15;

  window.addEventListener('devicemotion', (event) => {
    if (Router.currentPage !== 'shake') return;
    if (Lottery.isDrawing) return;

    const acc = event.accelerationIncludingGravity;
    if (!acc) return;

    const magnitude = Math.sqrt(
      (acc.x || 0) ** 2 + (acc.y || 0) ** 2 + (acc.z || 0) ** 2
    );

    const now = Date.now();
    if (magnitude > SHAKE_THRESHOLD && now - lastShakeTime > 2000) {
      lastShakeTime = now;
      doShake();
    }
  });
}

// ========== 初始化 ==========
function init() {
  // 初始化本地认证会话
  Auth.init();

  // 跨天重置
  Auth.resetTodayIfNeeded();

  // 背景粒子
  initBgParticles();

  // 更新顶部用户栏状态
  updateUserBar();

  // 监听认证状态变化
  Auth.onChange((loggedIn, user) => {
    updateUserBar();
    if (!loggedIn) {
      if (Router.currentPage === 'profile') {
        goHome();
      }
    }
  });

  // 广告SDK初始化
  AdSDK.init({
    platform: 'mock',
    enabled: true,
  });

  // 更新首页剩余次数
  updateRemainDisplay();

  // 渲染权益解锁状态
  renderUnlockEntries();

  // 首页默认选中"日常"
  selectScene('daily');

  // 监听设备摇晃
  initShakeListener();

  // 处理浏览器后退
  window.addEventListener('popstate', () => {
    goHome();
  });

  console.log('🏮 一键上上签 - 初始化完成');
  console.log('👤 登录状态:', Auth.isLoggedIn() ? `已登录(${Auth.getNickname()})` : '未登录');
  console.log('💾 数据存储: 本地 LocalStorage');
}

// 启动应用
document.addEventListener('DOMContentLoaded', init);

// ==================== 全局错误处理 ====================
window.addEventListener('error', (e) => {
  console.error('[全局捕获]', e.message, e.filename, e.lineno);
  if (e.error instanceof Error) {
    Toast.show('出了点小问题，请刷新页面重试', 2600);
  }
});

window.addEventListener('unhandledrejection', (e) => {
  console.error('[Promise异常]', e.reason);
  Toast.show('操作未能完成，请稍后再试', 2600);
});

// 全局阻止移动端长按弹出的默认菜单
// 例外：海报图片必须允许长按（微信 / iOS 保存相册的唯一方式）
document.addEventListener('contextmenu', (e) => {
  if (e.target.closest('.poster-image')) return;
  if (e.target.closest('button, a, [onclick], #app')) {
    e.preventDefault();
  }
});

// 阻止双击缩放
let lastTouchEnd = 0;
document.addEventListener('touchend', (e) => {
  const now = Date.now();
  if (now - lastTouchEnd <= 300) {
    e.preventDefault();
  }
  lastTouchEnd = now;
}, { passive: false });
