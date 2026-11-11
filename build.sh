#!/bin/bash
# 使い方:
#   ./build.sh         … src/ を結合して eft-tool.html を生成（ローカル開発用）
#   ./build.sh --dist  … さらに GitHub Pages 公開用の dist/ を作成（index.html 化・必要ファイルのみ）
#   DISCORD_BOT_URL=https://… ./build.sh  … Discord 出撃共有 Bot の URL を埋め込む（空なら設定タブに入力欄が出る）
set -e
cd "$(dirname "$0")"

# Bot の URL（GitHub Actions シークレット DISCORD_BOT_URL・ソースには書かない）を __DISCORD_BOT_URL__ と置き換える
BOT_URL="${DISCORD_BOT_URL:-}"
BOT_URL="${BOT_URL%/}"
if [ -n "$BOT_URL" ]; then
  case "$BOT_URL" in
    https://*|http://localhost*|http://127.0.0.1*) ;;
    *) echo "DISCORD_BOT_URL は https:// で始まる URL にしてください" >&2; exit 1 ;;
  esac
  if printf '%s' "$BOT_URL" | grep -q "[[:space:]'\"\\\\|&]"; then
    echo "DISCORD_BOT_URL に使えない文字が含まれています" >&2; exit 1
  fi
fi

cat src/head.html > eft-tool.html
if [ -n "$BOT_URL" ]; then
  cat src/js/[0-9]*.js | sed "s|__DISCORD_BOT_URL__|$BOT_URL|" >> eft-tool.html
  echo "Discord Bot URL: embedded"
else
  cat src/js/[0-9]*.js >> eft-tool.html
  echo "Discord Bot URL: (not set)"
fi
cat src/tail.html >> eft-tool.html
echo "Build complete: eft-tool.html"

if [ "$1" = "--dist" ]; then
  rm -rf dist
  mkdir -p dist
  cp eft-tool.html dist/index.html
  cp eft-tool.html style.css guides-data.js guide-viewer.html task-reward-lookup.html task-tree-viewer.html dist/
  # マップ画像は同梱しない（利用者が「画像を差し替え」で登録する）
  touch dist/.nojekyll
  echo "Dist complete: dist/"
fi
