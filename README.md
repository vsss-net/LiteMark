# LiteMark

LiteMark 是一款基于 **Vue 3 + Vite** 的个人书签管理应用，提供响应式双端体验、后台管理面板以及 Postgres 持久化存储。当前前端和后端（Vercel Functions + Vercel Postgres）已深度集成，只需少量配置即可在本地或 Vercel 上快速运行。
后台支持数据迁移与备份。
---

## 功能亮点

- 📚 **书签管理**：支持添加、编辑、删除、隐藏与排序；分类顺序与分类内顺序均可拖拽调整。
- 🎨 **主题定制**：内置多套主题，可在后台即时切换；支持自定义站点标题和图标。
- 🔍 **高效浏览**：搜索框置于顶栏，移动端卡片两列展示并自动适配描述内容。
- 🔐 **后台面板**：位于 `/admin`，含登录校验、缓存刷新、站点设置等管理动作。
- ☁️ **灵活存储**：内置 Vercel Blob、S3、R2、OSS、COS、WebDAV 等驱动，支持热插拔配置。
- 🚀 **极佳体验**：SSR 友好的 API、前端缓存提示、响应式布局与移动端操作优化。

---

## 后续更新计划

- 增加更多部署方案
- 优化网站响应速度



## 部署到 Vercel

1. **Fork / Clone** 仓库，并推送至自己的 Git 仓库。
2. 在 Vercel 创建新项目，导入仓库。
3. 项目设置 → **Environment Variables**，填入 `.env.local` 中的变量（见下表）。
4. 点击 **Deploy**，等待构建完成。前端地址为 `https://<project>.vercel.app`，后台入口 `https://<project>.vercel.app/admin`。

> 若部署后 `/api` 返回静态页面或 404，多半是 `vercel.json` 不存在或命名错误（确保文件名为 `vercel.json`）。

---

## 环境变量清单

在根目录 `.env.local` 或 Vercel 控制台中配置：

| 变量 | 说明 | 默认值 |
| --- | --- | --- |
| `VITE_API_BASE_URL` | 前端调用 API 的基础地址；留空则使用当前域名。 | _(空字符串)_ |

> 管理员账号密码存储在数据库的 `admin_credentials` 表中，默认账号为 `admin / admin123`，可在后台「站点设置 → 管理员账号」中修改，无需通过环境变量配置。

---

## 项目结构

```
├─ api/
│  ├─ auth/                 # 登录接口
│  ├─ bookmarks/            # 书签 CRUD、排序、刷新
│  ├─ settings/             # 站点设置获取/修改
│  ├─ admin/                # 管理员账号管理
│  └─ _lib/                 # 鉴权、数据库、HTTP 等辅助模块
├─ src/
│  ├─ pages/
│  │  ├─ HomePage.vue       # 前台书签展示
│  │  └─ AdminDashboard.vue # 后台管理面板
│  ├─ App.vue               # 路由容器
│  └─ main.ts               # 应用入口
└─ public/                  # 静态资源
```

---

更多使用说明请参考 [`api.md`](./api.md)。欢迎提交 Issue / PR 优化功能。
