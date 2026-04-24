import { NextRequest, NextResponse } from "next/server";
import Anthropic from '@anthropic-ai/sdk';
import { log } from "console";

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

    /* Get the required environment variables */
    const sidecarUrlResult = getRequiredEnv("SIDECAR_URL");
    if ("response" in sidecarUrlResult) {
      return sidecarUrlResult.response;
    }
    const sidecarUrl = sidecarUrlResult.value.replace(/\/+$/, "");

    const mcpServerUrlResult = getRequiredEnv("MCP_SERVER_URL");
    if ("response" in mcpServerUrlResult) {
      return mcpServerUrlResult.response;
    }
    const mcpServerUrl = mcpServerUrlResult.value;

    const anthropicApiKeyResult = getRequiredEnv("ANTHROPIC_API_KEY");
    if ("response" in anthropicApiKeyResult) {
      return anthropicApiKeyResult.response;
    }
    const anthropicApiKey = anthropicApiKeyResult.value;

    const agentIdentityResult = getRequiredEnv("AgentIdentity");
    if ("response" in agentIdentityResult) {
      return agentIdentityResult.response;
    }
    const agentIdentity = agentIdentityResult.value;

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



    /* Call the sidecar's authorization endpoint to get application token */
    /* To make it work make sure to include the following enviromant variables:
        - DownstreamApis__AppToken__RequestAppToken = ture
        - DownstreamApis__AppToken__Scopes__0 = https://your-api/.default */
    const appTokenSidecarUrl = `${sidecarUrl}/AuthorizationHeaderUnauthenticated/AppToken?AgentIdentity=${agentIdentity}&optionsOverride.AcquireTokenOptions.ForceRefresh=true`;
    console.log("**** Calling sidecar authorization endpoint:", appTokenSidecarUrl);
    const appTokenResponse = await fetch(appTokenSidecarUrl, {
      method: "GET"
    });


    const appTokenResult = await appTokenResponse.json();
    // console.log("***** Authorization validation (app token) result:", appTokenResult);
    // console.log("");


    /* Call the sidecar's authorization endpoint to get application token */
    /* To make it work make sure to include the following enviromant variables:
        - Do NOT!!! set up DownstreamApis__AgentUserToken__RequestAppToken to true
        - DownstreamApis__AgentUserToken__Scopes__0 = https://your-api/.default 
        - Change the AgentIdentity to the agent user identity
        - Change the AgentUsername to the agent user's username */
        
    const agentUserTokenSidecarUrl = `${sidecarUrl}/AuthorizationHeaderUnauthenticated/AgentUserToken?AgentIdentity=e65ad39a-8e20-4f17-acb6-1bf5dfb13ac0&AgentUsername=agent-user@ta6252.onmicrosoft.com&optionsOverride.AcquireTokenOptions.ForceRefresh=true`;
    console.log("**** Calling sidecar authorization endpoint:", agentUserTokenSidecarUrl);
    const agentUserTokenResponse = await fetch(agentUserTokenSidecarUrl, {
      method: "GET"
    });


    const agentUserTokenResult = await agentUserTokenResponse.json();
    console.log("***** Authorization validation (agent user token) result:", agentUserTokenResult);
    console.log("");

    
    /* Call the sidecar's authorization endpoint to exchange the user's token for a new one (OBO flow) */
    var authorizationToken;
    try {
      const oboTokenSidecarUrl = `${sidecarUrl}/AuthorizationHeader/MyApi?AgentIdentity=${agentIdentity}&optionsOverride.AcquireTokenOptions.ForceRefresh=true`;
      console.log("**** Calling sidecar authorization endpoint:", oboTokenSidecarUrl);
      const oboTokenResponse = await fetch(oboTokenSidecarUrl, {
        method: "GET",
        headers: {
          Authorization: authHeader,
        },
      });


      const oboTokenResult = await oboTokenResponse.json();

      /* Check if the response contains "status" and it's not 200 */
      if (oboTokenResult.status && oboTokenResult.status !== 200) {

        console.log("**** Authorization validation failed:", oboTokenResult);

        /* Add app custom code to the result */
        oboTokenResult.appCustomCode = "Authentication error (2)"

        return NextResponse.json(
          { error: oboTokenResult },
          { status: 401 }
        );
      }
      else {
        authorizationToken = oboTokenResult.authorizationHeader;
        //console.log("***** Authorization validation (on-behalf-of flow) result:", oboTokenResult.authorizationHeader);
      }

      

      /***********/
      const client = new Anthropic({
        apiKey: anthropicApiKey
      });

      const message = await client.beta.messages.create({
        max_tokens: 1024,
        messages: [{ role: "user", content: Prompt }],
        model: "claude-opus-4-6",
        system: [
          {
            type: "text",
            text: "You can use tools from the connected MCP server. Discover tools from that server and call them when their descriptions indicate they are relevant to the user's request."
          }
        ],
        mcp_servers: [
          {
            type: "url",
            name: "remoteMcp",
            url: mcpServerUrl,
            authorization_token: authorizationToken
          }
        ],
        tools: [
          {
            type: "mcp_toolset",
            mcp_server_name: "remoteMcp"
          }
        ],
        betas: ["mcp-client-2025-11-20"]
      });


      console.log(message.content);

      /* Return the text content from the message */
      const textContent = message.content.map((item: any) => item.text).join("\n");
      return NextResponse.json({ reply: textContent });

      /***************/
    }
    catch (error) {
      /* If the authorization validation fails, return the error from the sidecar */

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
