# IBC 排班系统

IBC 排班系统是一个部署在 GitHub Pages 的静态前端，使用 Supabase 作为共享数据层，负责学生给班、管理员排班、排班历史、补贴资料与补贴导出管理。

- 线上地址：[https://jia-ethan.github.io/ibc-scheduler/](https://jia-ethan.github.io/ibc-scheduler/)
- 仓库地址：[https://github.com/Jia-Ethan/ibc-scheduler](https://github.com/Jia-Ethan/ibc-scheduler)
- 正式部署口径：`main` 构建，发布到 `gh-pages`

## 当前运行事实

- **唯一正式部署方案**：GitHub Pages。仓库内不再保留 Vercel 相关配置，也不使用 Vercel 作为发布入口。
- **前端公开配置来源**：仅来自构建环境里的 `VITE_SUPABASE_URL` 与 `VITE_SUPABASE_ANON_KEY`。
- **云端数据真源**：
  - `users`：学生/管理员名单
  - `availability`：学生已确认的给班时段
  - `schedule`：管理员最终排班，含 `assigned` 与 `explanation`
  - `user_profiles`：电话与补贴资料
  - `schedule_history`：排班快照
  - `subsidy_records`：补贴草稿与已导出记录
- **本地 `localStorage` 的职责**：仅作离线镜像与 UI 状态缓存，不再作为 `schedule.explanation` 的唯一真源。

## 部署与 GitHub Pages

### 为什么 `vite.config.ts` 必须保持 `base: './'`

项目发布在 GitHub Pages 的子路径 `/ibc-scheduler/` 下。Vite 产物必须使用相对静态资源路径，否则线上会出现 JS / CSS 404，页面白屏。

当前配置位于 [vite.config.ts](/Users/ethan/ibc-scheduler/vite.config.ts)：

```ts
export default defineConfig({
  plugins: [react()],
  base: './',
})
```

### 首次启用 Pages

如果仓库第一次部署，GitHub 仓库设置中需要手动选择：

`Settings > Pages > Source > Deploy from a branch > gh-pages`

### 正式部署命令

```bash
npm install
./deploy.sh
```

[deploy.sh](/Users/ethan/ibc-scheduler/deploy.sh) 会：

1. 安装依赖
2. 校验公开 Supabase 环境变量
3. 校验 `public/subsidy-template.xlsx` 是否存在
4. 运行 `npm run build`
5. 把 `dist/` 发布到远端 `gh-pages`

脚本只允许从 `main` 分支执行，避免发布分支与主线再次漂移。

## 环境变量

复制 [.env.example](/Users/ethan/ibc-scheduler/.env.example) 为 `.env` 或 `.env.local`：

```bash
VITE_SUPABASE_URL=https://your-project-url.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
VITE_ADMIN_NOTIFICATION_EMAIL_HINT=a***@icloud.com
```

说明：

- `VITE_SUPABASE_URL`：Supabase Project URL
- `VITE_SUPABASE_ANON_KEY`：前端公开 anon key
- `VITE_ADMIN_NOTIFICATION_EMAIL_HINT`：仅用于前端展示脱敏邮箱提示，不参与真实发信

前端构建时如果缺少 `VITE_SUPABASE_URL` / `VITE_SUPABASE_ANON_KEY`，应用会直接显示配置错误页，不会再静默回退到任何线上默认库。

## Supabase 初始化与结构

### 初始化脚本

- [setup.sql](/Users/ethan/ibc-scheduler/setup.sql)：当前推荐的初始化 / 对齐脚本
- [supabase/migrations/](/Users/ethan/ibc-scheduler/supabase/migrations)：保留迁移历史
- [repair_subsidy_profiles_from_records.sql](/Users/ethan/ibc-scheduler/repair_subsidy_profiles_from_records.sql)：从补贴记录回填 `user_profiles`
- [upgrade_subsidy_profiles.sql](/Users/ethan/ibc-scheduler/upgrade_subsidy_profiles.sql)：旧补贴资料字段补齐脚本

### 当前业务约束

- `day_of_week` 统一为 **周一到周五**：`0-4`
- `period` 统一为 `1-8`
- `schedule.explanation` 为正式持久化字段，不再只保存在浏览器本地
- `users.role` 纳入初始化脚本，用于消除远端 schema 与仓库脚本漂移

`setup.sql` 与新增 migration 都会在发现周末脏数据时显式报错，要求先清理数据，再继续对齐。

### 本地 Supabase CLI

[supabase/config.toml](/Users/ethan/ibc-scheduler/supabase/config.toml) 当前已关闭失效的 seed 配置；仓库里没有 `supabase/seed.sql`，因此不要假设本地 `db reset` 会自动灌入示例数据。

## 给班提交通知流程

学生在前端确认给班时，流程如下：

1. 前端调用 Supabase Edge Function `confirm-availability-submission`
2. Function 对给班时段做规范化与差异比对
3. Function 用 service role 重写当前用户的 `availability`
4. Function 通过 Resend 向管理员固定邮箱发送通知
5. 如果邮件发送失败，Function 会尽量回滚本次给班写入

相关文件：

- [src/lib/storage.ts](/Users/ethan/ibc-scheduler/src/lib/storage.ts)
- [supabase/functions/confirm-availability-submission/index.ts](/Users/ethan/ibc-scheduler/supabase/functions/confirm-availability-submission/index.ts)
- [supabase/functions/confirm-availability-submission/README.md](/Users/ethan/ibc-scheduler/supabase/functions/confirm-availability-submission/README.md)

部署 Function：

```bash
supabase functions deploy confirm-availability-submission
```

需要在 Supabase Function Secrets 中配置：

```bash
SUPABASE_URL=你的 Project URL
SUPABASE_SERVICE_ROLE_KEY=你的 service_role key
RESEND_API_KEY=你的 Resend API Key
RESEND_FROM_EMAIL=已验证的发件地址
ADMIN_NOTIFICATION_EMAIL=管理员真实收件邮箱
```

## 导出现状

### Word 排班导出

- 入口：管理员页“导出 Word”
- 实现：浏览器端 `docx` 生成 `.docx`
- 文件：`排班表_YYYY-MM-DD.docx`
- 当前内容口径：
  - 标题：`国际商学院学生助理值班表`
  - 日期：`更新日期：YYYY年M月D日`
  - 主表：周一至周五、第一节至第八节
  - 联系电话：优先读取 `user_profiles.phone`，再与系统内置学生资料种子合并

相关实现位于 [src/lib/utils.ts](/Users/ethan/ibc-scheduler/src/lib/utils.ts)。

### 补贴导出

- 入口：管理员页“补贴记录”
- 模板资产：`src/assets/subsidy-template.xlsx` 会随前端构建打包；`public/subsidy-template.xlsx` 保留为发布产物中的固定副本
- 实现：浏览器端读取打包后的模板并导出 `.xlsx`
- 云端记录：保存在 `subsidy_records`
- 草稿可继续编辑，已导出记录支持复制、再次导出、删除

相关实现位于 [src/lib/subsidy.ts](/Users/ethan/ibc-scheduler/src/lib/subsidy.ts) 和 [src/pages/AdminPage.tsx](/Users/ethan/ibc-scheduler/src/pages/AdminPage.tsx)。

## 本地开发

```bash
npm install
npm run dev
```

本地预览构建结果：

```bash
npm run build
npm run preview
```

测试：

```bash
npm test
```

补贴数据备份：

```bash
npm run backup:subsidy
```

备份脚本优先读取：

1. shell 环境变量
2. `.env.local`
3. `.env`

不会再从 `src/lib/storage.ts` 里解析任何默认线上配置。

## 目录结构

```text
ibc-scheduler/
├── public/
│   ├── subsidy-template.xlsx
│   └── vite.svg
├── src/
│   ├── components/
│   ├── context/
│   ├── lib/
│   ├── pages/
│   └── types/
├── supabase/
│   ├── functions/confirm-availability-submission/
│   ├── migrations/
│   └── config.toml
├── tests/
├── scripts/backup-subsidy-data.mjs
├── deploy.sh
├── setup.sql
├── repair_subsidy_profiles_from_records.sql
└── upgrade_subsidy_profiles.sql
```

## 管理员入口

- 管理员口令：`IBCprincipal`

## 当前已知后续风险

- `setup.sql` 与现网仍使用宽松的 `Allow all` RLS policy，这对安全性不是长期方案；本轮只做工程对齐，没有同步引入新的鉴权模型。
- 仓库保留了历史 `supabase/migrations/20260404160300_remote_schema.sql` 快照与新 migration；今后如果线上继续演进，记得同步刷新 schema 快照，避免再次失真。
