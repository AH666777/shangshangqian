// ============================================
// 一键上上签 - 签文库
// 覆盖四类签文 × 四大场景 × 五大维度
// ============================================

const FORTUNES = [
  // ==================== 上上签 (25%) ====================
  {
    id: "ss_001",
    level: "上上签",
    probability: 25,
    title: "鸿运当头",
    poem: "红日东升照九州，祥云瑞气满高楼。\n今朝喜得东风便，万事亨通不用愁。",
    analysis: {
      career: "事业状态正佳，也容易得到他人的帮助，近期可能有升职加薪的机会，不妨大胆展现你的才能。",
      study: "学业如日中天，考试运极强，复习的内容都能融会贯通，逢考必过。",
      wealth: "财运亨通，固定收入与额外收获都不错，但切忌贪心，稳扎稳打能守住财富。",
      health: "身体状况良好，精力充沛，适合开始新的健身计划，注意劳逸结合。",
      love: "感情氛围很好，单身者有机会遇见合得来的人，有伴侣者感情升温，甜蜜幸福。"
    },
    lucky: { color: "金色", number: "8", direction: "东南" },
    scenes: ["daily", "exam", "work", "festival"]
  },
  {
    id: "ss_002",
    level: "上上签",
    probability: 25,
    title: "步步高升",
    poem: "青云直上九重天，鹏程万里展新篇。\n自有贵人相扶助，功成名就在眼前。",
    analysis: {
      career: "事业正处于上升期，你的努力将被看见，重要项目或晋升机会即将到来。",
      study: "学业进步神速，理解力和记忆力都处于巅峰状态，把握住这段黄金时期。",
      wealth: "财运稳步上升，投资理财有好机会，可以考虑长期的财务规划。",
      health: "身强体健，精力充沛，但注意不要过度劳累，保持规律作息。",
      love: "感情状态顺遂，与伴侣沟通顺畅，单身者在职场或学习场合容易遇到聊得来的人。"
    },
    lucky: { color: "红色", number: "6", direction: "正南" },
    scenes: ["daily", "exam", "work", "festival"]
  },
  {
    id: "ss_003",
    level: "上上签",
    probability: 25,
    title: "吉星高照",
    poem: "北斗七星照门庭，祥光瑞气满堂中。\n所求之事皆如意，福禄双全喜气浓。",
    analysis: {
      career: "天时地利人和，你所从事的工作将迎来突破性进展，团队协作顺畅。",
      study: "灵感如泉涌，特别适合攻克难题，考试成绩会超出预期。",
      wealth: "可能有意外收获，但更重要的是把稳定的收入经营好。",
      health: "身心舒畅，免疫力增强，是调理身体的好时机。",
      love: "好的缘分来自真诚的相处与经营，保持开放心态迎接新可能。"
    },
    lucky: { color: "紫色", number: "9", direction: "正东" },
    scenes: ["daily", "exam", "work", "festival"]
  },
  {
    id: "ss_004",
    level: "上上签",
    probability: 25,
    title: "万事如意",
    poem: "春风得意马蹄疾，一路繁花相送时。\n心想事成皆有应，笑看人间好日迟。",
    analysis: {
      career: "一切都在往好的方向发展，你的计划和目标将逐一实现，保持信心。",
      study: "事半功倍的学习效率，所学科目都能轻松掌握，考试结果令人满意。",
      wealth: "财源广进，之前的投资将看到回报，可以考虑适度扩张。",
      health: "身体状态极佳，心情愉悦是最好的良药，保持积极心态。",
      love: "感情世界春暖花开，与爱人的关系更加亲密，单身者魅力四射。"
    },
    lucky: { color: "粉色", number: "3", direction: "西北" },
    scenes: ["daily", "exam", "work", "festival"]
  },
  {
    id: "ss_005",
    level: "上上签",
    probability: 25,
    title: "锦鲤附体",
    poem: "锦鲤一跃过龙门，好运连连福满门。\n天降祥瑞添喜气，一年好运从今分。",
    analysis: {
      career: "你就是今天的幸运儿！工作上一切阻碍都会迎刃而解，大胆去做你想做的事。",
      study: "考运爆棚，押题准确率高，关键知识点都能完美掌握。",
      wealth: "手头较为宽裕，可能有意外的小惊喜，但记得理性消费，好运也需要珍惜。",
      health: "活力满满，身心都在最佳状态，适合挑战新的运动目标。",
      love: "人缘很旺，走到哪里都容易成为焦点，不妨多主动与人交流。"
    },
    lucky: { color: "金色", number: "7", direction: "西南" },
    scenes: ["daily", "exam", "work", "festival"]
  },
  {
    id: "ss_006",
    level: "上上签",
    probability: 25,
    title: "财源广进",
    poem: "财如晓日腾云起，利似春潮带雨来。\n广开财路通四海，日进斗金笑颜开。",
    analysis: {
      career: "事业版图扩张的好时机，新项目或新方向值得大胆尝试。",
      study: "知识变现能力强，学以致用能带来可观收益。",
      wealth: "收入状况向好，可能有额外进账，但勿忘做好支出规划。",
      health: "财多身不弱，精神状态极佳，但勿因忙碌忽视身体。",
      love: "经济基础稳固让感情更有安全感，适合规划未来。"
    },
    lucky: { color: "金色", number: "8", direction: "正西" },
    scenes: ["daily", "exam", "work", "festival"]
  },
  {
    id: "ss_007",
    level: "上上签",
    probability: 25,
    title: "如鱼得水",
    poem: "如鱼得水任遨游，海阔天空竞自由。\n环境融通皆适意，所向披靡无烦忧。",
    analysis: {
      career: "新的环境或岗位非常适合你，能力和才华将得到充分施展。",
      study: "找到最适合的学习方法，效率倍增，乐在其中。",
      wealth: "在熟悉的领域深耕，财富增长水到渠成。",
      health: "身心舒畅，找到适合自己的运动方式，坚持下去。",
      love: "与伴侣相处融洽默契，共同的兴趣爱好让感情升温。"
    },
    lucky: { color: "蓝色", number: "5", direction: "正北" },
    scenes: ["daily", "exam", "work", "festival"]
  },
  {
    id: "ss_008",
    level: "上上签",
    probability: 25,
    title: "旗开得胜",
    poem: "旗开得胜第一功，马到成功气势雄。\n乘胜追击不停步，一路高歌向长空。",
    analysis: {
      career: "刚启动的项目或计划会有开门红，给你带来极大信心。",
      study: "第一仗打赢了，趁热打铁继续深造，进步会更快。",
      wealth: "首战告捷带来第一桶金，做好资金规划再接再厉。",
      health: "士气高昂身体棒，运动的成就感让你上瘾。",
      love: "主动出击终获回应，告白成功率很高。"
    },
    lucky: { color: "红色", number: "1", direction: "东南" },
    scenes: ["daily", "exam", "work", "festival"]
  },

  // ==================== 上吉签 (35%) ====================
  {
    id: "sj_001",
    level: "上吉签",
    probability: 35,
    title: "顺风顺水",
    poem: "一叶扁舟顺水流，清风送爽到桥头。\n虽无大浪惊涛起，却也安然度岁秋。",
    analysis: {
      career: "工作平稳顺利，按部就班就能取得不错的成绩，适合积累经验和人脉。",
      study: "学习状态良好，保持现有节奏即可，不必给自己太大压力。",
      wealth: "财务状况稳定，没有大起大落，适合储蓄和保守理财。",
      health: "身体无恙，但需注意换季保暖，预防小感冒。",
      love: "感情平稳温暖，平淡中见真情，是增进感情的好时机。"
    },
    lucky: { color: "蓝色", number: "2", direction: "正北" },
    scenes: ["daily", "exam", "work", "festival"]
  },
  {
    id: "sj_002",
    level: "上吉签",
    probability: 35,
    title: "喜气盈门",
    poem: "喜鹊登枝报好音，门庭若市客来频。\n好事连连心欢畅，笑口常开福自临。",
    analysis: {
      career: "好消息即将到来，可能是项目成功、客户签约或同事的认可。",
      study: "学习上有新的突破点，之前困惑的问题会豁然开朗。",
      wealth: "有小额意外之财，可能是红包、奖金或朋友请客。",
      health: "心情愉悦就是最好的养生，精神状态非常好。",
      love: "家庭和睦，朋友相聚频繁，社交生活丰富多彩。"
    },
    lucky: { color: "橙色", number: "5", direction: "东北" },
    scenes: ["daily", "exam", "work", "festival"]
  },
  {
    id: "sj_003",
    level: "上吉签",
    probability: 35,
    title: "前程似锦",
    poem: "锦绣前程在眼前，脚踏实地步步坚。\n莫羡他人风光好，自有花开待来年。",
    analysis: {
      career: "前景光明但需要耐心，你的付出正在酝酿回报，不要急于求成。",
      study: "打好基础很重要，扎实的知识储备会让未来的路更宽。",
      wealth: "财富在积累中，现在是播种阶段，将来的收获会很丰厚。",
      health: "建议培养规律的运动习惯，好的身体是未来发展的基础。",
      love: "缘分需要经营，用心对待身边的人，幸福会悄然而至。"
    },
    lucky: { color: "绿色", number: "4", direction: "正西" },
    scenes: ["daily", "exam", "work", "festival"]
  },
  {
    id: "sj_004",
    level: "上吉签",
    probability: 35,
    title: "贵人相助",
    poem: "他乡遇故知心意，雪中送炭正当时。\n莫愁前路无知己，自有贵人解忧思。",
    analysis: {
      career: "贵人就在身边，可能是一位前辈、领导或同事，主动请教会有意外收获。",
      study: "遇到难题不要硬扛，找老师或同学讨论会有新的启发。",
      wealth: "理财方面可以咨询专业人士，避免盲目投资。",
      health: "如有不适及时就医，小问题早解决，不要拖延。",
      love: "朋友可能变成恋人，珍惜身边一直支持你的人。"
    },
    lucky: { color: "白色", number: "1", direction: "东南" },
    scenes: ["daily", "exam", "work", "festival"]
  },
  {
    id: "sj_005",
    level: "上吉签",
    probability: 35,
    title: "否极泰来",
    poem: "寒冬过尽见春晖，否极泰来好运归。\n守得云开见月明，苦尽甘来展笑眉。",
    analysis: {
      career: "之前的困境正在消退，新的机会即将出现，做好准备迎接改变。",
      study: "之前觉得很难的科目将迎来转机，坚持下去就能看到进步。",
      wealth: "经济状况有望逐步改善，之前的压力也会慢慢缓解。",
      health: "适合放慢节奏，给自己一些休整和放松的时间。",
      love: "过去的感情纠葛将释怀，新的开始等待着你。"
    },
    lucky: { color: "黄色", number: "8", direction: "正南" },
    scenes: ["daily", "exam", "work", "festival"]
  },
  {
    id: "sj_006",
    level: "上吉签",
    probability: 35,
    title: "春风得意",
    poem: "春风拂面暖融融，万物复苏生意浓。\n乘势而上莫迟疑，大好时光在手中。",
    analysis: {
      career: "当前是行动的黄金期，有想法就大胆去执行，成功概率很高。",
      study: "学习效率最高的时候，趁热打铁攻克重点难点。",
      wealth: "消费运好，购物能买到性价比高的好东西。",
      health: "新陈代谢旺盛，适合开始减肥或健身计划。",
      love: "主动出击的好时机，约喜欢的人出去成功率很高。"
    },
    lucky: { color: "青色", number: "3", direction: "正东" },
    scenes: ["daily", "exam", "work", "festival"]
  },
  {
    id: "sj_007",
    level: "上吉签",
    probability: 35,
    title: "福星护佑",
    poem: "福星高照护平安，一路顺风少波澜。\n心存善念天自佑，好运常伴在身旁。",
    analysis: {
      career: "工作环境和谐，同事关系融洽，团队合作效率高。",
      study: "考试运稳定，发挥正常水平就能取得好成绩。",
      wealth: "财务安全，不会有大的意外支出，可以放心规划。",
      health: "家人健康平安，这是最大的福气。",
      love: "家庭温暖，亲情浓厚，是心灵最好的港湾。"
    },
    lucky: { color: "金色", number: "6", direction: "西北" },
    scenes: ["daily", "exam", "work", "festival"]
  },
  {
    id: "sj_008",
    level: "上吉签",
    probability: 35,
    title: "心诚则灵",
    poem: "心诚则灵感应天，善念常存福自延。\n莫问前程多与少，真心一片胜过千。",
    analysis: {
      career: "真诚是职场最好的通行证，你的真心会打动对的人。",
      study: "带着热爱去学习，效果大不相同，找到知识的乐趣。",
      wealth: "诚信待人，好的口碑会带来意想不到的财富。",
      health: "心宽体胖是福气，保持善良的心是最好的养生。",
      love: "真心换真心，你的真诚会吸引同样真诚的人。"
    },
    lucky: { color: "粉色", number: "2", direction: "西南" },
    scenes: ["daily", "exam", "work", "festival"]
  },
  {
    id: "sj_009",
    level: "上吉签",
    probability: 35,
    title: "变通致远",
    poem: "山不转时水自转，变通方能致远方。\n灵活应变天地阔，死守一隅路不长。",
    analysis: {
      career: "换个思路解决问题会有奇效，不要被惯性思维束缚。",
      study: "多尝试不同的学习方法，总有一种最适合你。",
      wealth: "多尝试几种方案，不要把希望全押在一件事上。",
      health: "运动方式要多样化，单一模式容易枯燥放弃。",
      love: "相处模式适时调整，新鲜感是感情的保鲜剂。"
    },
    lucky: { color: "橙色", number: "7", direction: "正西" },
    scenes: ["daily", "exam", "work", "festival"]
  },
  {
    id: "sj_010",
    level: "上吉签",
    probability: 35,
    title: "精进不休",
    poem: "学无止境勤为路，精进不休志愈坚。\n今日汗水浇沃土，明朝硕果满枝前。",
    analysis: {
      career: "持续学习是职场最好的防身术，新技能带来新机遇。",
      study: "每天进步一点点，日积月累将发生质变。",
      wealth: "投资自己的回报率最高，报个课程或考个证书。",
      health: "坚持锻炼的效果正在显现，继续加油。",
      love: "不断成长的你最有魅力，好的感情共同进步。"
    },
    lucky: { color: "青色", number: "3", direction: "东北" },
    scenes: ["daily", "exam", "work", "festival"]
  },
  {
    id: "sj_011",
    level: "上吉签",
    probability: 35,
    title: "家和万事兴",
    poem: "家和万事自然兴，欢声笑语满门庭。\n亲人和睦福气聚，温暖港湾任你停。",
    analysis: {
      career: "家人的支持是你最大的动力，好消息要第一个告诉他们。",
      study: "温馨的家庭环境让你学习更专注，感恩家人的付出。",
      wealth: "家和财自聚，家庭成员同心协力财运会越来越好。",
      health: "心情愉悦是最好的保养品，家庭和睦让你容光焕发。",
      love: "珍惜身边人，平淡日子里的陪伴最珍贵。"
    },
    lucky: { color: "暖黄", number: "6", direction: "正南" },
    scenes: ["daily", "exam", "work", "festival"]
  },

  // ==================== 中平签 (30%) ====================
  {
    id: "zp_001",
    level: "中平签",
    probability: 30,
    title: "守正不移",
    poem: "世事如棋局局新，守正不移是本真。\n莫为浮云遮望眼，脚踏实地最安稳。",
    analysis: {
      career: "保持现状、稳扎稳打是最好的策略，不宜冒进或频繁变动。",
      study: "按部就班复习即可，临时抱佛脚效果有限，功夫在平时。",
      wealth: "收支平衡，不宜大额消费或投资，守住现有的就是赚到。",
      health: "身体状况一般，注意饮食规律，避免熬夜。",
      love: "感情需要多一些耐心和理解，不要因小事争执。"
    },
    lucky: { color: "棕色", number: "5", direction: "正北" },
    scenes: ["daily", "exam", "work", "festival"]
  },
  {
    id: "zp_002",
    level: "中平签",
    probability: 30,
    title: "静待花开",
    poem: "花开花落自有时，强求不得莫心痴。\n待到春风化雨后，自有芬芳满树枝。",
    analysis: {
      career: "时机尚未成熟，现在适合积蓄力量，等待更好的机会。",
      study: "学习效果需要时间沉淀，不要因短期看不到进步而气馁。",
      wealth: "投资需谨慎，现在不是入场的最佳时机。",
      health: "注意调节情绪，压力大会影响身体状况。",
      love: "缘分急不来，做好自己，对的人会在合适的时候出现。"
    },
    lucky: { color: "灰色", number: "2", direction: "西南" },
    scenes: ["daily", "exam", "work", "festival"]
  },
  {
    id: "zp_003",
    level: "中平签",
    probability: 30,
    title: "淡然处之",
    poem: "云卷云舒天自高，淡然处之心不劳。\n得失成败寻常事，笑看人间走一遭。",
    analysis: {
      career: "有得有失是常态，不必过于计较一时得失，眼光放长远。",
      study: "平常心对待考试，过度紧张反而影响发挥。",
      wealth: "小有结余就好，知足常乐是财富之道。",
      health: "心理健康同样重要，学会释放压力。",
      love: "感情中有小摩擦很正常，沟通是解决问题的关键。"
    },
    lucky: { color: "米色", number: "7", direction: "正东" },
    scenes: ["daily", "exam", "work", "festival"]
  },
  {
    id: "zp_004",
    level: "中平签",
    probability: 30,
    title: "随遇而安",
    poem: "人生何处不青山，随遇而安天地宽。\n莫道前途多险阻，柳暗花明又一关。",
    analysis: {
      career: "适应变化的能力很重要，环境在变，保持灵活的心态。",
      study: "找到适合自己的学习方法比盲目努力更重要。",
      wealth: "量入为出，合理消费，财务健康比追求高收益更实际。",
      health: "适当运动有助于改善状态，但不必追求高强度。",
      love: "顺其自然的感情最长久，不必刻意改变自己。"
    },
    lucky: { color: "天蓝", number: "9", direction: "东北" },
    scenes: ["daily", "exam", "work", "festival"]
  },
  {
    id: "zp_005",
    level: "中平签",
    probability: 30,
    title: "蓄势待发",
    poem: "潜龙在渊待时机，蓄势待发莫迟疑。\n一朝风雨雷电至，直上青云天下知。",
    analysis: {
      career: "现在是在幕后积累的阶段，你的努力不会白费，爆发期即将到来。",
      study: "知识储备很关键，现在多学一点，未来就多一分把握。",
      wealth: "理财知识的学习比盲目投资更重要，先武装头脑。",
      health: "养生贵在坚持，养成良好的生活习惯受益终身。",
      love: "先把自己变得更好，好的感情自然会被吸引而来。"
    },
    lucky: { color: "深蓝", number: "4", direction: "正南" },
    scenes: ["daily", "exam", "work", "festival"]
  },
  {
    id: "zp_006",
    level: "中平签",
    probability: 30,
    title: "心安理得",
    poem: "心安理得睡梦香，问心无愧天地宽。\n不与他人争长短，自在一生福自安。",
    analysis: {
      career: "做好本职工作就是最好的职场策略，不必参与办公室政治。",
      study: "尽力而为就问心无愧，成绩不是衡量一切的标准。",
      wealth: "不攀比、不盲从，按自己的节奏生活最自在。",
      health: "心态平和是健康的基础，少生气多笑笑。",
      love: "真诚是感情的基石，用心经营就能收获幸福。"
    },
    lucky: { color: "浅绿", number: "1", direction: "正西" },
    scenes: ["daily", "exam", "work", "festival"]
  },
  {
    id: "zp_007",
    level: "中平签",
    probability: 30,
    title: "以静制动",
    poem: "以静制动观其变，后发制人智为先。\n风浪虽大终有尽，稳坐船头岸在前。",
    analysis: {
      career: "目前局势不明朗时，观望是最好的策略，别急着站队。",
      study: "不焦虑不盲从，按自己的节奏来，水滴石穿。",
      wealth: "外界波动时保持冷静，不盲目跟风、不急于求成。",
      health: "静心和冥想有助于缓解焦虑，试试早睡一周。",
      love: "感情中的矛盾冷静处理，不要说气话。"
    },
    lucky: { color: "灰蓝", number: "5", direction: "正西" },
    scenes: ["daily", "exam", "work", "festival"]
  },
  {
    id: "zp_008",
    level: "中平签",
    probability: 30,
    title: "知足常乐",
    poem: "知足常乐天地宽，贪心不足百事难。\n比上不足比下余，笑看人生心自安。",
    analysis: {
      career: "不比不争，做好份内事就是最好的职场生存之道。",
      study: "超越自己就是进步，不必和别人比较。",
      wealth: "钱够用就好，快乐不取决于账户余额。",
      health: "知足的心态是最好的保健品，少焦虑多健康。",
      love: "珍惜当下所拥有的，不要总羡慕别人的感情。"
    },
    lucky: { color: "米黄", number: "3", direction: "正东" },
    scenes: ["daily", "exam", "work", "festival"]
  },
  {
    id: "zp_009",
    level: "中平签",
    probability: 30,
    title: "事在人为",
    poem: "天命三分人七分，事在人为莫靠神。\n勤能补拙是良训，一分辛苦一分甜。",
    analysis: {
      career: "运气只占三成，努力才是关键，不要等机会，去创造机会。",
      study: "笨鸟先飞早入林，勤奋可以弥补天赋的差距。",
      wealth: "踏实赚钱最靠谱，不要幻想一夜暴富。",
      health: "好的身体靠自律，管住嘴迈开腿。",
      love: "感情需要用心经营，幸福不会从天而降。"
    },
    lucky: { color: "棕色", number: "4", direction: "西北" },
    scenes: ["daily", "exam", "work", "festival"]
  },
  {
    id: "zp_010",
    level: "中平签",
    probability: 30,
    title: "一日三省",
    poem: "一日三省吾身行，知错能改善莫停。\n人非圣贤孰无过，改过自新日月明。",
    analysis: {
      career: "复盘近期工作，找到改进空间，小调整带来大改善。",
      study: "错题是最好的老师，认真总结胜过做十套新题。",
      wealth: "审视消费习惯，砍掉不必要的开支就是赚钱。",
      health: "复盘生活作息，找到影响健康的小习惯并改正。",
      love: "反思自己在感情中的问题，改变从自身开始。"
    },
    lucky: { color: "墨绿", number: "0", direction: "正北" },
    scenes: ["daily", "exam", "work", "festival"]
  },

  // ========== 蓄力签 (10%) ==========
// 合规（计划书 §1.6）：原等级名「下吉签」易被理解为负面运势判定，
// 已中性化为「蓄力签」。旧名在 levels.js 中保留别名，兼容历史本地数据。
  {
    id: "xj_001",
    level: "蓄力签",
    probability: 10,
    title: "谨慎行事",
    poem: "山路崎岖慢步行，小心驶得万年船。\n三思而后行大事，谨慎方能保平安。",
    analysis: {
      career: "近期工作上需多加小心，重要决策三思而行，避免冲动犯错。",
      study: "考试时注意审题，不要粗心大意，小细节可能影响大局。",
      wealth: "不宜进行风险投资，捂紧钱包，避免不必要的消费。",
      health: "注意交通安全和意外伤害，出门在外多加小心。",
      love: "新认识的人需要多观察了解，别急着投入全部心意。"
    },
    lucky: { color: "黑色", number: "0", direction: "避开正西" },
    scenes: ["daily", "exam", "work", "festival"]
  },
  {
    id: "xj_002",
    level: "蓄力签",
    probability: 10,
    title: "沉淀反思",
    poem: "人生难得是清闲，沉淀反思得心安。\n休养生息蓄精锐，来日方长再扬帆。",
    analysis: {
      career: "暂时放缓脚步不是坏事，利用这段时间复盘和提升自己。",
      study: "成绩不理想不代表能力不行，找到薄弱环节针对性改进。",
      wealth: "近期花销可能较大，建议做预算，控制不必要的支出。",
      health: "身体发出信号就要重视，该休息时不要硬撑。",
      love: "给彼此一些空间，短暂的冷静期反而能让感情更牢固。"
    },
    lucky: { color: "深灰", number: "3", direction: "避开东北" },
    scenes: ["daily", "exam", "work", "festival"]
  },
  {
    id: "xj_003",
    level: "蓄力签",
    probability: 10,
    title: "退一步宽",
    poem: "退步原来是向前，海阔天空在心间。\n莫争一时输赢事，云淡风轻又见山。",
    analysis: {
      career: "当前的挫折是暂时的，适当让步反而能赢得更大空间。",
      study: "遇到瓶颈时换个思路，短暂的休息能带来更好的状态。",
      wealth: "偶尔的小支出不必太在意，心态放宽反而更顺。",
      health: "小病小痛是身体的提醒，及时调养勿拖延。",
      love: "争吵赢了道理输了感情，有时候让步才是爱的智慧。"
    },
    lucky: { color: "墨绿", number: "2", direction: "避开正南" },
    scenes: ["daily", "exam", "work", "festival"]
  },
  {
    id: "xj_004",
    level: "蓄力签",
    probability: 10,
    title: "独善其身",
    poem: "门前冷落鞍马稀，独善其身待时机。\n世间纷扰休理会，修身养性勿迟疑。",
    analysis: {
      career: "外部环境不够理想时，向内修炼是明智之选。",
      study: "远离干扰，专注自身是最好的应对策略。",
      wealth: "减少社交开销，把钱花在提升自己上。",
      health: "独处有助于身心恢复，不必勉强社交。",
      love: "不适合开始新恋情，先花时间了解自己。"
    },
    lucky: { color: "藏青", number: "4", direction: "正北" },
    scenes: ["daily", "exam", "work", "festival"]
  },
  {
    id: "xj_005",
    level: "蓄力签",
    probability: 10,
    title: "守株待时",
    poem: "守株待兔非上策，主动谋变才是真。\n困局之中寻出路，山重水复又一村。",
    analysis: {
      career: "与其被动等待，不如主动求变，调岗或跳槽都可以考虑。",
      study: "学习方法需要革新，旧的模式已经不适合现在的你。",
      wealth: "节流不如开源，是时候寻找新的收入渠道了。",
      health: "小毛病积久成疾，拖延不是办法，及时就医。",
      love: "不要在原地等一个不来的人，向前看才有新风景。"
    },
    lucky: { color: "灰白", number: "6", direction: "东北" },
    scenes: ["daily", "exam", "work", "festival"]
  },

  // ==================== 追加通用签文（扩充至60+） ====================
  {
  id: "ss_009",
  level: "上上签",
  probability: 25,
  title: "天时地利",
  poem: "天时地利聚今朝，人和锦上更添娇。\n三才合一逢好运，乘风破浪乐逍遥。",
  analysis: {
    career: "所有条件都已齐备，现在就是行动的最佳时机，不要再犹豫。",
    study: "学习环境、状态、资源都处于最佳配置，出成果的高峰期。",
    wealth: "投资的最佳窗口期，看准机会果断出手。",
    health: "天气适宜运动，户外活动让你身心愉悦。",
    love: "时机成熟了，该表白就表白，该求婚就求婚。"
  },
  lucky: { color: "金色", number: "8", direction: "东南" },
  scenes: ["daily", "exam", "work", "festival"]
},
{
  id: "ss_010",
  level: "上上签",
  probability: 25,
  title: "喜从天降",
  poem: "喜从天降不期至，好运敲门声声响。\n意外之喜频频顾，开怀大笑福满堂。",
  analysis: {
    career: "惊喜可能以意想不到的方式出现，可能是奖金、外快或猎头机会。",
    study: "不经意间发现的解题思路，让你豁然开朗。",
    wealth: "可能有意外的小惊喜，比如久未联系的朋友请你吃饭。",
    health: "精力充沛，感觉身体回到了最佳状态。",
    love: "意外的邂逅可能成为一段美好故事的开端。"
  },
  lucky: { color: "金色", number: "5", direction: "西南" },
  scenes: ["daily", "exam", "work", "festival"]
},
{
  id: "sj_012",
  level: "上吉签",
  probability: 35,
  title: "智珠在握",
  poem: "智珠在握心自明，运筹帷幄定乾坤。\n胸中自有百万策，何惧前路雾蒙蒙。",
  analysis: {
    career: "你的洞察力和判断力正处于巅峰，重要决策尽管放心。",
    study: "逻辑思维能力强，数理化类科目得心应手。",
    wealth: "聪明的投资策略会带来超出预期的回报。",
    health: "头脑清醒，状态极佳，适合深度学习或策划。",
    love: "用智慧经营感情，矛盾在你面前都能巧妙化解。"
  },
  lucky: { color: "深蓝", number: "7", direction: "西北" },
  scenes: ["daily", "exam", "work", "festival"]
},
{
  id: "sj_013",
  level: "上吉签",
  probability: 35,
  title: "桃运满园",
  poem: "人面桃花相映红，春意满园情意浓。\n相遇或许在咫尺，莫待花落一场空。",
  analysis: {
    career: "社交运旺盛，多参加行业聚会，人脉带来新机会。",
    study: "同学之间的学习互助特别有效，不要单打独斗。",
    wealth: "朋友推荐的投资或项目值得关注。",
    health: "心情愉悦，与人交往让你获得能量。",
    love: "人缘很好，身边或许有人默默欣赏你，不妨多留一份心。"
  },
  lucky: { color: "桃粉", number: "3", direction: "正南" },
  scenes: ["daily", "exam", "work", "festival"]
},
{
  id: "zp_011",
  level: "中平签",
  probability: 30,
  title: "随缘而行",
  poem: "随缘而行心不累，强求反失本来趣。\n得失看淡天地阔，顺其自然福自来。",
  analysis: {
    career: "不强求结果，享受过程，好心态反而能带来好结果。",
    study: "学习不是苦差事，带着好奇和兴趣去探索。",
    wealth: "不急不躁地理财，时间会给出最好的答案。",
    health: "放松身心的休闲娱乐是你的良药。",
    love: "感情中最美的是缘分的安排，不必刻意寻觅。"
  },
  lucky: { color: "藕粉", number: "9", direction: "东南" },
  scenes: ["daily", "exam", "work", "festival"]
},
{
  id: "zp_012",
  level: "中平签",
  probability: 30,
  title: "天道酬勤",
  poem: "天道酬勤是古训，一分耕耘一分收。\n莫羡旁人风光好，脚踏实地自风流。",
  analysis: {
    career: "你的每一分努力都不会白费，回报虽迟但必到。",
    study: "勤奋的人运气都不会太差，现在的积累决定未来的高度。",
    wealth: "勤劳致富是最稳健的路，别想着走捷径。",
    health: "坚持锻炼的效果在潜移默化中改善你的身体。",
    love: "用心经营的感情，细水长流最珍贵。"
  },
  lucky: { color: "大地棕", number: "5", direction: "正西" },
  scenes: ["daily", "exam", "work", "festival"]
},
  {
    id: "sj_014",
    level: "上吉签",
    probability: 35,
    title: "贵人相助",
    poem: "贵人相助出迷雾，柳暗花明又一途。\n感恩在心莫忘报，福泽流转复如初。",
    analysis: {
      career: "一位意想不到的人将给你带来关键帮助，可能是引荐或提点。",
      study: "老师或前辈的指点让你茅塞顿开，受益匪浅。",
      wealth: "靠谱的人分享的机会值得认真考虑。",
      health: "朋友推荐的养生方法或医生值得信赖。",
      love: "朋友介绍的对象可能比社交软件更靠谱。"
    },
    lucky: { color: "金色", number: "9", direction: "四面八方" },
    scenes: ["daily", "exam", "work", "festival"]
  },
  {
    id: "zp_013",
    level: "中平签",
    probability: 30,
    title: "云开见日",
    poem: "云开今日见晴日，雾散终能见远山。\n困境只是暂时的，坚持过后天地宽。",
    analysis: {
      career: "如果最近有些迷茫，不妨换个角度重新梳理，新的思路可能就在眼前。",
      study: "困扰你的难题会有突破，换个角度思考会找到答案。",
      wealth: "财务状况即将好转，但需要再坚持一段日子。",
      health: "注意规律作息，身体的疲惫感会慢慢缓解。",
      love: "感情的低谷即将过去，沟通是解决问题的最好方式。"
    },
    lucky: { color: "天蓝", number: "7", direction: "正东" },
    scenes: ["daily", "exam", "work", "festival"]
  }];

