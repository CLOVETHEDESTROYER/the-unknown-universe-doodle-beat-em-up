import path from 'path';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, ".", "");
  return {
    server: {
      port: 3000,
      host: "0.0.0.0"
    },
    plugins: [react()],
    define: {
      "process.env.API_KEY": JSON.stringify(env.GEMINI_API_KEY),
      "process.env.GEMINI_API_KEY": JSON.stringify(env.GEMINI_API_KEY)
    },
    build: {
      chunkSizeWarningLimit: 900,
      rollupOptions: {
        output: {
          manualChunks(id) {
            if (!id.includes("node_modules")) {
              return undefined;
            }

            if (id.includes("@google/genai")) {
              return "genai";
            }

            if (id.includes("react")) {
              return "react-vendor";
            }

            if (id.includes("phaser")) {
              return "phaser-vendor";
            }

            return "vendor";
          }
        }
      }
    },
    resolve: {
      alias: {
        "@": path.resolve(__dirname, "."),
        phaser: path.resolve(__dirname, "node_modules/phaser/dist/phaser-arcade-physics.js")
      }
    }
  };
});
