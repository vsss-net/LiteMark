# LiteMark

LiteMark 是一款基于 **Vue 3 + Vite** 的个人书签管理应用，提供响应式双端体验、后台管理面板以及多种对象存储驱动。当前前端和后端（Vercel Functions）已深度集成，只需少量配置即可在本地或 Vercel 上快速运行。

---

## 功能亮点

- 📚 **书签管理**：支持添加、编辑、删除、隐藏与排序；分类顺序与分类内顺序均可拖拽调整。
- 🎨 **主题定制**：内置多套主题，可在后台即时切换；支持自定义站点标题和图标。
- 🔍 **高效浏览**：搜索框置于顶栏，移动端卡片两列展示并自动适配描述内容。
- 🔐 **后台面板**：位于 `/admin`，含登录校验、缓存刷新、站点设置等管理动作。
- ☁️ **灵活存储**：内置 Vercel Blob、S3、R2、OSS、COS、WebDAV 等驱动，支持热插拔配置。
- 🚀 **极佳体验**：SSR 友好的 API、前端缓存提示、响应式布局与移动端操作优化。

---

## 快速开始

```bash
# 安装依赖
npm install
# pnpm / yarn / bun 亦可

# 开发模式（仅前端）
npm run dev

# 生产构建
npm run build

# 本地预览生产包
npm run preview
```

> `npm run dev` 只启动 Vite 前端，如需同时调试 API，请参见「本地调试」章节。

---

## 本地调试与开发

### 1. 前端 + 线上 API
- 在 `.env.local` 设置 `VITE_API_BASE_URL=https://<你的部署域名>`。
- 运行 `npm run dev`，前端会直接调用线上 API。

### 2. 同步调试前端与 Functions
- 安装 [Vercel CLI](https://vercel.com/docs/cli)：`npm i -g vercel`。
- 根目录执行 `vercel dev`（保持 `vercel.json` 存在），CLI 会启动 3000 端口的 API 代理与前端构建。
- 如果已有本地占用，可指定端口：`vercel dev --listen 127.0.0.1:3005`。

### 3. 仅调试 Functions
- 保留 `vercel.json` 中的 `functions` 配置，并在根目录运行：
  ```bash
  vercel dev --yes
  ```
- 前端可通过 `VITE_API_BASE_URL=http://127.0.0.1:<端口>` 访问本地函数。

---

## 部署到 Vercel

1. **Fork / Clone** 仓库，并推送至自己的 Git 仓库。
2. 在 Vercel 创建新项目，导入仓库。
3. 项目设置 → **Environment Variables**，填入 `.env.local` 中的变量（见下表）。
4. 确保仓库根目录存在 `vercel.json`，内容如下：
   ```json
   {
     "functions": {
       "api/**/*.ts": {
         "runtime": "@vercel/node@3.2.8"
       }
     },
     "rewrites": [
       { "source": "/api/(.*)", "destination": "/api/$1" },
       { "source": "/(.*)", "destination": "/" }
     ],
     "headers": [
       {
         "source": "/(.*)\\.(js|css|json|svg|png|jpg|jpeg|gif|webp|ico|woff2?)",
         "headers": [
           { "key": "Cache-Control", "value": "no-store, no-cache, must-revalidate, max-age=0" },
           { "key": "Pragma", "value": "no-cache" },
           { "key": "Expires", "value": "0" }
         ]
       }
     ]
   }
   ```
5. 点击 **Deploy**，等待构建完成。前端地址为 `https://<project>.vercel.app`，后台入口 `https://<project>.vercel.app/admin`。

> 若部署后 `/api` 返回静态页面或 404，多半是 `vercel.json` 不存在或命名错误（确保文件名为 `vercel.json`）。

---

## 环境变量清单

在根目录 `.env.local` 或 Vercel 控制台中配置：

| 变量 | 说明 | 默认值 |
| --- | --- | --- |
| `VITE_API_BASE_URL` | 前端调用 API 的基础地址；留空则使用当前域名。 | _(空字符串)_ |
| `STORAGE_DRIVER` | 存储驱动：`vercel-blob` / `s3` / `r2` / `oss` / `cos` / `webdav`。 | `vercel-blob` |
| `BLOB_READ_WRITE_TOKEN` | 使用 Vercel Blob 必填的令牌。 | - |
| `ADMIN_USERNAME` | 后台登录用户名。 | `admin` |
| `ADMIN_PASSWORD` | 后台登录密码。 | `admin123` |
| `SETTINGS_CACHE_TTL_MS` | 站点设置缓存 TTL（毫秒，0 表示关闭缓存）。 | `60000` |
| `BOOKMARKS_CACHE_TTL_MS` | 书签缓存 TTL（毫秒，0 表示关闭缓存）。 | `60000` |

> 选择非默认存储驱动时，请补充对应的 Bucket、Endpoint、密钥等字段，可参考 `api/_lib/storage.ts` 内的 `ensureXXXClient` 实现。

---

## 项目结构

```
├─ api/
│  ├─ auth/                 # 登录接口
│  ├─ bookmarks/            # 书签 CRUD、排序、刷新
│  ├─ settings/             # 站点设置获取/修改、刷新
│  └─ _lib/                 # 鉴权、存储、缓存等辅助模块
├─ src/
│  ├─ pages/
│  │  ├─ HomePage.vue       # 前台书签展示、搜索、拖拽排序
│  │  └─ AdminDashboard.vue # 后台管理面板
│  ├─ App.vue               # 路由容器
│  └─ main.ts               # 应用入口
└─ public/                  # 静态资源
```

---

## 常见问题 FAQ

1. **部署后 `/api` 无法访问？**
   - 检查仓库根目录是否存在 `vercel.json`，文件名不能改成其它名字。
   - 确认项目环境变量已配置且重新部署。

2. **后台排序没生效或提示 401？**
   - 需先登录后台才能操作；如已登录却 401，请确认 `ADMIN_USERNAME` 与 `ADMIN_PASSWORD` 是否与 `.env.local` 匹配。

3. **书签分类顺序错乱？**
   - 后台的“保存分类顺序”按钮会落盘分类排序；保存后刷新页面即可同步。

4. **本地 `npm run dev` 访问不到 API？**
   - 在 `.env.local` 中设置 `VITE_API_BASE_URL` 指向部署好的地址，或使用 `vercel dev` 同时启动函数。

5. **存储驱动切换失败？**
   - 请在后台刷新数据或调用 `/api/bookmarks/refresh`、`/api/settings/refresh`，同时确保相关凭证正确。

更多使用说明请参考 [`api.md`](./api.md)。欢迎提交 Issue / PR 优化功能。
