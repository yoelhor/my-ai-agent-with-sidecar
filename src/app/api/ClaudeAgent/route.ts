import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { Prompt } = body;

    if (!Prompt || typeof Prompt !== "string") {
      return NextResponse.json(
        { error: "Prompt is required and must be a string." },
        { status: 400 }
      );
    }

    // TODO: Replace with actual Claude API call
    const reply = `Echo: ${Prompt}`;

    return NextResponse.json({ reply });
  } catch {
    return NextResponse.json(
      { error: "Invalid request body." },
      { status: 400 }
    );
  }
}
