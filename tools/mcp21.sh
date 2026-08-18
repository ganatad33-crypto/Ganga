#!/bin/sh
# קריאה לכלי של 21st.dev MCP.  שימוש:  tools/mcp21.sh <tool> '<json args>'
TOOL="$1"; ARGS="${2:-{\}}"
curl -sS -X POST "https://21st.dev/api/mcp" \
  -H "Content-Type: application/json" -H "Accept: application/json, text/event-stream" \
  -H "x-api-key: $TWENTYFIRST_API_KEY" --max-time 90 \
  -d "{\"jsonrpc\":\"2.0\",\"id\":1,\"method\":\"tools/call\",\"params\":{\"name\":\"$TOOL\",\"arguments\":$ARGS}}"
