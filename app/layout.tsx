import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Miva — Controle de Vendas',
  description: 'Dashboard de vendas para semijoias',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR">
      <body>{children}</body>
    </html>
  );
}
