const { defineConfig } = require('@vue/cli-service');
const path = require('path');
const AutoImport = require('unplugin-auto-import/webpack').default
const Components = require('unplugin-vue-components/webpack').default
const { ElementPlusResolver } = require('unplugin-vue-components/resolvers');
const CompressionPlugin = require("compression-webpack-plugin")

module.exports = defineConfig({
  parallel: false,
  outputDir: path.resolve(__dirname, '../CloudFlare-ImgBed/frontend-dist'),
  configureWebpack: {
    plugins: [
      new CompressionPlugin(),
      AutoImport({
        resolvers: [ElementPlusResolver()],
      }),
      Components({
        resolvers: [ElementPlusResolver()],
      }),
    ],
  },
  devServer: {
    port: 3000,
    proxy: {
      '/api': {
        target: process.env.VUE_APP_BACKEND_URL,
        changeOrigin: true,
        pathRewrite: {
          '^/api': '',
        },
      },
    },
  },
  transpileDependencies: true,
});
