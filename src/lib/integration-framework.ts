export type IntegrationProviderKey =
  | "weather"
  | "sportsengine"
  | "gamechanger"
  | "teamsnap"
  | "leagueapps"
  | "playmetrics"
  | "sprocketsports"
  | "hometeamsonline"
  | "csv"
  | "gameday_native"
  | "daktronics"
  | "stripe"
  | "notifications"
  | "streaming";

export type IntegrationAuthType = "api_key" | "oauth2" | "webhook" | "server_env" | "manual";
export type IntegrationConnectionStatus = "not_configured" | "credentials_missing" | "ready_to_connect" | "connected" | "sync_error" | "disconnected";
export type IntegrationSyncStatus = "pending" | "running" | "completed" | "failed" | "skipped";
export type IntegrationMode = "API_SYNC" | "WEBHOOK" | "FILE_IMPORT" | "LINK_OUT" | "MANUAL" | "NATIVE";
export type IntegrationApiSupportState = "LIVE" | "CREDENTIALS_REQUIRED" | "PARTNER_ACCESS_REQUIRED" | "SCAFFOLDED" | "LINK_OUT_ONLY" | "DISABLED";

export type IntegrationCredentialRequirement = {
  envVar: string;
  label: string;
  required: boolean;
  secret: boolean;
};

export type IntegrationProviderDefinition = {
  key: IntegrationProviderKey;
  name: string;
  category: "weather" | "schedule" | "scoreboard" | "payments" | "communications" | "streaming";
  authType: IntegrationAuthType;
  description: string;
  integrationMode: IntegrationMode;
  apiSupportState: IntegrationApiSupportState;
  enabled: boolean;
  supportedEntityTypes: string[];
  capabilities: Record<string, boolean | string>;
  externalDomains: string[];
  internalNotes: string;
  credentialRequirements: IntegrationCredentialRequirement[];
  supportsOAuth: boolean;
  supportsWebhooks: boolean;
  supportsManualSync: boolean;
  existingImplementation?: {
    routes: string[];
    services: string[];
    envVars: string[];
    databaseTables: string[];
  };
};

export type IntegrationProviderStatus = {
  provider: IntegrationProviderDefinition;
  status: IntegrationConnectionStatus;
  missingEnvVars: string[];
  configuredEnvVars: string[];
  message: string;
};

export const integrationPermissions = [
  "integrations.view",
  "integrations.create",
  "integrations.edit",
  "integrations.delete",
  "integrations.connect",
  "integrations.disconnect",
  "integrations.sync",
  "integrations.view_logs",
  "integrations.manage_credentials",
] as const;

export const integrationAdminRoleKeys = [
  "platform_admin",
  "organization_admin",
  "venue_director",
  "tournament_director",
  "league_director",
] as const;

