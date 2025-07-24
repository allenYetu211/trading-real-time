-- AlterTable
ALTER TABLE "kline_data" ALTER COLUMN "open_price" SET DATA TYPE DECIMAL(30,8),
ALTER COLUMN "high_price" SET DATA TYPE DECIMAL(30,8),
ALTER COLUMN "low_price" SET DATA TYPE DECIMAL(30,8),
ALTER COLUMN "close_price" SET DATA TYPE DECIMAL(30,8),
ALTER COLUMN "volume" SET DATA TYPE DECIMAL(30,8),
ALTER COLUMN "quote_asset_volume" SET DATA TYPE DECIMAL(30,8),
ALTER COLUMN "taker_buy_base_asset_volume" SET DATA TYPE DECIMAL(30,8),
ALTER COLUMN "taker_buy_quote_asset_volume" SET DATA TYPE DECIMAL(30,8);

-- AlterTable
ALTER TABLE "strategy_signal_records" ALTER COLUMN "price" SET DATA TYPE DECIMAL(30,8),
ALTER COLUMN "quantity" SET DATA TYPE DECIMAL(30,8),
ALTER COLUMN "stop_loss" SET DATA TYPE DECIMAL(30,8),
ALTER COLUMN "take_profit" SET DATA TYPE DECIMAL(30,8);

-- AlterTable
ALTER TABLE "strategy_signals" ALTER COLUMN "price" SET DATA TYPE DECIMAL(30,8),
ALTER COLUMN "upper_level" SET DATA TYPE DECIMAL(30,8),
ALTER COLUMN "lower_level" SET DATA TYPE DECIMAL(30,8),
ALTER COLUMN "stop_loss" SET DATA TYPE DECIMAL(30,8),
ALTER COLUMN "take_profit" SET DATA TYPE DECIMAL(30,8);

-- CreateTable
CREATE TABLE "trading_records" (
    "id" SERIAL NOT NULL,
    "trade_id" VARCHAR(100) NOT NULL,
    "instrument" VARCHAR(20) NOT NULL,
    "direction" VARCHAR(10) NOT NULL,
    "status" VARCHAR(20) NOT NULL,
    "leverage" DECIMAL(5,2),
    "entry_time" TIMESTAMP(3),
    "exit_time" TIMESTAMP(3),
    "duration" INTEGER,
    "planned_price" DECIMAL(30,8),
    "actual_entry_price" DECIMAL(30,8),
    "actual_exit_price" DECIMAL(30,8),
    "position_size" DECIMAL(30,8),
    "margin" DECIMAL(30,8),
    "pnl" DECIMAL(30,8),
    "ror_percentage" DECIMAL(8,4),
    "fees" DECIMAL(30,8),
    "net_pnl" DECIMAL(30,8),
    "slippage" DECIMAL(30,8),
    "initial_take_profit" DECIMAL(30,8),
    "initial_stop_loss" DECIMAL(30,8),
    "hit_take_profit" BOOLEAN NOT NULL DEFAULT false,
    "hit_stop_loss" BOOLEAN NOT NULL DEFAULT false,
    "max_favorable_excursion" DECIMAL(30,8),
    "max_adverse_excursion" DECIMAL(30,8),
    "notion_synced" BOOLEAN NOT NULL DEFAULT false,
    "notion_page_id" VARCHAR(100),
    "synced_at" TIMESTAMP(3),
    "okx_order_ids" TEXT,
    "raw_data" TEXT,
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "trading_records_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "trading_records_trade_id_key" ON "trading_records"("trade_id");

-- CreateIndex
CREATE INDEX "trading_records_instrument_status_created_at_idx" ON "trading_records"("instrument", "status", "created_at");

-- CreateIndex
CREATE INDEX "trading_records_status_notion_synced_idx" ON "trading_records"("status", "notion_synced");

-- CreateIndex
CREATE INDEX "trading_records_entry_time_exit_time_idx" ON "trading_records"("entry_time", "exit_time");
