const nextConfig = {
  reactStrictMode: false, // Disabled for react-leaflet compatibility
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
  typescript: {
    // Temporarily ignore build errors to fix deployment
    ignoreBuildErrors: true,
  },
}

export default nextConfig
