// Carga el .env de la raíz del repo antes que nada, sin importar desde qué carpeta se corra
// el script. Si DATABASE_URL ya está puesta en el entorno, esa gana (dotenv no la pisa).
// Se importa primero en cada script: `import "./entorno";`
import { config } from "dotenv";
import { fileURLToPath } from "node:url";

config({ path: fileURLToPath(new URL("../../../.env", import.meta.url)), quiet: true });
