<template>
  <view class="page-root">
    <view class="top-bar">
      <view class="back-btn" @click="goBack">← 返回</view>
      <text class="page-title">{{ doc.title }}</text>
      <view style="width: 96rpx;"></view>
    </view>

    <text class="meta">{{ doc.meta }}</text>

    <view v-for="(b, i) in doc.blocks" :key="i" class="blk">
      <!-- 重点提示卡片 -->
      <view v-if="b.t === 'card'" class="card" :class="{ warn: b.warn }">
        <text>{{ b.text }}</text>
      </view>

      <!-- 章节标题 -->
      <text v-else-if="b.t === 'h2'" class="blk-h2">{{ b.text }}</text>

      <!-- 段落 -->
      <text v-else-if="b.t === 'p'" class="blk-p">{{ b.text }}</text>

      <!-- 无序列表 -->
      <view v-else-if="b.t === 'ul'" class="blk-ul">
        <text v-for="(li, k) in b.items" :key="k" class="blk-li">· {{ li }}</text>
      </view>

      <!-- 表格 -->
      <view v-else-if="b.t === 'table'" class="blk-table">
        <view class="tr tr-head">
          <text v-for="(h, k) in b.head" :key="k" class="td">{{ h }}</text>
        </view>
        <view v-for="(row, r) in b.rows" :key="r" class="tr">
          <text v-for="(cell, c) in row" :key="c" class="td">{{ cell }}</text>
        </view>
      </view>
    </view>

    <view class="legal-links">
      <text @click="open('terms')">用户协议</text>
      <text @click="open('privacy')">隐私政策</text>
    </view>
  </view>
</template>

