import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    // demo-widget is its own Vite project with its own lint setup, and
    // public/demo-app is its built (minified) output copied in for embedding.
    "demo-widget/**",
    "public/demo-app/**",
  ]),
]);

export default eslintConfig;
