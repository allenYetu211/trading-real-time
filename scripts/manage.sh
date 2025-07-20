#!/bin/bash

# 项目管理脚本

set -e

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# 启动开发环境
dev_start() {
    log_info "启动开发环境..."
    
    # 启动数据库服务
    if ! docker-compose ps postgres | grep -q "Up"; then
        log_info "启动数据库服务..."
        docker-compose up -d postgres redis
        sleep 5
    fi
    
    # 运行数据库迁移
    log_info "运行数据库迁移..."
    npx prisma migrate dev --name auto
    
    # 生成Prisma客户端
    log_info "生成Prisma客户端..."
    npx prisma generate
    
    # 启动应用
    log_info "启动NestJS应用..."
    pnpm start:dev
}

# 停止开发环境
dev_stop() {
    log_info "停止开发环境..."
    docker-compose down
    log_success "开发环境已停止"
}

# 重置数据库
db_reset() {
    log_warning "这将删除所有数据，是否继续? (y/N)"
    read -r response
    if [[ "$response" =~ ^([yY][eE][sS]|[yY])$ ]]; then
        log_info "重置数据库..."
        npx prisma migrate reset --force
        log_success "数据库已重置"
    else
        log_info "操作已取消"
    fi
}

# 查看数据库数据
db_view() {
    log_info "查看币种配置数据..."
    docker-compose exec postgres psql -U postgres -d trading_system -c "
    SELECT 
        id,
        symbol,
        interval,
        is_active,
        created_at
    FROM coin_configs 
    ORDER BY id;
    "
}

# 测试API
test_api() {
    log_info "测试API..."
    
    # 检查服务是否运行
    if ! curl -s http://localhost:3000 > /dev/null; then
        log_error "服务未运行，请先启动应用"
        return 1
    fi
    
    echo ""
    log_info "=== 币种配置管理 ==="
    log_info "1. 获取配置列表"
    curl -s http://localhost:3000/api/coins/list | jq . || echo "请安装jq：brew install jq"
    
    echo ""
    log_info "2. 获取统计信息"
    curl -s http://localhost:3000/api/coins/stats | jq . || echo "请安装jq：brew install jq"
    
    echo ""
    log_info "3. 获取活跃配置"
    curl -s http://localhost:3000/api/coins/active | jq . || echo "请安装jq：brew install jq"
    
    echo ""
    log_info "=== 数据服务 ==="
    log_info "4. 系统健康检查"
    curl -s http://localhost:3000/api/data/health | jq . || echo "请安装jq：brew install jq"
    
    echo ""
    log_info "5. 获取BTC最新价格"
    curl -s http://localhost:3000/api/data/price/BTCUSDT | jq . || echo "请安装jq：brew install jq"
    
    echo ""
    log_info "6. 数据统计信息"
    curl -s http://localhost:3000/api/data/stats | jq . || echo "请安装jq：brew install jq"
    
    echo ""
    log_info "=== 技术分析 ==="
    log_info "7. 分析仪表板"
    curl -s http://localhost:3000/api/analysis/dashboard | jq . || echo "分析模块可能未正确启动"
}

# 添加币种配置
add_config() {
    local symbol=$1
    local interval=$2
    local active=${3:-true}
    
    if [ -z "$symbol" ] || [ -z "$interval" ]; then
        log_error "用法: $0 add <SYMBOL> <INTERVAL> [ACTIVE]"
        log_info "示例: $0 add BTCUSDT 1h true"
        return 1
    fi
    
    log_info "添加配置: $symbol - $interval"
    curl -X POST http://localhost:3000/api/coins/config \
        -H "Content-Type: application/json" \
        -d "{\"symbol\": \"$symbol\", \"interval\": \"$interval\", \"isActive\": $active}" \
        | jq . || echo ""
}

# 刷新数据
refresh_data() {
    local symbol=$1
    local interval=$2
    local limit=${3:-50}
    
    if [ -z "$symbol" ] || [ -z "$interval" ]; then
        log_error "用法: $0 refresh <SYMBOL> <INTERVAL> [LIMIT]"
        log_info "示例: $0 refresh BTCUSDT 1h 100"
        return 1
    fi
    
    log_info "刷新数据: $symbol - $interval (获取${limit}条)"
    curl -X POST "http://localhost:3000/api/data/refresh/$symbol/$interval?limit=$limit" \
        | jq . || echo ""
}

