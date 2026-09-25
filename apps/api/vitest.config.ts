import { defineConfig } from "vitest/config";
import swc from "unplugin-swc";
import path from "path";

export default defineConfig({
  test: {
    globals: true,
    environment: "node",
    alias: {
      "@schoolerp/contracts": path.resolve(
        __dirname,
        "../../packages/contracts/src",
      ),
      "@schoolerp/i18n": path.resolve(__dirname, "../../packages/i18n/src"),
      "@schoolerp/shared": path.resolve(__dirname, "../../packages/shared/src"),
    },
  },
  plugins: [
    swc.vite({
      module: { type: "es6" },
    }),
  ],
});
