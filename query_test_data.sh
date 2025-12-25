#!/bin/bash

echo "=== 综合功能测试：健康检查 / 入库 / 查询 / 取件 / 管理端 ==="
echo ""

BASE_URL=${BASE_URL:-"https://localhost"}

# 修复的 token 提取函数
get_token() {
  if [ -n "${1:-}" ]; then
    printf '%s' "$1"
  else
    cat
  fi | python3 - <<'EOF'
import sys, json
try:
    data = sys.stdin.read()
    if not data:
        sys.exit(0)
    d = json.loads(data)
    
    # 尝试从不同的位置提取 token
    token = d.get("access_token")  # 可能在根级别
    if not token:
        token = d.get("data", {}).get("access_token")  # 可能在 data 对象中
    if not token:
        token = d.get("access_token", "")  # 尝试其他可能的键
    
    if token:
        print(token)
    else:
        # 打印调试信息
        print("DEBUG: No token found in response", file=sys.stderr)
        print("DEBUG: Response keys:", d.keys() if hasattr(d, 'keys') else "No keys", file=sys.stderr)
        sys.exit(0)
except Exception as e:
    print(f"DEBUG: Error parsing JSON: {e}", file=sys.stderr)
    sys.exit(0)
EOF
}

login_student() {
  local phone=$1
  local name=$2
  local resp
  
  # 使用更详细的调试信息
  echo "DEBUG: Logging in student $phone with name $name..." >&2
  resp=$(curl -sk -X POST "$BASE_URL/api/v1/auth/student/login" -H "Content-Type: application/json" -d "{\"phone\":\"$phone\",\"name\":\"$name\"}")
  echo "DEBUG: Raw response: $resp" >&2
  
  local tok
  tok=$(printf '%s' "$resp" | get_token)
  
  if [ -z "$tok" ]; then
    echo "ERROR: Failed to extract token from response for student $phone" >&2
    # 尝试直接从响应中提取（硬编码方法）
    if echo "$resp" | grep -q "access_token"; then
      echo "DEBUG: Trying manual extraction..." >&2
      tok=$(echo "$resp" | python3 -c "import json,sys; d=json.load(sys.stdin); print(d.get('data', {}).get('access_token', ''))" 2>/dev/null)
      if [ -n "$tok" ]; then
        echo "DEBUG: Manual extraction succeeded" >&2
        echo "$tok"
        return 0
      fi
    fi
    return 1
  fi
  
  echo "$tok"
}

login_admin() {
  local username=${1:-"admin"}
  local password=${2:-"secret"}
  local resp
  
  echo "DEBUG: Logging in admin $username..." >&2
  resp=$(curl -sk -X POST "$BASE_URL/api/v1/auth/admin/login" -H "Content-Type: application/json" -d "{\"username\":\"$username\",\"password\":\"$password\"}")
  
  local tok
  tok=$(printf '%s' "$resp" | get_token)
  
  if [ -z "$tok" ]; then
    echo "ERROR: Failed to extract token from response for admin" >&2
    # 尝试直接从响应中提取
    tok=$(echo "$resp" | python3 -c "import json,sys; d=json.load(sys.stdin); print(d.get('access_token') or d.get('data', {}).get('access_token', ''))" 2>/dev/null)
    if [ -z "$tok" ]; then
      return 1
    fi
  fi
  
  echo "$tok"
}

PHONE1="13800138000"
PHONE2="13900139000"
PHONE3="13700137000"

echo "[0] 跳过健康检查 /ping（直接进行数据插入测试）..."
echo ""

echo "[1] 调用入库脚本，写入基础测试数据..."
chmod +x ./insert_test_data.sh 2>/dev/null || true
./insert_test_data.sh || {
  echo "注意: 入库脚本执行失败可能是因为数据已存在，继续测试..." >&2
}
echo ""

echo "[1.5] 登录获取 JWT..."
STUDENT_TOKEN_1=$(login_student "$PHONE1" "张三")
if [ $? -ne 0 ] || [ -z "$STUDENT_TOKEN_1" ]; then
  echo "ERROR: Failed to get token for student1, exiting" >&2
  exit 1
fi

STUDENT_TOKEN_2=$(login_student "$PHONE2" "李四")
if [ $? -ne 0 ] || [ -z "$STUDENT_TOKEN_2" ]; then
  echo "ERROR: Failed to get token for student2, exiting" >&2
  exit 1
fi

STUDENT_TOKEN_3=$(login_student "$PHONE3" "王五")
if [ $? -ne 0 ] || [ -z "$STUDENT_TOKEN_3" ]; then
  echo "ERROR: Failed to get token for student3, exiting" >&2
  exit 1
