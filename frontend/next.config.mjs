/** Exported as static files and served by the API container, so the app and API share one origin. */
export default {
  output: 'export',
  trailingSlash: true,
  images: { unoptimized: true },
  poweredByHeader: false,
};
