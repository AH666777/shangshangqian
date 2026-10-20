// ============================================
// 一键上上签 - 广告SDK封装
// 预留广告接口，支持快速接入不同平台
// ============================================

const AdSDK = {
  // 广告配置
  config: {
    // 广告单元ID（接入真实SDK时替换）
    rewardVideoUnitId: '',
    // 是否启用广告
    enabled: true,
    // 广告平台：'mock' | 'wechat' | 'web'
    platform: 'mock',
  },

  // 广告状态
  state: {
    isLoading: false,
    isReady: false,
    lastWatchTime: 0,
  },

  // ========== 初始化广告 ==========
  init(config = {}) {
    this.config = { ...this.config, ...config };

    if (this.config.platform === 'wechat') {
      this._initWechatAd();
    } else if (this.config.platform === 'web') {
      this._initWebAd();
    } else {
      // Mock模式：模拟广告流程
      console.log('[AdSDK] 使用Mock广告模式');
    }
  },

  _initWechatAd() {
    // 微信小程序激励视频广告初始化
    // if (typeof wx !== 'undefined' && wx.createRewardedVideoAd) {
    //   this.rewardedVideoAd = wx.createRewardedVideoAd({
    //     adUnitId: this.config.rewardVideoUnitId
    //   });
    //   this._bindWechatEvents();
    // }
  },

  _initWebAd() {
    // H5广告SDK初始化
    // 可接入Google AdSense、穿山甲H5等
  },

  // ========== 真实广告是否就绪 ==========
  _realAdReady() {
    if (this.config.platform === 'wechat') {
      return typeof wx !== 'undefined' && !!wx.createRewardedVideoAd && !!this.rewardedVideoAd;
    }
    if (this.config.platform === 'web') {
      return !!this.webAdInstance;
    }
    return false;
  },

  // ========== 显示激励视频 ==========
  showRewardVideo(rewardType) {
    return new Promise((resolve, reject) => {
      if (!this.config.enabled) {
        // 广告未启用，直接给奖励（开发测试用）
        resolve({ type: rewardType, adEnabled: false });
        return;
      }

      const platform = this.config.platform;

      // 关键：微信 / H5 原生广告尚未接入时必须回退到 Mock。
      // 否则 _showWechatAd() 等空实现会让 Promise 永不 settle，
      // 表现为「点击按钮后一直无响应」。
      if (platform === 'mock' || !this._realAdReady()) {
        if (platform !== 'mock') {
          console.warn(`[AdSDK] ${platform} 广告尚未接入，自动回退到 Mock 模式`);
        }
        this._showMockAd(rewardType, resolve, reject);
        return;
      }

      if (platform === 'wechat') {
        this._showWechatAd(resolve, reject);
      } else {
        this._showWebAd(resolve, reject);
      }
    });
  },

  // ========== Mock广告（模拟激励视频） ==========
  _showMockAd(rewardType, resolve, reject) {
    // 显示模拟广告遮罩
    const overlay = document.createElement('div');
    overlay.className = 'fixed inset-0 z-[90] bg-black/90 backdrop-blur-sm flex flex-col items-center justify-center';
    overlay.innerHTML = `
      <div class="text-center animate-fadeIn px-6">
        <div class="text-5xl mb-4">📺</div>
        <p class="text-white text-lg font-bold mb-2">观看广告获取奖励</p>
        <p class="text-white/60 text-sm mb-6">广告剩余 <span id="ad-countdown">3</span> 秒</p>
        <div class="w-64 h-1.5 bg-white/20 rounded-full overflow-hidden mb-6">
          <div id="ad-progress" class="h-full bg-gold-500 rounded-full transition-all duration-1000" style="width: 0%"></div>
        </div>
        <p class="text-white/40 text-xs">广告结束后自动获得奖励</p>
      </div>
    `;
    document.body.appendChild(overlay);

    // 倒计时动画
    let countdown = 3;
    const countdownEl = overlay.querySelector('#ad-countdown');
    const progressEl = overlay.querySelector('#ad-progress');

    const timer = setInterval(() => {
      // 遮罩被外部移除（如页面刷新/异常）时立即停止，避免定时器泄漏
      if (!overlay.isConnected || !countdownEl || !progressEl) {
        clearInterval(timer);
        overlay.remove();
        reject(new Error('广告窗口已关闭'));
        return;
      }

      countdown--;
      countdownEl.textContent = countdown;
      progressEl.style.width = `${((3 - countdown) / 3) * 100}%`;

      if (countdown <= 0) {
        clearInterval(timer);
        overlay.style.opacity = '0';
        overlay.style.transition = 'opacity 0.3s';
        setTimeout(() => overlay.remove(), 300);

        // 广告观看完成，发放奖励
        resolve({
          success: true,
          type: rewardType,
          adEnabled: true,
        });
      }
    }, 1000);

    // 倒计时防作弊：提前关闭不给奖励
    overlay.addEventListener('click', (e) => {
      if (countdown > 0) {
        e.stopPropagation();
        Toast.show(`广告还有 ${countdown} 秒，请耐心观看~`);
      }
    });
  },

  _showWechatAd(resolve, reject) {
    // 微信激励视频广告
    // this.rewardedVideoAd.show().catch(() => {
    //   this.rewardedVideoAd.load().then(() => this.rewardedVideoAd.show());
    // });
  },

  _showWebAd(resolve, reject) {
    // H5广告
  },

  // ========== 广告奖励处理 ==========
  async watchAdForReward(rewardType) {
    try {
      const result = await this.showRewardVideo(rewardType);

      // 根据奖励类型发放奖励
      switch (rewardType) {
        case 'extra_draws': {
          // 额外抽签次数（通过回退当日计数实现）
          const currentCount = Storage.getTodayCount();
          Storage.set(Storage.KEYS.TODAY_RECORD, {
            date: Storage._today(),
            count: Math.max(0, currentCount - 1), // 减少计数 = 增加可用次数
          });
          Toast.show('🎉 获得额外抽签次数！');
          break;
        }

        case 'premium_fortunes':
          Storage.unlockFeature('premiumFortunes');
          Toast.show('🔮 高级签文已解锁！锦鲤签等你来抽');
          break;

        case 'deep_analysis':
          Storage.unlockFeature('deepAnalysis');
          Toast.show('📖 深度解签已解锁！');
          break;

        case 'unlimited_draws':
          Storage.unlockFeature('unlimitedDraws');
          Toast.show('♾️ 无限抽签已解锁！畅快抽到满意为止');
          break;

        default:
          break;
      }

      return result;
    } catch (e) {
      console.warn('广告观看失败:', e);
      Toast.show('广告加载失败，请稍后再试');
      return null;
    }
  },
};
