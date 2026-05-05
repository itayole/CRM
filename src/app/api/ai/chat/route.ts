import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";

export async function POST(req: NextRequest) {
  try {
    const { system, messages } = await req.json();

    const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

    const response = await client.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 1024,
      system,
      messages: messages.filter((m: { role: string }) => m.role !== "system"),
    });

    const text = response.content[0]?.type === "text" ? response.content[0].text : "שגיאה";
    return NextResponse.json({ content: text });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "שגיאה" }, { status: 500 });
  }
}
