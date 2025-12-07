#!/bin/bash

# 测试脚本：验证后端 API 是否正常运行
# 使用方法：bash test-backend.sh

echo "🧪 测试 Neko Ani 后端 API..."
echo ""

# 颜色定义
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# 测试 1: 检查后端是否运行
echo "📋 测试 1: 检查后端服务状态..."
RESPONSE=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:3001/api/health)

if [ "$RESPONSE" == "200" ]; then
    echo -e "${GREEN}✓ 后端服务运行正常${NC}"
else
    echo -e "${RED}✗ 后端服务未启动（HTTP $RESPONSE）${NC}"
    echo "💡 请先运行: npm run dev:server"
    exit 1
fi

echo ""

# 测试 2: 测试搜索 API
echo "📋 测试 2: 搜索 API 功能..."

SEARCH_PAYLOAD='{
  "source": {
    "factoryId": "test",
    "version": 1,
    "arguments": {
      "name": "测试源",
      "searchConfig": {
        "searchUrl": "https://www.google.com/search?q={keyword}",
        "subjectFormatId": "a",
        "channelFormatId": "flattened",
        "matchVideo": {
          "matchVideoUrl": "https?://[^\\s]+"
        }
      }
    }
  },
  "keyword": "test"
}'

SEARCH_RESPONSE=$(curl -s -X POST \
  http://localhost:3001/api/search \
  -H "Content-Type: application/json" \
  -d "$SEARCH_PAYLOAD")

# 检查是否是 JSON 数组（成功的搜索会返回 [] 或 [...]）
if echo "$SEARCH_RESPONSE" | grep -q "^\["; then
    echo -e "${GREEN}✓ 搜索 API 正常${NC}"
    echo "  响应: $SEARCH_RESPONSE" | head -c 100
    echo "..."
else
    echo -e "${RED}✗ 搜索 API 返回异常${NC}"
    echo "  响应: $SEARCH_RESPONSE"
fi

echo ""
echo -e "${YELLOW}✨ 测试完成！${NC}"
echo ""
echo "💡 接下来："
echo "  1. 在浏览器打开 http://localhost:3000"
echo "  2. 尝试搜索和观看视频"
echo "  3. 打开浏览器开发者工具 (F12) 查看 Network 标签"
echo ""
