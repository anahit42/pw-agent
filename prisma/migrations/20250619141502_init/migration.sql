-- CreateTable
CREATE TABLE "TraceFile" (
    "id" TEXT NOT NULL,
    "bucketName" TEXT NOT NULL,
    "originalZipPath" TEXT NOT NULL,
    "uploadedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TraceFile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TraceAnalysis" (
    "id" TEXT NOT NULL,
    "traceFileId" TEXT NOT NULL,
    "summary" TEXT NOT NULL,
    "failedStep" TEXT NOT NULL,
    "errorReason" TEXT NOT NULL,
    "suggestions" TEXT NOT NULL,
    "networkIssues" TEXT NOT NULL,
    "stackTraceAnalysis" TEXT NOT NULL,
    "correlatedEvents" TEXT NOT NULL,
    "analyzedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "TraceAnalysis_pkey" PRIMARY KEY ("id")
);


-- AddForeignKey
ALTER TABLE "TraceAnalysis" ADD CONSTRAINT "TraceAnalysis_traceFileId_fkey" FOREIGN KEY ("traceFileId") REFERENCES "TraceFile"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
