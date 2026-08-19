# CityUHK Study Planner

CityUHK Study Planner 是一个面向香港城市大学（CityUHK）学生的课程规划、选课参考和科研信息整合网站。项目把本科专业 study plan、毕业要求、课程池、GE 课程、硕博项目、PG 课程评分细则、专业对比和科研参考资料放在同一个可搜索、可核对、可 DIY 编辑的界面中，帮助学生更清楚地规划自己的学习路径。

在线访问：
[https://yifeilu84-sketch.github.io/cityu-study-planner/](https://yifeilu84-sketch.github.io/cityu-study-planner/)

功能更新：2026-08-12

## 中英文界面

网站顶部提供 `中 / EN` 语言切换，桌面侧栏和移动端导航都可以直接操作。选择结果保存在浏览器本地，刷新页面或进入其他路由时会继续使用上次选择的语言。

首次访问时的欢迎确认弹窗也内置同一组语言控件，用户无需先关闭弹窗即可切换英文，弹窗内容会立即更新。

双语范围包括：

- 首页、学院、专业、GE、专业对比、数据来源、硕博目录、科研目录和新闻详情页。
- 本科与硕博 DIY 编辑器、课程选择器、课程详情弹窗和欢迎弹窗。
- 毕业要求自检、开课学期冲突、先修课链条、学分过载、GE Area 缺口、not offering 和跨学期项目等动态提示。
- 来源可信度、课程池状态、官方计划 / structure / graduation-based / DIY 等状态说明。
- 页面语言会同步更新 HTML `lang` 属性，便于浏览器、读屏软件和搜索引擎正确识别。

课程代码、官方英文课程名、项目名和来源链接保持原始官方写法。科研资料如果只有中文标题或研究方向，英文模式不会自动编造翻译，而会隐藏未确认的中文字段并显示英文缺失说明；微信公众号的官方中文名称会作为必要检索标识保留。

> 本项目不是 CityUHK 官方系统。所有信息仅供学习规划和选课参考，最终选课、毕业审核、课程开设、学分认定、课程替代和项目要求请以 CityUHK 官方系统、学院/学系、ARRO/SGS 和学术顾问的最终审核为准。

---

## 项目定位

很多 CityUHK 学生在选课和规划时会遇到这些问题：

- 不同专业的 study plan 分散在不同学院网页、PDF、handbook 或 flowchart 中。
- 有些专业有明确的逐学期官方 study plan，有些只有 programme structure 或毕业要求。
- GE 课程数量多，想按考试方式、评分结构、开课单位筛选并不方便。
- 课程详情、assessment、exam duration、先修课、学分要求需要反复打开不同 PDF 或 catalogue 页面。
- 硕士、MPhil、PhD、专业博士项目并不都提供固定 sample schedule，但仍然有课程池和毕业要求需要规划。
- 本科生做 FYP / RA，硕博生找导师方向时，也需要快速参考教授、研究方向和代表论文。

这个网站的目标不是替代官方系统，而是把这些分散信息整理成一个更容易检索、比较和自查的 planning workspace。

---

## 当前覆盖范围

数据状态截至 2026-07-06。

| 模块 | 当前覆盖 |
| --- | --- |
| 本科项目 | 63 个本科项目，覆盖 10 个学院 / 学校 |
| 本科课程 | 1,898 条本科课程记录；全站搜索索引当前收录 1,856 条本科课程结果 |
| 本科 study plan 来源 | 47 个官方逐学期 study plan、4 个官方 structure / flowchart 解析、6 个按毕业要求整理、6 个 DIY 空表 |
| GE 课程 | 180 门官方 GE Search 课程，支持 area / unit / level / term / exam / assessment profile 筛选 |
| 硕博项目 | 102 个 CityUHK 香港本部 PG 项目 |
| 授课型硕士 | 68 个 taught master 项目 |
| 研究型硕博 | 30 个 MPhil / PhD research degree 项目 |
| 专业博士 | 4 个 professional doctorate 项目 |
| PG 课程 | 918 门 PG 课程记录，其中 901 门已解析官方 assessment / exam / duration / PDF 来源 |
| 科研参考 | 928 位学术人员、31 个学系、2,603 条代表论文 / 项目参考 |

硕博项目只覆盖 CityUHK 香港本部官方项目，不纳入 CityUHK(DG)。

---

## 核心功能

### 1. 本科 Study Plan

本科部分按学院 / 学校浏览，进入专业后可以看到该专业的课程结构、四年学期安排、毕业要求、课程池和官方来源。

网站会区分 study plan 的来源可信度：

| 来源类型 | 页面含义 |
| --- | --- |
| 官方推荐学习计划 | 来自 CityUHK 官方 recommended study plan、sample study plan、model study path、handbook 或同等逐学期安排 |
| 官方 Structure / Flowchart 解析 | 官网没有直接表格化 study plan，但提供 programme structure、major structure 或 flowchart，本项目按图表解析课程放置 |
| 按毕业要求整理 | 官网没有明确逐学期 study plan，本项目按 graduation requirements 和课程池整理参考路径 |
| DIY 空表 | 官网没有明确学期规划，不预填课程，只提供毕业要求、课程池和空白 semester 表格 |

对于没有明确官方 study plan 的项目，页面会明确标注“非官网准确 study plan，请学生自行 DIY / 核对”，避免把参考规划伪装成官方安排。

目前特别处理过的本科数据包括：

- `BENG1_CDE-1` Computer and Data Engineering：从官方 EE structure / flowchart 解析。
- `BENG1_ELEL-1` Electronic and Electrical Engineering：从官方 EE structure / flowchart 解析。
- `BENG1_INFE-1` Information Engineering：从官方 programme structure / flowchart 解析。
- `BENG1_MEE-1` Microelectronics Engineering：从官方 EE structure / flowchart 解析。
- 商学院、人文社科学院、创意媒体学院等没有逐学期官方 sample plan 的项目，按毕业要求整理或标注为 DIY。
- 双学位、旗舰路径和特色路径补齐毕业要求、课程池和空白 DIY 规划。

### 2. 毕业要求自检

专业页面包含毕业要求自检面板，用于辅助检查当前规划是否满足学分和课程结构要求。

自检内容包括：

- 总学分是否达到要求。
- GE 学分和 GE area 是否存在缺口。
- 学院 / 学系指定课程是否满足。
- 专业核心、专业选修、自由选修等 bucket 是否满足。
- 是否出现重复课程。
- 是否存在可能缺少先修课的风险。
- 当前规划是否来自官方 study plan、structure 解析、按毕业要求整理或 DIY。

项目也修正了跨学期课程的处理逻辑。例如 final year project、thesis、dissertation、internship 等一年制或跨学期项目可以在两个学期出现，不会被简单误判为重复课程冲突。

### 3. DIY 学期规划

本科和硕博页面都支持 DIY 规划。用户可以进入编辑模式，把课程从课程池放入不同学期，按自己的交换、实习、轻重学期、先修课和兴趣方向重新安排。

设计原则是：

- 有官方逐学期 plan 的项目，优先展示官方安排。
- 没有官方 plan 的项目，不自动编造学期安排。
- 只给空 semester 表格、毕业要求和完整课程池，让学生自己 DIY。
- DIY 内容保存在浏览器本地，不上传服务器。

### 4. 课程详情与评分细则

课程详情弹窗会展示课程基础信息和尽可能完整的官方评分信息。

本科和 GE 课程尽量保留：

- 课程代码和标题。
- 学分。
- 开课单位。
- GE area。
- 先修 / 互斥 / 等价课程信息。
- assessment、exam、duration 等评分细则。
- 官方 catalogue 或 PDF 来源。

PG 课程单独维护在 `pg-courses.json`，不会与本科课程混在一起。PG 课程优先从 CityUHK PG Course Catalogue 课程页或 PDF 中解析：

- continuous assessment。
- examination。
- examination duration。
- minimum passing requirement。
- prerequisite raw text。
- offering term。
- official PDF URL。

如果某门课程只出现在官方 programme course pool 中，但找不到对应 course detail HTML / PDF，页面会标注“官方课程详情未确认”。

### 5. GE 选课助手

GE 页面用于集中筛选可自由组合的 GE 课程。

支持筛选维度：

- 课程代码。
- 课程名称。
- GE Area。
- 开课单位。
- 课程 level。
- term。
- 是否考试。
- assessment profile。

这个页面适合用来快速寻找不冲突、评分结构更适合自己、或者符合特定 GE area 要求的课程。

### 6. 专业对比

专业对比页面支持并排查看 2 到 3 个专业。

可以对比：

- 总学分。
- 课程结构。
- 来源可信度。
- 课程重叠。
- 专业核心 / 选修要求。
- 是否存在 DIY 或 advisory 标注。

适合用于选专业、转专业、双学位路径比较或在相近专业之间做初步判断。

### 7. 硕博项目目录与详情页

硕博页面 `/postgraduate` 是一个 PG 项目目录，覆盖 CityUHK 香港本部 2026/27 授课型硕士、研究型 MPhil / PhD 和专业博士项目。

目录页支持：

- 搜索 MSc、MPhil、PhD、DBA、programme title、department、course code。
- 按项目类型筛选。
- 按学院 / 学校筛选。
- 查看来源状态统计。
- 查看哪些项目有官方 sample schedule，哪些需要 DIY。

详情页 `/postgraduate/:programmeCode` 会展示：

- 项目基本信息。
- award、mode、college、department。
- 官方项目链接和 curriculum 链接。
- Study Plan 或 DIY 空学期表。
- graduation / coursework requirements。
- required / elective / stream / research coursework pool。
- PG 课程详情弹窗。
- sources 与数据状态说明。

处理原则：

- 有官方 sample schedule 的 MSc 项目，按官方 sample schedule 展示。
- 没有官方学期计划的 taught master 项目，展示空 semester 表格 + 毕业要求 + 课程池。
- 研究型 MPhil / PhD 不伪造成授课型固定 study plan，而是展示研究领域、coursework pool、proposal / thesis / milestone checklist。
- 专业博士项目按官方要求展示课程池、毕业要求和 DIY 规划入口。

### 8. 科研参考

科研参考页面接入 companion academic repository 的公开资料，用于辅助本科生和硕博生了解 CityUHK 的科研方向。

可以检索：

- 教授姓名。
- 学院 / 学系。
- research area。
- publication keyword。
- 学生项目 / 研究方向线索。

使用场景：

- 本科生寻找 FYP、RA、reading group 或导师方向。
- 硕博申请者了解潜在 supervisor。
- 已入学学生根据课程方向反查相关研究组和代表论文。

科研参考数据只作为研究方向探索，不作为课程要求或毕业审核依据。

### 9. 首页新闻轮播与使用演示

首页顶部新增 campus spotlight 新闻轮播，类似官网入口风格，不占满第一屏，但用户一进入网站就能看到重点信息。

当前轮播保留两项：

1. 3 分钟网站使用演示：真实页面录制，慢速展示全站搜索、本科规划、GE、专业对比、硕博项目、科研参考和来源覆盖。
2. CityUHK 官方网站导航：集中提供 11 个学院 / 学校、29 个学系与语文中心、63 个本科专业、102 个硕博项目，以及 36 个行政与学生支援单位入口。

官方网站导航支持中英文界面、分类切换和即时搜索。学院、学系与专业逐项直达 CityUHK 官方页面；没有独立公开网站的行政单位会明确标注并跳转至 CityUHK 官方联络目录，不会生成未经确认的网址。

欢迎弹窗只在每次新打开浏览器会话时出现一次，刷新页面不会重复弹出。

---

## 页面入口

由于项目使用 HashRouter，线上深链接格式如下：

| 页面 | 地址 |
| --- | --- |
| 首页 | `/#/` |
| 数据来源覆盖 | `/#/coverage` |
| GE 选课助手 | `/#/ge` |
| 专业对比 | `/#/compare` |
| 硕博项目目录 | `/#/postgraduate` |
| 科研参考 | `/#/academic` |
| 本科专业详情 | `/#/major/:majorCode` |
| 硕博项目详情 | `/#/postgraduate/:programmeCode` |
| 新闻详情 | `/#/spotlight/:spotlightId` |
| CityUHK 官方网站导航 | `/#/spotlight/cityu-official-directory` |

线上完整地址示例：

```text
https://yifeilu84-sketch.github.io/cityu-study-planner/#/coverage
https://yifeilu84-sketch.github.io/cityu-study-planner/#/ge
https://yifeilu84-sketch.github.io/cityu-study-planner/#/postgraduate
https://yifeilu84-sketch.github.io/cityu-study-planner/#/academic
https://yifeilu84-sketch.github.io/cityu-study-planner/#/spotlight/cityu-official-directory
```

---

## 数据来源与处理原则

主要数据来源包括：

- CityUHK Undergraduate Catalogue。
- CityUHK Postgraduate Programme List 2026/27。
- CityUHK Research Degree Programmes / Research Areas。
- CityUHK Professional Doctorate Programme pages。
- CityUHK PG Course Catalogue。
- CityUHK GE Search。
- CityUHK programme handbooks、suggested study plans、flowcharts、official PDFs。
- CityUHK 学术人员公开主页与 companion `cityuhk-academic` 数据。

数据处理原则：

- 优先使用 CityUHK 官方来源。
- 不使用第三方课程站点作为毕业要求或课程要求依据。
- 有官方逐学期 study plan 时，按官方计划展示。
- 只有 structure / flowchart 时，明确标注为图表解析。
- 没有明确 study plan 时，不预填课程到学期表，只展示毕业要求、课程池和空白 DIY 表格。
- 对只找到课程池、但无法确认课程详情页的 PG 课程，保留课程代码和标题，并标注待确认。
- 对跨学期项目按项目属性处理，不简单按重复课程报错。

---

## 技术栈

- React 19。
- TypeScript。
- Vite。
- React Router HashRouter。
- Tailwind CSS。
- lucide-react icons。
- Node.js 数据构建脚本。
- Playwright / browser automation 用于数据抽取、页面检查和演示视频录制。
- GitHub Actions + GitHub Pages 部署。

---

## 项目结构

```text
src/
  components/                 复用组件：布局、课程详情、规划编辑器、科研参考面板等
  data/
    all-majors.json           本科项目主数据
    courses.json              本科课程详情
    ge-official-courses.json  GE Search 元数据
    postgraduate-programmes.json
    pg-courses.json
    pg-course-details.json
    academic-profiles.json
    search-index.json
  i18n/                      全站语言状态、持久化和语言相关内容筛选
  pages/                      页面路由
  utils/                      搜索、毕业审核、来源标注、GE 筛选、反馈和数据汇总工具

scripts/
  apply-ge-official-metadata.mjs
  build-postgraduate-data.mjs
  fetch-pg-course-details.mjs
  import-academic-data.mjs
  split-major-data.mjs
  build-search-index.mjs

tests/
  i18n.test.mjs
  study-plan-data.test.mjs

public/
  spotlight/                  首页新闻轮播海报和演示视频资源
```

---

## 本地开发

需要 Node.js 24+。

```bash
npm install
npm run dev
```

常用命令：

```bash
# 运行数据完整性、路由和核心功能测试
npm test

# 生成数据并构建生产版本
npm run build

# 本地预览生产构建
npm run preview

# 只重建硕博项目和 PG 课程数据
npm run build:pg

# 重新生成全站搜索索引
npm run build:search

# 从 CityUHK PG Course Catalogue 抓取 / 更新 PG 课程评分摘要
npm run fetch:pg-details
```

说明：

- `npm run build` 会执行 `prepare:data`，依次更新 GE、PG、academic、major split 和 search index 数据。
- 普通构建不需要实时联网，因为已解析的数据保存在 `src/data/`。
- `npm run fetch:pg-details` 依赖 CityUHK 官网当前可访问状态，运行时间较长，适合需要更新 PG 课程详情时单独执行。

---

## 部署

项目通过 GitHub Pages 部署。推送到 `main` 后，GitHub Actions 会自动构建并发布到 `gh-pages` 分支。

```bash
npm run build
git push origin main
```

部署完成后访问：

[https://yifeilu84-sketch.github.io/cityu-study-planner/](https://yifeilu84-sketch.github.io/cityu-study-planner/)

---

## 质量保障

当前测试重点覆盖：

- 本科官方 study plan 与生成数据一致性。
- structure / flowchart 专业的课程放置。
- 没有官方 study plan 的项目必须显示 DIY / advisory 状态。
- GE course metadata 与 assessment 字段完整性。
- 毕业要求 audit 的学分、GE、选修、重复课程、前置课程判断。
- 跨学期 final year project / thesis 不被误判为重复课程。
- PG 项目必须有课程池或明确的官方约束说明。
- PG 课程详情解析覆盖率不能回退。
- 搜索、路由、专业对比、科研参考和 PG 页面入口正常工作。
- 欢迎弹窗只在新浏览会话出现，刷新不重复弹出。
- 首页 campus spotlight 新闻轮播和详情页正常工作。

主测试命令：

```bash
npm test
```

截至最近一次验证，测试为 73/73 通过，`npm run build` 也可以正常完成。

---

## 已知限制

- CityUHK 官方页面会随学年更新，课程开设学期、assessment、exam、graduation requirements 可能变化。
- 少数官方 programme page 会列出课程代码和标题，但 PG Course Catalogue 暂未发布对应详情页；这些课程会在页面中标注待人工核对。
- DIY 学期表只是规划辅助，不代表 ARRO / SGS / 学院 / 学系审核结果。
- 课程评分细则解析依赖官方页面或 PDF 结构；如果官网改版，需要重新检查抓取脚本。
- 科研参考数据来自公开资料和 companion repository，仅用于科研方向探索，不作为课程要求依据。

---

## 维护者

制作与维护：吕逸飞（Lyu Yifei）

问题反馈微信：`L18617192008`

欢迎反馈：

- 专业 study plan 与官网不一致。
- 官网链接失效。
- 课程池缺失。
- GE / PG 课程评分细则错误。
- 毕业要求自检误判。
- 页面 UI 或移动端体验问题。

---

## 免责声明

CityUHK Study Planner 是个人整理的学习规划辅助工具，不代表 CityUHK 官方意见。所有课程、学分、毕业要求、开课学期、评分方式、项目安排和课程替代，请以 CityUHK 官方系统、官方文件、学院 / 学系、ARRO / SGS 和学术顾问的最终审核为准。