export const integrationProviders: IntegrationProviderDefinition[] = [
  {
    authType: "server_env",
    category: "weather",
    credentialRequirements: [
      { envVar: "WEATHER_PROVIDER", label: "Weather provider", required: false, secret: false },
      { envVar: "OPENWEATHER_API_KEY", label: "OpenWeather API key", required: false, secret: true },
      { envVar: "WEATHER_API_KEY", label: "Weather API key fallback", required: false, secret: true },
    ],
    description: "Existing venue weather profile integration used by public venue and field pages.",
    integrationMode: "API_SYNC", apiSupportState: "LIVE", enabled: true,
    supportedEntityTypes: ["venue"], capabilities: { weather: true },
    externalDomains: ["api.openweathermap.org", "api.weather.gov"], internalNotes: "Operational weather only.",
    existingImplementation: {
      databaseTables: ["weather_profiles", "venues.latitude", "venues.longitude"],
      envVars: ["WEATHER_PROVIDER", "OPENWEATHER_API_KEY", "WEATHER_API_KEY"],
      routes: ["/api/weather", "/api/weather/venue/[venueId]"],
      services: ["src/lib/services/weather-live.ts", "src/lib/services/weather-profiles.ts"],
    },
    key: "weather",
    name: "Weather",
    supportsManualSync: false,
    supportsOAuth: false,
    supportsWebhooks: false,
  },
  {
    authType: "oauth2",
    category: "schedule",
    credentialRequirements: [
      { envVar: "SPORTSENGINE_CLIENT_ID", label: "Client ID", required: true, secret: false },
      { envVar: "SPORTSENGINE_CLIENT_SECRET", label: "Client secret", required: true, secret: true },
      { envVar: "SPORTSENGINE_REDIRECT_URI", label: "Redirect URI", required: true, secret: false },
      { envVar: "SPORTSENGINE_GRAPHQL_URL", label: "GraphQL URL", required: true, secret: false },
    ],
    description: "SportsEngine schedule/events provider. Ready for OAuth credentials; no fake schedule data is generated.",
    integrationMode: "API_SYNC", apiSupportState: "CREDENTIALS_REQUIRED", enabled: true,
    supportedEntityTypes: ["organization", "season", "team", "participant", "event", "venue", "tournament"],
    capabilities: { schedules: true, games: true, practices: true, registration_link: true, payment_account_link: true },
    externalDomains: ["sportsengine.com", "www.sportsengine.com", "user.sportngin.com"],
    internalNotes: "Registration, dues, forms, and account management remain SportsEngine link-outs.",
    key: "sportsengine",
    name: "SportsEngine",
    supportsManualSync: true,
    supportsOAuth: true,
    supportsWebhooks: true,
  },
  { authType: "oauth2", category: "schedule", credentialRequirements: [], description: "Scorebook and game link-out. Structured ingestion is disabled until legitimate API access exists.", key: "gamechanger", name: "GameChanger", supportsManualSync: false, supportsOAuth: false, supportsWebhooks: false, integrationMode: "LINK_OUT", apiSupportState: "LINK_OUT_ONLY", enabled: true, supportedEntityTypes: ["team", "event", "live_source"], capabilities: { scorebook_link: true, roster_link: true, live_data: false }, externalDomains: ["gc.com", "gamechanger.io", "web.gc.com"], internalNotes: "GameDay does not rebuild GameChanger scoring or claim unsupported ingestion." },
  { authType: "oauth2", category: "schedule", credentialRequirements: [], description: "Team and schedule link-out; API sync awaits partner access.", key: "teamsnap", name: "TeamSnap", supportsManualSync: false, supportsOAuth: true, supportsWebhooks: false, integrationMode: "LINK_OUT", apiSupportState: "PARTNER_ACCESS_REQUIRED", enabled: false, supportedEntityTypes: ["team", "participant", "event"], capabilities: { team_link: true, schedule_link: true, api_sync: false }, externalDomains: ["teamsnap.com", "go.teamsnap.com"], internalNotes: "No fake parity." },
  { authType: "api_key", category: "schedule", credentialRequirements: [], description: "League and registration link-out; API sync awaits partner access.", key: "leagueapps", name: "LeagueApps", supportsManualSync: false, supportsOAuth: false, supportsWebhooks: false, integrationMode: "LINK_OUT", apiSupportState: "PARTNER_ACCESS_REQUIRED", enabled: false, supportedEntityTypes: ["organization", "season", "team", "event"], capabilities: { league_link: true, schedule_link: true, registration_link: true, api_sync: false }, externalDomains: ["leagueapps.com"], internalNotes: "Registration remains provider-owned." },
  { authType: "oauth2", category: "schedule", credentialRequirements: [], description: "Team-management link-out awaiting partner access.", key: "playmetrics", name: "PlayMetrics", supportsManualSync: false, supportsOAuth: true, supportsWebhooks: false, integrationMode: "LINK_OUT", apiSupportState: "PARTNER_ACCESS_REQUIRED", enabled: false, supportedEntityTypes: ["team", "participant", "event"], capabilities: { team_link: true, api_sync: false }, externalDomains: ["playmetrics.com"], internalNotes: "No API sync is claimed." },
  { authType: "oauth2", category: "schedule", credentialRequirements: [], description: "League link-out awaiting partner access.", key: "sprocketsports", name: "Sprocket Sports", supportsManualSync: false, supportsOAuth: true, supportsWebhooks: false, integrationMode: "LINK_OUT", apiSupportState: "PARTNER_ACCESS_REQUIRED", enabled: false, supportedEntityTypes: ["organization", "team", "event"], capabilities: { league_link: true, registration_link: true, api_sync: false }, externalDomains: ["sprocketsports.com"], internalNotes: "Registration remains provider-owned." },
  { authType: "manual", category: "schedule", credentialRequirements: [], description: "Public-feed and league-site link-out capability.", key: "hometeamsonline", name: "HomeTeamsOnline", supportsManualSync: true, supportsOAuth: false, supportsWebhooks: false, integrationMode: "LINK_OUT", apiSupportState: "LINK_OUT_ONLY", enabled: true, supportedEntityTypes: ["team", "event"], capabilities: { schedule_link: true, public_feed: "conditional" }, externalDomains: ["hometeamsonline.com"], internalNotes: "Feed imports use the shared normalization pipeline." },
  { authType: "manual", category: "schedule", credentialRequirements: [], description: "No-credential CSV or manual schedule import through the canonical pipeline.", key: "csv", name: "CSV / Manual Import", supportsManualSync: true, supportsOAuth: false, supportsWebhooks: false, integrationMode: "FILE_IMPORT", apiSupportState: "LIVE", enabled: true, supportedEntityTypes: ["team", "participant", "event", "venue"], capabilities: { teams: true, participants: "minimal", schedules: true, venues: true }, externalDomains: [], internalNotes: "Uses shared validation, identity, precedence, and change rules." },
  { authType: "manual", category: "schedule", credentialRequirements: [], description: "GameDay-owned canonical operations and enrichment.", key: "gameday_native", name: "GameDay Native", supportsManualSync: false, supportsOAuth: false, supportsWebhooks: false, integrationMode: "NATIVE", apiSupportState: "LIVE", enabled: true, supportedEntityTypes: ["organization", "season", "team", "participant", "event", "venue", "playable_space", "tournament", "live_source"], capabilities: { canonical_operations: true, venue_enrichment: true, family_projection: true }, externalDomains: [], internalNotes: "Native operational state and explicit overrides have highest applicable authority." },
  {
    authType: "server_env",
    category: "scoreboard",
    credentialRequirements: [{ envVar: "DAKTRONICS_ADAPTER_TOKEN", label: "Local adapter token", required: true, secret: true }],
    description: "Read-only Daktronics scoreboard feed receiver for local venue adapters. GameDay OS never sends physical scoreboard control commands in this phase.",
    integrationMode: "WEBHOOK", apiSupportState: "CREDENTIALS_REQUIRED", enabled: true,
    supportedEntityTypes: ["event", "live_source"], capabilities: { scores_read_only: true },
    externalDomains: [], internalNotes: "Inbound read-only adapter. No physical scoreboard control commands.",
    key: "daktronics",
    name: "Daktronics",
    supportsManualSync: false,
    supportsOAuth: false,
    supportsWebhooks: true,
  },
  { authType: "api_key", category: "payments", credentialRequirements: [{ envVar: "STRIPE_SECRET_KEY", label: "Stripe secret key", required: true, secret: true }], description: "Disabled framework entry. Family 2.0B does not add payment workflows.", key: "stripe", name: "Stripe", supportsManualSync: false, supportsOAuth: false, supportsWebhooks: true, integrationMode: "LINK_OUT", apiSupportState: "DISABLED", enabled: false, supportedEntityTypes: [], capabilities: {}, externalDomains: ["stripe.com", "checkout.stripe.com"], internalNotes: "Out of scope for Family; no registration or payment implementation." },
  { authType: "manual", category: "communications", credentialRequirements: [], description: "Notification delivery framework for future email, SMS, and push providers.", key: "notifications", name: "Notifications", supportsManualSync: false, supportsOAuth: false, supportsWebhooks: true, integrationMode: "MANUAL", apiSupportState: "SCAFFOLDED", enabled: false, supportedEntityTypes: [], capabilities: {}, externalDomains: [], internalNotes: "Not a Family provider source." },
  { authType: "manual", category: "streaming", credentialRequirements: [], description: "Streaming provider framework for approved external live sources.", key: "streaming", name: "Streaming", supportsManualSync: true, supportsOAuth: false, supportsWebhooks: true, integrationMode: "LINK_OUT", apiSupportState: "SCAFFOLDED", enabled: false, supportedEntityTypes: ["live_source"], capabilities: { live_source_link: true }, externalDomains: [], internalNotes: "No custom streaming CDN." },
];

