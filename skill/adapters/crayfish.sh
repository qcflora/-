#!/bin/bash
# 小龙虾（本地部署模型）适配器骨架
# 用法: ./crayfish.sh <doc-type> <materials-file> [api-endpoint]
# 示例: ./crayfish.sh notice materials.txt http://localhost:8000/v1/chat/completions

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
SHARED_DIR="$(cd "$SCRIPT_DIR/../../shared" && pwd)"

DOC_TYPE="$1"
MATERIALS_FILE="$2"
API_ENDPOINT="${3:-http://localhost:8000/v1/chat/completions}"

if [ -z "$DOC_TYPE" ] || [ -z "$MATERIALS_FILE" ]; then
  echo "用法: $0 <doc-type> <materials-file> [api-endpoint]"
  echo "示例: $0 notice materials.txt http://localhost:8000/v1/chat/completions"
  exit 1
fi

# 读取文种定义
DOC_TYPE_JSON="$SHARED_DIR/doc-types/${DOC_TYPE}.json"
if [ ! -f "$DOC_TYPE_JSON" ]; then
  echo "错误: 未知文种 $DOC_TYPE"
  exit 1
fi

# 读取素材
MATERIALS=$(cat "$MATERIALS_FILE")

# 构建 system prompt 与 user prompt
SYSTEM_PROMPT=$(cat <<EOF
你是一位公文整合助手。请按文种规范整合素材为正式公文，不得编造事实、数据或政策依据。输出符合 JSON Schema 的结构化数据。

## 文种规范
$(cat "$DOC_TYPE_JSON")

## JSON Schema
$(cat "$SHARED_DIR/json-schema/document.json")
EOF
)

USER_PROMPT=$(cat <<EOF
请整合以下素材：

$MATERIALS
EOF
)

# 构建 JSON payload
PAYLOAD=$(jq -n \
  --arg system "$SYSTEM_PROMPT" \
  --arg user "$USER_PROMPT" \
  '{
    model: "crayfish",
    messages: [
      {role: "system", content: $system},
      {role: "user", content: $user}
    ]
  }')

# 调用本地 API
echo "正在调用小龙虾模型: $API_ENDPOINT ..."
curl -s -X POST "$API_ENDPOINT" \
  -H "Content-Type: application/json" \
  -d "$PAYLOAD" | jq .
