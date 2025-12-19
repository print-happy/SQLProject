#!/bin/bash

echo "=== 插入测试数据 ==="

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

# 包裹1
curl -s -X POST http://localhost:8080/api/v1/inbound \
  -H "Content-Type: application/json" \
  -d "{
    \"tracking_number\": \"SF10001\",
    \"phone\": \"$PHONE1\",
    \"courier_code\": \"SF\",
    \"user_name\": \"张三\"
  }" | grep -o "success\|error"
echo "  包裹1: SF10001"

sleep 1

# 包裹2
curl -s -X POST http://localhost:8080/api/v1/inbound \
  -H "Content-Type: application/json" \
  -d "{
    \"tracking_number\": \"JD20001\",
    \"phone\": \"$PHONE1\",
    \"courier_code\": \"JD\",
    \"user_name\": \"张三\"
  }" | grep -o "success\|error"
echo "  包裹2: JD20001"

sleep 1

# 包裹3
curl -s -X POST http://localhost:8080/api/v1/inbound \
  -H "Content-Type: application/json" \
  -d "{
    \"tracking_number\": \"EMS30001\",
    \"phone\": \"$PHONE1\",
    \"courier_code\": \"EMS\",
    \"user_name\": \"张三\"
  }" | grep -o "success\|error"
echo "  包裹3: EMS30001"

echo ""
echo "2. 为手机号 $PHONE2 插入2个包裹..."

# 包裹1
curl -s -X POST http://localhost:8080/api/v1/inbound \
  -H "Content-Type: application/json" \
  -d "{
    \"tracking_number\": \"SF10002\",
    \"phone\": \"$PHONE2\",
    \"courier_code\": \"SF\",
    \"user_name\": \"李四\"
  }" | grep -o "success\|error"
echo "  包裹1: SF10002"

sleep 1

# 包裹2
curl -s -X POST http://localhost:8080/api/v1/inbound \
  -H "Content-Type: application/json" \
  -d "{
    \"tracking_number\": \"JD20002\",
    \"phone\": \"$PHONE2\",
    \"courier_code\": \"JD\",
    \"user_name\": \"李四\"
  }" | grep -o "success\|error"
echo "  包裹2: JD20002"

echo ""
echo "3. 为手机号 $PHONE3 插入1个包裹..."

curl -s -X POST http://localhost:8080/api/v1/inbound \
  -H "Content-Type: application/json" \
  -d "{
    \"tracking_number\": \"EMS30002\",
    \"phone\": \"$PHONE3\",
    \"courier_code\": \"EMS\",
    \"user_name\": \"王五\"
  }" | grep -o "success\|error"
echo "  包裹: EMS30002"

echo ""
echo "=== 数据插入完成 ==="
echo ""
