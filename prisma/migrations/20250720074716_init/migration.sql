-- CreateTable
CREATE TABLE "coin_configs" (
    "id" SERIAL NOT NULL,
    "symbol" VARCHAR(20) NOT NULL,
    "interval" VARCHAR(10) NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "coin_configs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "kline_data" (
    "id" SERIAL NOT NULL,
    "symbol" VARCHAR(20) NOT NULL,
    "interval" VARCHAR(10) NOT NULL,
    "open_time" BIGINT NOT NULL,
    "close_time" BIGINT NOT NULL,
    "open_price" DECIMAL(20,8) NOT NULL,
    "high_price" DECIMAL(20,8) NOT NULL,
    "low_price" DECIMAL(20,8) NOT NULL,
    "close_price" DECIMAL(20,8) NOT NULL,
    "volume" DECIMAL(20,8) NOT NULL,
    "quote_asset_volume" DECIMAL(20,8) NOT NULL,
    "number_of_trades" INTEGER NOT NULL,
    "taker_buy_base_asset_volume" DECIMAL(20,8) NOT NULL,
    "taker_buy_quote_asset_volume" DECIMAL(20,8) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "kline_data_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "analysis_results" (
    "id" SERIAL NOT NULL,
    "symbol" VARCHAR(20) NOT NULL,
    "interval" VARCHAR(10) NOT NULL,
    "pattern_type" VARCHAR(50) NOT NULL,
    "upper_level" DECIMAL(20,8),
    "lower_level" DECIMAL(20,8),
    "support_level" DECIMAL(20,8),
    "resistance_level" DECIMAL(20,8),
    "confidence" DECIMAL(3,2) NOT NULL,
    "note" TEXT,
    "analysis_time" BIGINT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "analysis_results_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "strategy_signals" (
    "id" SERIAL NOT NULL,
    "symbol" VARCHAR(20) NOT NULL,
    "interval" VARCHAR(10) NOT NULL,
    "strategy_type" VARCHAR(50) NOT NULL,
    "signal_type" VARCHAR(20) NOT NULL,
    "price" DECIMAL(20,8) NOT NULL,
    "confidence" DECIMAL(3,2) NOT NULL,
    "recommendation" TEXT NOT NULL,
    "upper_level" DECIMAL(20,8),
    "lower_level" DECIMAL(20,8),
    "stop_loss" DECIMAL(20,8),
    "take_profit" DECIMAL(20,8),
    "note" TEXT,
    "timestamp" BIGINT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "strategy_signals_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "coin_configs_symbol_interval_key" ON "coin_configs"("symbol", "interval");

-- CreateIndex
CREATE INDEX "kline_data_symbol_interval_open_time_idx" ON "kline_data"("symbol", "interval", "open_time");

-- CreateIndex
CREATE UNIQUE INDEX "kline_data_symbol_interval_open_time_key" ON "kline_data"("symbol", "interval", "open_time");

-- CreateIndex
CREATE INDEX "analysis_results_symbol_interval_analysis_time_idx" ON "analysis_results"("symbol", "interval", "analysis_time");

-- CreateIndex
CREATE INDEX "strategy_signals_symbol_strategy_type_created_at_idx" ON "strategy_signals"("symbol", "strategy_type", "created_at");
