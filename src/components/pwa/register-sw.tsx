"use client";
import { useEffect } from "react";

/** Mendaftarkan service worker (hanya produksi). SW hanya menyediakan halaman offline —
 *  data pribadi siswa sengaja TIDAK disimpan di cache perangkat. */
export function RegisterSW() {
  useEffect(() => {
    if (process.env.NODE_ENV !== "production" || !("serviceWorker" in navigator)) return;
    navigator.serviceWorker.register("/sw.js", { scope: "/" }).catch(() => {});
  }, []);
  return null;
}
