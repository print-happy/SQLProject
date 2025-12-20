#!/bin/bash

echo "=== 插入基础测试数据（入库功能） ==="

BASE_URL=${BASE_URL:-"http://localhost:8080"}

get_token() {
  # Prefer stdin (pipe), fallback to first argument.
  if [ -n "${1:-}" ]; then
    printf '%s' "$1"
  else
    cat
  fi | python3 -c 'import json,sys; d=json.load(sys.stdin); print(d.get("data",{}).get("access_token",""))'
}

login_courier() {
  local code=$1
  local resp
  resp=$(curl -s -X POST "$BASE_URL/api/v1/auth/courier/login" -H "Content-Type: application/json" -d "{\"courier_code\":\"$code\"}")
  local tok
  tok=$(printf '%s' "$resp" | get_token)
  if [ -z "$tok" ]; then
    echo "failed to login courier $code: $resp" >&2
    return 1
  fi
  echo "$tok"
}

# 定义颜色
RED='\033[0;31m'
GREEN='\033[0;32m'
NC='\033[0m'

# 手机号1：有3个包裹
PHONE1="13800138000"
# 手机号2：有2个包裹  
PHONE2="13900139000"
# 手机号3：有1个包裹
PHONE3="13700137000"

echo "1. 为手机号 $PHONE1 插入3个包裹..."

TOKEN_SF=$(login_courier "SF") || exit 1
TOKEN_JD=$(login_courier "JD") || exit 1
TOKEN_EMS=$(login_courier "EMS") || exit 1

echo "  -> 包裹1: SF10001"
curl -s -X POST "$BASE_URL/api/v1/inbound" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN_SF" \
  -d "{
    \"tracking_number\": \"SF10001\",
    \"phone\": \"$PHONE1\",
    \"user_name\": \"张三\"
  }" | grep -o "success\\|error" || echo " error"

sleep 0.5

echo "  -> 包裹2: JD20001"
curl -s -X POST "$BASE_URL/api/v1/inbound" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN_JD" \
  -d "{
    \"tracking_number\": \"JD20001\",
    \"phone\": \"$PHONE1\",
    \"user_name\": \"张三\"
  }" | grep -o "success\\|error" || echo " error"

sleep 0.5

echo "  -> 包裹3: EMS30001"
curl -s -X POST "$BASE_URL/api/v1/inbound" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN_EMS" \
  -d "{
    \"tracking_number\": \"EMS30001\",
    \"phone\": \"$PHONE1\",
    \"user_name\": \"张三\"
  }" | grep -o "success\\|error" || echo " error"

echo ""
echo "2. 为手机号 $PHONE2 插入2个包裹..."

echo "  -> 包裹1: SF10002"
curl -s -X POST "$BASE_URL/api/v1/inbound" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN_SF" \
  -d "{
    \"tracking_number\": \"SF10002\",
    \"phone\": \"$PHONE2\",
    \"user_name\": \"李四\"
  }" | grep -o "success\\|error" || echo " error"

sleep 0.5

echo "  -> 包裹2: JD20002"
curl -s -X POST "$BASE_URL/api/v1/inbound" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN_JD" \
  -d "{
    \"tracking_number\": \"JD20002\",
    \"phone\": \"$PHONE2\",
    \"user_name\": \"李四\"
  }" | grep -o "success\\|error" || echo " error"

echo ""
echo "3. 为手机号 $PHONE3 插入1个包裹..."

echo "  -> 包裹: EMS30002"
curl -s -X POST "$BASE_URL/api/v1/inbound" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN_EMS" \
  -d "{
    \"tracking_number\": \"EMS30002\",
    \"phone\": \"$PHONE3\",
    \"user_name\": \"王五\"
  }" | grep -o "success\\|error" || echo " error"

echo ""
echo -e "${GREEN}=== 入库测试数据插入完成 ===${NC}"
echo ""
