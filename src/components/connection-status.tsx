"use client";

import { useEffect, useState } from "react";

export function ConnectionStatus() {
  const [offline, setOffline] = useState(false);

  useEffect(() => {
    const update = () => setOffline(!navigator.onLine);
    update();
    window.addEventListener("online", update);
    window.addEventListener("offline", update);
    return () => { window.removeEventListener("online", update); window.removeEventListener("offline", update); };
  }, []);

  if (!offline) return null;
  return <div className="fixed inset-x-3 top-3 z-[100] mx-auto max-w-md rounded-lg border border-amber-300 bg-amber-50 px-4 py-3 text-center text-sm font-black text-amber-950 shadow-lg" role="status">Connection lost. Changes cannot be saved right now.</div>;
}
