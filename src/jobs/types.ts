export interface ExtractionJobData {
    traceId: string;
    originalFileName: string;
    s3Key: string;
    userId: string;
}

export interface TraceAnalysisJobData {
    traceId: string;
}