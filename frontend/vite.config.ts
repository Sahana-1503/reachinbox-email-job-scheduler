import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

export default defineConfig({
  plugins: [react(), tailwindcss()],

  preview: {
    allowedHosts: [
      "pleasant-perception-production-49ee.up.railway.app",
    ],
  },
});