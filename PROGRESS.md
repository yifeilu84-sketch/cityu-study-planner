# CityU Study Planner - 实时进度记录

## 2026-05-10

### 项目完成！

- [x] 项目初始化（Vite + React + TypeScript + Tailwind CSS）
- [x] 爬取54个专业页面（10个学院）
- [x] 爬取1695门课程详情（含前置课程、学期、考核方式、PDF链接）
- [x] 构建静态网站成功
- [x] 清理临时文件

## 数据概况
- 10个学院 / 54个本科专业
- 1695门课程详情
- 数据全部来自 CityU 官方课程目录

## 网站功能
- 首页：学院卡片，搜索功能
- 学院页：学系和专业列表
- 专业页：
  - 学习计划时间线（4年8学期）
  - 课程要求表格
  - 课程列表（支持搜索）
  - 课程详情弹窗（学期、前置课程、考核方式、PDF链接）

## 技术栈
- React 19 + TypeScript + Vite
- Tailwind CSS 4
- React Router
- 静态部署（dist/目录）

## 文件位置
- 项目根目录：`C:\Users\lenovo\cityu-study-planner`
- 构建输出：`C:\Users\lenovo\cityu-study-planner\dist`
- 运行预览：`npm run preview`
- 重新构建：`npm run build`
