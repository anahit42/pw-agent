import unzipper from 'unzipper';
import { AppError } from './custom-errors';

export async function extractTraceFiles(buffer: Buffer, fileNames: string[]): Promise<Record<string, Buffer>> {
    const results: Record<string, Buffer> = {};
    const directory = await unzipper.Open.buffer(buffer);

    for (const fileName of fileNames) {
        const file = directory.files.find(file =>
            file.type === 'File' && file.path.toLowerCase().includes(fileName));

        if (file) {
            results[fileName] = await file.buffer();
        }
    }

    return results
}

export function parseToJSON(result: unknown): Record<string, unknown> {
    let parsedResult;
    try {
        parsedResult = typeof result === 'string' ? JSON.parse(result) : result;
    } catch (e) {
        throw new AppError('Failed to parse analysis result');
    }

    return parsedResult;
}