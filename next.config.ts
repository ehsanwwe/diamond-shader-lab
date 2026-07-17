import type { NextConfig } from 'next';

function deploymentBasePath(): string {
  const override = process.env.NEXT_PUBLIC_BASE_PATH;
  if (override !== undefined) return override === '/' ? '' : `/${override.replace(/^\/+|\/+$/g, '')}`;
  const repository = process.env.GITHUB_REPOSITORY?.split('/')[1];
  return repository && repository !== 'ehsanwwe.github.io' ? `/${repository}` : '';
}

const basePath = deploymentBasePath();
const config: NextConfig = { output: 'export', distDir: 'build', trailingSlash: true, basePath, assetPrefix: basePath || undefined, images: { unoptimized: true }, env: { NEXT_PUBLIC_BASE_PATH: basePath } };
export default config;
