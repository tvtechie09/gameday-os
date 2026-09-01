export type LiveWeatherErrorCode = "missing_venue_id" | "venue_not_found" | "missing_coordinates" | "missing_api_key" | "provider_failure";

export class LiveWeatherError extends Error {
  code: LiveWeatherErrorCode;
  status: number;

  constructor(code: LiveWeatherErrorCode, message: string, status: number) {
    super(message);
    this.code = code;
    this.status = status;
  }
}

// Provider configuration and response details are useful to operators and API
// logs, but should not leak into public venue/field cards. Keep the fallback
// deliberately neutral so missing optional weather configuration never makes
// the core game-day experience look broken.
export function publicWeatherErrorMessage(error: unknown) {
  if (error instanceof LiveWeatherError && error.code === "missing_coordinates") {
    return "Live weather is not available for this venue right now.";
  }

  return "Live weather is temporarily unavailable.";
}
