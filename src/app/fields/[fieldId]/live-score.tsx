"use client";

import { useEffect, useState } from "react";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";

// Live score for the public field page, fed by the Connected Game Engine.
// Seeds from the server-rendered session score (kept in sync by the engine's
// legacy projection) and then subscribes to game_live_state changes over
// Supabase Realtime — so a scorekeeper tap or a Daktronics reading updates the
// QR field page with no refresh. Degrades to the static score if Realtime or
// the browser client is unavailable.
export function LiveScore({
  gameId,
  initialHome,
  initialAway,
  className,
  style,
}: Readonly<{ gameId: string; initialHome: number; initialAway: number; className?: string; style?: React.CSSProperties }>) {
  const [home, setHome] = useState(initialHome);
  const [away, setAway] = useState(initialAway);
  const [live, setLive] = useState(false);

  useEffect(() => {
    const supabase = getSupabaseBrowserClient();
    if (!supabase) return;
    const channel = supabase
      .channel("game-live-state-" + gameId)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "game_live_state", filter: "game_id=eq." + gameId },
        (payload) => {
          const row = payload.new as { score_home?: number | null; score_away?: number | null } | null;
          if (!row) return;
          if (typeof row.score_home === "number") setHome(row.score_home);
          if (typeof row.score_away === "number") setAway(row.score_away);
          setLive(true);
        }
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [gameId]);

  return (
    <p className={className} style={style}>
      {home}-{away}
      {live ? <span className="ml-2 align-middle text-xs font-bold text-emerald-300">● LIVE</span> : null}
    </p>
  );
}
