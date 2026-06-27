import { Resend } from "resend";

let resend: Resend | null = null;

function getResend() {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    throw new Error("RESEND_API_KEY is required to send authentication emails");
  }
  resend ??= new Resend(apiKey);
  return resend;
}

export async function sendMagicLinkEmail(input: { email: string; url: string }) {
  const from = process.env.EMAIL_FROM;
  if (!from) {
    throw new Error("EMAIL_FROM is required to send authentication emails");
  }

  const { error } = await getResend().emails.send({
    from,
    to: input.email,
    subject: "Seu acesso seguro ao Be Rich",
    text: `Use este link para entrar no Be Rich. Ele expira em 15 minutos: ${input.url}`,
    html: `<div style="font-family:Arial,sans-serif;max-width:520px;margin:auto;padding:32px"><h1 style="color:#173f35">Be Rich</h1><p>Seu link seguro está pronto.</p><p><a href="${input.url}" style="display:inline-block;background:#1f6f5d;color:white;padding:12px 18px;border-radius:10px;text-decoration:none;font-weight:600">Entrar no Be Rich</a></p><p style="color:#66756f;font-size:13px">O link expira em 15 minutos e funciona uma única vez.</p></div>`,
  });

  if (error) {
    throw new Error(`Unable to send magic link: ${error.message}`);
  }
}

export async function sendFamilyInviteEmail(input: {
  email: string;
  inviterName: string;
  workspaceName: string;
  url: string;
}) {
  const from = process.env.EMAIL_FROM;
  if (!from) throw new Error("EMAIL_FROM is required to send family invitations");
  const { error } = await getResend().emails.send({
    from,
    to: input.email,
    subject: `${input.inviterName} convidou você para ${input.workspaceName}`,
    text: `Aceite o convite para ${input.workspaceName}: ${input.url}. O convite expira em 7 dias.`,
    html: `<h1>Espaço financeiro compartilhado</h1><p>${input.inviterName} convidou você para <strong>${input.workspaceName}</strong>.</p><p><a href="${input.url}">Aceitar convite</a></p><p>Expira em 7 dias. Suas contas pessoais continuam privadas.</p>`,
  });
  if (error) throw new Error(`Unable to send family invitation: ${error.message}`);
}
