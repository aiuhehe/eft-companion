#!/bin/bash
# 使い方:
#   ./build.sh         … src/ を結合して eft-tool.html を生成（ローカル開発用）
#   ./build.sh --dist  … さらに GitHub Pages 公開用の dist/ を作成（index.html 化・必要ファイルのみ）
set -e
cd "$(dirname "$0")"
cat src/head.html > eft-tool.html
cat src/js/[0-9]*.js >> eft-tool.html
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
