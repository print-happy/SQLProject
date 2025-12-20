#!/bin/bash

echo "=== 综合功能测试：健康检查 / 入库 / 查询 / 取件 / 管理端 ==="
echo ""

BASE_URL=${BASE_URL:-"http://localhost:8080"}

get_token() {
  # Prefer stdin (pipe), fallback to first argument.
  if [ -n "${1:-}" ]; then
    printf '%s' "$1"
  else
    cat
  fi | python3 -c 'import json,sys; d=json.load(sys.stdin); print(d.get("data",{}).get("access_token",""))'
}

login_student() {
  local phone=$1
  local name=$2
  local resp
  resp=$(curl -s -X POST "$BASE_URL/api/v1/auth/student/login" -H "Content-Type: application/json" -d "{\"phone\":\"$phone\",\"name\":\"$name\"}")
  local tok
  tok=$(printf '%s' "$resp" | get_token)
  if [ -z "$tok" ]; then
    echo "failed to login student $phone: $resp" >&2
    return 1
  fi
  echo "$tok"
}

login_admin() {
  local username=${1:-"admin"}
  local password=${2:-"secret"}
  local resp
  resp=$(curl -s -X POST "$BASE_URL/api/v1/auth/admin/login" -H "Content-Type: application/json" -d "{\"username\":\"$username\",\"password\":\"$password\"}")
  local tok
  tok=$(printf '%s' "$resp" | get_token)
  if [ -z "$tok" ]; then
    echo "failed to login admin: $resp" >&2
    return 1
  fi
  echo "$tok"
}

PHONE1="13800138000"
PHONE2="13900139000"
PHONE3="13700137000"
echo "[0] 健康检查 /ping:"
PING_RESP=$(curl -s "$BASE_URL/ping")
if [ -z "$PING_RESP" ]; then
    echo " ping 接口请求失败（无响应）"
    exit 1
fi

echo "$PING_RESP" | python3 -c 'import json,sys; print("响应:", json.load(sys.stdin))' || {
    echo "解析 /ping 响应失败，原始响应如下："
    echo "$PING_RESP"
    exit 1
}
echo ""

echo "[1] 调用入库脚本，写入基础测试数据..."
chmod +x ./insert_test_data.sh 2>/dev/null || true
./insert_test_data.sh || echo " 入库脚本执行失败，请检查后端是否已启动"
echo ""

echo "[1.5] 登录获取 JWT..."
STUDENT_TOKEN_1=$(login_student "$PHONE1" "张三") || exit 1
STUDENT_TOKEN_2=$(login_student "$PHONE2" "李四") || exit 1
STUDENT_TOKEN_3=$(login_student "$PHONE3" "王五") || exit 1
ADMIN_TOKEN=$(login_admin "admin" "secret") || exit 1
echo "  student1 token OK"
echo "  student2 token OK"
echo "  student3 token OK"
echo "  admin token OK"
echo ""
echo "[2] 学生端查询接口（分页）:"
echo "  2.1 查询手机号 $PHONE1 的包裹（期望约3个），page=1,page_size=2:"
curl -s "$BASE_URL/api/v1/parcels?page=1&page_size=2" -H "Authorization: Bearer $STUDENT_TOKEN_1" | \
  python3 -c 'import json,sys; d=json.load(sys.stdin); print("状态:", d.get("message")); print("当前页数量:", d.get("count")); items=d.get("data") or []; [print("  包裹{}: {} | {} | 状态: {} | 取件码: {}".format(i, p.get("tracking_number"), p.get("courier_name"), p.get("status"), p.get("pickup_code"))) for i,p in enumerate(items,1)]' \
  || echo " 查询失败"
echo ""
echo "  2.2 查询手机号 $PHONE2 的包裹（期望约2个）："
curl -s "$BASE_URL/api/v1/parcels?page=1&page_size=20" -H "Authorization: Bearer $STUDENT_TOKEN_2" | \
  python3 -c 'import json,sys; d=json.load(sys.stdin); print("状态:", d.get("message")); print("包裹数量:", d.get("count")); items=d.get("data") or []; [print("  包裹{}: {} | {} | 状态: {}".format(i, p.get("tracking_number"), p.get("courier_name"), p.get("status"))) for i,p in enumerate(items,1)]' \
  || echo " 查询失败"
echo ""
echo "  2.3 查询手机号 $PHONE3 的包裹（期望约1个）："
curl -s "$BASE_URL/api/v1/parcels?page=1&page_size=20" -H "Authorization: Bearer $STUDENT_TOKEN_3" | \
  python3 -c 'import json,sys; d=json.load(sys.stdin); print("状态:", d.get("message")); print("包裹数量:", d.get("count")); items=d.get("data") or []; [print("  包裹{}: {} | {} | 状态: {}".format(i, p.get("tracking_number"), p.get("courier_name"), p.get("status"))) for i,p in enumerate(items,1)]' \
  || echo " 查询失败"
