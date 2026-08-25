import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  server: {
    host: "127.0.0.1",
    port: 4185,
    proxy: { "/studio": "http://127.0.0.1:8685" },
  },
  test: { environment: "jsdom" },
});
