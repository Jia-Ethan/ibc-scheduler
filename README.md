# IBC 排班系統

一個精美的玻璃質感排班系統，支持跨設備同步。

![Screenshot](https://via.placeholder.com/800x450.png?text=IBC+Scheduler)

## 🌐 正式地址

- **線上使用**：https://jia-ethan.github.io/ibc-scheduler/
- **GitHub 倉庫**：https://github.com/Jia-Ethan/ibc-scheduler

## ✨ 功能特性

- 🎨 **玻璃質感 UI** - 極光背景 + Framer Motion 動畫
- 🔄 **跨設備同步** - Supabase 實時數據同步
- 👥 **多使用者支持** - 管理員可添加/刪除使用者
- 📅 **智能排班** - 自動排班算法，支持手動調整
- ✉️ **給班提交通知** - 學生確認給班後保存並通知管理員固定郵箱
- 🌐 **雙語支持** - 中文/English 切換
- 📄 **Word 導出** - 一鍵導出 `.docx` 排班表

## 🚀 快速部署（3分鐘）

### 方法一：一鍵部署腳本（推薦）

```bash
# 1. 克隆專案
git clone https://github.com/Jia-Ethan/ibc-scheduler.git
cd ibc-scheduler

# 2. 運行部署腳本
./deploy.sh
```

腳本會自動：
- 安裝依賴
- 配置 Supabase
- 構建項目
- 部署到 GitHub Pages

> 注意：本專案部署在 GitHub Pages 子路徑 `/ibc-scheduler/` 下，`vite.config.ts` 必須保持 `base: './'`，否則線上會因靜態資源路徑錯誤而白屏。

### 方法二：手動部署

#### 1. 創建 Supabase 項目

1. 訪問 [supabase.com](https://supabase.com) 並登入
2. 點擊 "New Project"，名稱填 `ibc-scheduler`
3. 等待數據庫創建完成
4. 進入 SQL Editor，執行以下 SQL：

```sql
-- 用戶表
CREATE TABLE users (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);

-- 給班表
CREATE TABLE availability (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  day_of_week INTEGER NOT NULL,
  period INTEGER NOT NULL,
  UNIQUE(user_id, day_of_week, period)
);

-- 排班表
CREATE TABLE schedule (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  day_of_week INTEGER NOT NULL,
  period INTEGER NOT NULL,
  UNIQUE(day_of_week, period)
);

-- 啟用 Realtime
ALTER TABLE schedule REPLICA IDENTITY FULL;
ALTER PUBLICATION supabase_realtime ADD TABLE schedule;
ALTER TABLE availability REPLICA IDENTITY FULL;
ALTER PUBLICATION supabase_realtime ADD TABLE availability;
ALTER TABLE users REPLICA IDENTITY FULL;
ALTER PUBLICATION supabase_realtime ADD TABLE users;
```

#### 2. 獲取 API 密鑰

1. Project Settings > API
2. 複製 `Project URL` 和 `anon public` key
3. 複製 `.env.example` 為 `.env`，填入前端環境變量：

```bash
VITE_SUPABASE_URL=你的 Project URL
VITE_SUPABASE_ANON_KEY=你的 Anon Key

# 可選：只用於前端彈窗顯示，不要填寫私密 token
VITE_ADMIN_NOTIFICATION_EMAIL_HINT=a***@example.com
```

#### 3. 配置給班提交郵件

學生點擊「確認排班」時，前端會調用 Supabase Edge Function `confirm-availability-submission`。該 Function 會先保存給班，再通過 Resend 發送通知；如果郵件發送失敗，會盡量回滾本次保存。

部署 Function：

```bash
supabase functions deploy confirm-availability-submission
```

在 Supabase Function Secrets 中配置：

```bash
SUPABASE_URL=你的 Project URL
SUPABASE_SERVICE_ROLE_KEY=你的 service_role key
RESEND_API_KEY=你的 Resend API Key
RESEND_FROM_EMAIL=已驗證的發件地址
ADMIN_NOTIFICATION_EMAIL=管理員固定收件郵箱
```

`ADMIN_NOTIFICATION_EMAIL` 只放在 Supabase Secret 裡，前端只顯示 `VITE_ADMIN_NOTIFICATION_EMAIL_HINT` 的脫敏提示。

#### 4. Word 排班表導出依賴

管理員頁的「導出 Word」使用 `docx` 在瀏覽器端生成 `.docx` 文件；安裝依賴時會隨 `npm install` 自動安裝，不需要額外服務端配置。

#### 5. 部署到 GitHub Pages

```bash
# 安裝依賴
npm install

# 構建
npm run build

# 部署到 GitHub Pages
./deploy.sh
```

部署前請確認 `vite.config.ts` 仍為相對基路徑：

```typescript
export default defineConfig({
  plugins: [react()],
  base: './',
})
```

## 📁 項目結構

```
ibc-scheduler/
├── .github/workflows/    # GitHub Actions 自動部署
├── src/
│   ├── components/       # UI 組件
│   ├── context/         # React Context
│   ├── lib/             # 工具函數 & Supabase 配置
│   ├── pages/           # 頁面組件
│   └── types/           # TypeScript 類型
├── deploy.sh            # 一鍵部署腳本
└── README.md            # 本文檔
```

## 🔧 本地開發

```bash
# 安裝依賴
npm install

# 啟動開發伺服器
npm run dev

# 訪問 http://localhost:5173
```

## 🌐 管理員登入

- **口令**: `IBCprincipal`

## 📄 許可證

MIT License

## 🤝 貢獻

歡迎提交 Issue 和 Pull Request！
