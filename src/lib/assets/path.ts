const basePath = process.env.NEXT_PUBLIC_BASE_PATH ?? '';
export function assetPath(path: string): string { return `${basePath}/${path.replace(/^\//, '')}`; }
