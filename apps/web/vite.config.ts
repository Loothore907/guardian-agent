import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

export default defineConfig({
  root: import.meta.dirname,
  plugins: [react()],
  server: { proxy: { "/v1/judge/": "http://127.0.0.1:4317" } },
  build: {
    emptyOutDir: true,
    outDir: "../../dist/web",
  },
});
