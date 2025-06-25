import { defineConfig } from "vite";

// https://vitejs.dev/config/
export default defineConfig({
  base: "/CanvasCode/",
  build: {
    minify: "terser",
    terserOptions: {
      compress: {
        drop_console: true,
        drop_debugger: true,
      },
    },
  },
});
