import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { buildPrivateMetadata } from "@/lib/seo";

export const metadata: Metadata = buildPrivateMetadata("Boreal Desktop");

export default function DesktopDownloadAliasPage() {
  redirect("/download/boreal-desktop");
}
