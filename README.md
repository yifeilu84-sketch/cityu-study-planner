# CityU Study Planner

CityU Study Planner 是一个面向香港城市大学（CityUHK）学生的课程规划与选课参考网站。它把本科专业 study plan、毕业要求、课程池、GE 课程、硕博项目、PG 课程评分细则和科研参考资料整合到一个可搜索、可对比、可 DIY 编辑的界面里。

**在线访问：** [https://yifeilu84-sketch.github.io/cityu-study-planner/](https://yifeilu84-sketch.github.io/cityu-study-planner/)

> 本项目不是 CityUHK 官方系统。所有内容仅用于学习规划参考，最终选课、毕业审核、课程开设和学分认定请以 CityUHK 官方系统、学院/学系、ARRO/SGS 和学术顾问意见为准。

---

## 当前覆盖范围

数据状态截至 2026-07-06：

| 模块 | 覆盖情况 |
| --- | --- |
| 本科项目 | 63 个本科项目，覆盖 10 个学院 / 学校 |
| 本科课程 | 1,898 门课程记录 |
| 本科 study plan 来源 | 47 个官方 study plan、4 个 structure / flowchart、6 个按毕业要求整理、6 个 DIY 空表 |
| GE 课程 | 180 门官方 GE Search 课程，支持 area / unit / level / term / exam 筛选 |
| 硕博项目 | 102 个香港本部 PG 项目：68 个 taught master、30 个 research degree、4 个 professional doctorate |
| PG 课程 | 918 门 PG 课程记录，其中 901 门已解析官方 assessment / exam / duration / PDF 来源 |
| 科研参考 | 928 位学术人员、31 个学系、2,603 条代表论文 / 项目参考 |

硕博项目只覆盖 CityUHK 香港本部官方页面，不纳入 CityUHK(DG)。

---

## 核心功能

### 本科 Study Plan

- 按学院 / 学校浏览本科专业。
- 展示四年学期规划，包括 Semester A、Semester B 和 Summer Term。
- 区分不同来源可信度：
  - 官方 Study Plan：来自官方 recommended study plan、sample study plan、handbook 或同等逐学期安排。
  - Structure / Flowchart：来自官方课程结构图或 flowchart，需要按图表解释学期安排。
  - 按毕业要求排：官网没有明确逐学期 plan，本网站按毕业要求整理参考路径。
  - DIY 空表：官网没有明确 plan，不预填课程，只展示毕业要求和课程池。
- 对没有明确官方 study plan 的项目标注「非官网准确 study plan，请学生自行 DIY / 核对」。

### 自定义规划与毕业要求自检

- 可在专业页进入编辑模式，自行增删课程、调整学期。
- 课程池包含专业核心、专业选修、学院课程、GE、自由选修等类别。
- 支持对 final year project / thesis / dissertation 这类跨学期项目做特殊识别，避免误判为重复课程。
- 自动提示：
  - 学分缺口
  - GE area 缺口
  - 专业核心 / 选修要求
  - 前置课程风险
  - 非官方计划的 advisory 状态

### GE 选课助手

- 集中展示可自由组合的 GE 课程。
- 支持按课程代码、课程名、GE Area、开课单位、level、term、是否考试、assessment profile 筛选。
- 已接入官方 GE Search 元数据，并尽量保留课程 PDF 中可解析的评分细则。

### 硕博项目目录

- `/postgraduate` 提供 PG 项目目录、搜索、学院筛选、项目类型筛选和来源状态统计。
- `/postgraduate/:programmeCode` 提供单个 PG 项目的详情页：
  - Study Plan / DIY 空学期表
  - Graduation requirements
  - Required / elective / research coursework pool
  - Sources
  - PG 课程详情弹窗
- 对有官方 sample schedule 的项目，展示官方 sample schedule。
- 对没有明确学期安排的项目，不伪造 plan，只提供空表和课程池，让学生自行 DIY。
- 对 MPhil / PhD，不把研究型项目伪造成授课型固定计划，而是展示研究领域、coursework pool、proposal / thesis / milestone checklist。

### PG 课程评分细则

- `pg-courses.json` 与本科 `courses.json` 分开维护，避免混淆本科和硕博课程。
- 优先从 CityUHK PG Course Catalogue 年度课程页解析：
  - continuous assessment
  - examination
  - examination duration
  - minimum passing requirement
  - official PDF URL
  - offering term
  - prerequisite raw text
- 当前 918 门 PG 课程中，901 门已解析官方评分摘要。
- 仍有 17 门课程只在官方 programme course pool 出现，但未找到对应 course detail HTML / PDF，因此页面会标注为待人工核对。

### 科研参考

- 接入另一个仓库 `cityuhk-academic` 生成的 academic profiles。
- 支持按教授、学院、学系、研究方向、关键词和代表论文进行检索。
- 本科生和硕博学生都可以用来参考科研方向、导师背景和相关项目。

---

## 数据来源与口径

主要来源包括：

- CityUHK Undergraduate Catalogue
- CityUHK Postgraduate Programme List 2026/27
- CityUHK PG Course Catalogue annual course pages
- CityUHK programme handbooks / suggested study plans / flowcharts / official PDFs
- CityUHK GE Search
- CityUHK 学术人员公开主页和 companion `cityuhk-academic` 数据

数据处理原则：

- 优先使用 CityUHK 官方来源，不使用第三方课程站点作为课程要求依据。
- 有官方逐学期 study plan 时，按官方计划展示。
- 没有明确 study plan 时，不冒充官方 plan，而是展示毕业要求、课程池和空白 DIY 表格。
- 对只存在官方课程池但没有 course detail page 的课程，保留代码和标题，并标注详情未确认。
- 对跨学期 project / thesis / final year project，按项目性质处理，不简单按重复课程报错。

---

## 项目结构

```text
src/
  components/                 复用组件，如课程详情弹窗、布局、科研参考面板
  data/
    all-majors.json           本科项目总数据
    courses.json              本科课程详情
    ge-official-courses.json  GE Search 元数据
    postgraduate-programmes.json
    pg-courses.json
    pg-course-details.json
    academic-profiles.json
    search-index.json
  pages/                      页面路由
  utils/                      搜索、毕业审核、GE 筛选、反馈、数据汇总工具
scripts/
  build-postgraduate-data.mjs
  fetch-pg-course-details.mjs
  apply-ge-official-metadata.mjs
  import-academic-data.mjs
  split-major-data.mjs
  build-search-index.mjs
tests/
  study-plan-data.test.mjs
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
# 运行数据完整性和路由/功能测试
npm test

# 生成数据并构建生产版本
npm run build

# 本地预览生产构建
npm run preview

# 只重建硕博项目和 PG 课程数据
npm run build:pg

# 重新生成搜索索引
npm run build:search

# 从 CityUHK PG Course Catalogue 重新抓取 PG 课程评分摘要
npm run fetch:pg-details
```

说明：

- `npm run build` 会执行 `prepare:data`，重新生成 GE、PG、academic、major split 和 search index 数据。
- `npm run fetch:pg-details` 会通过 Playwright CLI 打开 CityUHK PG catalogue 页面，在浏览器上下文中读取年度课程页；这个步骤较慢，也依赖 CityUHK 官网当时是否可访问。
- 普通 build 不需要联网，因为解析后的 PG 课程详情已保存到 `src/data/pg-course-details.json`。

---

## 部署

项目通过 GitHub Pages 部署。

```bash
npm run build
git push origin main
```

推送到 `main` 后，GitHub Actions 会自动构建并发布到 `gh-pages` 分支。部署完成后访问：

[https://yifeilu84-sketch.github.io/cityu-study-planner/](https://yifeilu84-sketch.github.io/cityu-study-planner/)

由于项目使用 HashRouter，线上深链接格式为：

```text
https://yifeilu84-sketch.github.io/cityu-study-planner/#/coverage
https://yifeilu84-sketch.github.io/cityu-study-planner/#/postgraduate
https://yifeilu84-sketch.github.io/cityu-study-planner/#/ge
```

---

## 质量保障

测试覆盖重点包括：

- 本科官方 study plan 与生成数据一致性
- flowchart / structure 专业的课程放置
- 没有官方 study plan 的专业必须显示 DIY / advisory 状态
- GE course metadata 和 assessment 字段完整性
- 毕业要求 audit 的学分、GE、选修、重复课程、前置课判断
- PG 项目必须有课程池或明确的官方约束说明
- PG 课程详情解析覆盖率不得回退
- 搜索、路由、科研参考和 PG 页面入口正常工作

当前主测试命令：

```bash
npm test
```

---

## 已知限制

- CityUHK 官方页面可能随学年更新，课程开设学期、assessment 和 graduation requirements 可能变化。
- 少数官方 programme page 会列出课程代码和标题，但 PG Course Catalogue 暂未发布对应详情页；这些课程会在页面中标注待人工核对。
- DIY 学期表只是规划辅助，不代表 ARRO / SGS / 学系审核结果。
- GE、PG course assessment 和 official PDFs 的解析依赖官方页面结构；如果官网改版，需要重新检查抓取脚本。

---

## 制作人

**吕逸飞（Lyu Yifei）**

问题反馈微信：**L18617192008**

欢迎反馈课程缺漏、官网链接失效、study plan 不匹配、课程评分细则错误或 UI 使用问题。

---

## 免责声明

本网站为个人整理的 CityUHK 学业规划辅助工具，不代表 CityUHK 官方意见。所有课程、学分、毕业要求、开课学期、评分方式和项目安排，请以 CityUHK 官方系统、官方文件和学院/学系最终审核为准。
