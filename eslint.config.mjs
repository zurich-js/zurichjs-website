import { defineConfig } from "eslint/config";
import nextCoreWebVitals from "eslint-config-next/core-web-vitals";
import nextTypescript from "eslint-config-next/typescript";
import importPlugin from "eslint-plugin-import";
import oxlint from "eslint-plugin-oxlint";

export default defineConfig([
  {
    ignores: [".vercel/**"],
  },
  {
    extends: [...nextCoreWebVitals, ...nextTypescript],

    plugins: {
      import: importPlugin,
    },

    rules: {
      "import/order": [
        "error",
        {
          groups: ["builtin", "external", "internal", "parent", "sibling", "index"],
          "newlines-between": "always",

          alphabetize: {
            order: "asc",
            caseInsensitive: true,
          },
        },
      ],
      "@next/next/no-img-element": "off",
      "react-hooks/set-state-in-effect": "off",
    },
  },
  ...oxlint.configs["flat/recommended"],
]);
