#!/bin/bash

# IBC 排班系統 - 一鍵部署腳本
# 用法: ./deploy.sh

set -e

echo "🚀 IBC 排班系統一鍵部署"
echo "========================"

# 檢查 Node.js
if ! command -v node &> /dev/null; then
    echo "❌ 未檢測到 Node.js，請先安裝: https://nodejs.org/"
    exit 1
fi

echo "✅ Node.js 版本: $(node --version)"

# 安裝依賴
echo "📦 安裝依賴..."
npm install

# 檢查 Supabase 配置
STORAGE_FILE="src/lib/storage.ts"
if grep -q "your-project-url" "$STORAGE_FILE" || grep -q "your-anon-key" "$STORAGE_FILE"; then
    echo ""
    echo "⚠️  請先配置 Supabase"
    echo ""
    echo "步驟:"
    echo "1. 訪問 https://supabase.com 創建項目"
    echo "2. 在 SQL Editor 執行專案根目錄的 setup.sql"
    echo "3. 獲取 Project URL 和 Anon Key"
    echo "4. 更新 $STORAGE_FILE 中的配置"
    echo ""
    read -p "是否現在編輯配置文件? (y/n) " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        if command -v code &> /dev/null; then
            code "$STORAGE_FILE"
        elif command -v vim &> /dev/null; then
            vim "$STORAGE_FILE"
        else
            open "$STORAGE_FILE"
        fi
        echo "請更新配置後重新運行 ./deploy.sh"
        exit 0
    fi
fi

# 構建
echo "🔨 構建項目..."
if ! grep -q "base: './'" vite.config.ts; then
    echo "❌ vite.config.ts 必須使用相對基路徑 base: './'，否則 GitHub Pages 子路徑部署會白屏。"
    exit 1
fi
npm run build

# 部署到 GitHub Pages
echo "📤 部署到 GitHub Pages..."

# 檢查是否有 GitHub 倉庫
if ! git remote -v &> /dev/null; then
    echo "❌ 未檢測到 GitHub 倉庫"
    echo "請先創建 GitHub 倉庫並添加遠程:"
    echo "  git remote add origin https://github.com/你的用戶名/ibc-scheduler.git"
    exit 1
fi

# 保存當前分支
CURRENT_BRANCH=$(git branch --show-current)
PROJECT_ROOT=$(pwd)
REMOTE_URL=$(git remote get-url origin)

if [ "$CURRENT_BRANCH" != "main" ]; then
    echo "❌ 為避免 gh-pages 與主線再次漂移，現在只允許從 main 分支部署。"
    echo "請先切換到 main，確認變更已合併後再執行 ./deploy.sh"
    exit 1
fi

# 在乾淨臨時目錄中發布，避免把 node_modules、backups、dist 等本地 ignored 文件誤推到 gh-pages。
DEPLOY_DIR=$(mktemp -d)
trap 'rm -rf "$DEPLOY_DIR"' EXIT

cp -R "$PROJECT_ROOT/dist/." "$DEPLOY_DIR/"
touch "$DEPLOY_DIR/.nojekyll"

cd "$DEPLOY_DIR"
git init -q
git checkout -b gh-pages
git config user.name "$(git -C "$PROJECT_ROOT" config user.name || echo 'IBC Scheduler Deploy')"
git config user.email "$(git -C "$PROJECT_ROOT" config user.email || echo 'deploy@ibc-scheduler.local')"
git remote add origin "$REMOTE_URL"
git fetch origin gh-pages:refs/remotes/origin/gh-pages || true

git add .
git commit -m "Deploy to GitHub Pages - $(date '+%Y-%m-%d %H:%M:%S')" || true
git push origin gh-pages --force-with-lease

cd "$PROJECT_ROOT"

echo ""
echo "✅ 部署完成！"
echo ""
REPO_PATH=$(git remote get-url origin | sed -E 's#^git@github.com:##; s#^https://github.com/##; s#\.git$##')
REPO_OWNER=${REPO_PATH%%/*}
REPO_NAME=${REPO_PATH#*/}
echo "🌐 你的網站將在以下地址可用："
echo "   https://${REPO_OWNER}.github.io/${REPO_NAME}/"
echo ""
echo "⚠️  如果這是首次部署，請在 GitHub 倉庫設置中啟用 Pages："
echo "   Settings > Pages > Source > Deploy from a branch > gh-pages"
echo ""
