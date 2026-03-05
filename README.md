# IBC 排班系統

一個精美的玻璃質感排班系統，支持跨設備同步。

![Screenshot](https://via.placeholder.com/800x450.png?text=IBC+Scheduler)

## ✨ 功能特性

### 核心功能
- 🎨 **玻璃質感 UI** - 極光背景 + Framer Motion 動畫
- 🔄 **跨設備同步** - Supabase 實時數據同步
- 👥 **多使用者支持** - 管理員可添加/刪除使用者
- 📅 **智能排班** - 自動排班算法，支持手動調整
- 🌐 **雙語支持** - 中文/English 切換
- 📊 **CSV 導出** - 一鍵導出排班表（含統計）

### 新增功能 (2026-03)
- 📝 **請假審批** - 學生提交請假，管理員審批
- 📋 **排班歷史** - 自動保存歷史版本，可查看/導出
- ⚠️ **衝突警告** - 實時檢測排班衝突
- 📈 **時數統計** - 顯示每人值班時段數
- 🌙 **暗黑模式** - 支持淺色/深色/系統主題
- 📱 **移動端優化** - 觸控友好的響應式設計
- 🔔 **值班提醒** - 首頁顯示即將值班信息

## 🚀 快速部署（3分鐘）

### 方法一：一鍵部署腳本（推薦）

```bash
# 1. 克隆專案
git clone https://github.com/Ethan-Pier/ibc-scheduler.git
cd ibc-scheduler

# 2. 運行部署腳本
./deploy.sh
```

### 方法二：手動部署

#### 1. 創建 Supabase 項目

1. 訪問 [supabase.com](https://supabase.com) 並登入
2. 點擊 "New Project"，名稱填 `ibc-scheduler`
3. 進入 SQL Editor，執行 `setup.sql`

#### 2. 獲取 API 密鑰

1. Project Settings > API
2. 複製 ` `anon public`Project URL` 和 key
3. 更新 `.env` 文件：

```bash
VITE_SUPABASE_URL=你的 Project URL
VITE_SUPABASE_ANON_KEY=你的 Anon Key
```

#### 3. 部署到 GitHub Pages

```bash
npm install
npm run build
npx gh-pages -d dist
```

## 📁 項目結構

```
ibc-scheduler/
├── src/
│   ├── components/       # UI 組件
│   │   ├── AuroraBackground.tsx
│   │   ├── EmptyState.tsx
│   │   ├── LeaveRequestModal.tsx
│   │   ├── Skeleton.tsx
│   │   └── ThemeToggle.tsx
│   ├── context/         # React Context
│   │   ├── AppContext.tsx
│   │   ├── LanguageContext.tsx
│   │   └── ThemeContext.tsx
│   ├── lib/             # 工具函數
│   │   ├── storage.ts   # Supabase 配置
│   │   └── utils.ts    # 工具函數
│   ├── pages/           # 頁面組件
│   │   ├── AdminPage.tsx
│   │   ├── HomePage.tsx
│   │   ├── LeaveRequestsPage.tsx
│   │   ├── LockScreen.tsx
│   │   ├── ScheduleHistoryPage.tsx
│   │   └── SchedulePage.tsx
│   └── types/           # TypeScript 類型
├── setup.sql           # 數據庫初始化
├── backup.sql          # 數據庫備份
├── swap_requests.sql   # 調班申請（預留）
└── README.md           # 本文檔
```

## 🔧 本地開發

```bash
npm install
npm run dev
# 訪問 http://localhost:5173
```

## 🌐 管理員登入

- **口令**: `IBCprincipal`

## 📊 數據庫表

| 表名 | 說明 |
|------|------|
| users | 用戶 |
| availability | 可用性設置 |
| schedule | 排班結果 |
| leave_requests | 請假申請 |
| schedule_history | 排班歷史 |
| shift_swap_requests | 調班申請（預留） |

## 📄 許可證

MIT License

## 🤝 貢獻

歡迎提交 Issue 和 Pull Request！