// ==================== 场景专属签文 ====================
const SCENE_FORTUNES = {
  exam: [
    {
      id: "exam_ss",
      level: "上上签",
      probability: 30,
      title: "金榜题名",
      poem: "十年磨剑试锋芒，金榜题名喜气扬。\n笔下生花如有神，蟾宫折桂姓名香。",
      analysis: {
        career: "考试运极佳，关键知识点都能完美掌握，发挥超常水平。",
        study: "理解和记忆状态都很好，保持节奏，逢考必过。",
        wealth: "学业有成带来长远财富，知识是最保值的投资。",
        health: "保持良好作息，考试前保证充足睡眠。",
        love: "学业为先，好的成绩会让你更加自信迷人。"
      },
      lucky: { color: "红色", number: "9", direction: "正东" },
      scenes: ["exam"]
    },
    {
      id: "exam_sj",
      level: "上吉签",
      probability: 40,
      title: "学业有成",
      poem: "书山有路勤为径，学海无涯苦作舟。\n今日用功终有报，考场得意拔头筹。",
      analysis: {
        career: "知识改变命运，现在的努力将为未来铺平道路。",
        study: "复习效果显著，重点内容掌握扎实，考试从容应对。",
        wealth: "奖学金、助学金等学业收入有机会获得。",
        health: "注意用眼卫生，适当休息保护视力。",
        love: "志同道合的同学可能成为特别的缘分。"
      },
      lucky: { color: "蓝色", number: "6", direction: "西北" },
      scenes: ["exam"]
    },
    {
      id: "exam_sj2",
      level: "上吉签",
      probability: 30,
      title: "妙笔生花",
      poem: "文思泉涌笔生花，挥毫落纸如云霞。\n胸有成竹无所惧，考场纵横展才华。",
      analysis: {
        career: "写作和表达能力极强，面试或演讲都会有出色表现。",
        study: "文科类考试状态不错，主观题发挥空间大，思路清晰。",
        wealth: "靠知识和才华赚钱的机会增多。",
        health: "脑力消耗大，注意补充营养和多休息。",
        love: "才气外露吸引欣赏你的人。"
      },
      lucky: { color: "紫色", number: "7", direction: "东南" },
      scenes: ["exam"]
    },
    {
      id: "exam_zp",
      level: "中平签",
      probability: 25,
      title: "稳扎稳打",
      poem: "不骄不躁平常心，稳扎稳打步步营。\n但求无愧于自己，成绩如何皆是赢。",
      analysis: {
        career: "保持现有节奏，考前冲刺要有策略，重点突破薄弱环节。",
        study: "查漏补缺是关键，错题本是最好的复习资料。",
        wealth: "学习投资永远值得，买好的参考书不要吝啬。",
        health: "考前注意饮食卫生，避免肠胃不适影响状态。",
        love: "考试期间以学业为重，感情的事考后再说。"
      },
      lucky: { color: "绿色", number: "4", direction: "正南" },
      scenes: ["exam"]
    }
  ],
  work: [
    {
      id: "work_ss",
      level: "上上签",
      probability: 30,
      title: "升职加薪",
      poem: "勤勉耕耘终有报，升职加薪在今朝。\n领导赏识同事敬，事业腾飞步步高。",
      analysis: {
        career: "晋升机会近在眼前，你的努力终于被看见，准备好迎接新挑战。",
        study: "职场学习能力提升快，新技能掌握迅速。",
        wealth: "固定收入有望增长，奖金和提成值得期待。",
        health: "注意颈椎和腰椎，久坐办公要定时活动。",
        love: "职场中的好感需要谨慎对待，办公室恋情要三思。"
      },
      lucky: { color: "金色", number: "8", direction: "东南" },
      scenes: ["work"]
    },
    {
      id: "work_sj",
      level: "上吉签",
      probability: 40,
      title: "事业顺利",
      poem: "顺风顺水事业兴，左右逢源贵人迎。\n项目推进无障碍，团队协作创共赢。",
      analysis: {
        career: "工作进展顺利，与同事和客户的沟通高效愉快。",
        study: "在工作中学习成长，实践经验是最宝贵的财富。",
        wealth: "收入稳定，可能有额外的项目奖金。",
        health: "工作压力适中，注意平衡工作与生活。",
        love: "伴侣对你的工作支持理解，是坚强的后盾。"
      },
      lucky: { color: "紫色", number: "5", direction: "正西" },
      scenes: ["work"]
    },
    {
      id: "work_sj2",
      level: "上吉签",
      probability: 30,
      title: "万众瞩目",
      poem: "百尺竿头进一步，万众瞩目展宏图。\n才德兼备人敬仰，职场星光耀前途。",
      analysis: {
        career: "你的能力将得到领导层关注，重要任务会交付给你。",
        study: "在实战中快速成长，经验积累速度超过同龄人。",
        wealth: "绩效奖金丰厚，加薪谈判成功率很高。",
        health: "成就感带来好心情，但要警惕工作狂倾向。",
        love: "职场魅力大增，自信的你更有吸引力。"
      },
      lucky: { color: "银色", number: "1", direction: "正东" },
      scenes: ["work"]
    },
    {
      id: "work_zp",
      level: "中平签",
      probability: 25,
      title: "稳步前行",
      poem: "不争朝夕争长远，稳步前行路自宽。\n韬光养晦待时至，厚积薄发天地宽。",
      analysis: {
        career: "当前适合深耕专业领域，成为不可替代的专家型人才。",
        study: "考取职业资格证书的好时机，投资自己回报最高。",
        wealth: "做好财务规划，建立紧急备用金。",
        health: "定期体检很重要，预防胜于治疗。",
        love: "工作再忙也要留时间给家人。"
      },
      lucky: { color: "灰色", number: "2", direction: "正北" },
      scenes: ["work"]
    }
  ],
  festival: [
    {
      id: "fes_ss",
      level: "上上签",
      probability: 30,
      title: "新春大吉",
      poem: "爆竹声中一岁除，春风送暖入屠苏。\n千门万户曈曈日，总把新桃换旧符。",
      analysis: {
        career: "新年新气象，事业将开启全新篇章，大胆追逐你的梦想。",
        study: "新的一年学习运旺盛，是进修和提升的好时机。",
        wealth: "财源广进，红包收到手软，新年财运滚滚来。",
        health: "全家安康，新的一年身体健康万事如意。",
        love: "家庭团圆美满，新年和和美美，幸福满满。"
      },
      lucky: { color: "中国红", number: "6", direction: "正南" },
      scenes: ["festival"]
    },
    {
      id: "fes_sj",
      level: "上吉签",
      probability: 40,
      title: "福满人间",
      poem: "福如东海长流水，寿比南山不老松。\n喜气洋洋迎新岁，阖家欢乐福满门。",
      analysis: {
        career: "节后复工状态不错，开门红的好兆头。",
        study: "新年学习计划顺利推进，目标清晰执行力强。",
        wealth: "节日期间消费运好，但记得做好预算。",
        health: "家人健康就是最大的福气。",
        love: "走亲访友增进感情，家庭关系更加和睦。"
      },
      lucky: { color: "金色", number: "8", direction: "正东" },
      scenes: ["festival"]
    },
    {
      id: "fes_zp",
      level: "中平签",
      probability: 25,
      title: "合家安康",
      poem: "合家安康就是福，平平淡淡才是真。\n不求大富与大贵，但求平安度此生。",
      analysis: {
        career: "节日是放松和充电的好时机，为新的工作周期做好准备。",
        study: "假期适当休息，劳逸结合才能走得更远。",
        wealth: "节日开销要节制，幸福不在于花多少钱。",
        health: "节日饮食注意适度，暴饮暴食伤身体。",
        love: "多陪伴家人，珍惜团圆的每一刻。"
      },
      lucky: { color: "橙色", number: "3", direction: "西南" },
      scenes: ["festival"]
    },
    {
      id: "fes_sj2",
      level: "上吉签",
      probability: 30,
      title: "万象更新",
      poem: "一元复始万象新，辞旧迎新福满门。\n今朝又是好时节，笑迎春色入乾坤。",
      analysis: {
        career: "新的一年职场焕然一新，过去的努力将迎来新的回报。",
        study: "新学期新气象，调整好状态迎接新的挑战。",
        wealth: "新年开门红，理财计划从节日开始。",
        health: "万象更新的时节，也是给身体做个全面调理的好时机。",
        love: "新的开始带来新的期待，给感情注入新的活力。"
      },
      lucky: { color: "春绿", number: "1", direction: "正东" },
      scenes: ["festival"]
    }
  ]
};

