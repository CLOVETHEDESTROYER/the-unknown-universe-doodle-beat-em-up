import path from 'path';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(() => {
  return {
    server: {
      port: 3000,
      host: "0.0.0.0"
    },
    plugins: [react()],
    build: {
      chunkSizeWarningLimit: 900,
      rollupOptions: {
        output: {
          manualChunks(id) {
            if (!id.includes("node_modules")) {
              return undefined;
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
