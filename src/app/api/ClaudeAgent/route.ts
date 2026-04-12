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

    /* Get the sidecar URL from environment variables */
    const sidecarUrl = process.env.SIDECAR_URL;
    if (!sidecarUrl) {
      return NextResponse.json(
        { error: "SIDECAR_URL environment variable is not configured." },
        { status: 500 }
      );
    }

    /* Get the authorization header from the request */
    const authHeader = request.headers.get("authorization");
    if (!authHeader) {
      return NextResponse.json(
        { error: "Authorization header is missing." },
        { status: 401 }
      );
    }

    /* Call the sidecar's Validate endpoint */
    const baseUrl = sidecarUrl.replace(/\/+$/, "");

    try {
      const validateResponse = await fetch(`${baseUrl}/Validate`, {
        method: "GET",
        headers: {
          Authorization: authHeader,
        },
      });

      const validateResult = await validateResponse.json();
    } 
    catch (error) {
      /* If the authorization validation fails, return the error from the sidecar */
      return NextResponse.json(
        { error: error instanceof Error ? "Authentication error: " + error.message : "Unknown authentication error" },
        { status: 401 }
      );
    }

    /* Return the result from the sidecar */
    const reply = `${Prompt}`;
    return NextResponse.json({ reply });

  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}
