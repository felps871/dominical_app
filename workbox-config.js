module.exports = {
  globDirectory: 'dist/',
  globPatterns: [
    '**/*.{js,css,html,png,jpg,jpeg,svg,ico,json,ttf,woff,woff2}'
  ],
  swDest: 'dist/sw.js',
  navigateFallback: '/index.html',
  maximumFileSizeToCacheInBytes: 5 * 1024 * 1024
};