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
