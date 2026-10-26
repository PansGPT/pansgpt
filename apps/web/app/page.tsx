import type { Metadata } from "next";
import { ComingSoon } from "@/components/public/coming-soon";

export const metadata: Metadata = {
  title: "PansGPT — A little more understanding",
  description:
    "Our new website is on the way. Your pharmacy study workspace is already here — log in or create your PansGPT account.",
};

export default function HomePage(): React.ReactElement {
  return <ComingSoon />;
}
