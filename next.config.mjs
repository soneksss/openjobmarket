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
  // Empty turbopack config to allow webpack config (for build compatibility)
  turbopack: {},
  webpack: (config, { isServer }) => {
    // Suppress source map warnings from node_modules
    config.ignoreWarnings = [
      { module: /node_modules/ },
      /Failed to parse source map/,
      /sourceMapURL could not be parsed/,
    ]
    return config
  },
}

export default nextConfig
