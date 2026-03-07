import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { viteStaticCopy } from "vite-plugin-static-copy";
import { resolve } from "path";

export default defineConfig({
  plugins: [
    react(),
    viteStaticCopy({
      targets: [
        { src: "chrome-extension/public/manifest.json", dest: "." },
        { src: "chrome-extension/public/icons", dest: "." },
      ],
    }),
  ],
  build: {
    outDir: "dist",
    rollupOptions: {
      input: {
        popup: resolve(__dirname, "popup.html"),
        background: resolve(__dirname, "chrome-extension/src/background/index.ts"),
      },
      output: {
        entryFileNames: (chunk) => {
          if (chunk.name === "background") return "background/index.js";
          return "[name].js";
        },
      },
    },
  },
});
