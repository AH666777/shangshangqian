// ============================================
// 一键上上签 - 存储适配器（uni-app 版）
// ============================================
// 计划书 §6.5-4：localStorage 只是其中一种实现。迁移到小程序时，
// 只需新增一个后端实现并 StorageAdapter.use(...)，上层 Storage / Auth 无需改动。
//
// uni-app 场景下直接用 uni.getStorageSync / setStorageSync / removeStorageSync：
// 同一套后端在 H5、微信小程序、抖音、支付宝、App 上全部可用，
// 无需再区分浏览器与小程序的存储实现。
//
// 约束：本文件不认识任何业务 key，只负责「字符串读写 + JSON 编解码」。

// ---------- 后端 1：uni 统一存储（全平台） ----------
const UniStorageBackend = {
  name: 'uniStorage',
  available() {
    return typeof uni !== 'undefined' && typeof uni.getStorageSync === 'function';
  },
  getItem(key) {
    try {
      const v = uni.getStorageSync(key);
      // uni.getStorageSync 在 key 不存在时返回空字符串，统一归一化为 null
      return (v === '' || v === undefined || v === null) ? null : v;
    } catch {
      return null;
    }
  },
  setItem(key, value) {
    try {
      uni.setStorageSync(key, value);
      return true;
    } catch (e) {
      console.warn('uni 存储写入失败:', e);
      return false;
    }
  },
  removeItem(key) {
    try {
      uni.removeStorageSync(key);
    } catch { /* ignore */ }
  },
};

// ---------- 后端 2：内存（降级：无 uni 环境 / 单测） ----------
const MemoryStorageBackend = {
  name: 'memory',
  _map: new Map(),
  available() {
    return true;
  },
  getItem(key) {
    return this._map.has(key) ? this._map.get(key) : null;
  },
  setItem(key, value) {
    this._map.set(key, String(value));
    return true;
  },
  removeItem(key) {
    this._map.delete(key);
  },
};

const StorageAdapter = {
  UniStorageBackend,
  MemoryStorageBackend,

  _backend: null,

  // 切换后端（未来接后端时可替换为远端实现）
  use(backend) {
    if (backend && typeof backend.getItem === 'function') {
      this._backend = backend;
    }
  },

  // 惰性选择默认后端：优先 uni 存储，不可用则内存
  _resolve() {
    if (this._backend) return this._backend;
    if (UniStorageBackend.available()) {
      this._backend = UniStorageBackend;
    } else {
      this._backend = MemoryStorageBackend;
    }
    return this._backend;
  },

  // ---------- 字符串级接口 ----------
  getItem(key) {
    return this._resolve().getItem(key);
  },

  setItem(key, value) {
    return this._resolve().setItem(key, value);
  },

  removeItem(key) {
    return this._resolve().removeItem(key);
  },

  // ---------- JSON 级接口 ----------
  get(key, defaultValue = null) {
    try {
      const raw = this.getItem(key);
      return raw ? JSON.parse(raw) : defaultValue;
    } catch {
      return defaultValue;
    }
  },

  set(key, value) {
    return this.setItem(key, JSON.stringify(value));
  },

  remove(key) {
    this.removeItem(key);
  },
};

export default StorageAdapter;
