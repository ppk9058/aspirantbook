/** @type {import('next').NextConfig} */
const nextConfig = {
    output: process.env.NEXT_STANDALONE === "true" || process.env.NEXT_STANDALONE === "1" ? "standalone" : undefined,
    distDir: process.env.NEXT_DIST_DIR || ".next",
    skipMiddlewareUrlNormalize: true,
    images: {
        formats: ['image/avif', 'image/webp'],
        minimumCacheTTL: 60 * 60 * 24 * 30,
        dangerouslyAllowSVG: true,
        contentDispositionType: 'attachment',
        contentSecurityPolicy: "default-src 'self'; script-src 'none'; sandbox;",
        remotePatterns: [
            {
                protocol: 'https',
                hostname: '**',
            },
        ],
    },
    compiler: {
        removeConsole: process.env.NODE_ENV === 'production',
    },
    devIndicators: {
        appIsrStatus: false,
        buildActivity: false,
    },
    typescript: {
        ignoreBuildErrors: true,
    },
    eslint: {
        ignoreDuringBuilds: true,
    },
    productionBrowserSourceMaps: false,
    compress: true,
    poweredByHeader: false,
    httpAgentOptions: {
        keepAlive: true,
    },
    reactStrictMode: true,
    experimental: {
        staleTimes: {
            dynamic: 30,
            static: 180,
        },
        optimizePackageImports: [
            'lucide-react',
            'date-fns',
            'framer-motion',
            'recharts',
            'clsx',
            'tailwind-merge',
            '@radix-ui/react-accordion',
            '@radix-ui/react-avatar',
            '@radix-ui/react-checkbox',
            '@radix-ui/react-dialog',
            '@radix-ui/react-dropdown-menu',
            '@radix-ui/react-label',
            '@radix-ui/react-progress',
            '@radix-ui/react-radio-group',
            '@radix-ui/react-select',
            '@radix-ui/react-slider',
            '@radix-ui/react-slot',
            '@radix-ui/react-switch',
            '@radix-ui/react-tabs',
            '@radix-ui/react-toast',
            'sonner',
            '@tanstack/react-query',
        ],
    },
    async headers() {
        const connectHosts = [
            "'self'",
            'https://api.razorpay.com',
            'https://lumberjack.razorpay.com',
            'https://*.amazonaws.com',
            'https://challenges.cloudflare.com',
            'https://accounts.google.com',
            'wss:',
        ];

        const s3Endpoint = process.env.S3_ENDPOINT || process.env.AWS_ENDPOINT;
        if (s3Endpoint) {
            try {
                const parsed = new URL(s3Endpoint);
                if (!connectHosts.includes(parsed.origin)) {
                    connectHosts.push(parsed.origin);
                }
            } catch {
                // ignore invalid URL
            }
        }

        const sentryDsn = process.env.SENTRY_DSN;
        if (sentryDsn) {
            try {
                const parsed = new URL(sentryDsn);
                const ingestHost = `https://${parsed.host}`;
                if (!connectHosts.includes(ingestHost)) {
                    connectHosts.push(ingestHost);
                }
            } catch {
                // ignore invalid DSN
            }
        }

        const csp = [
            "default-src 'self'",
            "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://checkout.razorpay.com https://api.razorpay.com https://challenges.cloudflare.com https://www.youtube.com https://s.ytimg.com",
            "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
            "font-src 'self' data: https://fonts.gstatic.com",
            "img-src 'self' data: blob: https://*.razorpay.com https: http:",
            "frame-src 'self' https://api.razorpay.com https://checkout.razorpay.com https://challenges.cloudflare.com https://www.youtube.com https://www.youtube-nocookie.com blob: data: https://aspirantbook-files.ae55f76e25efc786fa816ab0f463a146.r2.cloudflarestorage.com",
            `connect-src ${connectHosts.join(' ')}`,
            "media-src 'self' https: blob:",
            "worker-src 'self' blob:",
            "object-src 'none'",
            "base-uri 'self'",
            "form-action 'self' https://api.razorpay.com https://accounts.google.com",
            "frame-ancestors 'self'",
        ].join('; ');

        return [
            {
                source: '/:path*',
                headers: [
                    {
                        key: 'X-DNS-Prefetch-Control',
                        value: 'on',
                    },
                    {
                        key: 'Strict-Transport-Security',
                        value: 'max-age=63072000; includeSubDomains; preload',
                    },
                    {
                        key: 'X-Content-Type-Options',
                        value: 'nosniff',
                    },
                    {
                        key: 'X-Frame-Options',
                        value: 'SAMEORIGIN',
                    },
                    {
                        key: 'Referrer-Policy',
                        value: 'strict-origin-when-cross-origin',
                    },
                    {
                        key: 'Permissions-Policy',
                        value: 'camera=(), microphone=(), geolocation=(), browsing-topics=()',
                    },
                    {
                        key: 'Content-Security-Policy',
                        value: csp,
                    },
                ],
            },
            {
                source: '/:all*(svg|jpg|jpeg|png|webp|avif|gif|ico|woff2)',
                headers: [
                    {
                        key: 'Cache-Control',
                        value: 'public, max-age=31536000, immutable',
                    },
                ],
            },
        ]
    },
}

module.exports = nextConfig