// ==================== 高级签文（需解锁） ====================
const PREMIUM_FORTUNES = [
  {
    id: "pre_001",
    level: "锦鲤签",
    title: "锦鲤附身·万事胜意",
    poem: "锦鲤跃过九天门，福运齐天降凡尘。\n所愿皆成无阻碍，好运连连福满门。",
    deepAnalysis: "这是一支极为罕见的锦鲤签，象征着一股「顺势而为」的劲头。事业上，之前持续的投入有望迎来回报，可能是期待已久的晋升、转型或新项目落地；学业上，灵感与专注度都处在很好的状态，适合把握重要节点；财运上，近期收支较为宽裕，但别忘了理性规划；感情上，不妨主动一些，多创造与人相处的机会。建议趁状态正好的时候，大胆推进自己真正想做的事，把这份劲头用在行动上。",
    lucky: { color: "金红色", number: "7", direction: "东南" }
  },
  {
    id: "pre_002",
    level: "万能上上签",
    title: "万能上上·心想事成",
    poem: "万能签出万事灵，心想事成福满庭。\n天时地利人和聚，好运当头步步赢。",
    deepAnalysis: "万能上上签是本产品氛围最明亮的一支签，寓意「心之所向，行则将至」。它提醒你，当心态积极、方向清晰时，事业、学业、财运、感情都更容易往好的方向发展。关键不在于等待，而在于保持乐观的同时付诸行动，并愿意把机会分享给身边的人——善意在人际之间流转，往往也会以别的方式回到你身上。不妨列出三个近期最想达成的小目标，从今天能做的第一步开始。",
    lucky: { color: "彩虹色", number: "9", direction: "随心而行" }
  },
  {
    id: "pre_003",
    level: "定制好运签",
    title: "专属好运·定制福气",
    poem: "此签只为你一人，专属好运落凡尘。\n量身定制吉祥意，福运独宠有心人。",
    deepAnalysis: "这是一支为你专属定制的好运签。你是一个特别的人，有着独一无二的光芒。近期你可能会面临一些重要的选择，请相信你的直觉，因为你的内心早已知道答案。事业上，展现你的独特才华，不必随波逐流；学业上，找到属于你的学习方法，效率会大幅提升；财运上，专注于你擅长的领域，财富会随之而来；感情上，做真实的自己，对的人会被真实的你吸引。记住：你是自己人生的主角，好运是你应得的礼物。",
    lucky: { color: "专属色", number: "1", direction: "跟随内心" }
  },
  {
    id: "pre_004",
    level: "龙腾签",
    title: "龙腾四海·大展宏图",
    poem: "龙腾四海风云动，大展宏图气势雄。\n乘风破浪会有时，直挂云帆济苍穹。",
    deepAnalysis: "龙腾签象征着力量、勇气与开拓精神。它提示你，当下或许正处于需要做选择的阶段，例如尝试新方向、转换赛道，或接触更广阔的领域。不要畏惧未知，你的行动力往往比自己以为的更强。事业上不妨放开手脚、主动争取，你的魄力也会感染身边的人；财务上，任何决策前都值得先做足功课、控制好风险；感情上，新的相处方式可能带来新的体验。这是一支鼓励你走出舒适区的签，天地之大，任你驰骋。",
    lucky: { color: "帝王金", number: "8", direction: "四方向荣" }
  },
  {
    id: "pre_005",
    level: "福寿签",
    title: "福寿双全·岁岁安康",
    poem: "福如东海深又长，寿比南山永安康。\n岁岁今朝花相似，年年如意福满堂。",
    deepAnalysis: "福寿签是祝福意味最浓的一支签，它关注的是长远的幸福与平安。这支签提醒你，人生最珍贵的往往不是一时的得失，而是身心的安稳与家人的陪伴。接下来的日子里，你不妨重新审视一下什么才是真正重要的。作息与饮食上可以对自己更好一些，试试规律的运动与休息；家庭关系值得用心经营，组织一次全家聚餐或短途出行是不错的选择；事业上不必急于求成，稳步发展才最安心。多花时间陪伴家人，平安喜乐就是最好的「上上签」。",
    lucky: { color: "中国红", number: "6", direction: "正南" }
  },
  {
    id: "pre_006",
    level: "天赐签",
    title: "天赐良缘·喜从天降",
    poem: "天赐良缘一线牵，喜从天降心相连。\n今朝有幸逢知己，相伴一生福绵绵。",
    deepAnalysis: "天赐签是一支关于「连接」的签，它提示你，良好的人际关系值得被认真对待。如果你单身，不妨多走出熟悉的圈子、参加一些新的活动，认识新朋友的机会往往出现在不经意的场合——书店、通勤路上、朋友的聚会。如果你已有伴侣，这段时间适合多一些坦诚的交流，让彼此更了解对方的期待。同时，这支签也提醒你留意身边的善意与帮助，主动与人建立连接，往往会带来意想不到的收获。保持开放和真诚，关系的种子需要时间慢慢生长。",
    lucky: { color: "玫瑰金", number: "2", direction: "随缘而遇" }
  }
];

// ============================================
// 双出口：浏览器（经典脚本）下 FORTUNES / SCENE_FORTUNES / PREMIUM_FORTUNES
// 为全局词法绑定；Node / Vitest 下用 require 取同一份数据。参见计划书 §6.5。
// ============================================
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { FORTUNES, SCENE_FORTUNES, PREMIUM_FORTUNES };
}
