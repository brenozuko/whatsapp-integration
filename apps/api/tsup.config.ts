import { resolve } from "path";
import { defineConfig, type Options } from "tsup";

export default defineConfig((options: Options) => ({
  entryPoints: ["src/index.ts"],
  clean: true,
  format: ["cjs"],
  esbuildOptions(options) {
    options.alias = {
      "@": resolve(__dirname, "src"),
      "@lib": resolve(__dirname, "src/lib"),
      "@lib/*": resolve(__dirname, "src/lib/*"),
    };
  },
  ...options,
}));
