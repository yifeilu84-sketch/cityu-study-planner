# CityU Study Planner

香港城市大学（CityU）课程规划辅助工具，涵盖 53 个本科专业的官方推荐学习计划、课程详情、考核方式、前置要求查询，以及自定义编辑模式。

**在线访问：** https://yifeilu84-sketch.github.io/cityu-study-planner/

---

## 功能特性

- **53 个本科专业** — 覆盖 10 个学院的本科课程
- **1800+ 门课程** — 含课程代码、名称、学分、学期、前置课程、考核方式
- **官方学习计划** — 基于 CityU 2025 cohort normative 4-year degree 的推荐学习路径
- **课程详情弹窗** — 学期安排、前置要求、考核占比（平时成绩/期末考试）、及格线
- **编辑模式** — 拖拽调整课程到不同学期，自动校验前置课程要求
- **辅修专业选择** — 10 个 predefined minors（COMP、DS、MATH 等）
- **Summer Term 支持** — 完整的四年学制含暑期学期
- **移动端适配** — 响应式布局，支持手机浏览器访问

---

## 技术栈

- React 19 + TypeScript + Vite
- Tailwind CSS 4
- React Router（HashRouter）
- @dnd-kit/core（拖拽编辑）
- pdfjs-dist（PDF 课程信息提取）

---

## 本地开发

```bash
# 安装依赖
npm install

# 启动开发服务器
npm run dev

# 构建生产版本
npm run build

# 预览生产构建
npm run preview

# 一键部署到 GitHub Pages
npm run deploy
```

---

## 数据来源

- CityU 官方课程目录：cityu.edu.hk/catalogue/ug/current
- 各专业 Recommended Study Plan PDF
- 通识教育课程信息：cityu.edu.hk/ge_info

---

## 制作人

**吕逸飞（Lyu Yifei）**

如有问题或建议，欢迎通过微信联系：
**L18617192008**

---

## 免责声明

本网站数据来源于 CityU 官方课程目录，仅供参考。实际选课请以大学官方系统和学术顾问意见为准。
