/** @type {import('next').NextConfig} */
const isStandalone = process.env.BUILD_STANDALONE === 'true';

const nextConfig = {
  output: isStandalone ? 'standalone' : 'export',
  trailingSlash: true,
  images: {
    unoptimized: true,
  },
};

module.exports = nextConfig;
