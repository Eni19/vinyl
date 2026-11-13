import react from "@vitejs/plugin-react";
import { defineConfig } from "vitest/config";

export default defineConfig({
  plugins: [react()],
  resolve: { tsconfigPaths: true },
  test: {
    environment: "node",
    include: ["src/**/*.test.{ts,tsx}", "content/**/*.test.ts"],
    setupFiles: ["./vitest.setup.ts"],
    coverage: {
      include: ["src/domain/**", "src/application/**", "src/infrastructure/**"],
    },
  },
});
