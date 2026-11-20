// Lint de todo el monorepo (la API y los paquetes): revisa el código buscando errores comunes
// antes de que lleguen a correr, como un corrector ortográfico para el código. Cada workspace
// corre `eslint .` en su carpeta y ESLint encuentra este archivo subiendo carpetas.
//
// Reglas: las recomendadas de typescript-eslint. legado/ (el portal viejo, solo para consultar)
// y lo que genera Prisma no se revisan.
import { defineConfig, globalIgnores } from "eslint/config";
import tseslint from "typescript-eslint";

export default defineConfig(
  globalIgnores(["legado/**", "**/node_modules/**", "**/generated/**", "**/dist/**", "**/.next/**"]),
  tseslint.configs.recommended,
  {
    rules: {
      // Una variable o un parámetro que empieza con _ está sin usar a propósito.
      "@typescript-eslint/no-unused-vars": ["error", { argsIgnorePattern: "^_", varsIgnorePattern: "^_" }],
    },
  },
);
