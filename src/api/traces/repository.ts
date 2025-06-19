import { prisma } from '../../utils/db';

export async function createTraceFile(data: { id: string; originalFileName: string; originalZipPath: string }) {
    return prisma.traceFile.create({ data });
}

export async function findTraceFileById(id: string) {
    return prisma.traceFile.findUnique({ where: { id } });
}

export async function createTraceAnalysis(data: {
    traceFileId: string;
    analysisJson: any;
    analyzedAt?: Date;
}) {
    return prisma.traceAnalysis.create({ data });
}

export async function listTraceFiles({ page, limit }: { page: number; limit: number }) {
    const skip = (page - 1) * limit;
    const take = limit;
    return prisma.traceFile.findMany({
        orderBy: { uploadedAt: 'desc' },
        skip,
        take,
    });
}

export async function countTraceFiles() {
    return prisma.traceFile.count();
}

export async function findTraceFileWithAnalysesById(id: string) {
    return prisma.traceFile.findUnique({
        where: { id },
        include: {
            analyses: {
                orderBy: { analyzedAt: 'desc' }
            }
        }
    });
}