/*
  Warnings:

  - You are about to drop the column `analysis_time` on the `analysis_results` table. All the data in the column will be lost.
  - You are about to drop the column `lower_level` on the `analysis_results` table. All the data in the column will be lost.
  - You are about to drop the column `note` on the `analysis_results` table. All the data in the column will be lost.
  - You are about to drop the column `pattern_type` on the `analysis_results` table. All the data in the column will be lost.
  - You are about to drop the column `resistance_level` on the `analysis_results` table. All the data in the column will be lost.
  - You are about to drop the column `support_level` on the `analysis_results` table. All the data in the column will be lost.
  - You are about to drop the column `upper_level` on the `analysis_results` table. All the data in the column will be lost.
  - Added the required column `momentum_score` to the `analysis_results` table without a default value. This is not possible if the table is not empty.
  - Added the required column `signal` to the `analysis_results` table without a default value. This is not possible if the table is not empty.
  - Added the required column `timestamp` to the `analysis_results` table without a default value. This is not possible if the table is not empty.
  - Added the required column `trend_score` to the `analysis_results` table without a default value. This is not possible if the table is not empty.
  - Added the required column `volatility_score` to the `analysis_results` table without a default value. This is not possible if the table is not empty.

*/
-- DropIndex
DROP INDEX "analysis_results_symbol_interval_analysis_time_idx";

-- AlterTable
ALTER TABLE "analysis_results" DROP COLUMN "analysis_time",
DROP COLUMN "lower_level",
DROP COLUMN "note",
DROP COLUMN "pattern_type",
DROP COLUMN "resistance_level",
DROP COLUMN "support_level",
DROP COLUMN "upper_level",
ADD COLUMN     "momentum_score" DECIMAL(5,2) NOT NULL,
ADD COLUMN     "patterns" TEXT,
ADD COLUMN     "signal" VARCHAR(20) NOT NULL,
ADD COLUMN     "summary" TEXT,
ADD COLUMN     "support_resistance" TEXT,
ADD COLUMN     "timestamp" BIGINT NOT NULL,
ADD COLUMN     "trend_score" DECIMAL(5,2) NOT NULL,
ADD COLUMN     "volatility_score" DECIMAL(5,2) NOT NULL,
ALTER COLUMN "confidence" SET DATA TYPE DECIMAL(5,2);

-- CreateIndex
CREATE INDEX "analysis_results_symbol_interval_timestamp_idx" ON "analysis_results"("symbol", "interval", "timestamp");
