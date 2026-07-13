// Provider-ready SMS via Twilio. Sends when TWILIO_ACCOUNT_SID /
// TWILIO_AUTH_TOKEN / TWILIO_FROM are configured; otherwise records the send as
// skipped (no crash), mirroring the Resend email pattern in alert-delivery.ts.

export function smsConfigured(): boolean {
  return Boolean(process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN && process.env.TWILIO_FROM);
}

// Normalize to E.164. Assumes US (+1) when no country code is given. Returns
// null for anything that can't be a valid number so we skip rather than send.
export function normalizePhone(raw: string | null | undefined): string | null {
  if (!raw) return null;
  const trimmed = raw.trim();
  if (!trimmed) return null;
  const hasPlus = trimmed.startsWith("+");
  const digits = trimmed.replace(/[^0-9]/g, "");
  if (digits.length < 10) return null;
  if (hasPlus) return "+" + digits;
  if (digits.length === 10) return "+1" + digits;
  if (digits.length === 11 && digits.startsWith("1")) return "+" + digits;
  return "+" + digits;
}

export type SmsResult = { sent: boolean; provider: string; error: string };

export async function sendSms(to: string, body: string): Promise<SmsResult> {
  const sid = process.env.TWILIO_ACCOUNT_SID;
  const token = process.env.TWILIO_AUTH_TOKEN;
  const from = process.env.TWILIO_FROM;
  if (!sid || !token || !from) return { sent: false, provider: "", error: "" };
  const normalized = normalizePhone(to);
  if (!normalized) return { sent: false, provider: "twilio", error: "invalid phone number" };
  try {
    const response = await fetch("https://api.twilio.com/2010-04-01/Accounts/" + encodeURIComponent(sid) + "/Messages.json", {
      method: "POST",
      headers: {
        authorization: "Basic " + Buffer.from(sid + ":" + token).toString("base64"),
        "content-type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({ To: normalized, From: from, Body: body.slice(0, 1500) }).toString(),
    });
    if (!response.ok) {
      const detail = await response.text().catch(() => "");
      return { sent: false, provider: "twilio", error: ("HTTP " + response.status + " " + detail).slice(0, 300) };
    }
    return { sent: true, provider: "twilio", error: "" };
  } catch (error) {
    return { sent: false, provider: "twilio", error: error instanceof Error ? error.message.slice(0, 300) : "send failed" };
  }
}
