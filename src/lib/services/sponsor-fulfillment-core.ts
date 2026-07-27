// Revenue Engine — sponsor fulfillment core (pure, dependency-free).
//
// Turns a sold sponsor campaign (contracted asset quantities) into automated,
// PROVABLE delivery: each game the campaign covers fulfills its sponsor assets
// as it moves through the game lifecycle, and the game's real
// game.started / game.final timestamps (from the Connected Game Engine ledger)
// are the delivery proof. Everything here is IO-free so it is unit-testable;
// sponsor-campaigns.ts does the loading and calls these.

export type SponsorAssetType =
  | "scoreboard_logo"
  | "pregame_announcement"
  | "final_score_graphic"
  | "livestream_bumper"
  | "field_signage";

// When each asset fulfills, and how many placements per game it yields.
type AssetSpec = {
  label: string;
  description: string;
  trigger: "started" | "final"; // which lifecycle milestone delivers it
  perGame: number;
};

export const SPONSOR_ASSET_CATALOG: Record<SponsorAssetType, AssetSpec> = {
  scoreboard_logo: { label: "Scoreboard logo rotation", description: "Sponsor logo on the field scoreboard/scorebug while the game is live.", trigger: "started", perGame: 2 },
  pregame_announcement: { label: "Pre-game PA announcement", description: "Sponsor read announced as the game goes live.", trigger: "started", perGame: 1 },
  field_signage: { label: "Field signage impression", description: "Sponsor signage exposed to attendees for each game on the field.", trigger: "started", perGame: 1 },
  livestream_bumper: { label: "Livestream bumper", description: "Sponsor bumper attached to the game's livestream.", trigger: "started", perGame: 1 },
  final_score_graphic: { label: "Sponsored final-score graphic", description: "Sponsor lockup on the final-score graphic when the game ends.", trigger: "final", perGame: 1 },
};

export const SPONSOR_ASSET_TYPES = Object.keys(SPONSOR_ASSET_CATALOG) as SponsorAssetType[];

export function isSponsorAssetType(value: string): value is SponsorAssetType {
  return value in SPONSOR_ASSET_CATALOG;
}

// Sellable bundles — starting points for the campaign form; quantities are
// editable and become the campaign's contracted totals.
export type PackageTemplate = { key: string; name: string; contracted: Partial<Record<SponsorAssetType, number>> };

export const PACKAGE_TEMPLATES: PackageTemplate[] = [
  { key: "weekend", name: "Weekend Sponsor Package", contracted: { scoreboard_logo: 144, pregame_announcement: 72, final_score_graphic: 72, livestream_bumper: 36 } },
  { key: "field", name: "Field Sponsor", contracted: { scoreboard_logo: 288, field_signage: 144, final_score_graphic: 72 } },
  { key: "game_of_day", name: "Game of the Day", contracted: { pregame_announcement: 1, scoreboard_logo: 4, final_score_graphic: 1 } },
];

// A game the campaign covers, with the lifecycle milestones it actually reached.
// startedAt/finalAt are ISO timestamps from the engine ledger, or null if the
// game never reached that milestone (so nothing was delivered for it).
export type CoveredGame = {
  id: string;
  label: string;
  startedAt: string | null;
  finalAt: string | null;
};

export type AssetDelivery = { assetType: SponsorAssetType; gameId: string; gameLabel: string; quantity: number; occurredAt: string };

// The automated fulfillment for a single game: which sponsor placements fired,
// how many, and when — driven purely by the milestones the game reached.
export function fulfillmentForGame(game: CoveredGame): AssetDelivery[] {
  const deliveries: AssetDelivery[] = [];
  for (const assetType of SPONSOR_ASSET_TYPES) {
    const spec = SPONSOR_ASSET_CATALOG[assetType];
    const occurredAt = spec.trigger === "started" ? game.startedAt : game.finalAt;
    if (!occurredAt) continue;
    deliveries.push({ assetType, gameId: game.id, gameLabel: game.label, quantity: spec.perGame, occurredAt });
  }
  return deliveries;
}

// What a number in this report actually rests on. A sponsor conversation lives
// or dies on this distinction, so we never present a modeled figure as a
// counted one.
export type MetricBasis = "verified" | "modeled";

export const BASIS_LABEL: Record<MetricBasis, string> = {
  verified: "Verified",
  modeled: "Modeled",
};

export const BASIS_EXPLANATION: Record<MetricBasis, string> = {
  verified: "Counted directly from the game record or from tracked page events.",
  modeled:
    "A verified game milestone multiplied by this asset's configured per-game rate. The game is proven; the placement count is derived from it — we don't claim to have watched every rotation.",
};

// Under-delivery inside this margin isn't worth a make-good conversation
// (rounding on a 300-placement package). A POLICY DEFAULT, not a law — the exact
// shortfall is always reported regardless, so the venue can decide.
export const MAKE_GOOD_TOLERANCE = 0.98;

export type ProofLine = {
  assetType: SponsorAssetType;
  label: string;
  contracted: number;
  delivered: number;
  deliveryRate: number; // 0..1 (or >1 when over-delivered); 1 when nothing contracted
  // Contracted-but-undelivered placements. Always exact; 0 for bonus lines
  // (nothing was sold, so nothing can be owed).
  shortfall: number;
  underDelivered: boolean;
  // Placement counts are modeled (verified milestone x configured rate).
  basis: MetricBasis;
};

// What the venue owes this sponsor if the campaign fell short of what was sold.
export type MakeGood = {
  required: boolean;
  totalShortfall: number;
  lines: Array<{ assetType: SponsorAssetType; label: string; contracted: number; delivered: number; shortfall: number }>;
  recommendation: string;
};

