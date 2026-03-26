# 补贴记录上线复盘

本次“补贴草稿 + 补贴记录”功能已经成功上线，但过程中暴露出几类可避免的问题。这里沉淀成下次可直接复用的检查表。

## 这次犯的错误

### 1. 先假设数据库已就绪，后验证

前端功能已经实现并上线，但一开始没有先确认生产库里是否已经存在 `subsidy_records`。

实际情况是：
- 线上前端可访问
- 生产 Supabase 中 `subsidy_records` 不存在
- 直接访问 REST 接口时返回 `404`

这会导致“界面看起来上线了，但核心能力不可用”的假上线。

### 2. 低估了登录态来源

一开始默认用隔离浏览器环境进入 Supabase 控制台，但真正可用的登录态在用户原本的 Chrome 中。

结论：
- 需要依赖已有网页登录态的后台操作，优先确认是否必须复用用户原浏览器
- 不要默认隔离浏览器与用户真实会话是等价的

### 3. 过早走 UI 点击路径

最开始尝试从控制台页面进入 SQL Editor，但这条路径依赖页面结构、登录跳转和浏览器会话，稳定性差。

后来改成：
- 从用户 Chrome 会话中拿到 Supabase 控制台 token
- 通过 Management API 执行 `database/query`

这一条更短、更稳、可验证。

### 4. 直接使用仓库默认构建命令

仓库当前 `npm run build` 会写入 `node_modules/.tmp/*.tsbuildinfo`，而默认 `vite build` 又会碰到现有 `dist/.DS_Store` 权限问题。

结果：
- `tsc -b` 因 `.tsbuildinfo` 写入失败而中断
- `vite build` 因清理 `dist/.DS_Store` 失败而中断

更稳的做法是：
- 类型检查改用 `npx tsc --noEmit -p ...`
- 生产构建改用 `npx vite build --outDir /tmp/...`

### 5. 测试命令参数想当然

曾错误使用 `vitest run --runInBand`，但当前项目的 Vitest 版本不支持这个参数。

以后应优先使用项目既有脚本：
- `npm test`

## 这次确认有效的上线顺序

推荐以后按这个顺序执行：

1. 本地完成功能开发
2. 跑 `npm test`
3. 跑 `npx tsc --noEmit -p tsconfig.app.json`
4. 跑 `npx tsc --noEmit -p tsconfig.node.json`
5. 用生产 anon key 先探测新表是否存在
6. 若不存在，先执行数据库迁移
7. 再次验证：
   - 表存在
   - RLS policy 存在
   - realtime publication 已加入
8. 用临时目录执行生产构建
9. 发布静态站点
10. 抽查线上资源中是否包含新文案或新入口

## 这次最终采用的稳妥做法

- 数据库迁移：通过 Supabase Management API 的 `POST /v1/projects/{ref}/database/query`
- 生产库验证：
  - REST 访问 `subsidy_records` 从 `404` 变为 `200`
  - SQL 校验 policy / realtime / columns
- 前端发布：`npx vite build --outDir /tmp/ibc-scheduler-build` 后推送 `gh-pages`

## 下次上线前的最小检查

- 新增表是否已经在生产库存在
- 前端是否依赖新表或新列
- 是否需要用户真实浏览器中的网页登录态
- 构建输出目录是否会被现有文件权限阻塞
- 发布后是否有一个可机器验证的线上探针
