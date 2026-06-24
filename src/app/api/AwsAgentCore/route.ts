import { NextRequest, NextResponse } from "next/server";
// Removed: BedrockAgentCoreClient / InvokeAgentRuntimeCommand — the SDK only
// does SigV4 and can't carry a bearer token. You can drop the dependency.

export async function POST(request: NextRequest) {

    /* Get the authorization header from the request */
    const authHeader = request.headers.get("authorization");
    if (!authHeader) {
        const errorResult = {
            detail: "Authorization header is missing.",
            status: 401,
            appCustomCode: "Authentication error (1)"
        };
        return NextResponse.json({ error: errorResult }, { status: errorResult.status });
    }

    /* Get the required environment variables */
    const agentRuntimeArn = getRequiredEnv("AWS_AgentRuntimeArn");
    if ("response" in agentRuntimeArn) {
        return agentRuntimeArn.response;
    }

    const body = await request.json();
    const prompt = body?.Prompt ?? body?.prompt;

    if (!prompt || typeof prompt !== "string") {
        return NextResponse.json(
            {
                error: {
                    detail: "Prompt is required and must be a string.",
                    status: 400,
                    appCustomCode: "Input parameter error"
                }
            },
            { status: 400 }
        );
    }

    try {
        const arn = agentRuntimeArn.value;
        // Derive region from the ARN so it can't drift from the runtime's region.
        const region = arn.split(":")[3] || "us-east-1";

        // Session ID must be 33+ chars; each new one spins up a fresh MicroVM.
        const sessionId = "test-session-" + Date.now() + "-" + crypto.randomUUID().slice(0, 7);

        // The ARN must be URL-encoded into the path.
        const url =
            `https://bedrock-agentcore.${region}.amazonaws.com` +
            `/runtimes/${encodeURIComponent(arn)}/invocations?qualifier=DEFAULT`;

        const response = await fetch(url, {
            method: "POST",
            headers: {
                // authHeader already includes "Bearer <token>" — forward it as-is.
                "Authorization": authHeader,
                "Content-Type": "application/json",
                "X-Amzn-Bedrock-AgentCore-Runtime-Session-Id": sessionId,
            },
            body: JSON.stringify({ prompt }),
        });

        const textResponse = await response.text();

        if (!response.ok) {
            // 403 with "Authorization method mismatch" => runtime isn't on CUSTOM_JWT,
            // or the token's aud/iss/client doesn't match the authorizer config.
            console.error("AgentCore returned", response.status, textResponse);
            return NextResponse.json(
                {
                    error: {
                        detail: textResponse || "Agent invocation failed.",
                        status: response.status,
                        appCustomCode: "Agent authorization error"
                    }
                },
                { status: response.status }
            );
        }

        let finalResponse = extractDeltaTextFromStream(textResponse);
        finalResponse = finalResponse.replace(/<thinking>.*?<\/thinking>/g, "").trim();

        // The response may look like this: <response>The response content.</response>
        finalResponse = finalResponse.replace(/<\/?response>/g, "").trim();

        return NextResponse.json({ reply: finalResponse || textResponse });

    } catch (error) {
        console.error("Error invoking AWS Bedrock AgentCore:", error);

        const errorResult = {
            detail: error instanceof Error ? error.message : "Unknown error",
            status: 500,
            appCustomCode: "General error"
        };

        return NextResponse.json({ error: errorResult }, { status: 400 });
    }
}


function extractDeltaTextFromStream(streamText: string): string {
    return streamText
        .split(/\r?\n/)
        .map((line) => line.trim())
        .filter((line) => line.startsWith("data:"))
        .map((line) => line.slice(5).trim())
        .filter(Boolean)
        .map((jsonPayload) => {
            try {
                const parsed = JSON.parse(jsonPayload) as {
                    event?: { contentBlockDelta?: { delta?: { text?: string } } };
                };
                return parsed.event?.contentBlockDelta?.delta?.text ?? "";
            } catch {
                return "";
            }
        })
        .join("");
}

function getRequiredEnv(
    envName: string
): { value: string } | { response: NextResponse } {
    const value = process.env[envName];
    if (!value) {
        const errorResult = {
            detail: `${envName} environment variable is not configured.`,
            status: 500,
            appCustomCode: `Configuration error`,
        };
        return {
            response: NextResponse.json({ error: errorResult }, { status: errorResult.status }),
        };
    }
    return { value };
}