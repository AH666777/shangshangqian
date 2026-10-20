// ============================================
// 一键上上签 - 海报生成模块
// ============================================

const Poster = {
  currentFortune: null,

  // ========== 生成海报HTML ==========
  generate(fortune, scene) {
    this.currentFortune = fortune;

    // 等级配色统一由 Lottery 维护，避免多处重复维护
    const bgColor = Lottery.LEVEL_COLOR[fortune.level] || '#D4A017';

    const canvas = document.getElementById('poster-canvas');
    if (!canvas) return null;

    canvas.innerHTML = `
      <div style="
        position: absolute;
        top: 0; left: 0; right: 0; bottom: 0;
        background: linear-gradient(160deg, #1a0a2e 0%, #2d1b4e 40%, #1a0a2e 100%);
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: space-between;
        padding: 24px 20px;
      ">
        <!-- 顶部装饰 -->
        <div style="text-align: center; width: 100%;">
          <div style="font-size: 40px; margin-bottom: 4px;">🏮</div>
          <div style="
            font-family: 'STKaiti', 'KaiTi', '楷体', serif;
            font-size: 18px;
            font-weight: bold;
            color: #D4A017;
            letter-spacing: 8px;
          ">一键上上签</div>
        </div>

        <!-- 签文卡片 -->
        <div style="
          width: 100%;
          background: rgba(255,255,255,0.06);
          border: 2px solid rgba(212,160,23,0.4);
          border-radius: 20px;
          padding: 16px;
          text-align: center;
        ">
          <!-- 等级标签 -->
          <span style="
            display: inline-block;
            background: ${bgColor};
            color: #FFE0B2;
            padding: 4px 16px;
            border-radius: 20px;
            font-size: 13px;
            font-weight: bold;
            margin-bottom: 8px;
            letter-spacing: 2px;
          ">${fortune.level}</span>

          <!-- 签文标题 -->
          <div style="
            font-family: 'STKaiti', 'KaiTi', '楷体', serif;
            font-size: 22px;
            font-weight: bold;
            color: #FFC107;
            margin-bottom: 8px;
            letter-spacing: 3px;
          ">${fortune.title}</div>

          <!-- 签诗 -->
          <div style="
            font-family: 'STKaiti', 'KaiTi', '楷体', serif;
            font-size: 13px;
            color: rgba(255,255,255,0.75);
            line-height: 2;
            white-space: pre-line;
          ">${fortune.poem}</div>

          <!-- 幸运信息 -->
          <div style="
            display: flex;
            justify-content: space-around;
            margin-top: 10px;
            padding-top: 10px;
            border-top: 1px solid rgba(212,160,23,0.2);
            font-size: 11px;
            color: rgba(255,255,255,0.55);
          ">
            <span>🎨 幸运色：${fortune.lucky.color}</span>
            <span>🔢 幸运数：${fortune.lucky.number}</span>
            <span>🧭 ${fortune.lucky.direction}</span>
          </div>
        </div>

        <!-- 底部信息 -->
        <div style="text-align: center; width: 100%;">
          <div style="
            font-size: 12px;
            color: rgba(255,255,255,0.4);
            letter-spacing: 2px;
          ">${Lottery.getSceneName(scene)} · ${new Date().toLocaleDateString('zh-CN')}</div>
          <div style="
            font-size: 10px;
            color: rgba(212,160,23,0.4);
            margin-top: 4px;
          ">扫码摇一摇，看看你的今日好运 →</div>
        </div>
      </div>
    `;

    // 重置上一次生成的图片，回到 DOM 预览态
    this._dataUrl = null;
    const img = document.getElementById('poster-image');
    if (img) {
      img.classList.add('hidden');
      img.removeAttribute('src');
    }
    canvas.classList.remove('hidden');

    return canvas;
  },

  // 生成后的图片缓存（避免重复截图）
  _dataUrl: null,
  _libPromise: null,

  // html2canvas 备用 CDN（按顺序尝试）
  CDN_LIST: [
    'https://cdn.jsdelivr.net/npm/html2canvas@1.4.1/dist/html2canvas.min.js',
    'https://unpkg.com/html2canvas@1.4.1/dist/html2canvas.min.js',
    'https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js',
  ],

  // ========== 按需加载 html2canvas ==========
  // 只有用户真正保存海报时才加载，避免首屏加载 200KB 的第三方脚本；
  // 同时提供多 CDN 兜底，替换掉原先不稳定的 document.write 方案。
  _loadLib() {
    if (window.html2canvas) return Promise.resolve(window.html2canvas);
    if (this._libPromise) return this._libPromise;

    this._libPromise = new Promise((resolve, reject) => {
      const tryLoad = (index) => {
        if (index >= this.CDN_LIST.length) {
          this._libPromise = null;
          reject(new Error('html2canvas 加载失败'));
          return;
        }
        const script = document.createElement('script');
        script.src = this.CDN_LIST[index];
        script.async = true;
        script.crossOrigin = 'anonymous';
        script.referrerPolicy = 'no-referrer';
        script.onload = () => {
          if (window.html2canvas) resolve(window.html2canvas);
          else tryLoad(index + 1);
        };
        script.onerror = () => {
          script.remove();
          console.warn('[Poster] CDN 加载失败，切换备用源:', this.CDN_LIST[index]);
          tryLoad(index + 1);
        };
        document.head.appendChild(script);
      };
      tryLoad(0);
    });

    return this._libPromise;
  },

  // ========== 将海报 DOM 渲染为 PNG dataURL ==========
  async buildImage() {
    if (this._dataUrl) return this._dataUrl;

    const canvas = document.getElementById('poster-canvas');
    if (!canvas) {
      Toast.show('海报生成失败，请重试');
      return null;
    }

    try {
      const html2canvas = await this._loadLib();

      // 等待一帧，确保 DOM 布局与字体已就绪
      await new Promise(resolve => requestAnimationFrame(() => setTimeout(resolve, 60)));

      const rendered = await html2canvas(canvas, {
        backgroundColor: '#1a0a2e',
        scale: 2,        // 2 倍清晰度
        useCORS: true,
        logging: false,
      });

      this._dataUrl = rendered.toDataURL('image/png', 1);
      return this._dataUrl;
    } catch (e) {
      console.error('海报生成失败:', e);
      Toast.show('海报生成失败，请稍后重试');
      return null;
    }
  },

  // ========== 展示图片：微信 / iOS 只能通过长按保存 ==========
  showImage(dataUrl) {
    const img = document.getElementById('poster-image');
    const canvas = document.getElementById('poster-canvas');
    if (!img) return;

    img.src = dataUrl;
    img.classList.remove('hidden');
    if (canvas) canvas.classList.add('hidden');
  },

  // ========== 下载海报（桌面 / 安卓浏览器） ==========
  downloadImage(dataUrl) {
    const link = document.createElement('a');
    link.download = `一键上上签_${Date.now()}.png`;
    link.href = dataUrl;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  },

  // ========== dataURL -> File（供系统分享使用） ==========
  _dataUrlToFile(dataUrl, filename) {
    const [meta, base64] = dataUrl.split(',');
    const mime = (meta.match(/:(.*?);/) || [, 'image/png'])[1];
    const binary = atob(base64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
    return new File([bytes], filename, { type: mime });
  },

  // ========== 保存 / 分享海报（统一入口） ==========
  async save() {
    const dataUrl = await this.buildImage();
    if (!dataUrl) return false;

    // 一定先把图片渲染出来，保证「长按保存」始终可用
    this.showImage(dataUrl);

    const ua = navigator.userAgent;
    const isWechat = /micromessenger/i.test(ua);
    const isIOS = /iPad|iPhone|iPod/.test(ua) ||
      (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);

    // 1) 非微信环境优先调用系统分享（可「存储图像」或直接发送）
    if (!isWechat && typeof navigator.share === 'function') {
      try {
        const file = this._dataUrlToFile(dataUrl, `一键上上签_${Date.now()}.png`);
        if (typeof navigator.canShare !== 'function' || navigator.canShare({ files: [file] })) {
          await navigator.share({ files: [file], title: '一键上上签', text: '看看我抽到的好运签' });
          return true;
        }
      } catch (e) {
        if (e && e.name === 'AbortError') return true; // 用户主动取消
        console.warn('[Poster] 系统分享失败，回退到长按/下载:', e);
      }
    }

    // 2) 微信 / iOS：不支持下载，只能长按图片保存
    if (isWechat || isIOS) {
      Toast.show('长按上方图片即可保存到相册', 2600);
      return true;
    }

    // 3) 其余环境：直接下载
    this.downloadImage(dataUrl);
    Toast.show('海报已保存到相册');
    return true;
  },
};
