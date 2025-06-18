import unzipper from 'unzipper';

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
