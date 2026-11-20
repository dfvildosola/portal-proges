// Ajustes de Next.js para la web de Proges.
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // @proges/contrato viene de otra carpeta del monorepo y se publica como TypeScript sin compilar:
  // Next tiene que compilarlo junto con la web.
  transpilePackages: ["@proges/contrato"],
  experimental: {
    serverActions: {
      // Las fotos y los PDF suben por una server action (la web se los pasa a la API). El tope por
      // defecto es 1 MB; la API acepta hasta 25 MB por archivo.
      bodySizeLimit: "25mb",
    },
    // Antes de llegar a la acción, el proxy (proxy.ts) guarda en memoria una copia del cuerpo de
    // cada petición, y por defecto corta la copia a los 10 MB: un PDF grande llegaría truncado.
    proxyClientMaxBodySize: "25mb",
  },
};

export default nextConfig;
