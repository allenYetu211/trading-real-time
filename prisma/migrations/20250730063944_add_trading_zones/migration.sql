-- AlterTable
ALTER TABLE "analysis_results" ADD COLUMN     "buy_zones" TEXT,
ADD COLUMN     "current_price" DECIMAL(30,8),
ADD COLUMN     "sell_zones" TEXT;
