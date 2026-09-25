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
    // Cloudflare build output and generated types (ADR-0014, ADR-0015).
    ".open-next/**",
    "**/.wrangler/**",
    "worker-configuration.d.ts",
    // Each Worker is its own package with its own toolchain (ADR-0006).
    "workers/**",
  ]),
]);

export default eslintConfig;
