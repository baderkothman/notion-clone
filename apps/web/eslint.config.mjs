import { dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { FlatCompat } from "@eslint/eslintrc";

const __dirname = dirname(fileURLToPath(import.meta.url));

const compat = new FlatCompat({ baseDirectory: __dirname });

const eslintConfig = [
  ...compat.extends("next/core-web-vitals", "next/typescript"),
  {
    ignores: [
      ".next/**",
      "node_modules/**",
      "playwright-report/**",
      "test-results/**",
      "e2e/**",
      "next-env.d.ts",
    ],
  },
  {
    rules: {
      // Server actions and event handlers routinely fire-and-forget; the project's
      // convention is explicit `void` on intentionally unawaited promises (see
      // CLAUDE.md-equivalent docs/DEVELOPMENT.md), which this rule would otherwise flag
      // as needing `.catch()`.
      "@typescript-eslint/no-floating-promises": "off",
    },
  },
];

export default eslintConfig;
