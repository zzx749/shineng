# 失能评估辅助系统（shineng）

老人失能等级评估辅助系统。核心是「辅助」——系统依据国标自动计算失能等级，工作人员评估不合理时可纠正并留痕。

## 技术栈

Vue 3 + Vite + Element Plus + Vue Router + Pinia + axios

## 功能

- 登录 / 注册（admin 管理员、staff 评估员两种角色，路由守卫区分）
- 老人信息管理（姓名、年龄、地址、身份证号、电话、儿女电话；年龄由身份证号自动推算）
- 失能评估：依据 GB/T 42195-2022《老年人能力评估规范》，4 个一级指标、22 个二级指标，自动算分 → 等级
- 纠正流程：系统自动评定与工作人员手填判断不一致时高亮警示，可一键纠正并留痕
- 报告生成：老人信息 + 各维度得分 + 最终等级 + 评估人 + 日期，可直接导出 PDF 文件（html2canvas + jsPDF）或打印
- 用户管理（管理员）：查看 / 编辑 / 删除用户、重置密码

## 快速开始

```bash
npm install
npm run dev
```

访问 http://localhost:5173

### 演示账号

| 角色   | 用户名 | 密码     |
| ------ | ------ | -------- |
| 管理员 | admin  | admin123 |
| 评估员 | staff  | staff123 |

## 后端对接说明

> 完整接口契约、数据模型与项目总结见 [docs/后端接口文档.md](docs/后端接口文档.md)

当前使用 **axios 自定义 adapter 做 mock**（localStorage 持久化），后端接口就绪后：

1. 将 `src/api/http.js` 中的 `USE_MOCK` 改为 `false`
2. 确认 `baseURL` 与后端真实地址一致，即可切换到真实接口

Mock 接口约定见 `src/api/mock/adapter.js`。

## 目录结构

```
src/
├── api/
│   ├── http.js            # axios 实例 + mock 开关
│   ├── mock/
│   │   ├── db.js          # localStorage 数据层 + 种子数据
│   │   └── adapter.js     # mock adapter（路由表 + 处理器）
│   └── modules/           # 各业务 API 封装
├── constants/scoring.js   # GB/T 42195-2022 评分表（阈值可配置）
├── router/                # 路由 + 守卫
├── stores/auth.js         # 登录态 Pinia store
├── utils/
│   ├── idCard.js          # 身份证号推算年龄/性别
│   └── pdf.js             # DOM 导出多页 PDF
├── views/                 # 页面
└── styles/index.css       # 全局样式 + 打印样式
```

## 评分规则说明

- 每项 0/1/2 分；维度等级 0=完好 1=轻度 2=中度 3=重度
- 综合等级：全完好 → 能力完好；出现轻度(无中/重度) → 轻度失能；出现中度(无重度) → 中度失能；出现重度 → 重度失能
- 各维度「总分 → 等级」阈值位于 `src/constants/scoring.js`，为占位近似值，**需专业老师最终确认后调整**
