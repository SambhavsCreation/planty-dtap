import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const nextConfig = {
  reactStrictMode: true,
  outputFileTracingRoot: __dirname,
  output: 'export',
  basePath: '/DTAP_Demo1',
  images: {
    unoptimized: true,
  },
};

export default nextConfig;
