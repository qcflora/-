#!/bin/bash
# Claude Code 适配器骨架
# 用法: ./claude-code.sh <doc-type> <materials-file> [options]

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
SHARED_DIR="$(cd "$SCRIPT_DIR/../../shared" && pwd)"

DOC_TYPE="$1"
MATERIALS_FILE="$2"

if [ -z "$DOC_TYPE" ] || [ -z "$MATERIALS_FILE" ]; then
  echo "用法: $0 <doc-type> <materials-file>"
  echo "示例: $0 notice materials.txt"
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

# 构建 prompt
PROMPT=$(cat <<EOF
你是一位公文整合助手。请将以下素材按照"$DOC_TYPE"文种的格式规范整合成一份正式公文。

## 文种规范
$(cat "$DOC_TYPE_JSON")

## 素材
$MATERIALS

## 要求
1. 按文种标准结构组织内容
2. 保留素材来源标记
3. 补充适当的过渡句和衔接语
4. 不得编造事实、数据或政策依据
5. 输出符合以下 JSON Schema 的结构化数据
$(cat "$SHARED_DIR/json-schema/document.json")

请输出 JSON 格式的整合结果。
EOF
)

# 调用 Claude Code
echo "$PROMPT" | claude --model claude-sonnet-4-20250514