<script>
const DOCS = {
  privacy: {
    title: '隐私政策',
    meta: '生效日期：2026 年 9 月 13 日　|　版本：v1.0',
    blocks: [
      { t: 'card', text: '一句话说明：「一键上上签」是一款纯前端国风趣味抽签小游戏。我们不收集、不上传、不出售你的任何个人信息，你产生的全部数据只保存在你自己的设备上。' },
      { t: 'h2', text: '一、我们如何处理你的信息' },
      { t: 'p', text: '本产品无需注册账号即可完整体验。你在使用过程中产生或填写的信息，全部仅保存在你的设备本地，不会上传到我们的服务器（本产品当前不存在业务服务器）。' },
      {
        t: 'table',
        head: ['信息项', '用途', '存储位置'],
        rows: [
          ['昵称', '仅用于在页面内展示你的称呼，便于区分不同使用者', '你设备的本地存储'],
          ['抽签记录与统计', '展示历史签文、累计抽签次数、抽签天数', '你设备的本地存储'],
          ['权益与次数状态', '记录每日剩余次数、已解锁的功能', '你设备的本地存储'],
        ],
      },
      { t: 'p', text: '上述数据均以 yqsss_ 为前缀保存在本地。你可以随时在游戏内「清空记录」删除抽签历史，或卸载应用将全部本地数据一并删除。' },
      { t: 'h2', text: '二、我们申请的权限及用途' },
      {
        t: 'table',
        head: ['权限', '用途', '是否必需'],
        rows: [
          ['设备运动传感器', '用于「摇一摇」抽签', '否，可改用点击签筒抽签'],
          ['相册写入权限', '用于将你生成的签文海报保存到相册', '否，仅点击「保存海报」时申请'],
        ],
      },
      { t: 'p', text: '以上权限均需你主动授权后才会生效，你可以随时在系统设置中关闭，关闭后不影响其他功能的正常使用。' },
      { t: 'h2', text: '三、第三方服务' },
      {
        t: 'ul',
        items: [
          '海报生成：当你点击「保存海报」时，会从公共 CDN 加载开源的图片生成库，该 CDN 服务商可能获取你的网络请求信息（如 IP），属于常规技术行为。',
          '广告服务：当你选择「看广告解锁」时，广告由对应平台（如微信广告组件）提供，广告平台可能依据其隐私政策收集设备与广告互动信息。',
        ],
      },
      { t: 'p', text: '除上述情形外，本产品不向任何第三方提供、共享或出售你的信息。' },
      { t: 'h2', text: '四、未成年人保护' },
      { t: 'p', text: '本产品为休闲娱乐内容，适合各年龄段用户使用。若你是未满 14 周岁的未成年人，请在监护人陪同与同意下使用。我们不会主动收集未成年人的个人信息。' },
      { t: 'h2', text: '五、数据安全' },
      { t: 'p', text: '由于全部数据仅存储于你的设备本地，其安全性取决于你设备自身的安全设置。请注意：清除应用数据、卸载应用或更换设备都将导致本地数据永久丢失，且无法恢复。' },
      { t: 'h2', text: '六、本政策的更新' },
      { t: 'p', text: '若本产品未来新增云端账户、会员或其他涉及数据处理的功能，我们将在功能上线前更新本政策并显著提示。继续使用即表示你接受更新后的政策。' },
      { t: 'h2', text: '七、联系我们' },
      { t: 'p', text: '如你对本隐私政策有任何疑问、意见或投诉，可通过游戏内反馈入口或下方邮箱联系，我们将在收到后 15 个工作日内回复。' },
      { t: 'p', text: '联系邮箱：（请在正式上线前替换为你的真实联系邮箱）' },
    ],
  },

  terms: {
    title: '用户协议',
    meta: '生效日期：2026 年 9 月 13 日　|　版本：v1.0',
    blocks: [
      { t: 'card', warn: true, text: '重要提示：「一键上上签」是一款国风趣味娱乐小游戏，不是占卜、算命、命理测算或任何形式的前途预测服务。产品内全部签文、签诗与解读均为原创文学创作与心理暗示文本，仅供娱乐与解压参考，不构成任何命运预测、投资、医疗、婚恋、法律或其他专业建议。请理性看待，切勿据此做出任何实际决策。' },
      { t: 'h2', text: '一、服务内容' },
      { t: 'p', text: '本产品为用户提供以中国传统文化「签」为视觉与文案载体的趣味抽签娱乐体验，主要功能包括：选择场景、抽签、查看签文与解读、生成分享海报、查看历史记录等。' },
      { t: 'p', text: '本产品当前完全运行于你的设备本地，不依赖业务服务器，无需注册真实身份即可使用。' },
      { t: 'h2', text: '二、娱乐性质与用户须知' },
      {
        t: 'ul',
        items: [
          '签文中的「上上签」「蓄力签」等表述为游戏化的等级标签，仅代表文案分类，不代表对现实生活的任何预测或判断。',
          '解读文本中的行动建议属于一般性生活提醒与正向心理暗示，不具有专业咨询效力。',
          '涉及健康、财务、法律、婚恋等重大事项时，请务必咨询具备相应资质的专业人士。',
          '请勿将本产品用于任何形式的商业宣传、医疗宣称、投资诱导或封建迷信活动。',
        ],
      },
      { t: 'h2', text: '三、虚拟权益说明' },
      { t: 'p', text: '本产品可能通过观看广告等方式，为你解锁额外的抽签次数、深度解读等内容。相关说明如下：' },
      {
        t: 'ul',
        items: [
          '通过观看广告获得的权益仅在本设备本地生效，清除本地数据后将一并失效。',
          '虚拟权益不可转让、不可兑换现金、不可跨设备转移。',
          '若本产品未来上线付费会员服务，我们将另行公示价格、权益范围、有效期与退款规则。虚拟商品一经开通使用，除法律法规另有规定或平台规则另有要求外，不予退款。',
        ],
      },
      { t: 'h2', text: '四、用户行为规范' },
      { t: 'p', text: '你在使用本产品时，应遵守中华人民共和国相关法律法规及各平台规则，不得利用本产品从事下列行为：' },
      {
        t: 'ul',
        items: [
          '发布、传播违法违规、色情低俗、暴力恐怖、虚假或侵权内容；',
          '以本产品名义开展算命、占卜、收费取名等经营活动，或诱导他人付费；',
          '通过技术手段批量刷取次数、篡改本地数据、破解或干扰产品正常运行；',
          '将本产品内容用于误导他人、实施诈骗或其他损害他人合法权益的用途。',
        ],
      },
      { t: 'h2', text: '五、知识产权' },
      { t: 'p', text: '本产品的界面设计、签文库、签诗、解读文案及相关素材，均由我们原创创作或已获得合法授权，受著作权法保护。未经许可，不得用于商业用途的复制、转载、改编或二次分发。' },
      { t: 'p', text: '你在使用本产品过程中自行生成的海报图片，可用于个人社交分享，但不得用于商业宣传或虚假宣称。' },
      { t: 'h2', text: '六、免责声明' },
      {
        t: 'ul',
        items: [
          '本产品内容仅供娱乐，不构成任何形式的承诺、保证或专业建议。',
          '因你自行依据游戏内容做出任何决策而产生的后果，由你自行承担。',
          '因设备差异、兼容性、网络状况或第三方服务原因导致的功能异常，我们将尽力修复，但不承担因此产生的间接损失。',
          '本地数据因你清除数据、卸载应用或更换设备而丢失的，无法恢复，我们不承担相应责任。',
        ],
      },
      { t: 'h2', text: '七、协议变更与终止' },
      { t: 'p', text: '我们可能根据法律法规或产品功能变化更新本协议，更新后将在产品内显著位置提示。若你不同意变更内容，请停止使用本产品；继续使用即视为接受变更后的协议。' },
      { t: 'h2', text: '八、联系我们' },
      { t: 'p', text: '如你对本协议有任何疑问、意见或投诉，可通过游戏内反馈入口或下方邮箱联系，我们将在收到后 15 个工作日内回复。' },
      { t: 'p', text: '联系邮箱：（请在正式上线前替换为你的真实联系邮箱）' },
    ],
  },
};

