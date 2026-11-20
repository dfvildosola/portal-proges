// La raíz de toda la web: tipografías, sesión de Clerk, globitos de ayuda y los metadatos.
import { ClerkProvider } from "@clerk/nextjs";
import type { Metadata, Viewport } from "next";
import { JetBrains_Mono, Plus_Jakarta_Sans } from "next/font/google";
import "./globals.css";
import { ProveedorDeTooltips } from "@/componentes/ui/tooltip";

// Jakarta para todo el texto; JetBrains Mono solo para cifras y datos técnicos (montos, fechas,
// números de orden), como en la maqueta.
const jakarta = Plus_Jakarta_Sans({ variable: "--font-jakarta", subsets: ["latin"], display: "swap" });
const jetbrains = JetBrains_Mono({ variable: "--font-jetbrains", subsets: ["latin"], display: "swap" });

export const metadata: Metadata = {
  title: { default: "Proges", template: "%s · Proges" },
  description: "El portal de Proges: servicios, propiedades y su historia.",
};

// `cover` deja usar toda la pantalla en celulares con muesca; el layout respeta las zonas seguras.
export const viewport: Viewport = { width: "device-width", initialScale: 1, viewportFit: "cover" };

export default function LayoutRaiz({ children }: { children: React.ReactNode }) {
  return (
    // Las direcciones de Clerk van aquí y no en .env: las variables de .env no existen en Vercel.
    <ClerkProvider signInUrl="/entrar" signInFallbackRedirectUrl="/" afterSignOutUrl="/entrar">
      <html lang="es" className={`${jakarta.variable} ${jetbrains.variable}`}>
        <body className="min-h-dvh">
          <ProveedorDeTooltips delay={300}>{children}</ProveedorDeTooltips>
        </body>
      </html>
    </ClerkProvider>
  );
}
