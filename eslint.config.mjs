import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  {
    rules: {
      // The codebase marks deliberately-unused bindings with a leading
      // underscore — `_prevState` on every `useActionState` action, `_formData`
      // on the bound delete action. Without this, only trailing ones were
      // exempt (the default `args: "after-used"`), so `_formData` warned while
      // `_prevState` did not.
      "@typescript-eslint/no-unused-vars": [
        "warn",
        {
          argsIgnorePattern: "^_",
          varsIgnorePattern: "^_",
          caughtErrorsIgnorePattern: "^_",
        },
      ],
    },
  },
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    // Kept only as a parity reference for the Django original.
    "_legacy_reference/**",
  ]),
]);

export default eslintConfig;