export default {
  data() {
    return {
      type: 'privacy',
    };
  },

  computed: {
    doc() {
      return DOCS[this.type] || DOCS.privacy;
    },
  },

  onLoad(options) {
    if (options && options.type && DOCS[options.type]) {
      this.type = options.type;
    }
    // 动态设置导航栏标题，增强可读性
    uni.setNavigationBarTitle({ title: this.doc.title });
  },

  methods: {
    goBack() {
      uni.navigateBack({ delta: 1, fail: () => uni.reLaunch({ url: '/pages/index/index' }) });
    },
    open(type) {
      this.type = type;
      uni.setNavigationBarTitle({ title: this.doc.title });
    },
  },
};
</script>

<style scoped>
.meta {
  display: block;
  text-align: center;
  font-size: 22rpx;
  color: rgba(255, 255, 255, 0.35);
  margin-bottom: 28rpx;
}
.blk { margin-bottom: 20rpx; }
.card {
  background: rgba(255, 255, 255, 0.05);
  border: 1rpx solid rgba(212, 160, 23, 0.25);
  border-radius: 16rpx;
  padding: 22rpx 24rpx;
  font-size: 26rpx;
  line-height: 1.8;
  color: rgba(255, 255, 255, 0.82);
}
.card.warn {
  background: rgba(196, 30, 58, 0.12);
  border-color: rgba(196, 30, 58, 0.4);
  color: rgba(255, 255, 255, 0.9);
}
.blk-h2 {
  display: block;
  font-size: 30rpx;
  font-weight: bold;
  color: #D4A017;
  margin: 28rpx 0 12rpx;
  padding-left: 16rpx;
  border-left: 6rpx solid rgba(212, 160, 23, 0.6);
}
.blk-p {
  display: block;
  font-size: 26rpx;
  line-height: 1.85;
  color: rgba(255, 255, 255, 0.78);
}
.blk-ul { margin: 4rpx 0; }
.blk-li {
  display: block;
  font-size: 26rpx;
  line-height: 1.8;
  color: rgba(255, 255, 255, 0.78);
  margin: 6rpx 0;
}
.blk-table {
  border: 1rpx solid rgba(255, 255, 255, 0.12);
  border-radius: 14rpx;
  overflow: hidden;
  margin: 12rpx 0;
}
.tr {
  display: flex;
  border-bottom: 1rpx solid rgba(255, 255, 255, 0.1);
}
.tr:last-child { border-bottom: none; }
.tr-head { background: rgba(212, 160, 23, 0.12); }
.td {
  flex: 1;
  padding: 16rpx 14rpx;
  font-size: 22rpx;
  line-height: 1.6;
  color: rgba(255, 255, 255, 0.75);
  border-right: 1rpx solid rgba(255, 255, 255, 0.08);
}
.td:last-child { border-right: none; }
.tr-head .td { color: #D4A017; font-weight: bold; }
</style>