# 获取K线数据
get_kline() {
    local symbol=$1
    local interval=$2
    local limit=${3:-10}
    
    if [ -z "$symbol" ] || [ -z "$interval" ]; then
        log_error "用法: $0 kline <SYMBOL> <INTERVAL> [LIMIT]"
        log_info "示例: $0 kline BTCUSDT 1h 5"
        return 1
    fi
    
    log_info "获取K线数据: $symbol - $interval (${limit}条)"
    curl -s "http://localhost:3000/api/data/kline?symbol=$symbol&interval=$interval&limit=$limit" \
        | jq '.[0:3]' || echo ""
}

# 获取价格信息
get_price() {
    local symbol=$1
    
    if [ -z "$symbol" ]; then
        log_error "用法: $0 price <SYMBOL>"
        log_info "示例: $0 price BTCUSDT"
        return 1
    fi
    
    log_info "获取价格: $symbol"
    curl -s "http://localhost:3000/api/data/price/$symbol" | jq . || echo ""
}

# WebSocket订阅
ws_subscribe() {
    local symbol=$1
    local interval=$2
    
    if [ -z "$symbol" ] || [ -z "$interval" ]; then
        log_error "用法: $0 ws-sub <SYMBOL> <INTERVAL>"
        log_info "示例: $0 ws-sub BTCUSDT 1h"
        return 1
    fi
    
    log_info "订阅实时数据流: $symbol - $interval"
    curl -X POST "http://localhost:3000/api/websocket/subscribe/$symbol/$interval" | jq . || echo ""
}

# WebSocket取消订阅
ws_unsubscribe() {
    local symbol=$1
    local interval=$2
    
    if [ -z "$symbol" ] || [ -z "$interval" ]; then
        log_error "用法: $0 ws-unsub <SYMBOL> <INTERVAL>"
        log_info "示例: $0 ws-unsub BTCUSDT 1h"
        return 1
    fi
    
    log_info "取消订阅实时数据流: $symbol - $interval"
    curl -X DELETE "http://localhost:3000/api/websocket/subscribe/$symbol/$interval" | jq . || echo ""
}

# WebSocket状态
ws_status() {
    log_info "WebSocket连接状态:"
    curl -s "http://localhost:3000/api/websocket/status" | jq . || echo ""
}

# 订阅活跃配置
ws_subscribe_active() {
    log_info "订阅所有活跃配置的实时数据流:"
    curl -X POST "http://localhost:3000/api/websocket/subscribe/active-configs" | jq . || echo ""
}

# 技术分析
analyze() {
    local symbol=$1
    local interval=$2
    local limit=${3:-50}
    
    if [ -z "$symbol" ] || [ -z "$interval" ]; then
        log_error "用法: $0 analyze <SYMBOL> <INTERVAL> [LIMIT]"
        log_info "示例: $0 analyze BTCUSDT 1h 100"
        return 1
    fi
    
    log_info "执行技术分析: $symbol - $interval (${limit}条K线)"
    curl -X POST "http://localhost:3000/api/analysis/comprehensive/$symbol/$interval?limit=$limit" \
        | jq '{ symbol, interval, score, summary }' || echo ""
}

# 获取交易信号
get_signal() {
    local symbol=$1
    local interval=$2
    
    if [ -z "$symbol" ] || [ -z "$interval" ]; then
        log_error "用法: $0 signal <SYMBOL> <INTERVAL>"
        log_info "示例: $0 signal BTCUSDT 1h"
        return 1
    fi
    
    log_info "获取交易信号: $symbol - $interval"
    curl -s "http://localhost:3000/api/analysis/signal/$symbol/$interval" | jq . || echo ""
}

# 分析仪表板
analysis_dashboard() {
    log_info "分析仪表板:"
    curl -s "http://localhost:3000/api/analysis/dashboard" | jq . || echo ""
}

# 获取技术指标
get_indicators() {
    local symbol=$1
    local interval=$2
    
    if [ -z "$symbol" ] || [ -z "$interval" ]; then
        log_error "用法: $0 indicators <SYMBOL> <INTERVAL>"
        log_info "示例: $0 indicators BTCUSDT 1h"
        return 1
    fi
    
    log_info "获取技术指标: $symbol - $interval"
    curl -s "http://localhost:3000/api/analysis/indicators/$symbol/$interval" | jq . || echo ""
}

