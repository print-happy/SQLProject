#!/bin/bash

echo "=== 快递系统压力测试脚本 ==="
echo ""

BASE_URL=${BASE_URL:-"https://localhost"}
CONCURRENCY=${CONCURRENCY:-10}  # 默认并发数
REQUESTS_PER_THREAD=${REQUESTS_PER_THREAD:-20}  # 每个线程请求数
TOTAL_REQUESTS=$((CONCURRENCY * REQUESTS_PER_THREAD))
TEST_DURATION=${TEST_DURATION:-30}  # 默认测试时长（秒）
RESULTS_DIR="./stress_results_$(date +%Y%m%d_%H%M%S)"
mkdir -p "$RESULTS_DIR"

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# 测试数据
TEST_PHONES=("13800138000" "13900139000" "13700137000")
TEST_NAMES=("张三" "李四" "王五")
ADMIN_USER="admin"
ADMIN_PASS="secret"
COURIER_CODES=("SF" "JD" "EMS")

# 全局token变量
declare -a STUDENT_TOKENS
declare -a COURIER_TOKENS
ADMIN_TOKEN=""

# 检查必要工具
check_dependencies() {
    echo "检查依赖工具..."
    local missing=0
    
    if ! command -v curl &> /dev/null; then
        echo -e "${RED}错误: curl 未安装${NC}"
        missing=1
    fi
    
    if ! command -v parallel &> /dev/null; then
        echo -e "${YELLOW}警告: GNU parallel 未安装，将使用串行测试${NC}"
        echo "安装命令: sudo apt-get install parallel 或 sudo yum install parallel"
        USE_PARALLEL=false
    else
        USE_PARALLEL=true
    fi
    
    if ! command -v python3 &> /dev/null; then
        echo -e "${RED}错误: python3 未安装${NC}"
        missing=1
    fi
    
    if ! command -v bc &> /dev/null; then
        echo -e "${YELLOW}警告: bc 未安装，部分统计功能可能受限${NC}"
        echo "安装命令: sudo apt-get install bc 或 sudo yum install bc"
    fi
    
    if [ $missing -eq 1 ]; then
        exit 1
    fi
    
    echo -e "${GREEN}所有依赖检查通过${NC}"
    echo ""
}

# 健康检查 - 修复版本
health_check() {
    echo "执行健康检查..."
    
    # 尝试多个可能的健康检查端点
    local endpoints=("/ping" "/api/v1/auth/student/login" "/api/v1/parcels")
    
    for endpoint in "${endpoints[@]}"; do
        echo "  尝试端点: $endpoint"
        local response_code
        response_code=$(curl -sk -o /dev/null -w "%{http_code}" "${BASE_URL}${endpoint}" 2>/dev/null)
        
        if [[ "$response_code" =~ ^2[0-9]{2}$ ]] || [[ "$response_code" =~ ^4[0-9]{2}$ ]]; then
            echo -e "  ${GREEN}端点可达 (HTTP $response_code)${NC}"
            return 0
        fi
    done
    
    echo -e "${YELLOW}警告: 无法确认服务状态，但继续测试...${NC}"
    return 0
}

# 修复的token提取函数
get_token() {
    python3 - <<'EOF'
import sys, json
try:
    data = sys.stdin.read()
    if not data:
        sys.exit(0)
    
    # 解析JSON
    d = json.loads(data)
    
    # 调试信息（可选）
    # print(f"DEBUG: Parsed keys: {list(d.keys())}", file=sys.stderr)
    
    # 尝试从不同位置提取token
    token = ""
    
    # 第一种格式: {"data": {"access_token": "..."}}
    if "data" in d and isinstance(d["data"], dict):
        if "access_token" in d["data"]:
            token = d["data"]["access_token"]
        elif "token" in d["data"]:
            token = d["data"]["token"]
    
    # 第二种格式: {"access_token": "..."}
    if not token and "access_token" in d:
        token = d["access_token"]
    
    # 第三种格式: {"token": "..."}
    if not token and "token" in d:
        token = d["token"]
    
    if token:
        print(token.strip())
    else:
        # 打印调试信息
        print(f"DEBUG: 无法从响应中找到token", file=sys.stderr)
        print(f"DEBUG: 响应数据: {data[:200]}...", file=sys.stderr)
except json.JSONDecodeError as e:
    print(f"DEBUG: JSON解析错误: {e}", file=sys.stderr)
    print(f"DEBUG: 原始数据: {data[:200]}...", file=sys.stderr)
except Exception as e:
    print(f"DEBUG: 其他错误: {e}", file=sys.stderr)
EOF
}

