import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// base harus sama dengan nama repository untuk GitHub Pages
export default defineConfig({
  plugins: [react()],
  base: "/animeku/",
  server: { host: "0.0.0.0", allowedHosts: true },
  preview: { host: "0.0.0.0", allowedHosts: true },
});
