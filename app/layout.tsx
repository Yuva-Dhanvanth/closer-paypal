import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Closer | Autonomous AI Sales & Collections Agent",
  description:
    "AI sales and collections agent for small sellers taking made-to-order work through DMs. Negotiates within rules, collects PayPal deposits, chases balances, and handles refunds.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="h-full">
      <body className="h-full antialiased">{children}</body>
    </html>
  );
}
