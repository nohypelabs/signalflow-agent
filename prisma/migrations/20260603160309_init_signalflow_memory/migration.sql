-- CreateEnum
CREATE TYPE "StrategyEngine" AS ENUM ('CONFLUENCE', 'LIQUIDITY_FLOW');

-- CreateEnum
CREATE TYPE "SignalAction" AS ENUM ('STRONG_LONG', 'LONG', 'WEAK_LONG', 'HOLD', 'WEAK_SHORT', 'SHORT', 'STRONG_SHORT');

-- CreateEnum
CREATE TYPE "SignalStatus" AS ENUM ('OPEN', 'WON', 'LOST', 'EXPIRED', 'CANCELED');

-- CreateEnum
CREATE TYPE "PositionSide" AS ENUM ('LONG', 'SHORT');

-- CreateEnum
CREATE TYPE "PositionStatus" AS ENUM ('OPEN', 'CLOSED', 'LIQUIDATED');

-- CreateEnum
CREATE TYPE "TradeSource" AS ENUM ('PAPER', 'LIVE');

-- CreateEnum
CREATE TYPE "TradeStatus" AS ENUM ('PENDING', 'FILLED', 'CANCELED', 'REJECTED');

-- CreateTable
CREATE TABLE "WalletProfile" (
    "id" TEXT NOT NULL,
    "walletAddress" TEXT NOT NULL,
    "normalizedWallet" TEXT NOT NULL,
    "displayName" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "lastSeenAt" TIMESTAMP(3),

    CONSTRAINT "WalletProfile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StrategyConfig" (
    "id" TEXT NOT NULL,
    "walletProfileId" TEXT NOT NULL,
    "name" TEXT NOT NULL DEFAULT 'Default',
    "engine" "StrategyEngine" NOT NULL DEFAULT 'CONFLUENCE',
    "tradingType" TEXT NOT NULL DEFAULT 'intraday',
    "isActive" BOOLEAN NOT NULL DEFAULT false,
    "confluenceWeights" JSONB,
    "liquidityFlow" JSONB,
    "riskConfig" JSONB,
    "executionConfig" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "StrategyConfig_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SignalHistory" (
    "id" TEXT NOT NULL,
    "walletProfileId" TEXT,
    "symbol" TEXT NOT NULL,
    "engine" "StrategyEngine" NOT NULL DEFAULT 'CONFLUENCE',
    "action" "SignalAction" NOT NULL,
    "confidence" INTEGER NOT NULL,
    "score" INTEGER,
    "entryPrice" DECIMAL(20,8),
    "takeProfit" DECIMAL(20,8),
    "stopLoss" DECIMAL(20,8),
    "status" "SignalStatus" NOT NULL DEFAULT 'OPEN',
    "generatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "resolvedAt" TIMESTAMP(3),
    "payload" JSONB,

    CONSTRAINT "SignalHistory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PaperAccount" (
    "id" TEXT NOT NULL,
    "walletProfileId" TEXT NOT NULL,
    "balance" DECIMAL(20,8) NOT NULL DEFAULT 10000,
    "equity" DECIMAL(20,8) NOT NULL DEFAULT 10000,
    "realizedPnl" DECIMAL(20,8) NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PaperAccount_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PaperPosition" (
    "id" TEXT NOT NULL,
    "paperAccountId" TEXT NOT NULL,
    "symbol" TEXT NOT NULL,
    "side" "PositionSide" NOT NULL,
    "status" "PositionStatus" NOT NULL DEFAULT 'OPEN',
    "size" DECIMAL(20,8) NOT NULL,
    "entryPrice" DECIMAL(20,8) NOT NULL,
    "markPrice" DECIMAL(20,8),
    "leverage" DECIMAL(10,2) NOT NULL DEFAULT 1,
    "margin" DECIMAL(20,8) NOT NULL,
    "realizedPnl" DECIMAL(20,8),
    "openedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "closedAt" TIMESTAMP(3),
    "payload" JSONB,

    CONSTRAINT "PaperPosition_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TradeJournal" (
    "id" TEXT NOT NULL,
    "walletProfileId" TEXT NOT NULL,
    "paperAccountId" TEXT,
    "source" "TradeSource" NOT NULL,
    "status" "TradeStatus" NOT NULL DEFAULT 'PENDING',
    "symbol" TEXT NOT NULL,
    "side" "PositionSide" NOT NULL,
    "orderType" TEXT NOT NULL,
    "quantity" DECIMAL(20,8) NOT NULL,
    "price" DECIMAL(20,8),
    "fee" DECIMAL(20,8),
    "pnl" DECIMAL(20,8),
    "txHash" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "payload" JSONB,

    CONSTRAINT "TradeJournal_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BacktestRun" (
    "id" TEXT NOT NULL,
    "walletProfileId" TEXT,
    "strategyConfigId" TEXT,
    "engine" "StrategyEngine" NOT NULL,
    "symbol" TEXT NOT NULL,
    "timeframe" TEXT NOT NULL,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "endedAt" TIMESTAMP(3),
    "configSnapshot" JSONB NOT NULL,
    "metrics" JSONB,
    "trades" JSONB,

    CONSTRAINT "BacktestRun_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "WalletProfile_walletAddress_key" ON "WalletProfile"("walletAddress");

-- CreateIndex
CREATE UNIQUE INDEX "WalletProfile_normalizedWallet_key" ON "WalletProfile"("normalizedWallet");

-- CreateIndex
CREATE INDEX "WalletProfile_normalizedWallet_idx" ON "WalletProfile"("normalizedWallet");

-- CreateIndex
CREATE INDEX "StrategyConfig_walletProfileId_isActive_idx" ON "StrategyConfig"("walletProfileId", "isActive");

-- CreateIndex
CREATE INDEX "StrategyConfig_engine_idx" ON "StrategyConfig"("engine");

-- CreateIndex
CREATE UNIQUE INDEX "StrategyConfig_walletProfileId_name_key" ON "StrategyConfig"("walletProfileId", "name");

-- CreateIndex
CREATE INDEX "SignalHistory_walletProfileId_generatedAt_idx" ON "SignalHistory"("walletProfileId", "generatedAt");

-- CreateIndex
CREATE INDEX "SignalHistory_symbol_generatedAt_idx" ON "SignalHistory"("symbol", "generatedAt");

-- CreateIndex
CREATE INDEX "SignalHistory_engine_status_idx" ON "SignalHistory"("engine", "status");

-- CreateIndex
CREATE UNIQUE INDEX "PaperAccount_walletProfileId_key" ON "PaperAccount"("walletProfileId");

-- CreateIndex
CREATE INDEX "PaperPosition_paperAccountId_status_idx" ON "PaperPosition"("paperAccountId", "status");

-- CreateIndex
CREATE INDEX "PaperPosition_symbol_openedAt_idx" ON "PaperPosition"("symbol", "openedAt");

-- CreateIndex
CREATE INDEX "TradeJournal_walletProfileId_createdAt_idx" ON "TradeJournal"("walletProfileId", "createdAt");

-- CreateIndex
CREATE INDEX "TradeJournal_source_status_idx" ON "TradeJournal"("source", "status");

-- CreateIndex
CREATE INDEX "TradeJournal_txHash_idx" ON "TradeJournal"("txHash");

-- CreateIndex
CREATE INDEX "BacktestRun_walletProfileId_startedAt_idx" ON "BacktestRun"("walletProfileId", "startedAt");

-- CreateIndex
CREATE INDEX "BacktestRun_engine_symbol_timeframe_idx" ON "BacktestRun"("engine", "symbol", "timeframe");

-- AddForeignKey
ALTER TABLE "StrategyConfig" ADD CONSTRAINT "StrategyConfig_walletProfileId_fkey" FOREIGN KEY ("walletProfileId") REFERENCES "WalletProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SignalHistory" ADD CONSTRAINT "SignalHistory_walletProfileId_fkey" FOREIGN KEY ("walletProfileId") REFERENCES "WalletProfile"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PaperAccount" ADD CONSTRAINT "PaperAccount_walletProfileId_fkey" FOREIGN KEY ("walletProfileId") REFERENCES "WalletProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PaperPosition" ADD CONSTRAINT "PaperPosition_paperAccountId_fkey" FOREIGN KEY ("paperAccountId") REFERENCES "PaperAccount"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TradeJournal" ADD CONSTRAINT "TradeJournal_walletProfileId_fkey" FOREIGN KEY ("walletProfileId") REFERENCES "WalletProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TradeJournal" ADD CONSTRAINT "TradeJournal_paperAccountId_fkey" FOREIGN KEY ("paperAccountId") REFERENCES "PaperAccount"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BacktestRun" ADD CONSTRAINT "BacktestRun_walletProfileId_fkey" FOREIGN KEY ("walletProfileId") REFERENCES "WalletProfile"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BacktestRun" ADD CONSTRAINT "BacktestRun_strategyConfigId_fkey" FOREIGN KEY ("strategyConfigId") REFERENCES "StrategyConfig"("id") ON DELETE SET NULL ON UPDATE CASCADE;
