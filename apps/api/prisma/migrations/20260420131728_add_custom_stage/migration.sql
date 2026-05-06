-- AlterEnum
ALTER TYPE "ApplicationStage" ADD VALUE 'CUSTOM';

-- AlterTable
ALTER TABLE "ApplicationStageHistory" ADD COLUMN     "customLabel" TEXT;
