#!/bin/bash

# IBC 排班系統 - GitHub Pages 部署腳本
# 用法: ./deploy.sh

set -euo pipefail

PROJECT_ROOT="$(cd "$(dirname "$0")" && pwd)"
cd "$PROJECT_ROOT"

load_env_file() {
    local env_file="$1"
    if [ -f "$env_file" ]; then
        set -a
        # shellcheck disable=SC1090
        . "$env_file"
        set +a
    fi
}

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

# 檢查公開環境變量配置
load_env_file ".env"
load_env_file ".env.local"

if [ -z "${VITE_SUPABASE_URL:-}" ] || [ -z "${VITE_SUPABASE_ANON_KEY:-}" ]; then
    echo ""
    echo "❌ 缺少公开 Supabase 配置。"
    echo "请在 .env 或 .env.local 中设置 VITE_SUPABASE_URL 和 VITE_SUPABASE_ANON_KEY。"
    echo "脚本不会再引导你修改 src/lib/storage.ts。"
    exit 1
fi

if [[ "${VITE_SUPABASE_URL}" == *"your-project-url"* ]] || [[ "${VITE_SUPABASE_ANON_KEY}" == *"your-anon-key"* ]]; then
    echo ""
    echo "❌ 当前 .env / .env.local 里仍是示例占位值。"
    echo "请改成真实的 VITE_SUPABASE_URL 和 VITE_SUPABASE_ANON_KEY 后再部署。"
    exit 1
fi

if [ ! -f "public/subsidy-template.xlsx" ]; then
    echo ""
    echo "❌ 缺少 public/subsidy-template.xlsx，当前补贴导出模板不完整。"
    echo "请先恢复模板资源，再执行部署。"
    exit 1
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
