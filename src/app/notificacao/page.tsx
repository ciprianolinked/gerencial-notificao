import type { Metadata } from "next";
import { SegmentPage } from "@/components/SegmentPage";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Notificação · Gerencial" };

export default function Page({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  return <SegmentPage tipo="notificacao" searchParams={searchParams} />;
}
