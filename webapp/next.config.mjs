/** @type {import('next').NextConfig} */
const nextConfig = {
  async rewrites() {
    return [
      // Documentation routes - serve static files from public/documentation
      {
        source: '/documentation',
        destination: '/documentation/index.html',
      },
      {
        source: '/documentation/',
        destination: '/documentation/index.html',
      },
      // Handle documentation pages without .html extension
      {
        source: '/documentation/:path([^.]*)',
        destination: '/documentation/:path/index.html',
      },
      // Handle all other documentation sub-routes (including assets)
      {
        source: '/documentation/:path*',
        destination: '/documentation/:path*',
      },
    ];
  },
  
  async redirects() {
    return [
      // Redirect /docs to /documentation for consistency
      {
        source: '/docs',
        destination: '/documentation',
        permanent: true,
      },
      {
        source: '/docs/:path*',
        destination: '/documentation/:path*',
        permanent: true,
      },
    ];
  },
};

export default nextConfig;
