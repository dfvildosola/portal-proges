// El portero de la web: corre antes de cada página y pide sesión de Clerk.
// En esta versión de Next.js lo que antes se llamaba «middleware» se llama «proxy».
//
// Aquí solo se comprueba que haya alguien con sesión. Si esa persona tiene permiso para estar en
// el portal (una cuenta activa en Proges) lo decide la API: la web le pregunta con GET /v1/yo y, si
// responde 403, manda a /sin-acceso (ver lib/api.ts).
import { clerkMiddleware } from "@clerk/nextjs/server";

// Lo único que se ve sin sesión: la pantalla de entrar (y sus pasos, que cuelgan de /entrar).
// Se compara la dirección a mano: `createRouteMatcher` de Clerk está obsoleto.
const esPublica = (ruta: string) => ruta === "/entrar" || ruta.startsWith("/entrar/");

export default clerkMiddleware(
  async (auth, request) => {
    if (esPublica(request.nextUrl.pathname)) return;
    // Sin sesión de Clerk, manda a /entrar (la dirección va en las opciones de abajo).
    await auth.protect();
  },
  // En código y no en .env: así funciona igual en Vercel y en el Mac.
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
