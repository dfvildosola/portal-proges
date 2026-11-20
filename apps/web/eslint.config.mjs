// Lint de la web: las reglas de Next.js (core-web-vitals y TypeScript).
//
// Este archivo es solo de apps/web: ESLint usa el archivo más cercano hacia arriba, así que
// `eslint .` corrido dentro de apps/web usa este, y en la API y los paquetes sigue mandando el de
// la raíz (eslint.config.mjs). Los dos no se mezclan.
import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

export default defineConfig([
  ...nextVitals,
  ...nextTs,
  globalIgnores([".next/**", "out/**", "build/**", "next-env.d.ts", "node_modules/**"]),
  {
    rules: {
      // Una variable o un parámetro que empieza con _ está sin usar a propósito.
      "@typescript-eslint/no-unused-vars": ["error", { argsIgnorePattern: "^_", varsIgnorePattern: "^_" }],
    },
  },
]);