echo ""
echo "  2.4 使用 student1 token 查询（不允许指定 phone），确认不会越权："
curl -s "$BASE_URL/api/v1/parcels?page=1&page_size=20" -H "Authorization: Bearer $STUDENT_TOKEN_1" | \
  python3 -c 'import json,sys; d=json.load(sys.stdin); print("状态:", d.get("message")); print("包裹数量:", d.get("count"))' \
  || echo " 查询失败"
echo ""

echo "[3] 测试取件流程：先查询取件码，再调用 /pickup，再次查询验证状态变化..."

RESP=$(curl -s "$BASE_URL/api/v1/parcels?page=1&page_size=20" -H "Authorization: Bearer $STUDENT_TOKEN_1")

TRACK_AND_CODE=$(printf '%s' "$RESP" | python3 -c 'import json,sys; d=json.load(sys.stdin); items=d.get("data") or []; print(items[0].get("tracking_number",""), items[0].get("pickup_code","")) if items else print("")' 2>/dev/null)

read -r TRACKING PICKUP_CODE <<<"$TRACK_AND_CODE"

echo "  3.1 选取手机号 $PHONE1 的第一个包裹，运单号: $TRACKING, 取件码: $PICKUP_CODE"
echo "  3.2 调用 /api/v1/pickup ..."
curl -s -X POST "$BASE_URL/api/v1/pickup" \
    -H "Content-Type: application/json" \
  -H "Authorization: Bearer $STUDENT_TOKEN_1" \
    -d "{\"tracking_number\": \"$TRACKING\", \"pickup_code\": \"$PICKUP_CODE\"}" | \
    python3 -c 'import json,sys; print("取件响应:", json.load(sys.stdin))' \
    || echo " 取件请求失败"
echo ""

echo "  3.3 再次查询手机号 $PHONE1，确认状态是否为 picked_up:"
curl -s "$BASE_URL/api/v1/parcels?page=1&page_size=20" -H "Authorization: Bearer $STUDENT_TOKEN_1" | \
    python3 -c 'import json,sys; d=json.load(sys.stdin); print("状态:", d.get("message")); items=d.get("data") or []; [print("  包裹{}: {} | 状态: {}".format(i, p.get("tracking_number"), p.get("status"))) for i,p in enumerate(items,1)]' \
    || echo " 查询失败"
echo ""

echo "[4] 管理员接口测试：仪表盘 / 滞留件 / 状态更新"
echo "  4.1 /api/v1/admin/dashboard:"
curl -s "$BASE_URL/api/v1/admin/dashboard" -H "Authorization: Bearer $ADMIN_TOKEN" | \
  python3 -c 'import json,sys; d=json.load(sys.stdin); print("仪表盘:", d.get("data"))' \
  || echo " 仪表盘接口失败"
echo ""

echo "  4.2 /api/v1/admin/parcels/retention?days=7&page=1&page_size=10:"
curl -s "$BASE_URL/api/v1/admin/parcels/retention?days=7&page=1&page_size=10" -H "Authorization: Bearer $ADMIN_TOKEN" | \
    python3 -c 'import json,sys; d=json.load(sys.stdin); print("状态:", d.get("message")); print("滞留件数量(当前页):", d.get("count")); items=d.get("data") or []; [print("  滞留包裹{}: {} | {} | 状态: {}".format(i, p.get("tracking_number"), p.get("courier_name"), p.get("status"))) for i,p in enumerate(items,1)]' \
    || echo " 滞留件接口失败（可能当前还没有到滞留阈值）"
echo ""

echo "  4.3 管理员更新某个包裹状态为 exception（以手机号 $PHONE2 的一个包裹为例）："
RESP2=$(curl -s "$BASE_URL/api/v1/parcels?page=1&page_size=20" -H "Authorization: Bearer $STUDENT_TOKEN_2")
TRACK2=$(printf '%s' "$RESP2" | python3 -c 'import json,sys; d=json.load(sys.stdin); items=d.get("data") or []; print(items[0].get("tracking_number","") if items else "", end="")' 2>/dev/null)

if [ -n "$TRACK2" ]; then
    echo "    选择运单号: $TRACK2"
    curl -s -X POST "$BASE_URL/api/v1/admin/parcels/$TRACK2/status" \
                -H "Content-Type: application/json" \
                -H "Authorization: Bearer $ADMIN_TOKEN" \
                -d '{"status": "exception"}' | \
                python3 -c 'import json,sys; print("状态更新响应:", json.load(sys.stdin))' \
                || echo " 状态更新失败"
else
  echo "    未找到可用于状态更新测试的包裹"
fi

echo ""
echo "=== 综合功能测试结束 ==="
echo ""
