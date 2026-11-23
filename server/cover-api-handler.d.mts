export function createCoverApiMiddleware(
  rootDir: string,
): (req: { url?: string }, res: unknown, next?: () => void) => Promise<void>;
