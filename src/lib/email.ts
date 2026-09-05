import { PRODUCT_NAME, SUPPORT_EMAIL } from "./config";

/**
 * Transactional email through Resend.
 *
 * Entirely optional: with no RESEND_API_KEY set, every call here is a no-op and
 * the app behaves exactly as before. Nothing in the generation path may depend
 * on mail succeeding — a job is finished whether or not the notice goes out.
 */

const FROM = process.env.EMAIL_FROM ?? `${PRODUCT_NAME} <noreply@cutframe.app>`;

async function send(to: string, subject: string, html: string) {
  const key = process.env.RESEND_API_KEY;
  if (!key || !to) return;

  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${key}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ from: FROM, to, subject, html }),
    });
    if (!res.ok) {
      console.warn("email send failed", res.status, await res.text());
    }
  } catch (err) {
    console.warn("email send threw", err);
  }
}

function layout(body: string, cta?: { href: string; label: string }) {
  return `<div style="font-family:-apple-system,Segoe UI,Roboto,sans-serif;max-width:520px;margin:0 auto;padding:32px 24px;color:#1c1a17;background:#faf7f2">
  <div style="font-size:19px;font-weight:600;letter-spacing:-.01em;margin-bottom:28px">${PRODUCT_NAME}</div>
  ${body}
  ${
    cta
      ? `<p style="margin:28px 0"><a href="${cta.href}" style="display:inline-block;background:#b4552d;color:#fff;text-decoration:none;padding:12px 20px;border-radius:10px;font-size:15px">${cta.label}</a></p>`
      : ""
  }
  <p style="margin-top:32px;font-size:13px;color:#9c9488;border-top:1px solid #e2dad0;padding-top:16px">
    Questions? Just reply, or email ${SUPPORT_EMAIL}.
  </p>
</div>`;
}

export async function sendJobFinishedEmail(opts: {
  to: string;
  jobTitle: string;
  jobId: string;
  done: number;
  failed: number;
}) {
  const site = process.env.NEXT_PUBLIC_SITE_URL ?? "https://cutframe.app";

  const failedLine =
    opts.failed > 0
      ? `<p style="font-size:15px;line-height:1.6;color:#6b6459">${opts.failed} frame${
          opts.failed === 1 ? "" : "s"
        } didn't render and ${
          opts.failed === 1 ? "its credit was" : "those credits were"
        } returned to your balance. You can regenerate ${
          opts.failed === 1 ? "it" : "them"
        } individually.</p>`
      : "";

  await send(
    opts.to,
    `Your images are ready — ${opts.jobTitle}`,
    layout(
      `<p style="font-size:17px;line-height:1.5;margin:0 0 12px">Your set is finished.</p>
       <p style="font-size:15px;line-height:1.6;color:#6b6459">
         <strong style="color:#1c1a17">${opts.done}</strong> frames generated for
         <strong style="color:#1c1a17">${opts.jobTitle}</strong>, numbered in script order and ready to download.
       </p>
       ${failedLine}`,
      { href: `${site}/app/jobs/${opts.jobId}`, label: "Open the set" },
    ),
  );
}
