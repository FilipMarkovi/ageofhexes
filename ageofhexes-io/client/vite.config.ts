
import { defineConfig } from "vite";
import path from "path";

export default defineConfig({
  server: {
    fs: {
      // allow importing from ../shared
      allow: [".."]
    }
  },
  resolve: {
    alias: {
      // optional nice alias
      shared: path.resolve(__dirname, "../shared")
    }
  }
});