export function getIntegrationProvider(providerKey: string) {
  return integrationProviders.find((provider) => provider.key === providerKey) ?? null;
}

export function maskCredential(value: string | null | undefined) {
  if (!value) return "Not set";
  if (value.length <= 4) return "••••";
  return `${value.slice(0, 2)}••••${value.slice(-2)}`;
}

export function getProviderEnvStatus(provider: IntegrationProviderDefinition, env: Record<string, string | undefined> = process.env): IntegrationProviderStatus {
  const missingEnvVars = provider.credentialRequirements.filter((credential) => credential.required && !env[credential.envVar]).map((credential) => credential.envVar);
  const configuredEnvVars = provider.credentialRequirements.filter((credential) => Boolean(env[credential.envVar])).map((credential) => credential.envVar);

  if (provider.key === "weather") {
    const hasOpenWeather = Boolean(env.OPENWEATHER_API_KEY || env.WEATHER_API_KEY);
    const providerName = env.WEATHER_PROVIDER || "openweather";
    return {
      configuredEnvVars,
      missingEnvVars: providerName === "national_weather_service" ? [] : hasOpenWeather ? [] : ["OPENWEATHER_API_KEY"],
      message: providerName === "national_weather_service" || hasOpenWeather ? "Existing Weather integration is configured." : "Weather integration is registered, but OpenWeather credentials are missing unless using National Weather Service.",
      provider,
      status: providerName === "national_weather_service" || hasOpenWeather ? "connected" : "credentials_missing",
    };
  }

  if (!provider.enabled || provider.apiSupportState === "DISABLED") {
    return { configuredEnvVars, missingEnvVars: [], message: provider.internalNotes, provider, status: "not_configured" };
  }

  if (provider.integrationMode === "LINK_OUT") {
    return { configuredEnvVars, missingEnvVars: [], message: "Safe external link capability. No structured API sync is claimed.", provider, status: "not_configured" };
  }

  if (provider.integrationMode === "FILE_IMPORT" || provider.integrationMode === "NATIVE") {
    return { configuredEnvVars, missingEnvVars: [], message: "Available without provider credentials.", provider, status: "connected" };
  }

  if (missingEnvVars.length > 0) {
    return { configuredEnvVars, missingEnvVars, message: `Missing ${missingEnvVars.join(", ")}.`, provider, status: "credentials_missing" };
  }

  if (provider.credentialRequirements.length > 0) {
    return { configuredEnvVars, missingEnvVars, message: "Credentials are present. Ready to start provider connection.", provider, status: "ready_to_connect" };
  }

  return { configuredEnvVars, missingEnvVars, message: "Provider definition is available. Add credentials or connector implementation when ready.", provider, status: "not_configured" };
}

export function canRoleManageIntegrations(roleKey: string) {
  return integrationAdminRoleKeys.some((allowedRole) => allowedRole === roleKey);
}
