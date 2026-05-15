import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Only use the basePath when building inside GitHub Actions
const isGithubActions = process.env.GITHUB_ACTIONS || false;

const nextConfig = {
  reactStrictMode: true,
  outputFileTracingRoot: __dirname,
  output: 'export',
  basePath: isGithubActions ? '/DTAP_Demo1' : '',
  images: {
    unoptimized: true,
  },
};

export default nextConfig;