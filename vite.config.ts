import { defineConfig } from "vite";

export default defineConfig({
  build: {
    rollupOptions: {
      input: {
        home: "index.html",
        strategy: "strategy.html",
        execution: "execution.html"
      }
    }
  }
});
