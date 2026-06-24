import { NextRequest, NextResponse } from "next/server";
const { BedrockAgentCoreClient, InvokeAgentRuntimeCommand } = require("@aws-sdk/client-bedrock-agentcore");

export async function POST(request: NextRequest) {

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

    console.log("Authorization header received.");

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

        // https://github.com/strands-agents/harness-sdk/blob/main/site/docs/examples/typescript/deploy_to_bedrock_agentcore/invoke.ts
        const client = new BedrockAgentCoreClient({ region: "us-east-1" });

        // Generate a session ID for each request. This is required to create a new MicroVM for each request.
        // The session ID must be 33+ char. Every new SessionId will create a new MicroVM
        const sessionId = 'test-session-' + Date.now() + '-' + crypto.randomUUID().slice(0, 7);

        const input = {
            runtimeSessionId: sessionId,
            agentRuntimeArn: agentRuntimeArn.value,
            payload: new TextEncoder().encode(
                JSON.stringify({
                    prompt,
                    authorization: authHeader,
                })
            ),
        };

        console.log("Input to AWS Bedrock AgentCore:", JSON.stringify(input));
        console.log("")

        // Invoke the agent runtime with the provided input
        const command = new InvokeAgentRuntimeCommand(input);
        const response = await client.send(command);

        // Transform the response to a string for easier handling
        const textResponse = await response.response.transformToString();
        let finalResponse = extractDeltaTextFromStream(textResponse);

        // console.log("Response (text):");
        // console.log(textResponse);
        // console.log("");

        console.log("Response (final):");
        console.log(finalResponse);
        console.log("");

        // <thinking>The User is asking for a specific piece of information, which is the capital of Israel. This is a factual question and does not require the use of any tools. I can provide the answer directly.</thinking>
        // Israel's capital is Jerusalem.
        // Remove the thinking tag and provide the answer directly in the response. The final response should be: "The capital of Israel is Jerusalem."
        finalResponse = finalResponse.replace(/<thinking>.*?<\/thinking>/g, "").trim();

        return NextResponse.json({ reply: finalResponse || textResponse });

    } catch (error) {
        console.error("Error invoking AWS Bedrock AgentCore:", error);
        console.log("");

        /* Create an error JSON object with following attributes: detail, status and AppCustomCode */
        const errorResult = {
            detail: error instanceof Error ? error.message : "Unknown error",
            status: 500,
            appCustomCode: "General error"
        };

        return NextResponse.json(
            { error: errorResult },
            { status: 400 }
        );
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
                    event?: {
                        contentBlockDelta?: {
                            delta?: {
                                text?: string;
                            };
                        };
                    };
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
            response: NextResponse.json(
                { error: errorResult },
                { status: errorResult.status }
            ),
        };
    }

    return { value };
}