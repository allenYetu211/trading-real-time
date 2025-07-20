-- CreateTable
CREATE TABLE "strategy_configs" (
    "id" SERIAL NOT NULL,
    "name" VARCHAR(100) NOT NULL,
    "strategy_type" VARCHAR(50) NOT NULL,
    "status" VARCHAR(20) NOT NULL DEFAULT 'INACTIVE',
    "symbol" VARCHAR(20) NOT NULL,
    "interval" VARCHAR(10) NOT NULL,
    "parameters" TEXT NOT NULL,
    "risk_management" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "strategy_configs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "strategy_signal_records" (
    "id" SERIAL NOT NULL,
    "strategy_id" INTEGER NOT NULL,
    "symbol" VARCHAR(20) NOT NULL,
    "interval" VARCHAR(10) NOT NULL,
    "signal" VARCHAR(20) NOT NULL,
    "side" VARCHAR(10) NOT NULL,
    "price" DECIMAL(20,8) NOT NULL,
    "quantity" DECIMAL(20,8),
    "confidence" DECIMAL(5,2) NOT NULL,
    "stop_loss" DECIMAL(20,8),
    "take_profit" DECIMAL(20,8),
    "reason" TEXT NOT NULL,
    "timestamp" BIGINT NOT NULL,
    "executed" BOOLEAN NOT NULL DEFAULT false,
    "executed_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "strategy_signal_records_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "strategy_backtests" (
    "id" SERIAL NOT NULL,
    "strategy_id" INTEGER NOT NULL,
    "symbol" VARCHAR(20) NOT NULL,
    "interval" VARCHAR(10) NOT NULL,
    "start_time" TIMESTAMP(3) NOT NULL,
    "end_time" TIMESTAMP(3) NOT NULL,
    "total_trades" INTEGER NOT NULL,
    "winning_trades" INTEGER NOT NULL,
    "losing_trades" INTEGER NOT NULL,
    "win_rate" DECIMAL(5,2) NOT NULL,
    "total_return" DECIMAL(10,4) NOT NULL,
    "max_drawdown" DECIMAL(5,2) NOT NULL,
    "sharpe_ratio" DECIMAL(8,4) NOT NULL,
    "trades" TEXT NOT NULL,
    "summary" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "strategy_backtests_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "strategy_configs_symbol_interval_status_idx" ON "strategy_configs"("symbol", "interval", "status");

-- CreateIndex
CREATE INDEX "strategy_signal_records_strategy_id_symbol_interval_timesta_idx" ON "strategy_signal_records"("strategy_id", "symbol", "interval", "timestamp");

-- CreateIndex
CREATE INDEX "strategy_signal_records_executed_created_at_idx" ON "strategy_signal_records"("executed", "created_at");

-- CreateIndex
CREATE INDEX "strategy_backtests_strategy_id_symbol_interval_idx" ON "strategy_backtests"("strategy_id", "symbol", "interval");

-- AddForeignKey
ALTER TABLE "strategy_signal_records" ADD CONSTRAINT "strategy_signal_records_strategy_id_fkey" FOREIGN KEY ("strategy_id") REFERENCES "strategy_configs"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "strategy_backtests" ADD CONSTRAINT "strategy_backtests_strategy_id_fkey" FOREIGN KEY ("strategy_id") REFERENCES "strategy_configs"("id") ON DELETE CASCADE ON UPDATE CASCADE;
