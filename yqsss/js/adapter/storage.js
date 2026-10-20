// ============================================
// 一键上上签 - 存储适配器（平台抽象层）
// ============================================
// 计划书 §6.5-4：抽出 get / set / remove 接口，localStorage 只是其中一种实现。
// 迁移到小程序时，只需新增一个 WxStorageBackend 并 StorageAdapter.use(...)，
// 上层 Storage / Auth 无需改动。
//
// 约束：本文件不认识任何业务 key，只负责「字符串读写 + JSON 编解码」。

// ---------- 后端 1：浏览器 localStorage（隐私模式下可能抛异常） ----------
const LocalStorageBackend = {
  name: 'localStorage',
  available() {
    try {
      return typeof localStorage !== 'undefined' && localStorage !== null;
    } catch {
      return false;
    }
  },
  getItem(key) {
    try {
      return localStorage.getItem(key);
    } catch {
      return null;
    }
  },
  setItem(key, value) {
    try {
      localStorage.setItem(key, value);
      return true;
    } catch (e) {
      console.warn('localStorage 写入失败:', e);
      return false;
    }
  },
  removeItem(key) {
    try {
      localStorage.removeItem(key);
    } catch { /* ignore */ }
  },
};

// ---------- 后端 2：内存（Node 单测 / 无痕模式降级） ----------
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
  LocalStorageBackend,
  MemoryStorageBackend,

  _backend: null,

  // 切换后端（小程序接入点）
  use(backend) {
    if (backend && typeof backend.getItem === 'function') {
      this._backend = backend;
    }
  },

  // 惰性选择默认后端：优先 localStorage，不可用则内存
  _resolve() {
    if (this._backend) return this._backend;
    if (LocalStorageBackend.available()) {
      this._backend = LocalStorageBackend;
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

// 双出口：浏览器（经典脚本）走全局词法绑定，Node/Vitest 走 CommonJS。
if (typeof module !== 'undefined' && module.exports) {
  module.exports = StorageAdapter;
}
