import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "GO Transit Departure Board",
  description: "Real-time GO Transit departures",
};

export default function GOLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
