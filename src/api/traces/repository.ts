import { prisma } from '../../utils/db';

export async function createTraceFile(data: { id: string; bucketName: string; originalZipPath: string }) {
    return prisma.traceFile.create({ data });
}

export async function findTraceFileById(id: string) {
    return prisma.traceFile.findUnique({ where: { id } });
}

export async function createTraceAnalysis(data: { traceFileId: string; summary: string; failedStep: string; errorReason: string; suggestions: string }) {
    return prisma.traceAnalysis.create({ data });
}

export async function listTraceFiles() {
    return prisma.traceFile.findMany({
        orderBy: { uploadedAt: 'desc' }
    });
}