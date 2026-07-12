export type IntegrationProviderKey =
  | "weather"
  | "sportsengine"
  | "gamechanger"
  | "teamsnap"
  | "leagueapps"
  | "daktronics"
  | "stripe"
  | "notifications"
  | "streaming";

export type IntegrationAuthType = "api_key" | "oauth2" | "webhook" | "server_env" | "manual";
export type IntegrationConnectionStatus = "not_configured" | "credentials_missing" | "ready_to_connect" | "connected" | "sync_error" | "disconnected";
export type IntegrationSyncStatus = "pending" | "running" | "completed" | "failed" | "skipped";

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
    key: "sportsengine",
    name: "SportsEngine",
    supportsManualSync: true,
    supportsOAuth: true,
    supportsWebhooks: true,
  },
  { authType: "oauth2", category: "schedule", credentialRequirements: [], description: "Future GameChanger schedule and scoring connector.", key: "gamechanger", name: "GameChanger", supportsManualSync: true, supportsOAuth: true, supportsWebhooks: true },
  { authType: "oauth2", category: "schedule", credentialRequirements: [], description: "Future TeamSnap team and schedule connector.", key: "teamsnap", name: "TeamSnap", supportsManualSync: true, supportsOAuth: true, supportsWebhooks: true },
  { authType: "api_key", category: "schedule", credentialRequirements: [], description: "Future LeagueApps league and registration connector.", key: "leagueapps", name: "LeagueApps", supportsManualSync: true, supportsOAuth: false, supportsWebhooks: true },
  {
    authType: "server_env",
    category: "scoreboard",
    credentialRequirements: [{ envVar: "DAKTRONICS_ADAPTER_TOKEN", label: "Local adapter token", required: true, secret: true }],
    description: "Read-only Daktronics scoreboard feed receiver for local venue adapters. GameDay OS never sends physical scoreboard control commands in this phase.",
    key: "daktronics",
    name: "Daktronics",
    supportsManualSync: false,
    supportsOAuth: false,
    supportsWebhooks: true,
  },
  { authType: "api_key", category: "payments", credentialRequirements: [{ envVar: "STRIPE_SECRET_KEY", label: "Stripe secret key", required: true, secret: true }], description: "Future payments and sponsorship billing provider.", key: "stripe", name: "Stripe", supportsManualSync: false, supportsOAuth: false, supportsWebhooks: true },
  { authType: "manual", category: "communications", credentialRequirements: [], description: "Notification delivery framework for future email, SMS, and push providers.", key: "notifications", name: "Notifications", supportsManualSync: false, supportsOAuth: false, supportsWebhooks: true },
  { authType: "manual", category: "streaming", credentialRequirements: [], description: "Streaming provider framework for SidelineHD, YouTube, Hudl, Pixellot, and venue streams.", key: "streaming", name: "Streaming", supportsManualSync: true, supportsOAuth: false, supportsWebhooks: true },
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
