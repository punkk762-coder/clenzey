import js from "@eslint/js";
import vitest from "@vitest/eslint-plugin";
import perfectionist from "eslint-plugin-perfectionist";
import { defineConfig } from "eslint/config";
import globals from "globals";
import tseslint from "typescript-eslint";

export default defineConfig([
  {
    ignores: ["dist/**", "node_modules/**"],
  },
  {
    extends: ["js/recommended"],
    files: ["**/*.{js,mjs,cjs,ts,mts,cts}"],
    ignores: ["dist/**", "**/*.js"],
    languageOptions: { globals: globals.node },
    plugins: { js },
  },
  tseslint.configs.recommended,
  perfectionist.configs["recommended-natural"],
  {
    files: ["**/*.test.ts", "**/*.spec.ts"],
    plugins: {
      vitest,
    },
    rules: {
      ...vitest.configs.recommended.rules,
      "@typescript-eslint/unbound-method": "off",
    },
  },
]);
