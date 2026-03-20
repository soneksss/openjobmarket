const isProd = process.env.NODE_ENV === 'production'

const nextConfig = {
  reactStrictMode: false, // Disabled for react-leaflet compatibility
  compress: true,
  images: {
    // Enable Next.js image optimization (WebP/AVIF conversion, srcset, resizing)
    formats: ['image/avif', 'image/webp'],
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'mklxzrvhanlndkyeteog.supabase.co',
        pathname: '/storage/v1/object/public/**',
      },
      {
        protocol: 'https',
        hostname: '**.supabase.co',
      },
    ],
    // Limit sizes to actual display sizes used in the app
    deviceSizes: [640, 750, 828, 1080, 1200],
    imageSizes: [16, 32, 48, 64, 96, 128, 256],
  },
  experimental: {
    optimizeCss: true,
    // Tree-shake large packages — only import what's actually used
    optimizePackageImports: [
      'lucide-react',
      'framer-motion',
      'recharts',
      'date-fns',
      '@radix-ui/react-accordion',
      '@radix-ui/react-dialog',
      '@radix-ui/react-dropdown-menu',
      '@radix-ui/react-select',
      '@radix-ui/react-tooltip',
    ],
  },
  compiler: {
    // Strip console.* calls in production builds
    removeConsole: isProd ? { exclude: ['error', 'warn'] } : false,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
}

export default nextConfig