# 获取图形形态
get_patterns() {
    local symbol=$1
    local interval=$2
    
    if [ -z "$symbol" ] || [ -z "$interval" ]; then
        log_error "用法: $0 patterns <SYMBOL> <INTERVAL>"
        log_info "示例: $0 patterns BTCUSDT 1h"
        return 1
    fi
    
    log_info "获取图形形态: $symbol - $interval"
    curl -s "http://localhost:3000/api/analysis/patterns/$symbol/$interval" | jq . || echo ""
}

# 获取支撑阻力
get_support_resistance() {
    local symbol=$1
    local interval=$2
    
    if [ -z "$symbol" ] || [ -z "$interval" ]; then
        log_error "用法: $0 support <SYMBOL> <INTERVAL>"
        log_info "示例: $0 support BTCUSDT 1h"
        return 1
    fi
    
    log_info "获取支撑阻力: $symbol - $interval"
    curl -s "http://localhost:3000/api/analysis/support-resistance/$symbol/$interval" | jq . || echo ""
}

# 策略仪表板
strategy_dashboard() {
    log_info "策略仪表板:"
    curl -s "http://localhost:3000/api/strategy/dashboard" | jq . || echo ""
}

# 创建策略
create_strategy() {
    local name=$1
    local type=$2
    local symbol=$3
    local interval=$4
    
    if [ -z "$name" ] || [ -z "$type" ] || [ -z "$symbol" ] || [ -z "$interval" ]; then
        log_error "用法: $0 create-strategy <NAME> <TYPE> <SYMBOL> <INTERVAL>"
        log_info "类型: TREND_FOLLOWING, RSI_OVERSOLD, RSI_OVERBOUGHT, MA_CROSSOVER, BREAKOUT"
        log_info "示例: $0 create-strategy 'BTC趋势策略' TREND_FOLLOWING BTCUSDT 1h"
        return 1
    fi
    
    log_info "创建策略: $name - $type $symbol/$interval"
    curl -X POST "http://localhost:3000/api/strategy/config" \
        -H "Content-Type: application/json" \
        -d "{
            \"name\": \"$name\",
            \"type\": \"$type\",
            \"symbol\": \"$symbol\",
            \"interval\": \"$interval\",
            \"parameters\": {
                \"minTrendScore\": 60,
                \"minConfidence\": 70,
                \"rsiThreshold\": 30
            },
            \"riskManagement\": {
                \"maxPositionSize\": 5,
                \"stopLossPercent\": 2,
                \"takeProfitPercent\": 4,
                \"maxDailyLoss\": 100,
                \"maxDrawdown\": 10,
                \"positionSizing\": \"PERCENTAGE\"
            }
        }" | jq . || echo ""
}

# 策略列表
list_strategies() {
    log_info "策略列表:"
    curl -s "http://localhost:3000/api/strategy/config/list" | jq . || echo ""
}

# 启动策略
start_strategy() {
    local id=$1
    
    if [ -z "$id" ]; then
        log_error "用法: $0 start-strategy <ID>"
        log_info "示例: $0 start-strategy 1"
        return 1
    fi
    
    log_info "启动策略: $id"
    curl -X POST "http://localhost:3000/api/strategy/config/$id/start" | jq . || echo ""
}

# 停止策略
stop_strategy() {
    local id=$1
    
    if [ -z "$id" ]; then
        log_error "用法: $0 stop-strategy <ID>"
        log_info "示例: $0 stop-strategy 1"
        return 1
    fi
    
    log_info "停止策略: $id"
    curl -X POST "http://localhost:3000/api/strategy/config/$id/stop" | jq . || echo ""
}

# 执行策略
execute_strategy() {
    local id=$1
    
    if [ -z "$id" ]; then
        log_error "用法: $0 execute-strategy <ID>"
        log_info "示例: $0 execute-strategy 1"
        return 1
    fi
    
    log_info "执行策略: $id"
    curl -X POST "http://localhost:3000/api/strategy/execute/$id" | jq . || echo ""
}

# 策略引擎状态
strategy_engine_status() {
    log_info "策略引擎状态:"
    curl -s "http://localhost:3000/api/strategy/engine/status" | jq . || echo ""
}

# 最新信号
latest_signals() {
    local limit=${1:-10}
    log_info "最新信号 (limit: $limit):"
    curl -s "http://localhost:3000/api/strategy/signals/latest?limit=$limit" | jq . || echo ""
}

# 信号统计
signal_stats() {
    log_info "信号统计:"
    curl -s "http://localhost:3000/api/strategy/signals/stats" | jq . || echo ""
}