# 简化的token提取函数（备用）
extract_token_simple() {
    echo "$1" | python3 -c "
import sys, json
try:
    data = json.load(sys.stdin)
    # 尝试多种可能的token位置
    token = data.get('access_token') or data.get('data', {}).get('access_token') or data.get('token') or data.get('data', {}).get('token')
    if token:
        print(token)
except:
    pass
" 2>/dev/null
}

# 初始化测试数据
init_test_data() {
    echo "初始化测试数据..."
    
    # 检查是否已有测试数据
    echo "检查测试数据..."
    
    # 尝试学生登录获取token
    echo "获取学生token..."
    for i in "${!TEST_PHONES[@]}"; do
        local phone="${TEST_PHONES[$i]}"
        local name="${TEST_NAMES[$i]}"
        
        echo "  尝试登录: $phone ($name)"
        local login_resp
        login_resp=$(curl -sk -X POST "$BASE_URL/api/v1/auth/student/login" \
            -H "Content-Type: application/json" \
            -d "{\"phone\":\"$phone\",\"name\":\"$name\"}")
        
        # 调试：显示响应前100个字符
        # echo "    响应: ${login_resp:0:100}..."
        
        local token
        token=$(extract_token_simple "$login_resp")
        
        if [ -n "$token" ]; then
            STUDENT_TOKENS+=("$token")
            echo -e "    ${GREEN}成功获取token (长度: ${#token})${NC}"
        else
            echo -e "    ${YELLOW}无法提取token，尝试备用方法...${NC}"
            
            # 备用方法：直接使用Python提取
            token=$(echo "$login_resp" | python3 -c "
import sys, json
try:
    data = json.load(sys.stdin)
    # 尝试从data.access_token提取
    if 'data' in data and 'access_token' in data['data']:
        print(data['data']['access_token'])
    elif 'access_token' in data:
        print(data['access_token'])
except:
    pass
" 2>/dev/null)
            
            if [ -n "$token" ]; then
                STUDENT_TOKENS+=("$token")
                echo -e "    ${GREEN}备用方法成功获取token${NC}"
            else
                echo -e "    ${RED}登录失败，响应格式:${NC}"
                echo "    ${login_resp:0:200}..."
                NEED_INIT=true
            fi
        fi
    done
    
    # 如果学生token获取失败，尝试插入测试数据
    if [ ${#STUDENT_TOKENS[@]} -eq 0 ] || [ "${NEED_INIT:-false}" = true ]; then
        echo -e "${YELLOW}尝试插入测试数据...${NC}"
        
        if [ -f "./insert_test_data.sh" ]; then
            chmod +x ./insert_test_data.sh 2>/dev/null || true
            echo "  运行插入脚本（忽略重复数据错误）..."
            ./insert_test_data.sh 2>/dev/null || true
            
            # 重新尝试获取token
            STUDENT_TOKENS=()
            for i in "${!TEST_PHONES[@]}"; do
                local phone="${TEST_PHONES[$i]}"
                local name="${TEST_NAMES[$i]}"
                
                local login_resp
                login_resp=$(curl -sk -X POST "$BASE_URL/api/v1/auth/student/login" \
                    -H "Content-Type: application/json" \
                    -d "{\"phone\":\"$phone\",\"name\":\"$name\"}")
                
                local token
                token=$(extract_token_simple "$login_resp")
                if [ -n "$token" ]; then
                    STUDENT_TOKENS+=("$token")
                fi
            done
        else
            echo -e "${RED}找不到 insert_test_data.sh 脚本${NC}"
        fi
    fi
    
    # 获取快递员token
    echo "获取快递员token..."
    for code in "${COURIER_CODES[@]}"; do
        echo "  尝试登录快递员: $code"
        local login_resp
        login_resp=$(curl -sk -X POST "$BASE_URL/api/v1/auth/courier/login" \
            -H "Content-Type: application/json" \
            -d "{\"courier_code\":\"$code\"}")
        
        local token
        token=$(extract_token_simple "$login_resp")
        
        if [ -n "$token" ]; then
            COURIER_TOKENS+=("$token")
            echo -e "    ${GREEN}成功获取token (长度: ${#token})${NC}"
        else
            echo -e "    ${YELLOW}无法提取token，尝试直接解析...${NC}"
            # 直接解析响应中的access_token
            token=$(echo "$login_resp" | grep -o '"access_token":"[^"]*"' | cut -d'"' -f4)
            if [ -n "$token" ]; then
                COURIER_TOKENS+=("$token")
                echo -e "    ${GREEN}通过grep成功获取token${NC}"
            else
                echo -e "    ${RED}快递员token获取失败${NC}"
            fi
        fi
    done
    
    # 获取管理员token
    echo "获取管理员token..."
    local admin_resp
    admin_resp=$(curl -sk -X POST "$BASE_URL/api/v1/auth/admin/login" \
        -H "Content-Type: application/json" \
        -d "{\"username\":\"$ADMIN_USER\",\"password\":\"$ADMIN_PASS\"}")
    
    ADMIN_TOKEN=$(extract_token_simple "$admin_resp")
    if [ -n "$ADMIN_TOKEN" ]; then
        echo -e "${GREEN}管理员token获取成功 (长度: ${#ADMIN_TOKEN})${NC}"
    else
        # 备用方法
        ADMIN_TOKEN=$(echo "$admin_resp" | grep -o '"access_token":"[^"]*"' | cut -d'"' -f4)
        if [ -n "$ADMIN_TOKEN" ]; then
            echo -e "${GREEN}通过grep成功获取管理员token${NC}"
        else
            echo -e "${YELLOW}管理员token获取失败${NC}"
        fi
    fi
    
    # 总结token获取情况
    echo ""
    echo "Token获取情况:"
    echo "  学生token: ${#STUDENT_TOKENS[@]} 个"
    for i in "${!STUDENT_TOKENS[@]}"; do
        echo "    学生$((i+1)): ${STUDENT_TOKENS[$i]:0:20}..."
    done
    
    echo "  快递员token: ${#COURIER_TOKENS[@]} 个"
    for i in "${!COURIER_TOKENS[@]}"; do
        echo "    快递员$((i+1)): ${COURIER_TOKENS[$i]:0:20}..."
    done
    
    echo "  管理员token: $(if [ -n "$ADMIN_TOKEN" ]; then echo "已获取 (${ADMIN_TOKEN:0:20}...)"; else echo "未获取"; fi)"
    echo ""
}

# 场景1: 学生登录压力测试
test_student_login() {
    echo -e "${BLUE}[场景1] 学生登录压力测试${NC}"
    echo "并发数: $CONCURRENCY, 总请求数: $TOTAL_REQUESTS"
    
    local log_file="${RESULTS_DIR}/student_login.log"
    local result_file="${RESULTS_DIR}/student_login_results.txt"
    
    # 生成测试命令
    echo "生成测试命令..."
    local commands=()
    for i in $(seq 1 $TOTAL_REQUESTS); do
        # 生成随机手机号（避免使用真实测试号码）
        local phone="199$(printf "%08d" $((RANDOM * RANDOM % 100000000)))"
        local name="压力测试用户${i}"
        commands+=("curl -sk -X POST '$BASE_URL/api/v1/auth/student/login' -H 'Content-Type: application/json' -d '{\"phone\":\"$phone\",\"name\":\"$name\"}' -w '%{http_code} %{time_total}\\n' -o /dev/null 2>&1")
    done
    
    echo "开始测试..."
    local start_time=$(date +%s.%N)
    
    if [ "$USE_PARALLEL" = true ] && command -v parallel &> /dev/null; then
        echo "使用Parallel并行测试..."
        printf "%s\n" "${commands[@]}" | parallel -j "$CONCURRENCY" > "$log_file" 2>&1
    else
        echo "使用串行测试..."
        for cmd in "${commands[@]}"; do
            eval "$cmd" >> "$log_file" 2>&1
            echo -n "."
        done
        echo ""
    fi
    
    local end_time=$(date +%s.%N)
    local duration=$(echo "$end_time - $start_time" | bc 2>/dev/null || echo "0")
    
    # 分析结果
    analyze_and_report "学生登录" "$log_file" "$result_file" "$duration"
    
    echo -e "${GREEN}场景1测试完成${NC}"
    echo ""
}

# 场景2: 包裹查询压力测试
test_parcel_query() {
    echo -e "${BLUE}[场景2] 包裹查询压力测试${NC}"
    
    if [ ${#STUDENT_TOKENS[@]} -eq 0 ]; then
        echo -e "${YELLOW}没有可用的学生token，跳过场景2${NC}"
        echo ""
        return
    fi
    
    echo "并发数: $CONCURRENCY, 总请求数: $TOTAL_REQUESTS"
    local log_file="${RESULTS_DIR}/parcel_query.log"
    local result_file="${RESULTS_DIR}/parcel_query_results.txt"
    
    # 使用第一个学生token
    local token="${STUDENT_TOKENS[0]}"
    echo "使用学生token: ${token:0:20}..."
    
    # 生成测试命令
    echo "生成测试命令..."
    local commands=()
    for i in $(seq 1 $TOTAL_REQUESTS); do
        local page=$((RANDOM % 5 + 1))
        local page_size=$((RANDOM % 10 + 5))
        commands+=("curl -sk '$BASE_URL/api/v1/parcels?page=$page&page_size=$page_size' -H 'Authorization: Bearer $token' -w '%{http_code} %{time_total}\\n' -o /dev/null 2>&1")
    done
    
    echo "开始测试..."
    local start_time=$(date +%s.%N)
    
    if [ "$USE_PARALLEL" = true ] && command -v parallel &> /dev/null; then
        echo "使用Parallel并行测试..."
        printf "%s\n" "${commands[@]}" | parallel -j "$CONCURRENCY" > "$log_file" 2>&1
    else
        echo "使用串行测试..."
        for cmd in "${commands[@]}"; do
            eval "$cmd" >> "$log_file" 2>&1
            echo -n "."
        done
        echo ""
    fi
    
    local end_time=$(date +%s.%N)
    local duration=$(echo "$end_time - $start_time" | bc 2>/dev/null || echo "0")
    
    # 分析结果
    analyze_and_report "包裹查询" "$log_file" "$result_file" "$duration"
    
    echo -e "${GREEN}场景2测试完成${NC}"
    echo ""
}

# 场景3: 快递员入库压力测试
test_courier_inbound() {
    echo -e "${BLUE}[场景3] 快递员入库压力测试${NC}"
    
    if [ ${#COURIER_TOKENS[@]} -eq 0 ]; then
        echo -e "${YELLOW}没有可用的快递员token，跳过场景3${NC}"
        echo ""
        return
    fi
    
    echo "并发数: $CONCURRENCY, 总请求数: $TOTAL_REQUESTS"
    local log_file="${RESULTS_DIR}/courier_inbound.log"
    local result_file="${RESULTS_DIR}/courier_inbound_results.txt"
    
    echo "生成测试命令..."
    local commands=()
    for i in $(seq 1 $TOTAL_REQUESTS); do
        # 随机选择快递员token
        local token_idx=$((RANDOM % ${#COURIER_TOKENS[@]}))
        local token="${COURIER_TOKENS[$token_idx]}"
        
        # 随机选择快递公司代码
        local courier_idx=$((RANDOM % ${#COURIER_CODES[@]}))
        local courier_code="${COURIER_CODES[$courier_idx]}"
        
        # 生成唯一的运单号
        local timestamp=$(date +%s%N)
        local random_num=$((RANDOM % 10000))
        local tracking="${courier_code}${timestamp: -8}${random_num}"
        
        # 生成随机手机号
        local phone="199$(printf "%08d" $((RANDOM * RANDOM % 100000000)))"
        local name="测试用户${i}"
        
        commands+=("curl -sk -X POST '$BASE_URL/api/v1/inbound' -H 'Content-Type: application/json' -H 'Authorization: Bearer $token' -d '{\"tracking_number\":\"$tracking\",\"phone\":\"$phone\",\"user_name\":\"$name\",\"courier_code\":\"$courier_code\"}' -w '%{http_code} %{time_total}\\n' -o /dev/null 2>&1")
    done
    
    echo "开始测试..."
    local start_time=$(date +%s.%N)
    
    if [ "$USE_PARALLEL" = true ] && command -v parallel &> /dev/null; then
        echo "使用Parallel并行测试..."
        printf "%s\n" "${commands[@]}" | parallel -j "$CONCURRENCY" > "$log_file" 2>&1
    else
        echo "使用串行测试..."
        for cmd in "${commands[@]}"; do
            eval "$cmd" >> "$log_file" 2>&1
            echo -n "."
        done
        echo ""
    fi
    
    local end_time=$(date +%s.%N)
    local duration=$(echo "$end_time - $start_time" | bc 2>/dev/null || echo "0")
    
    # 分析结果
    analyze_and_report "快递员入库" "$log_file" "$result_file" "$duration"
    
    echo -e "${GREEN}场景3测试完成${NC}"
    echo ""
}

# 场景4: 混合场景压力测试
test_mixed_scenario() {
    echo -e "${BLUE}[场景4] 混合场景压力测试${NC}"
    echo "模拟真实用户行为：登录->查询"
    
    if [ ${#STUDENT_TOKENS[@]} -eq 0 ]; then
        echo -e "${YELLOW}没有可用的学生token，跳过场景4${NC}"
        echo ""
        return
    fi
    
    local log_file="${RESULTS_DIR}/mixed_scenario.log"
    local result_file="${RESULTS_DIR}/mixed_scenario_results.txt"
    
    echo "开始混合场景测试（持续时间: ${TEST_DURATION}秒）..."
    echo "按Ctrl+C停止测试"
    
    local start_time=$(date +%s)
    local end_time=$((start_time + TEST_DURATION))
    local request_count=0
    local success_count=0
    
    # 清空日志文件
    > "$log_file"
    
    while [ $(date +%s) -lt $end_time ]; do
        for i in "${!TEST_PHONES[@]}"; do
            local phone="${TEST_PHONES[$i]}"
            local name="${TEST_NAMES[$i]}"
            
            # 1. 登录
            local login_start=$(date +%s.%N)
            local login_resp
            login_resp=$(curl -sk -X POST "$BASE_URL/api/v1/auth/student/login" \
                -H "Content-Type: application/json" \
                -d "{\"phone\":\"$phone\",\"name\":\"$name\"}" \
                -w "%{http_code}" \
                -o /dev/null 2>&1)
            local login_end=$(date +%s.%N)
            local login_time=$(echo "$login_end - $login_start" | bc 2>/dev/null || echo "0")
            
            # 统计
            ((request_count++))
            if [[ "$login_resp" =~ ^2[0-9]{2}$ ]]; then
                ((success_count++))
                echo "[$(date '+%H:%M:%S')] 登录成功: ${phone}, 时间: ${login_time}s" >> "$log_file"
            else
                echo "[$(date '+%H:%M:%S')] 登录失败: ${phone}, 状态码: ${login_resp}" >> "$log_file"
            fi
            
            # 2. 查询包裹（如果有token）
            if [ $i -lt ${#STUDENT_TOKENS[@]} ]; then
                local token="${STUDENT_TOKENS[$i]}"
                local query_start=$(date +%s.%N)
                local query_resp
                query_resp=$(curl -sk "$BASE_URL/api/v1/parcels?page=1&page_size=5" \
                    -H "Authorization: Bearer $token" \
                    -w "%{http_code}" \
                    -o /dev/null 2>&1)
                local query_end=$(date +%s.%N)
                local query_time=$(echo "$query_end - $query_start" | bc 2>/dev/null || echo "0")
                
                ((request_count++))
                if [[ "$query_resp" =~ ^2[0-9]{2}$ ]]; then
                    ((success_count++))
                    echo "[$(date '+%H:%M:%S')] 查询成功: ${phone}, 时间: ${query_time}s" >> "$log_file"
                else
                    echo "[$(date '+%H:%M:%S')] 查询失败: ${phone}, 状态码: ${query_resp}" >> "$log_file"
                fi
            fi
            
            # 随机延迟，模拟用户思考时间
            sleep 0.$((RANDOM % 3))
        done
    done
    
    local duration=$(( $(date +%s) - start_time ))
    
    # 输出结果
    {
        echo "=== 混合场景压力测试结果 ==="
        echo "测试时间: $(date)"
        echo "测试时长: ${duration}秒"
        echo "总请求数: ${request_count}"
        echo "成功请求: ${success_count}"
        
        if [ $request_count -gt 0 ]; then
            local success_rate=$(echo "scale=2; $success_count * 100 / $request_count" | bc 2>/dev/null || echo "0")
            echo "成功率: ${success_rate}%"
            echo "平均QPS: $(echo "scale=2; $request_count / $duration" | bc 2>/dev/null || echo "0")"
        else
            echo "成功率: 0%"
            echo "平均QPS: 0"
        fi
        
        echo ""
        echo "用户行为序列:"
        echo "  1. 学生登录"
        echo "  2. 包裹查询"
        echo "  3. 随机延迟 (0-0.3秒)"
    } | tee "$result_file"
    
    echo -e "${GREEN}场景4测试完成${NC}"
    echo ""
}

# 场景5: 管理员接口压力测试
test_admin_api() {
    echo -e "${BLUE}[场景5] 管理员接口压力测试${NC}"
    
    if [ -z "$ADMIN_TOKEN" ]; then
        echo -e "${YELLOW}没有可用的管理员token，跳过场景5${NC}"
        echo ""
        return
    fi
    
    echo "并发数: $CONCURRENCY, 总请求数: $TOTAL_REQUESTS"
    local log_file="${RESULTS_DIR}/admin_api.log"
    local result_file="${RESULTS_DIR}/admin_api_results.txt"
    
    # 定义管理员接口
    local admin_endpoints=(
        "/api/v1/admin/dashboard"
        "/api/v1/admin/parcels/retention?days=7&page=1&page_size=10"
        "/api/v1/admin/parcels?page=1&page_size=20"
    )
    
    echo "生成测试命令..."
    local commands=()
    for i in $(seq 1 $TOTAL_REQUESTS); do
        # 随机选择接口
        local endpoint_idx=$((RANDOM % ${#admin_endpoints[@]}))
        local endpoint="${admin_endpoints[$endpoint_idx]}"
        
        commands+=("curl -sk '$BASE_URL$endpoint' -H 'Authorization: Bearer $ADMIN_TOKEN' -w '%{http_code} %{time_total}\\n' -o /dev/null 2>&1")
    done
    
    echo "开始测试..."
    local start_time=$(date +%s.%N)
    
    if [ "$USE_PARALLEL" = true ] && command -v parallel &> /dev/null; then
        echo "使用Parallel并行测试..."
        printf "%s\n" "${commands[@]}" | parallel -j "$CONCURRENCY" > "$log_file" 2>&1
    else
        echo "使用串行测试..."
        for cmd in "${commands[@]}"; do
            eval "$cmd" >> "$log_file" 2>&1
            echo -n "."
        done
        echo ""
    fi
    
    local end_time=$(date +%s.%N)
    local duration=$(echo "$end_time - $start_time" | bc 2>/dev/null || echo "0")
    
    # 分析结果
    analyze_and_report "管理员接口" "$log_file" "$result_file" "$duration"
    
    echo -e "${GREEN}场景5测试完成${NC}"
    echo ""
}

# 通用结果分析函数
analyze_and_report() {
    local test_name="$1"
    local log_file="$2"
    local result_file="$3"
    local duration="$4"
    
    # 初始化统计变量
    local success_count=0
    local total_responses=0
    local total_time=0
    declare -A http_codes
    
    # 分析日志文件
    while IFS= read -r line; do
        # 提取HTTP状态码和响应时间
        if [[ "$line" =~ ([0-9]{3})\ ([0-9.]+) ]]; then
            local http_code="${BASH_REMATCH[1]}"
            local time_taken="${BASH_REMATCH[2]}"
            
            # 统计
            ((http_codes["$http_code"]++))
            total_time=$(echo "$total_time + $time_taken" | bc 2>/dev/null || echo "$total_time")
            ((total_responses++))
            
            if [[ "$http_code" =~ ^2[0-9]{2}$ ]]; then
                ((success_count++))
            fi
        fi
    done < <(grep -E '[0-9]{3} [0-9.]+$' "$log_file" 2>/dev/null || true)
    
    # 计算统计信息
    local success_rate=0
    if [ $total_responses -gt 0 ]; then
        success_rate=$(echo "scale=2; $success_count * 100 / $total_responses" | bc 2>/dev/null || echo "0")
    fi
    
    local avg_time=0
    if [ $success_count -gt 0 ] && [ "$(echo "$total_time > 0" | bc 2>/dev/null || echo "0")" = "1" ]; then
        avg_time=$(echo "scale=4; $total_time / $success_count" | bc 2>/dev/null || echo "0")
    fi
    
    # 响应时间分布
    local times=()
    while IFS= read -r line; do
        if [[ "$line" =~ ([0-9]{3})\ ([0-9.]+)$ ]]; then
            times+=("${BASH_REMATCH[2]}")
        fi
    done < <(grep -E '[0-9]{3} [0-9.]+$' "$log_file" 2>/dev/null || true)
    
    # 排序计算中位数
    local median_time=0
    if [ ${#times[@]} -gt 0 ]; then
        IFS=$'\n' sorted_times=($(sort -n <<<"${times[*]}"))
        unset IFS
        
        local len=${#sorted_times[@]}
        if [ $((len % 2)) -eq 1 ]; then
            median_time=${sorted_times[$((len/2))]}
        else
            local mid1=${sorted_times[$((len/2-1))]}
            local mid2=${sorted_times[$((len/2))]}
            median_time=$(echo "scale=4; ($mid1 + $mid2) / 2" | bc 2>/dev/null || echo "0")
        fi
    fi
    
    # 输出结果
    {
        echo "=== ${test_name}压力测试结果 ==="
        echo "测试时间: $(date)"
        echo "目标服务器: $BASE_URL"
        echo "并发数: $CONCURRENCY"
        echo "总请求数: $TOTAL_REQUESTS"
        echo "实际响应数: $total_responses"
        echo "成功响应数: $success_count"
        echo "成功率: ${success_rate}%"
        
        if [ "$(echo "$duration > 0" | bc 2>/dev/null || echo "0")" = "1" ]; then
            echo "测试时长: ${duration}秒"
            if [ "$(echo "$duration > 0" | bc 2>/dev/null || echo "0")" = "1" ]; then
                echo "QPS: $(echo "scale=2; $success_count / $duration" | bc 2>/dev/null || echo "0")"
            fi
        fi
        
        if [ "$(echo "$avg_time > 0" | bc 2>/dev/null || echo "0")" = "1" ]; then
            echo "平均响应时间: ${avg_time}秒"
        fi
        
        if [ "$(echo "$median_time > 0" | bc 2>/dev/null || echo "0")" = "1" ]; then
            echo "中位数响应时间: ${median_time}秒"
        fi
        
        echo ""
        echo "HTTP状态码分布:"
        for code in "${!http_codes[@]}"; do
            local count=${http_codes["$code"]}
            local percentage=0
            if [ $total_responses -gt 0 ]; then
                percentage=$(echo "scale=2; $count * 100 / $total_responses" | bc 2>/dev/null || echo "0")
            fi
            echo "  $code: $count次 (${percentage}%)"
        done
        
    } | tee "$result_file"
}

# 汇总报告
generate_summary_report() {
    echo -e "${BLUE}=== 压力测试汇总报告 ===${NC}"
    echo ""
    
    local summary_file="${RESULTS_DIR}/stress_test_summary.txt"
    
    {
        echo "压力测试汇总报告"
        echo "生成时间: $(date)"
        echo "测试服务器: $BASE_URL"
        echo "并发数: $CONCURRENCY"
        echo "测试目录: $RESULTS_DIR"
        echo ""
        echo "各场景测试结果:"
        echo "----------------------------------------"
    } > "$summary_file"
    
    # 收集各场景结果
    for result_file in "${RESULTS_DIR}"/*_results.txt; do
        if [ -f "$result_file" ]; then
            local test_name=$(basename "$result_file" _results.txt)
            echo -e "${YELLOW}${test_name}${NC}"
            
            # 提取关键信息
            local success_rate=$(grep -i "成功率" "$result_file" | head -1 | grep -o '[0-9.]\+%' || echo "N/A")
            local avg_time=$(grep -i "平均响应时间" "$result_file" | head -1 | grep -o '[0-9.]\+秒' || echo "N/A")
            local qps=$(grep -i "QPS" "$result_file" | head -1 | grep -o '[0-9.]\+' || echo "N/A")
            
            echo "  成功率: $success_rate"
            echo "  平均响应: $avg_time"
            if [ "$qps" != "N/A" ] && [ "$qps" != "0" ]; then
                echo "  QPS: $qps"
            fi
            echo ""
            
            # 写入汇总文件
            {
                echo "测试场景: $test_name"
                echo "  成功率: $success_rate"
                echo "  平均响应时间: $avg_time"
                if [ "$qps" != "N/A" ] && [ "$qps" != "0" ]; then
                    echo "  QPS: $qps"
                fi
                echo "----------------------------------------"
            } >> "$summary_file"
        fi
    done
    
    # 显示汇总文件路径
    echo -e "${GREEN}详细报告已保存到:${NC}"
    echo "  汇总报告: $summary_file"
    echo "  各场景详细日志: $RESULTS_DIR/"
    echo ""
}

# 主测试流程
main() {
    echo -e "${BLUE}压力测试配置:${NC}"
    echo "  目标服务器: $BASE_URL"
    echo "  并发数: $CONCURRENCY"
    echo "  每个线程请求数: $REQUESTS_PER_THREAD"
    echo "  总请求数: $TOTAL_REQUESTS"
    echo "  混合测试时长: ${TEST_DURATION}秒"
    echo "  测试结果目录: $RESULTS_DIR"
    echo ""
    
    # 检查依赖
    check_dependencies
    
    # 健康检查
    health_check
    
    # 初始化测试数据并获取token
    init_test_data
    
    # 询问用户选择测试场景
    echo "请选择要执行的测试场景:"
    echo "  1) 所有场景"
    echo "  2) 学生登录"
    echo "  3) 包裹查询"
    echo "  4) 快递员入库"
    echo "  5) 混合场景"
    echo "  6) 管理员接口"
    echo -n "请输入选择 (默认1): "
    read -r choice
    choice=${choice:-1}
    
    # 执行选择的测试场景
    case $choice in
        1|所有)
            test_student_login
            test_parcel_query
            test_courier_inbound
            test_mixed_scenario
            test_admin_api
            ;;
        2|学生登录)
            test_student_login
            ;;
        3|包裹查询)
            test_parcel_query
            ;;
        4|快递员入库)
            test_courier_inbound
            ;;
        5|混合场景)
            test_mixed_scenario
            ;;
        6|管理员接口)
            test_admin_api
            ;;
        *)
            echo -e "${RED}无效选择${NC}"
            exit 1
            ;;
    esac
    
    # 生成汇总报告
    generate_summary_report
    
    echo -e "${GREEN}=== 压力测试完成 ===${NC}"
    echo "结果已保存到: $RESULTS_DIR"
}

# 清理函数（在脚本退出时调用）
cleanup() {
    echo ""
    echo -e "${YELLOW}正在清理...${NC}"
    # 可以在这里添加清理代码
    exit 0
}

# 设置退出陷阱
trap cleanup EXIT INT TERM

# 解析命令行参数
while [[ $# -gt 0 ]]; do
    case $1 in
        -u|--url)
            BASE_URL="$2"
            shift 2
            ;;
        -c|--concurrency)
            CONCURRENCY="$2"
            shift 2
            ;;
        -r|--requests)
            REQUESTS_PER_THREAD="$2"
            shift 2
            ;;
        -d|--duration)
            TEST_DURATION="$2"
            shift 2
            ;;
        -h|--help)
            echo "使用方法: $0 [选项]"
            echo "选项:"
            echo "  -u, --url URL         测试服务器URL (默认: https://localhost)"
            echo "  -c, --concurrency N   并发线程数 (默认: 10)"
            echo "  -r, --requests N      每个线程请求数 (默认: 20)"
            echo "  -d, --duration N      混合测试时长(秒) (默认: 30)"
            echo "  -h, --help            显示此帮助信息"
            exit 0
            ;;
        *)
            echo "未知选项: $1"
            echo "使用 -h 查看帮助"
            exit 1
            ;;
    esac
done

# 运行主函数
main