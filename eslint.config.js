// Root ESLint flat config (ESLint 9+). One file for all packages; rules are scoped by `files`.
// Install (root devDependencies):
//   npm i -D eslint @eslint/js typescript-eslint globals eslint-config-prettier \
//     eslint-plugin-react eslint-plugin-react-hooks eslint-plugin-jsx-a11y \
//     @eslint-community/eslint-plugin-eslint-comments

import js from "@eslint/js";
import { defineConfig, globalIgnores } from "eslint/config";
import tseslint from "typescript-eslint";
import globals from "globals";
import react from "eslint-plugin-react";
import reactHooks from "eslint-plugin-react-hooks";
import jsxA11y from "eslint-plugin-jsx-a11y";
import eslintComments from "@eslint-community/eslint-plugin-eslint-comments";
import prettier from "eslint-config-prettier";

export default defineConfig([
  globalIgnores([
    "**/dist/**",
    "**/build/**",
    "**/coverage/**",
    "**/node_modules/**",
    "**/.venv/**",
    "packages/backend/engine/.venv/**",
    ".venv/**",
    ".archieve/**",
    "prototypes/**",
    "docs/**",
    "**/*.fixture.ts",
  ]),


  // Applies to every package.
  {
    linterOptions: { reportUnusedDisableDirectives: "error" },
  },
  js.configs.recommended,

  // TypeScript: strict, type-aware rules for all TS/TSX files.
  {
    files: ["**/*.{ts,tsx}"],
    extends: [tseslint.configs.strictTypeChecked],
    languageOptions: {
      parserOptions: {
        projectService: true,
        tsconfigRootDir: import.meta.dirname,
      },
    },
    rules: {
      // AGENTS.md bans: any, !., @ts-ignore, undescribed @ts-expect-error.
      "@typescript-eslint/no-unnecessary-condition": "off",
      "@typescript-eslint/no-unnecessary-type-conversion": "off",
      "@typescript-eslint/no-unnecessary-type-assertion": "off",
      "@typescript-eslint/no-confusing-void-expression": "off",
      "@typescript-eslint/no-misused-promises": "off",
      "@typescript-eslint/no-floating-promises": "off",
      "@typescript-eslint/restrict-template-expressions": "off",
      "@typescript-eslint/no-base-to-string": "off",
      "@typescript-eslint/require-await": "off",
      "@typescript-eslint/no-deprecated": "off",
      "@typescript-eslint/prefer-promise-reject-errors": "off",
      "@typescript-eslint/no-redundant-type-constituents": "off",
      "@typescript-eslint/no-unused-vars": ["error", { "argsIgnorePattern": "^_", "varsIgnorePattern": "^_" }],
      "@typescript-eslint/no-explicit-any": "error",
      "@typescript-eslint/no-non-null-assertion": "error",
      "@typescript-eslint/ban-ts-comment": [
        "error",
        {
          "ts-ignore": true,
          "ts-nocheck": true,
          "ts-expect-error": "allow-with-description",
          minimumDescriptionLength: 10,
        },
      ],
    },
  },

  // Plain JS/config files are not part of a tsconfig project.
  {
    files: ["**/*.{js,mjs,cjs}"],
    extends: [tseslint.configs.disableTypeChecked],
  },

  // Exceptions must be explained: `// eslint-disable-next-line <rule> -- EXCEPTION: <reason>`.
  {
    plugins: { "@eslint-community/eslint-comments": eslintComments },
    rules: {
      "@eslint-community/eslint-comments/require-description": "error",
      "@eslint-community/eslint-comments/no-unlimited-disable": "error",
      "@eslint-community/eslint-comments/disable-enable-pair": "error",
    },
  },

  // Backend: Node runtime, structured logging only.
  {
    files: ["packages/backend/**/*.{ts,js}"],
    languageOptions: { globals: globals.node },
    rules: {
      "no-console": "error", // use pino
    },
  },

  // Shared: runtime-neutral, no environment globals.
  {
    files: ["packages/shared/**/*.ts"],
    rules: {
      "no-console": "error",
    },
  },

  // Frontend: React, hooks, accessibility, bundle and token rules.
  {
    files: ["packages/frontend/**/*.{ts,tsx}"],
    extends: [
      react.configs.flat.recommended,
      react.configs.flat["jsx-runtime"],
      jsxA11y.flatConfigs.recommended,
    ],
    languageOptions: { globals: globals.browser },
    plugins: { "react-hooks": reactHooks },
    settings: { react: { version: "detect" } },
    rules: {
      "react-hooks/rules-of-hooks": "error",
      "react-hooks/exhaustive-deps": "warn",
      "react/prop-types": "off", // TypeScript covers props
      // Per-module react-bootstrap imports only.
      "no-restricted-imports": [
        "error",
        {
          paths: [
            {
              name: "react-bootstrap",
              message:
                "Import per module: import Button from 'react-bootstrap/Button'.",
            },
          ],
        },
      ],
      // JWTs must never live in browser storage.
      "no-restricted-globals": [
        "error",
        {
          name: "localStorage",
          message: "Never store tokens in browser storage.",
        },
        {
          name: "sessionStorage",
          message: "Never store tokens in browser storage.",
        },
      ],
    },
  },

  // Must be last: turns off formatting rules that conflict with Prettier.
  prettier,
]);
