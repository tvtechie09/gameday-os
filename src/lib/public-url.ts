export function getPublicAppUrl() {
  return process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "") || "http://localhost:3000";
}

export function hasConfiguredPublicAppUrl() {
  return Boolean(process.env.NEXT_PUBLIC_APP_URL);
}

export function publicAppUrlPointsToLocalhost() {
  const appUrl = getPublicAppUrl();
  return appUrl.includes("localhost") || appUrl.includes("127.0.0.1") || appUrl.includes("[::1]");
}

export function getPublicFieldUrl(fieldId: string) {
  return `${getPublicAppUrl()}/fields/${fieldId}`;
}

export function getPublicScoreboardUrl(sessionId: string) {
  return `${getPublicAppUrl()}/scoreboard/${sessionId}`;
}

export function getPublicFieldScoreboardUrl(fieldId: string) {
  return `${getPublicAppUrl()}/scoreboard/field/${fieldId}`;
}

export function getPublicVenueUrl(venueId: string) {
  return `${getPublicAppUrl()}/venues/${venueId}`;
}

export function getPublicVenueDisplayUrl(venueId: string) {
  return `${getPublicAppUrl()}/display/venue/${venueId}`;
}