# 显示帮助
show_help() {
    echo "项目管理脚本"
    echo ""
    echo "用法:"
    echo "  $0 <command> [options]"
    echo ""
    echo "环境管理:"
    echo "  dev           启动开发环境（数据库 + 应用）"
    echo "  stop          停止开发环境"
    echo "  db-reset      重置数据库"
    echo "  db-view       查看数据库数据"
    echo ""
    echo "API测试:"
    echo "  test          测试所有API功能"
    echo "  add           添加币种配置"
    echo "  refresh       刷新数据"
    echo "  kline         获取K线数据"
    echo "  price         获取价格信息"
    echo ""
    echo "WebSocket管理:"
    echo "  ws-sub        订阅实时数据流"
    echo "  ws-unsub      取消订阅数据流"
    echo "  ws-status     查看WebSocket状态"
    echo "  ws-active     订阅活跃配置"
    echo ""
    echo "技术分析:"
    echo "  analyze       综合技术分析"
    echo "  signal        获取交易信号"
    echo "  dashboard     分析仪表板"
    echo "  indicators    技术指标分析"
    echo "  patterns      图形形态识别"
    echo "  support       支撑阻力分析"
    echo ""
    echo "策略管理:"
    echo "  strategy-dashboard 查看策略仪表板"
    echo "  create-strategy  创建新策略"
    echo "  list-strategies  列出所有策略"
    echo "  start-strategy   启动策略"
    echo "  stop-strategy    停止策略"
    echo "  execute-strategy 执行策略"
    echo "  strategy-engine-status 查看策略引擎状态"
    echo "  latest-signals   查看最新信号"
    echo "  signal-stats     查看信号统计"
    echo ""
    echo "帮助:"
    echo "  help          显示帮助信息"
    echo ""
    echo "示例:"
    echo "  $0 dev                        # 启动开发环境"
    echo "  $0 add BTCUSDT 1h             # 添加BTC配置"
    echo "  $0 refresh ETHUSDT 4h 100     # 刷新ETH数据"
    echo "  $0 kline BTCUSDT 1h 5         # 获取BTC K线"
    echo "  $0 price ETHUSDT              # 获取ETH价格"
    echo "  $0 ws-sub BTCUSDT 1h          # 订阅BTC实时流"
    echo "  $0 analyze BTCUSDT 1h 100     # 技术分析"
    echo "  $0 signal ETHUSDT 4h          # 获取交易信号"
    echo "  $0 dashboard                  # 分析仪表板"
    echo "  $0 test                       # 测试所有API"
    echo "  $0 db-view                    # 查看数据"
}

# 主函数
main() {
    case "${1:-help}" in
        dev)
            dev_start
            ;;
        stop)
            dev_stop
            ;;
        db-reset)
            db_reset
            ;;
        db-view)
            db_view
            ;;
        test)
            test_api
            ;;
        add)
            add_config "$2" "$3" "$4"
            ;;
        refresh)
            refresh_data "$2" "$3" "$4"
            ;;
        kline)
            get_kline "$2" "$3" "$4"
            ;;
        price)
            get_price "$2"
            ;;
        ws-sub)
            ws_subscribe "$2" "$3"
            ;;
        ws-unsub)
            ws_unsubscribe "$2" "$3"
            ;;
        ws-status)
            ws_status
            ;;
        ws-active)
            ws_subscribe_active
            ;;
        analyze)
            analyze "$2" "$3" "$4"
            ;;
        signal)
            get_signal "$2" "$3"
            ;;
        dashboard)
            analysis_dashboard
            ;;
        indicators)
            get_indicators "$2" "$3"
            ;;
        patterns)
            get_patterns "$2" "$3"
            ;;
        support)
            get_support_resistance "$2" "$3"
            ;;
        strategy-dashboard)
            strategy_dashboard
            ;;
        create-strategy)
            create_strategy "$2" "$3" "$4" "$5"
            ;;
        list-strategies)
            list_strategies
            ;;
        start-strategy)
            start_strategy "$2"
            ;;
        stop-strategy)
            stop_strategy "$2"
            ;;
        execute-strategy)
            execute_strategy "$2"
            ;;
        strategy-engine-status)
            strategy_engine_status
            ;;
        latest-signals)
            latest_signals "$2"
            ;;
        signal-stats)
            signal_stats
            ;;
        help|--help|-h)
            show_help
            ;;
        *)
            log_error "未知命令: $1"
            show_help
            exit 1
            ;;
    esac
}

# 执行主函数
main "$@" 