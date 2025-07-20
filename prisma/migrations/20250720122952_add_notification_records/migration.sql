-- CreateTable
CREATE TABLE "notification_records" (
    "id" SERIAL NOT NULL,
    "title" VARCHAR(200) NOT NULL,
    "message" TEXT NOT NULL,
    "type" VARCHAR(20) NOT NULL,
    "symbol" VARCHAR(20),
    "interval" VARCHAR(10),
    "signal" VARCHAR(20),
    "confidence" DECIMAL(5,2),
    "summary" TEXT,
    "patterns" TEXT,
    "support_resistance" TEXT,
    "data" TEXT,
    "timestamp" TIMESTAMP(3) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "notification_records_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "notification_records_type_created_at_idx" ON "notification_records"("type", "created_at");

-- CreateIndex
CREATE INDEX "notification_records_symbol_interval_created_at_idx" ON "notification_records"("symbol", "interval", "created_at");

-- CreateIndex
CREATE INDEX "notification_records_timestamp_idx" ON "notification_records"("timestamp");
