import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "NLSA Operations Demo",
  description: "Private synthetic soccer operations demonstration.",
};

export default function NlsaDemoLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <div className="min-h-screen overflow-x-hidden bg-slate-50 text-slate-950">{children}</div>;
}
