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
    "analysisJson" JSONB NOT NULL,
    "analyzedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "TraceAnalysis_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "TraceAnalysis" ADD CONSTRAINT "TraceAnalysis_traceFileId_fkey" FOREIGN KEY ("traceFileId") REFERENCES "TraceFile"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
