/**
 * 分享能力统一封装
 *
 * 背景：微信小程序的「分享到朋友圈」(shareTimeline) 不是基础能力，需要同时满足
 *   1. 页面 JSON 声明 enableShareTimeline: true
 *   2. 开发者工具「详情 → 本地设置 → 启用分享到朋友圈」勾选
 *   3. 公众平台后台「功能 → 推广 → 分享到朋友圈」能力已开通（个人主体常未开）
 * 任一不满足，wx.showShareMenu 会直接 fail: no permission，且**连「转发给好友」
 * 这一基础项也一并失效**。
 *
 * 策略：
 *   - 默认只申请「转发给好友」(shareAppMessage)，这是基础能力，无需任何权限；
 *   - 朋友圈能力开通后，把 SHARE_TIMELINE_ENABLED 置 true 即可，无需改业务代码；
 *   - 任何情况下都显式 catch，避免 UnhandledPromiseRejection（真机计异常上报）。
 */

/** 是否申请开启「分享到朋友圈」——需先完成微信认证/备案并在后台开通该能力 */
export const SHARE_TIMELINE_ENABLED = false;

/**
 * 开启右上角「···」菜单的分享入口
 */
export function enableShareMenu() {
  // #ifdef MP-WEIXIN
  const full = ['shareAppMessage', 'shareTimeline'];
  const basic = ['shareAppMessage'];

  const invoke = (menus, onFail) => {
    try {
      uni.showShareMenu({
        menus,
        success: () => { /* 菜单已开启 */ },
        fail: () => {
          // 朋友圈能力不可用 → 降级为仅开启「转发给好友」，保住核心裂变链路
          if (onFail) onFail();
        },
      });
    } catch (e) {
      if (onFail) onFail();
    }
  };

  if (SHARE_TIMELINE_ENABLED) {
    invoke(full, () => invoke(basic, null));
  } else {
    invoke(basic, null);
  }
  // #endif
}

export default {
  enableShareMenu,
  SHARE_TIMELINE_ENABLED,
};
