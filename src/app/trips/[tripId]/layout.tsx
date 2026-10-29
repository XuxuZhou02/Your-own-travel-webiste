"use client";

import { useParams } from "next/navigation";
import { TripShell } from "@/components/TripShell";

export default function TripLayout({ children }: { children: React.ReactNode }) {
  const { tripId } = useParams<{ tripId: string }>();
  return <TripShell tripId={tripId}>{children}</TripShell>;
}
