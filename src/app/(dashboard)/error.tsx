"use client";
import { ErrorState } from "@/components/ui/states";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

export default function DashboardError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <Card>
      <ErrorState
        message={process.env.NODE_ENV === "development" ? error.message : "Terjadi kesalahan saat memuat halaman. Coba muat ulang."}
        action={<Button variant="secondary" onClick={reset}>Coba lagi</Button>}
      />
    </Card>
  );
}
