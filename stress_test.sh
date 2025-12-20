#!/bin/bash

# 简单压力测试脚本：对入库和查询接口进行高并发压测
# 使用方法：
#   chmod +x stress_test.sh
#   ./stress_test.sh               # 使用默认并发参数
#   CONCURRENCY=50 TOTAL=1000 ./stress_test.sh
#   BASE_URL=http://localhost:8080 CONCURRENCY=20 TOTAL=500 ./stress_test.sh

BASE_URL=${BASE_URL:-"http://localhost:8080"}
CONCURRENCY=${CONCURRENCY:-20}   # 同时并发请求数
TOTAL=${TOTAL:-200}              # 总请求数（每轮）

PHONE_STRESS="18800000000"
COURIER_CODE="SF"

get_token() {
  # Prefer stdin (pipe), fallback to first argument.
  if [ -n "${1:-}" ]; then
    printf '%s' "$1"
  else
    cat
  fi | python3 -c 'import json,sys; d=json.load(sys.stdin); print(d.get("data",{}).get("access_token",""))'
}

COURIER_TOKEN=$(curl -s -X POST "$BASE_URL/api/v1/auth/courier/login" -H "Content-Type: application/json" -d "{\"courier_code\":\"$COURIER_CODE\"}" | get_token)
STUDENT_TOKEN=$(curl -s -X POST "$BASE_URL/api/v1/auth/student/login" -H "Content-Type: application/json" -d "{\"phone\":\"$PHONE_STRESS\",\"name\":\"stress\"}" | get_token)

if [ -z "$COURIER_TOKEN" ]; then
  echo "failed to login courier" >&2
  exit 1
fi
if [ -z "$STUDENT_TOKEN" ]; then
  echo "failed to login student" >&2
  exit 1
fi

echo "=== 压力测试开始 ==="
echo "BASE_URL   = $BASE_URL"
echo "CONCURRENCY= $CONCURRENCY"
echo "TOTAL      = $TOTAL"
echo ""

start_ts=$(date +%s)

run_with_concurrency() {
  local total=$1
  local concurrency=$2
  local func=$3

  local i=1
  while [ $i -le $total ]; do
    $func "$i" &
    # 控制最大并发数
    if (( i % concurrency == 0 )); then
      wait
    fi
    i=$((i+1))
  done
  wait
}

# 入库压测：大量随机运单号入库
inbound_once() {
  local idx=$1
  local tracking="STRESS-$(date +%s%N)-$idx"
  curl -s -X POST "$BASE_URL/api/v1/inbound" \
    -H "Content-Type: application/json" \
    -H "Authorization: Bearer $COURIER_TOKEN" \
    -d "{\"tracking_number\": \"$tracking\", \"phone\": \"$PHONE_STRESS\", \"user_name\": \"stress-tester\"}" \
    >/dev/null 2>&1 || true
}

# 查询压测：对同一个手机号进行高频查询
query_once() {
  curl -s "$BASE_URL/api/v1/parcels?page=1&page_size=20" -H "Authorization: Bearer $STUDENT_TOKEN" \
    >/dev/null 2>&1 || true
}

echo "[1] 入库接口压力测试 (POST /api/v1/inbound) ..."
phase1_start=$(date +%s)
run_with_concurrency "$TOTAL" "$CONCURRENCY" inbound_once
phase1_end=$(date +%s)

echo "  入库压测耗时: $((phase1_end - phase1_start)) 秒"

echo "[2] 查询接口压力测试 (GET /api/v1/parcels) ..."
phase2_start=$(date +%s)
run_with_concurrency "$TOTAL" "$CONCURRENCY" query_once
phase2_end=$(date +%s)

echo "  查询压测耗时: $((phase2_end - phase2_start)) 秒"

end_ts=$(date +%s)

echo ""
echo "=== 压力测试结束，总耗时: $((end_ts - start_ts)) 秒 ==="
echo "提示：可以通过数据库统计或日志进一步分析 QPS / 错误率 / 慢查询情况。"
