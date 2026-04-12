import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { Prompt } = body;

    // Check if the Prompt is valid and no longer than 200 characters
    if (!Prompt || typeof Prompt !== "string" || Prompt.length > 200) {

      const errorResult = {
        detail: "Prompt is required, must be a string, and cannot exceed 200 characters.",
        status: 400,
        appCustomCode: "Input parameter error (1)"
      };

      return NextResponse.json(
        { error: errorResult },
        { status: errorResult.status }
      );
    }

    /* Get the sidecar URL from environment variables */
    const sidecarUrl = process.env.SIDECAR_URL;
    if (!sidecarUrl) {
      const errorResult = {
        detail: "SIDECAR_URL environment variable is not configured.",
        status: 500,
        appCustomCode: "Configuration error (1)"
      };
      return NextResponse.json(
        { error: errorResult },
        { status: errorResult.status }
      );
    }

    /* Get the ANTHROPIC_API_KEY */
    const anthropicApiKey = process.env.ANTHROPIC_API_KEY;
    if (!anthropicApiKey) {
      const errorResult = {
        detail: "ANTHROPIC_API_KEY environment variable is not configured.",
        status: 500,
        appCustomCode: "Configuration error (3)"
      };
      return NextResponse.json(
        { error: errorResult },
        { status: errorResult.status }
      );
    }

    /* Get the sidecar URL from environment variables */
    const agentIdentity = process.env.AgentIdentity;
    if (!agentIdentity) {
      const errorResult = {
        detail: "AgentIdentity environment variable is not configured.",
        status: 500,
        appCustomCode: "Configuration error (2)"
      };
      return NextResponse.json(
        { error: errorResult },
        { status: errorResult.status }
      );
    }

    /* Get the authorization header from the request */
    const authHeader = request.headers.get("authorization");
    if (!authHeader) {

      const errorResult = {
        detail: "Authorization header is missing.",
        status: 401,
        appCustomCode: "Authentication error (1)"
      };

      return NextResponse.json(
        { error: errorResult },
        { status: errorResult.status }
      );
    }

    /* Call the sidecar's Validate endpoint */
    const baseUrl = sidecarUrl.replace(/\/+$/, "");

    // try {
    //   const validateResponse = await fetch(`${baseUrl}/Validate`, {
    //     method: "GET",
    //     headers: {
    //       Authorization: authHeader,
    //     },
    //   });

    //   const validateResult = await validateResponse.json();
    // } 
    // catch (error) {
    //   /* If the authorization validation fails, return the error from the sidecar */
    //   return NextResponse.json(
    //     { error: error instanceof Error ? "Authentication error (3): " + error.message : "Unknown authentication error" },
    //     { status: 401 }
    //   );
    // }

    try {
      const validateResponse = await fetch(`${baseUrl}/AuthorizationHeader/Graph?AgentIdentity=${agentIdentity}`, {
        method: "GET",
        headers: {
          Authorization: authHeader,
        },
      });

      const result = await validateResponse.json();

      /* Check if the response contains "status" and it's not 200 */
      if (result.status && result.status !== 200) {

        /* Add app custom code to the result */
        result.AppCustomCode = "Authentication error (2)"

        return NextResponse.json(
          { error: result },
          { status: 401 }
        );
      }




      const response = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: {
          "x-api-key": anthropicApiKey,
          "anthropic-version": "2023-06-01",
          "content-type": "application/json"
        },
        body: JSON.stringify({
          model: "claude-sonnet-4-20250514",
          max_tokens: 1024,
          messages: [{ role: "user", content: Prompt }]
        })
      });
      const data = await response.json();
      console.log(data.content[0].text);
      






      return NextResponse.json({ reply: data.content[0].text });
    }
    catch (error) {
      /* If the authorization validation fails, return the error from the sidecar */

      /* Create an error JSON object with following attributes: detail, status and AppCustomCode */
      const errorResult = {
        detail: error instanceof Error ? error.message : "Unknown authentication error",
        status: 500,
        AppCustomCode: "Authentication error (3)"
      };

      return NextResponse.json(
        { error: errorResult },
        { status: 400 }
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