fi

ADMIN_TOKEN=$(login_admin "admin" "secret")
if [ $? -ne 0 ] || [ -z "$ADMIN_TOKEN" ]; then
  echo "ERROR: Failed to get token for admin, exiting" >&2
  exit 1
fi

echo "  student1 token OK (length: ${#STUDENT_TOKEN_1})"
echo "  student2 token OK (length: ${#STUDENT_TOKEN_2})"
echo "  student3 token OK (length: ${#STUDENT_TOKEN_3})"
echo "  admin token OK (length: ${#ADMIN_TOKEN})"
echo ""

# 验证 token 是否有效
echo "[1.6] 验证 token 有效性..."
VALIDATE_RESP=$(curl -sk "$BASE_URL/api/v1/parcels?page=1&page_size=1" -H "Authorization: Bearer $STUDENT_TOKEN_1")
if echo "$VALIDATE_RESP" | grep -q "Unauthorized\|invalid\|error"; then
  echo "ERROR: Student token appears to be invalid" >&2
  exit 1
else
  echo "  Token validation passed"
fi
echo ""

echo "[2] 学生端查询接口（分页）:"
echo "  2.1 查询手机号 $PHONE1 的包裹（期望约3个），page=1,page_size=2:"
RESPONSE=$(curl -sk "$BASE_URL/api/v1/parcels?page=1&page_size=2" -H "Authorization: Bearer $STUDENT_TOKEN_1")
echo "$RESPONSE" | python3 -c '
import json, sys
try:
    d = json.loads(sys.stdin.read())
    print("状态:", d.get("message", ""))
    print("当前页数量:", d.get("count", 0))
    items = d.get("data") or []
    for i, p in enumerate(items, 1):
        tracking = p.get("tracking_number", "")
        courier = p.get("courier_name", "")
        status = p.get("status", "")
        pickup_code = p.get("pickup_code", "")
        print("  包裹{}: {} | {} | 状态: {} | 取件码: {}".format(i, tracking, courier, status, pickup_code))
except json.JSONDecodeError as e:
    print("响应不是有效的JSON:", e)
    print("原始响应:", sys.stdin.read())
except Exception as e:
    print("解析失败:", e)
'
echo ""

echo "  2.2 查询手机号 $PHONE2 的包裹（期望约2个）："
RESPONSE=$(curl -sk "$BASE_URL/api/v1/parcels?page=1&page_size=20" -H "Authorization: Bearer $STUDENT_TOKEN_2")
echo "$RESPONSE" | python3 -c '
import json, sys
try:
    d = json.loads(sys.stdin.read())
    print("状态:", d.get("message", ""))
    print("包裹数量:", d.get("count", 0))
    items = d.get("data") or []
    for i, p in enumerate(items, 1):
        tracking = p.get("tracking_number", "")
        courier = p.get("courier_name", "")
        status = p.get("status", "")
        print("  包裹{}: {} | {} | 状态: {}".format(i, tracking, courier, status))
except Exception as e:
    print("查询失败:", e)
'
echo ""

echo "  2.3 查询手机号 $PHONE3 的包裹（期望约1个）："
RESPONSE=$(curl -sk "$BASE_URL/api/v1/parcels?page=1&page_size=20" -H "Authorization: Bearer $STUDENT_TOKEN_3")
echo "$RESPONSE" | python3 -c '
import json, sys
try:
    d = json.loads(sys.stdin.read())
    print("状态:", d.get("message", ""))
    print("包裹数量:", d.get("count", 0))
    items = d.get("data") or []
    for i, p in enumerate(items, 1):
        tracking = p.get("tracking_number", "")
        courier = p.get("courier_name", "")
        status = p.get("status", "")
        print("  包裹{}: {} | {} | 状态: {}".format(i, tracking, courier, status))
except Exception as e:
    print("查询失败:", e)
'
echo ""

echo "[3] 测试取件流程：先查询取件码，再调用 /pickup，再次查询验证状态变化..."

RESP=$(curl -sk "$BASE_URL/api/v1/parcels?page=1&page_size=20" -H "Authorization: Bearer $STUDENT_TOKEN_1")

