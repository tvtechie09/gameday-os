export function getPublicAppUrl() {
  return process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "") || "http://localhost:3000";
}

export function hasConfiguredPublicAppUrl() {
  return Boolean(process.env.NEXT_PUBLIC_APP_URL);
}

export function getPublicFieldUrl(fieldId: string) {
  return `${getPublicAppUrl()}/fields/${fieldId}`;
}
