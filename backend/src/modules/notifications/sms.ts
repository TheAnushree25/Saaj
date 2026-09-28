import { env } from "../../config/env.ts";
import { logger } from "../../lib/logger.ts";

/** Sends a one-time code by SMS. In development it is printed in the terminal instead. */
export async function sendOtpSms(phone: string, code: string): Promise<void> {
  if (env.SMS_PROVIDER === "console") {
    logger.warn(`[dev SMS] Code for ${phone}: ${code}`);
    return;
  }

  // MSG91's Flow API. Indian SMS templates must be DLT-registered first, and the
  // variable name ("otp") must match the one in your approved template.
  const response = await fetch("https://control.msg91.com/api/v5/flow", {
    method: "POST",
    headers: {
      authkey: env.MSG91_AUTH_KEY ?? "",
      "content-type": "application/json",
      accept: "application/json",
    },
    body: JSON.stringify({
      template_id: env.MSG91_OTP_TEMPLATE_ID,
      recipients: [{ mobiles: phone.replace("+", ""), otp: code }],
    }),
    signal: AbortSignal.timeout(10_000),
  });
  if (!response.ok) {
    throw new Error(`MSG91 answered ${response.status}: ${await response.text()}`);
  }
}
