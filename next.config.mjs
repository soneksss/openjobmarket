const nextConfig = {
  images: {
    unoptimized: true,
  },
  experimental: {
    optimizeCss: false,
    cssChunking: 'strict',
  },
  compiler: {
    removeConsole: false,
  },
}

export default nextConfig
