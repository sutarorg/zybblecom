import { z } from "zod";
import { contactFields, contactSettings } from "@/lib/backend/contact-config";
import {
  ApiError,
  ingressActor,
  limitActor,
  readJSON,
  respond,
  sameOrigin,
} from "@/lib/backend/http";

export async function POST(request: Request) {
  return respond(async () => {
    sameOrigin(request);
    const parsed = contactFields.safeParse(await readJSON(request, 16_384));
    if (!parsed.success) throw new ApiError("validation", 400);
    const settings = contactSettings(process.env);
    if (!settings) throw new ApiError("unavailable", 503);
    await limitActor("contact_ip", ingressActor(request), 4, 600);
    await limitActor("contact_global", "contact", 40, 3600);
    const { name, email, topic, message } = parsed.data;
    try {
      const result = await fetch("https://api.resend.com/emails", {
        method: "POST",
        cache: "no-store",
        redirect: "error",
        signal: AbortSignal.timeout(8_000),
        headers: {
          Authorization: `Bearer ${settings.key}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          from: settings.from,
          to: [settings.to],
          reply_to: email,
          subject: `Zybble contact: ${topic}`,
          text: `Name: ${name}\nEmail: ${email}\nTopic: ${topic}\n\n${message}`,
        }),
      });
      if (
        !result.ok ||
        !z.object({ id: z.uuid() }).safeParse(await result.json()).success
      )
        throw new Error("Provider did not accept message");
    } catch {
      throw new ApiError("unavailable", 503);
    }
    return { accepted: true };
  });
}
