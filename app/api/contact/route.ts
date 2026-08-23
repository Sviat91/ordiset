import { NextResponse } from "next/server";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const name = typeof body?.name === "string" ? body.name.trim() : "";
  const email = typeof body?.email === "string" ? body.email.trim() : "";
  const message = typeof body?.message === "string" ? body.message.trim() : "";

  if (name.length < 2 || !EMAIL_RE.test(email) || message.length < 10) {
    return NextResponse.json({ error: "Invalid submission." }, { status: 400 });
  }

  const token = process.env.TELEGRAM_BOT_TOKEN;
  const chatId = process.env.TELEGRAM_CHAT_ID;
  if (!token || !chatId) {
    console.error("Missing TELEGRAM_BOT_TOKEN or TELEGRAM_CHAT_ID");
    return NextResponse.json({ error: "Server not configured." }, { status: 500 });
  }

  const text =
    `📩 <b>New contact form submission</b>\n\n` +
    `<b>Name:</b> ${escapeHtml(name)}\n` +
    `<b>Email:</b> ${escapeHtml(email)}\n\n` +
    `${escapeHtml(message)}`;

  const telegramRes = await fetch(
    `https://api.telegram.org/bot${token}/sendMessage`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ chat_id: chatId, text, parse_mode: "HTML" }),
    },
  );

  if (!telegramRes.ok) {
    const detail = await telegramRes.text();
    console.error("Telegram sendMessage failed:", detail);
    return NextResponse.json({ error: "Failed to send." }, { status: 502 });
  }

  return NextResponse.json({ ok: true });
}
