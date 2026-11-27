import js from "@eslint/js";
import globals from "globals";
import tseslint from "typescript-eslint";
import reactHooks from "eslint-plugin-react-hooks";

export default tseslint.config(
  {
    ignores: [
      "dist/**",
      "node_modules/**",
      "output/**",
      "public/**",
      "art/**",
      "scripts/**",
      "tests/**",
      "*.config.js",
      "postcss.config.js",
      "tailwind.config.js"
    ]
  },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    files: ["**/*.{ts,tsx}"],
    languageOptions: {
      globals: {
        ...globals.browser,
        ...globals.es2022
      }
    },
    plugins: {
      "react-hooks": reactHooks
    },
    rules: {
      // Catch real bugs without tripping over legacy game-engine style.
      "no-empty": ["error", { allowEmptyCatch: true }],
      "prefer-const": "warn",
      "@typescript-eslint/no-explicit-any": "off",
      "@typescript-eslint/no-this-alias": "off",
      "@typescript-eslint/no-unused-vars": [
        "warn",
        { argsIgnorePattern: "^_", varsIgnorePattern: "^_" }
      ],
      "react-hooks/rules-of-hooks": "error",
      "react-hooks/exhaustive-deps": "warn"
    }
  }
);
