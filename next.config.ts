import type { NextConfig } from 'next';

// The site is published at https://ehsanwwe.github.io/diamond-shader/, so a
// production build defaults to that base path; `next dev` stays at the root.
// NEXT_PUBLIC_BASE_PATH overrides both ("/" for the root).
const SITE_BASE_PATH = '/diamond-shader';

function deploymentBasePath(): string {
  const override = process.env.NEXT_PUBLIC_BASE_PATH;
  if (override !== undefined) return override === '/' ? '' : `/${override.replace(/^\/+|\/+$/g, '')}`;
  const repository = process.env.GITHUB_REPOSITORY?.split('/')[1];
  if (repository && repository !== 'ehsanwwe.github.io') return `/${repository}`;
  return process.env.NODE_ENV === 'production' ? SITE_BASE_PATH : '';
}

const basePath = deploymentBasePath();
const config: NextConfig = { output: 'export', distDir: 'build', trailingSlash: true, basePath, assetPrefix: basePath || undefined, images: { unoptimized: true }, env: { NEXT_PUBLIC_BASE_PATH: basePath } };
export default config;
