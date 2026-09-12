/** The standalone build (see scripts/build-standalone.mjs) exports the same app as
    static files so they can be folded into one downloadable HTML file. Headers are a
    server feature and have no meaning in that mode, so they are left off there. */
const standalone = process.env.HARBOR_STANDALONE === '1'

/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    unoptimized: true,
  },
  ...(standalone
    ? {
      output: 'export',
      distDir: '.next-export',
      /* A literal, absolute prefix makes webpack emit its public path as a constant
         rather than reading document.currentScript.src at runtime. Inlining the
         scripts leaves that src empty and the runtime throws on it. Nothing is ever
         fetched from this host: every asset ends up inside the single file. */
      assetPrefix: 'https://harbor.invalid',
    }
    : {
      async headers() {
        return [{ source: '/:path*', headers: [
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          { key: 'Strict-Transport-Security', value: 'max-age=63072000' },
        ] }]
      },
    }),
}

export default nextConfig
