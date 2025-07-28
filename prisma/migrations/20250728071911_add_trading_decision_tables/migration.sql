-- CreateTable
CREATE TABLE "trading_opportunities" (
    "id" TEXT NOT NULL,
    "symbol" VARCHAR(20) NOT NULL,
    "direction" VARCHAR(10) NOT NULL,
    "market_state" VARCHAR(20) NOT NULL,
    "risk_reward_ratio" DECIMAL(8,2) NOT NULL,
    "entry_price" DECIMAL(30,8),
    "take_profit" DECIMAL(30,8),
    "stop_loss" DECIMAL(30,8),
    "status" VARCHAR(20) NOT NULL,
    "confidence" DECIMAL(5,2),
    "reason" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "expired_at" TIMESTAMP(3),

    CONSTRAINT "trading_opportunities_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "actionable_signals" (
    "id" TEXT NOT NULL,
    "opportunity_id" TEXT NOT NULL,
    "signal_type" VARCHAR(30) NOT NULL,
    "trigger_price" DECIMAL(30,8) NOT NULL,
    "entry_price" DECIMAL(30,8) NOT NULL,
    "take_profit" DECIMAL(30,8) NOT NULL,
    "stop_loss" DECIMAL(30,8) NOT NULL,
    "risk_reward_ratio" DECIMAL(8,2) NOT NULL,
    "confidence" DECIMAL(5,2) NOT NULL,
    "reason" TEXT NOT NULL,
    "triggered_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "status" VARCHAR(20) NOT NULL,
    "executed_at" TIMESTAMP(3),

    CONSTRAINT "actionable_signals_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "market_states" (
    "id" TEXT NOT NULL,
    "symbol" VARCHAR(20) NOT NULL,
    "timeframe" VARCHAR(10) NOT NULL,
    "state" VARCHAR(20) NOT NULL,
    "ema21" DECIMAL(30,8) NOT NULL,
    "ema55" DECIMAL(30,8) NOT NULL,
    "current_price" DECIMAL(30,8) NOT NULL,
    "confidence" DECIMAL(5,2) NOT NULL,
    "details" TEXT,
    "analyzed_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "market_states_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "support_resistance_levels" (
    "id" TEXT NOT NULL,
    "symbol" VARCHAR(20) NOT NULL,
    "timeframe" VARCHAR(10) NOT NULL,
    "level_type" VARCHAR(20) NOT NULL,
    "price" DECIMAL(30,8) NOT NULL,
    "strength" DECIMAL(5,2) NOT NULL,
    "touches" INTEGER NOT NULL DEFAULT 1,
    "last_touch" TIMESTAMP(3),
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "details" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "support_resistance_levels_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "trading_opportunities_symbol_status_created_at_idx" ON "trading_opportunities"("symbol", "status", "created_at");

-- CreateIndex
CREATE INDEX "trading_opportunities_market_state_risk_reward_ratio_idx" ON "trading_opportunities"("market_state", "risk_reward_ratio");

-- CreateIndex
CREATE INDEX "trading_opportunities_status_expired_at_idx" ON "trading_opportunities"("status", "expired_at");

-- CreateIndex
CREATE INDEX "actionable_signals_opportunity_id_status_idx" ON "actionable_signals"("opportunity_id", "status");

-- CreateIndex
CREATE INDEX "actionable_signals_signal_type_triggered_at_idx" ON "actionable_signals"("signal_type", "triggered_at");

-- CreateIndex
CREATE INDEX "actionable_signals_status_confidence_idx" ON "actionable_signals"("status", "confidence");

-- CreateIndex
CREATE INDEX "market_states_symbol_timeframe_analyzed_at_idx" ON "market_states"("symbol", "timeframe", "analyzed_at");

-- CreateIndex
CREATE INDEX "market_states_state_confidence_idx" ON "market_states"("state", "confidence");

-- CreateIndex
CREATE UNIQUE INDEX "market_states_symbol_timeframe_key" ON "market_states"("symbol", "timeframe");

-- CreateIndex
CREATE INDEX "support_resistance_levels_symbol_timeframe_level_type_idx" ON "support_resistance_levels"("symbol", "timeframe", "level_type");

-- CreateIndex
CREATE INDEX "support_resistance_levels_is_active_strength_idx" ON "support_resistance_levels"("is_active", "strength");

-- CreateIndex
CREATE UNIQUE INDEX "support_resistance_levels_symbol_timeframe_price_level_type_key" ON "support_resistance_levels"("symbol", "timeframe", "price", "level_type");

-- AddForeignKey
ALTER TABLE "actionable_signals" ADD CONSTRAINT "actionable_signals_opportunity_id_fkey" FOREIGN KEY ("opportunity_id") REFERENCES "trading_opportunities"("id") ON DELETE CASCADE ON UPDATE CASCADE;
