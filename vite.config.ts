import { defineConfig } from "vite";
import tailwindcss from "@tailwindcss/vite";
export default defineConfig({
  plugins: [tailwindcss()],
  optimizeDeps: { entries: ["index.html"] },
  server: {
    proxy: { "/api": "http://127.0.0.1:3001" },
    watch: { ignored: ["**/.data/**", "**/docs/**", "**/scripts/**", "**/tests/**"] },
  },
});
