#!/bin/bash

echo "=== 查询测试数据 ==="
echo ""

echo "1. 查询手机号 13800138000 的包裹（应该有3个）:"
curl -s "http://localhost:8080/api/v1/parcels?phone=13800138000" | python3 -c "
import json, sys
data = json.load(sys.stdin)
print(f'状态: {data[\"message\"]}')
print(f'包裹数量: {data[\"count\"]}')
if data[\"count\"] > 0:
    for i, parcel in enumerate(data[\"data\"], 1):
        print(f'  包裹{i}:')
        print(f'    快递单号: {parcel[\"tracking_number\"]}')
        print(f'    快递公司: {parcel[\"courier_name\"]}')
        print(f'    取件码: {parcel[\"pickup_code\"]}')
        print(f'    货架区域: {parcel[\"shelf_zone\"]}')
        print(f'    状态: {parcel[\"status\"]}')
        print(f'    更新时间: {parcel[\"updated_at\"]}')
        print()
else:
    print('  没有找到包裹')
"
echo ""

echo "2. 查询手机号 13900139000 的包裹（应该有2个）:"
curl -s "http://localhost:8080/api/v1/parcels?phone=13900139000" | python3 -c "
import json, sys
data = json.load(sys.stdin)
print(f'状态: {data[\"message\"]}')
print(f'包裹数量: {data[\"count\"]}')
if data[\"count\"] > 0:
    for i, parcel in enumerate(data[\"data\"], 1):
        print(f'  包裹{i}:')
        print(f'    快递单号: {parcel[\"tracking_number\"]}')
        print(f'    快递公司: {parcel[\"courier_name\"]}')
        print(f'    取件码: {parcel[\"pickup_code\"]}')
        print(f'    货架区域: {parcel[\"shelf_zone\"]}')
        print(f'    状态: {parcel[\"status\"]}')
        print()
else:
    print('  没有找到包裹')
"
echo ""

echo "3. 查询手机号 13700137000 的包裹（应该有1个）:"
curl -s "http://localhost:8080/api/v1/parcels?phone=13700137000" | python3 -c "
import json, sys
data = json.load(sys.stdin)
print(f'状态: {data[\"message\"]}')
print(f'包裹数量: {data[\"count\"]}')
if data[\"count\"] > 0:
    for i, parcel in enumerate(data[\"data\"], 1):
        print(f'  包裹{i}:')
        print(f'    快递单号: {parcel[\"tracking_number\"]}')
        print(f'    快递公司: {parcel[\"courier_name\"]}')
        print(f'    取件码: {parcel[\"pickup_code\"]}')
        print(f'    货架区域: {parcel[\"shelf_zone\"]}')
        print(f'    状态: {parcel[\"status\"]}')
        print()
else:
    print('  没有找到包裹')
"
echo ""

echo "4. 查询不存在的手机号 15000000000:"
curl -s "http://localhost:8080/api/v1/parcels?phone=15000000000" | python3 -c "
import json, sys
data = json.load(sys.stdin)
print(f'状态: {data[\"message\"]}')
print(f'包裹数量: {data[\"count\"]}')
"
echo ""
