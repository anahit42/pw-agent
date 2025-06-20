-- DropForeignKey
ALTER TABLE "TraceAnalysis" DROP CONSTRAINT "TraceAnalysis_traceFileId_fkey";

-- AddForeignKey
ALTER TABLE "TraceAnalysis" ADD CONSTRAINT "TraceAnalysis_traceFileId_fkey" FOREIGN KEY ("traceFileId") REFERENCES "TraceFile"("id") ON DELETE CASCADE ON UPDATE CASCADE;
