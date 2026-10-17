# 余烬试炼 · EMBER ARCHIVE

真实行测题库驱动的黑暗奇幻卡牌 Roguelike。简洁的灰黑、旧纸与火光视觉，独立生成的角色、敌人和遗迹美术。

## 直接游玩

本地版本需要 Node.js 20.19+（或 22.12+）。双击 **开始游戏.cmd**，浏览器会打开游戏；保持命令窗口开启。已附构建产物 `dist/`，游玩无需安装 npm 依赖。也可在此目录执行 `node launcher.mjs`。

所有题目、美术和程序都在本地运行，不需要 API 密钥。学习记录、永久成长与当前远征自动保存在当前浏览器的 IndexedDB（并以 localStorage 保存小型恢复快照）；可在游戏设置中导出、导入 JSON 存档。不同网站地址与浏览器的存档相互独立。

## 玩法

- 每回合先查看敌人意图和手牌，选择攻势、守势或洞察，再完成一道真实试题。答对获得 3 专注，答错也有 1 专注；连续正确作答还能额外蓄力。
- 攻势将正确答案转为穿透伤害；守势转为护甲；洞察转为抽牌与额外专注。随后消耗专注出牌，决定攻击顺序、防御与目标。
- 26 张招式涵盖易伤、灼烧、群攻、过牌、回收、回血、连击和低血反击。18 件遗物改变构筑收益。
- 三章各六层的分叉地图包含战斗、精英、守卫、商人、营地、事件与遗物。选择奖励、强化或移除牌，形成自己的路线。
- 三种职业、三档难度、每日固定随机种子，以及 8 个永久天赋和 10 项成就。远征结束带回余烬与经验。
- 藏书阁提供模块／题型联动筛选、考点与全文搜索、按序和随机刷题、错题复习、原始解析与源文链接。学习战绩按模块和题型统计正确率、平均／中位用时、累计用时及近7天／30天趋势，可按远征或自由研习区分。同题连续答对两次记作稳固掌握。
- 无强制答题倒计时；可随时暂离，自动保存到当前阶段。

## 开发

```bash
npm ci
npm run dev
npm test
npm run build
npm run verify:build
```

技术栈：React 19、Vite、原生 JavaScript 确定性状态引擎、Web Audio。没有服务器业务依赖。`src/engine.js` 独立于 UI，可序列化、重放与测试；`src/content.js` 定义全部游戏内容。UI 兼容桌面与移动端，并提供键盘焦点、减少动态效果与默认静音。

## 题目来源

仅使用 [Mentat-Uran/kaogongzhentizhengliu](https://github.com/Mentat-Uran/kaogongzhentizhengliu)，固定源版本与实际收录统计见 `public/data/manifest.json`；全量收录固定版本的 11,282 道原题：判断推理 7,713 道、资料分析 3,569 道。其中 9,690 道可判分、1,592 道保留为待复核。上游固定版本仅含这两个模块，不虚构其他模块题目。

题干、四个选项、正确答案、材料、原始解析及引用配图随题保存；每题携带对应 commit 的 GitHub 链接。原库疑点、答案不唯一、选项或解析缺失的记录保留为待复核题，可查阅原文，不进入正常战斗或准确率统计。复现导入：

```bash
git clone --config core.autocrlf=false https://github.com/Mentat-Uran/kaogongzhentizhengliu source-vault
git -C source-vault checkout 84ab93d4b64b61d897bece8a1c0a5bab06b4feb2
node scripts/import-questions.mjs source-vault public
```

详细来源与许可见 `public/data/SOURCE.md` 和上游 LICENSE。上游自行创作的标注与分类采用 CC BY-NC 4.0；真题题干、选项、材料和配图权利仍归原出题机构及原平台。供非商业个人学习交流。原库解析由程序生成并人工抽检，可能有错漏，游戏保留原文，不将游戏奖励视为答案正确性的独立验证。

## 美术与声音

`public/art/` 内每张场景、角色与敌人美术均由内建 Image Generation 独立生成，透明角色保留 alpha。另有 59 张独立秘典封面：15 个敌人、18 件遗物、26 张招式，战斗与商店同步使用。提示词分别记录于 `public/art/prompts.md`、`prompts-enemies.md`、`prompts-relics.md` 和 `prompts-cards.md`。未使用拼图或多角色图集。界面符号使用 Lucide，音效与氛围音乐由 Web Audio 合成，默认关闭。

PNG 原图完整保留在源码的 `public/art/` 中；运行版本使用保留透明度的 WebP 压缩副本，构建时只分发这些网页副本。4,566 张较大的原题配图另有无损 WebP 缓存，生成时逐张比对解码 RGBA 像素完全相等，原图仍完整保留在 `public/question-images/`。缓存及哈希记录在 `assets/question-images/`，构建仅需 Node.js；需要重建缓存时可使用安装了 Pillow 的 Python 运行 `scripts/optimize-question-images.py`。`verify:build` 校验发布版全部题目记录还原后与原始数据逐字段相同、配图全部存在，并检查部署体积。

网站版本使用 Sites 私有托管；本地源码仍可独立构建和运行。

发布版题库分片使用 gzip 传输，浏览器自动还原完整 JSON；开发版与原始数据仍保留普通 JSON。
