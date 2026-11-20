// El portero del portal: corre antes de cada página y pide sesión de Clerk.
// En esta versión de Next.js lo que antes se llamaba «middleware» se llama «proxy».
//
// Aquí solo se comprueba que haya alguien con sesión. Si esa persona tiene permiso
// para estar en el portal (un Usuario activo en la base) lo mira src/lib/sesion.ts,
// porque el proxy no es el lugar para consultar la base de datos.
import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";

// Lo único que se ve sin sesión: la pantalla de entrar.
const esPublica = createRouteMatcher(["/entrar(.*)"]);

export default clerkMiddleware(
  async (auth, request) => {
    if (esPublica(request)) return;
    // Sin sesión de Clerk, manda a /entrar (la dirección va en las opciones de abajo).
    await auth.protect();
  },
  // En código y no en .env: las variables de .env no existen en Vercel.
  { signInUrl: "/entrar" },
);

export const config = {
  matcher: [
    // Todo menos los archivos internos de Next y los archivos estáticos (imágenes, íconos, etc.).
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    // Y siempre las rutas de API.
    "/(api|trpc)(.*)",
  ],
};
