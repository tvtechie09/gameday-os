import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  canRoleManageIntegrations,
  getIntegrationProvider,
  getProviderEnvStatus,
  integrationPermissions,
  integrationProviders,
  maskCredential,
} from "../src/lib/integration-framework.ts";

describe("GameDay OS Integration Framework", () => {
  it("registers Weather as an existing working provider", () => {
    const weather = getIntegrationProvider("weather");
    assert.ok(weather);
    assert.deepEqual(weather.existingImplementation?.routes, ["/api/weather", "/api/weather/venue/[venueId]"]);
    assert.ok(weather.existingImplementation?.services.includes("src/lib/services/weather-live.ts"));
  });

  it("registers real provider definitions without mock adapters", () => {
    assert.deepEqual(integrationProviders.map((provider) => provider.key), [
      "weather",
      "sportsengine",
      "gamechanger",
      "teamsnap",
      "leagueapps",
      "daktronics",
      "stripe",
      "notifications",
      "streaming",
    ]);
    assert.equal(integrationProviders.some((provider) => provider.name.toLowerCase().includes("mock")), false);
  });

  it("defines admin-only integration permissions", () => {
    assert.deepEqual([...integrationPermissions], [
      "integrations.view",
      "integrations.create",
      "integrations.edit",
      "integrations.delete",
      "integrations.connect",
      "integrations.disconnect",
      "integrations.sync",
      "integrations.view_logs",
      "integrations.manage_credentials",
    ]);
    assert.equal(canRoleManageIntegrations("venue_director"), true);
    assert.equal(canRoleManageIntegrations("tournament_director"), true);
    assert.equal(canRoleManageIntegrations("coach"), false);
    assert.equal(canRoleManageIntegrations("parent"), false);
    assert.equal(canRoleManageIntegrations("fan"), false);
  });

  it("masks credentials and never returns raw secret values", () => {
    assert.equal(maskCredential("abcd1234"), "ab••••34");
    assert.equal(maskCredential("abc"), "••••");
    assert.equal(maskCredential(null), "Not set");
  });

  it("reports SportsEngine missing and ready-to-connect credential states accurately", () => {
    const sportsEngine = getIntegrationProvider("sportsengine");
    assert.ok(sportsEngine);
    const missing = getProviderEnvStatus(sportsEngine, {});
    assert.equal(missing.status, "credentials_missing");
    assert.deepEqual(missing.missingEnvVars, ["SPORTSENGINE_CLIENT_ID", "SPORTSENGINE_CLIENT_SECRET", "SPORTSENGINE_REDIRECT_URI", "SPORTSENGINE_GRAPHQL_URL"]);

    const ready = getProviderEnvStatus(sportsEngine, {
      SPORTSENGINE_CLIENT_ID: "client",
      SPORTSENGINE_CLIENT_SECRET: "secret",
      SPORTSENGINE_GRAPHQL_URL: "https://example.test/graphql",
      SPORTSENGINE_REDIRECT_URI: "https://example.test/callback",
    });
    assert.equal(ready.status, "ready_to_connect");
    assert.deepEqual(ready.missingEnvVars, []);
  });

  it("keeps SportsEngine as credential-ready instead of mocked", () => {
    const sportsEngine = getIntegrationProvider("sportsengine");
    assert.ok(sportsEngine);
    assert.equal(sportsEngine.description.includes("no fake schedule data"), true);
    assert.equal(sportsEngine.supportsOAuth, true);
    assert.equal(sportsEngine.supportsManualSync, true);
  });

  it("registers Daktronics as a read-only local adapter provider", () => {
    const daktronics = getIntegrationProvider("daktronics");
    assert.ok(daktronics);
    assert.equal(daktronics.supportsWebhooks, true);
    assert.equal(daktronics.description.includes("Read-only"), true);
    assert.deepEqual(daktronics.credentialRequirements.map((credential) => credential.envVar), ["DAKTRONICS_ADAPTER_TOKEN"]);
  });
});
