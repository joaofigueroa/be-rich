import { Resend } from "resend";
import { resolveEmailDelivery } from "@/lib/email-config";

let resend: Resend | null = null;

function getResend() {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    throw new Error("RESEND_API_KEY is required to send authentication emails");
  }
  resend ??= new Resend(apiKey);
  return resend;
}

async function deliverEmail(input: { to: string; subject: string; text: string; html: string }) {
  const delivery = resolveEmailDelivery({
    mode: process.env.EMAIL_DELIVERY_MODE,
    from: process.env.EMAIL_FROM,
    nodeEnv: process.env.NODE_ENV,
    hasApiKey: Boolean(process.env.RESEND_API_KEY),
  });

  if (delivery.mode === "console") {
    console.info(
      `\n[Be Rich development email]\nTo: ${input.to}\nSubject: ${input.subject}\n\n${input.text}\n`,
    );
    return;
  }

  const { error } = await getResend().emails.send({
    from: delivery.from,
    to: input.to,
    subject: input.subject,
    text: input.text,
    html: input.html,
  });
  if (error) throw new Error(`Unable to send email: ${error.message}`);
}

export async function sendMagicLinkEmail(input: { email: string; url: string }) {
  await deliverEmail({
    to: input.email,
    subject: "Seu acesso seguro ao Be Rich",
    text: `Use este link para entrar no Be Rich. Ele expira em 15 minutos: ${input.url}`,
    html: `<div style="font-family:Arial,sans-serif;max-width:520px;margin:auto;padding:32px"><h1 style="color:#173f35">Be Rich</h1><p>Seu link seguro está pronto.</p><p><a href="${input.url}" style="display:inline-block;background:#1f6f5d;color:white;padding:12px 18px;border-radius:10px;text-decoration:none;font-weight:600">Entrar no Be Rich</a></p><p style="color:#66756f;font-size:13px">O link expira em 15 minutos e funciona uma única vez.</p></div>`,
  });
}

export async function sendFamilyInviteEmail(input: {
  email: string;
  inviterName: string;
  workspaceName: string;
  url: string;
}) {
  await deliverEmail({
    to: input.email,
    subject: `${input.inviterName} convidou você para ${input.workspaceName}`,
    text: `Aceite o convite para ${input.workspaceName}: ${input.url}. O convite expira em 7 dias.`,
    html: `<h1>Espaço financeiro compartilhado</h1><p>${input.inviterName} convidou você para <strong>${input.workspaceName}</strong>.</p><p><a href="${input.url}">Aceitar convite</a></p><p>Expira em 7 dias. Suas contas pessoais continuam privadas.</p>`,
  });
}
