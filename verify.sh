#!/bin/bash

# 快速验证脚本 - 检查项目是否正确配置

set -e

echo "🔍 Neko Ani 项目验证..."
echo ""

# 颜色
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m'

# 检查项目结构
echo "📋 检查项目结构..."
files=(
  "package.json"
  "tsconfig.json"
  "vite.config.ts"
  "server/index.ts"
  "server/parsers.ts"
  "services/parserService.ts"
  "types.ts"
)

for file in "${files[@]}"; do
  if [ -f "$file" ]; then
    echo -e "${GREEN}✓${NC} $file"
  else
    echo -e "${RED}✗${NC} $file (缺失)"
  fi
done

echo ""
echo "📦 检查依赖..."
if [ -d "node_modules" ]; then
  echo -e "${GREEN}✓${NC} node_modules 已安装"
else
  echo -e "${YELLOW}⚠${NC} node_modules 未安装，运行 npm install"
fi

echo ""
echo "🏗️ 检查 TypeScript 配置..."
if grep -q '"module": "ES2022"' tsconfig.json; then
  echo -e "${GREEN}✓${NC} TypeScript 配置正确"
else
  echo -e "${RED}✗${NC} TypeScript 配置可能有问题"
fi

echo ""
echo "📝 检查 npm 脚本..."
if grep -q 'tsx server/index.ts' package.json; then
  echo -e "${GREEN}✓${NC} 后端脚本使用 tsx"
else
  echo -e "${YELLOW}⚠${NC} 后端脚本配置"
fi

echo ""
echo "✅ 验证完成！"
echo ""
echo "💡 接下来运行："
echo "   npm install  # 如果还未安装依赖"
echo "   npm run dev   # 启动前后端"