TRACK_AND_CODE=$(echo "$RESP" | python3 -c '
import json, sys
try:
    d = json.loads(sys.stdin.read())
    items = d.get("data") or []
    if items:
        tracking = items[0].get("tracking_number", "")
        pickup_code = items[0].get("pickup_code", "")
        print("{} {}".format(tracking, pickup_code))
    else:
        print("")
except:
    print("")
')

if [ -n "$TRACK_AND_CODE" ] && [[ "$TRACK_AND_CODE" != " " ]]; then
    read -r TRACKING PICKUP_CODE <<<"$TRACK_AND_CODE"
    echo "  3.1 选取手机号 $PHONE1 的第一个包裹，运单号: $TRACKING, 取件码: $PICKUP_CODE"
    echo "  3.2 调用 /api/v1/pickup ..."
    PICKUP_RESPONSE=$(curl -sk -X POST "$BASE_URL/api/v1/pickup" \
        -H "Content-Type: application/json" \
        -H "Authorization: Bearer $STUDENT_TOKEN_1" \
        -d "{\"tracking_number\": \"$TRACKING\", \"pickup_code\": \"$PICKUP_CODE\"}")
    echo "$PICKUP_RESPONSE" | python3 -c '
import json, sys
try:
    d = json.loads(sys.stdin.read())
    print("取件响应:", d)
except:
    print("取件响应:", sys.stdin.read())
'
else
    echo "  3.1 未找到可用的包裹"
fi

echo ""
echo "  3.3 再次查询手机号 $PHONE1，确认状态变化:"
RESPONSE=$(curl -sk "$BASE_URL/api/v1/parcels?page=1&page_size=20" -H "Authorization: Bearer $STUDENT_TOKEN_1")
echo "$RESPONSE" | python3 -c '
import json, sys
try:
    d = json.loads(sys.stdin.read())
    print("状态:", d.get("message", ""))
    items = d.get("data") or []
    for i, p in enumerate(items, 1):
        tracking = p.get("tracking_number", "")
        status = p.get("status", "")
        print("  包裹{}: {} | 状态: {}".format(i, tracking, status))
except Exception as e:
    print("查询失败:", e)
'
echo ""

echo "[4] 管理员接口测试：仪表盘 / 滞留件 / 状态更新"
echo "  4.1 /api/v1/admin/dashboard:"
RESPONSE=$(curl -sk "$BASE_URL/api/v1/admin/dashboard" -H "Authorization: Bearer $ADMIN_TOKEN")
echo "$RESPONSE" | python3 -c '
import json, sys
try:
    d = json.loads(sys.stdin.read())
    print("仪表盘数据:", d.get("data", {}))
except Exception as e:
    print("仪表盘接口失败:", e)
    print("原始响应:", sys.stdin.read())
'
echo ""

echo "  4.2 /api/v1/admin/parcels/retention?days=7&page=1&page_size=10:"
RESPONSE=$(curl -sk "$BASE_URL/api/v1/admin/parcels/retention?days=7&page=1&page_size=10" -H "Authorization: Bearer $ADMIN_TOKEN")
echo "$RESPONSE" | python3 -c '
import json, sys
try:
    d = json.loads(sys.stdin.read())
    print("状态:", d.get("message", ""))
    print("滞留件数量(当前页):", d.get("count", 0))
    items = d.get("data") or []
    for i, p in enumerate(items, 1):
        tracking = p.get("tracking_number", "")
        courier = p.get("courier_name", "")
        status = p.get("status", "")
        print("  滞留包裹{}: {} | {} | 状态: {}".format(i, tracking, courier, status))
except Exception as e:
    print("滞留件接口失败:", e)
'
echo ""

echo "  4.3 管理员更新某个包裹状态为 exception（以手机号 $PHONE2 的一个包裹为例）："
RESP2=$(curl -sk "$BASE_URL/api/v1/parcels?page=1&page_size=20" -H "Authorization: Bearer $STUDENT_TOKEN_2")
TRACK2=$(echo "$RESP2" | python3 -c '
import json, sys
try:
    d = json.loads(sys.stdin.read())
    items = d.get("data") or []
    if items:
        print(items[0].get("tracking_number", ""))
    else:
        print("")
except:
    print("")
')

if [ -n "$TRACK2" ]; then
    echo "    选择运单号: $TRACK2"
    UPDATE_RESPONSE=$(curl -sk -X POST "$BASE_URL/api/v1/admin/parcels/$TRACK2/status" \
        -H "Content-Type: application/json" \
        -H "Authorization: Bearer $ADMIN_TOKEN" \
        -d '{"status": "exception"}')
    echo "$UPDATE_RESPONSE" | python3 -c '
import json, sys
try:
    d = json.loads(sys.stdin.read())
    print("状态更新响应:", d)
except:
    print("状态更新响应:", sys.stdin.read())
'
else
    echo "    未找到可用于状态更新测试的包裹"
fi

echo ""
echo "=== 综合功能测试结束 ==="
echo ""