export type ProofOfPerformance = {
  contractedTotal: number;
  deliveredTotal: number;
  deliveryRate: number; // delivered / contracted across contracted assets, capped at 1 for the headline
  gamesCovered: number;
  gamesConnected: number; // games that reached at least "started"
  lines: ProofLine[];
  timeline: Array<{ assetType: SponsorAssetType; label: string; gameLabel: string; occurredAt: string }>;
  impressions: number;
  clicks: number;
  ctr: number; // 0..1
  makeGood: MakeGood;
  // Per-figure provenance for the report footer / column headers.
  basis: {
    placements: MetricBasis; // contracted vs delivered counts
    games: MetricBasis; // games covered / connected
    digital: MetricBasis; // impressions / clicks
  };
};

export type ProofInput = {
  contracted: Partial<Record<SponsorAssetType, number>>;
  games: CoveredGame[];
  impressions?: number;
  clicks?: number;
  timelineLimit?: number;
};

function rate(delivered: number, contracted: number): number {
  if (contracted <= 0) return delivered > 0 ? 1 : 1; // nothing sold -> treat as fully met
  return delivered / contracted;
}

// Aggregates automated per-game fulfillment into a sponsor-facing
// Proof-of-Performance: contracted vs delivered per asset, delivery rate, games
// connected, a delivery timeline, and folded-in digital impressions/clicks.
export function buildProofOfPerformance(input: ProofInput): ProofOfPerformance {
  const deliveries = input.games.flatMap(fulfillmentForGame);

  const deliveredByAsset = new Map<SponsorAssetType, number>();
  for (const d of deliveries) {
    deliveredByAsset.set(d.assetType, (deliveredByAsset.get(d.assetType) ?? 0) + d.quantity);
  }

  // Lines cover every contracted asset (delivery against what was sold); also
  // surface any asset delivered but not contracted as bonus (contracted 0).
  const assetTypes = new Set<SponsorAssetType>([
    ...(Object.keys(input.contracted) as SponsorAssetType[]).filter(isSponsorAssetType),
    ...deliveredByAsset.keys(),
  ]);

  const lines: ProofLine[] = [...assetTypes]
    .sort((a, b) => SPONSOR_ASSET_TYPES.indexOf(a) - SPONSOR_ASSET_TYPES.indexOf(b))
    .map((assetType) => {
      const contracted = input.contracted[assetType] ?? 0;
      const delivered = deliveredByAsset.get(assetType) ?? 0;
      // Only contracted inventory can be owed — a bonus placement nobody bought
      // can't be "short".
      const shortfall = contracted > 0 ? Math.max(0, contracted - delivered) : 0;
      return {
        assetType,
        label: SPONSOR_ASSET_CATALOG[assetType].label,
        contracted,
        delivered,
        deliveryRate: rate(delivered, contracted),
        shortfall,
        underDelivered: shortfall > 0,
        basis: "modeled" as MetricBasis,
      };
    });

  const contractedTotal = lines.reduce((sum, l) => sum + l.contracted, 0);
  // Delivery against what was SOLD — bonus (uncontracted) placements don't
  // inflate the headline rate; they're surfaced separately as bonus lines.
  const deliveredTotalContracted = lines.reduce((sum, l) => sum + (l.contracted > 0 ? Math.min(l.delivered, l.contracted) : 0), 0);
  const deliveredTotal = lines.reduce((sum, l) => sum + l.delivered, 0);

  const timeline = deliveries
    .slice()
    .sort((a, b) => a.occurredAt.localeCompare(b.occurredAt))
    .slice(0, input.timelineLimit ?? 50)
    .map((d) => ({ assetType: d.assetType, label: SPONSOR_ASSET_CATALOG[d.assetType].label, gameLabel: d.gameLabel, occurredAt: d.occurredAt }));

  const impressions = input.impressions ?? 0;
  const clicks = input.clicks ?? 0;
  const deliveryRate = contractedTotal > 0 ? Math.min(1, deliveredTotalContracted / contractedTotal) : 1;

  // Make-good: what's still owed against what was sold. Reported exactly, with
  // the tolerance deciding only whether we RECOMMEND the conversation.
  const shortLines = lines
    .filter((line) => line.shortfall > 0)
    .map((line) => ({ assetType: line.assetType, label: line.label, contracted: line.contracted, delivered: line.delivered, shortfall: line.shortfall }));
  const totalShortfall = shortLines.reduce((sum, line) => sum + line.shortfall, 0);
  const required = totalShortfall > 0 && deliveryRate < MAKE_GOOD_TOLERANCE;

  const makeGood: MakeGood = {
    required,
    totalShortfall,
    lines: shortLines,
    recommendation: required
      ? `Delivered ${Math.round(deliveryRate * 100)}% of contracted inventory. Offer ${totalShortfall} make-good placement${totalShortfall === 1 ? "" : "s"} (or a credit) before renewal — lead with it rather than waiting to be asked.`
      : totalShortfall > 0
        ? `Delivered ${Math.round(deliveryRate * 100)}% of contracted inventory — ${totalShortfall} placement${totalShortfall === 1 ? "" : "s"} short, inside the ${Math.round((1 - MAKE_GOOD_TOLERANCE) * 100)}% tolerance. No make-good recommended; disclose it if asked.`
        : "Delivered in full against everything contracted. Nothing owed.",
  };

  return {
    contractedTotal,
    deliveredTotal,
    deliveryRate,
    gamesCovered: input.games.length,
    gamesConnected: input.games.filter((g) => g.startedAt).length,
    lines,
    timeline,
    impressions,
    clicks,
    ctr: impressions > 0 ? clicks / impressions : 0,
    makeGood,
    basis: { placements: "modeled", games: "verified", digital: "verified" },
  };
}
