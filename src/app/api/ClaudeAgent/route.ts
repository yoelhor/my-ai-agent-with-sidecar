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


    const agentUserAccountIdentityResult = getRequiredEnv("AgentUserAccountIdentity");
    if ("response" in agentUserAccountIdentityResult) {
      return agentUserAccountIdentityResult.response;
    }
    const agentUserAccountIdentity = agentUserAccountIdentityResult.value;


    const agentUserAccountUpnResult = getRequiredEnv("AgentUserAccountUpn");
    if ("response" in agentUserAccountUpnResult) {
      return agentUserAccountUpnResult.response;
    }
    const agentUserAccountUpn = agentUserAccountUpnResult.value;

    // Optionall parameters
    const microsoftMcpServerUrl = process.env["Microsoft_MCP_SERVER_URL"];
    const microsoftMcpServerDescription = process.env["Microsoft_MCP_SERVER_DESCRIPTION"];

    if (microsoftMcpServerUrl == null) {
      console.log("The Microsoft MCP server URL is not configured. To configure it, set up the Microsoft_MCP_SERVER_URL environment variable. ");
    }

    if (microsoftMcpServerDescription == null) {
      console.log("The Microsoft MCP server description is not configured. To configure it, set up the Microsoft_MCP_SERVER_DESCRIPTION environment variable. ");
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

    var authFlow = "application token flow";

    try {
      /* Call the sidecar's authorization endpoint to get application token */
      /* To make it work make sure to include the following environment variables:
          - DownstreamApis__AppToken__RequestAppToken = true
          - DownstreamApis__AppToken__Scopes__0 = https://your-api/.default */
      const appTokenSidecarUrl = `${sidecarUrl}/AuthorizationHeaderUnauthenticated/AppToken?AgentIdentity=${agentIdentity}&optionsOverride.AcquireTokenOptions.ForceRefresh=true`;
      console.log(`**** Calling sidecar endpoint (${authFlow}):`, appTokenSidecarUrl);
      const appTokenResponse = await fetch(appTokenSidecarUrl, {
        method: "GET"
      });


      const appTokenResult = await appTokenResponse.json();
      console.log(`***** Authorization validation (${authFlow}) result:`, appTokenResult);
      console.log("");
    }
    catch (error) {
      console.error(`**** Authorization validation (${authFlow}) failed:`, error instanceof Error ? error.message : error);
    }

    try {
      /* Call the sidecar's authorization endpoint to get agent's user account token */
      /* To make it work make sure to include the following environment variables:
          - Do NOT!!! set up DownstreamApis__AgentUserToken__RequestAppToken to true
          - DownstreamApis__AgentUserToken__Scopes__0 = https://graph.microsoft.com/User.Read, or something like api://12345678-1223-9876-5432-123456778812/mymcp.read 
          - Change the AgentIdentity to the agent user identity
          - Change the AgentUsername to the agent user's username */
      authFlow = "agent's user account flow";
      const agentUserTokenSidecarUrl = `${sidecarUrl}/AuthorizationHeaderUnauthenticated/AgentUserToken?AgentIdentity=${agentUserAccountIdentity}&AgentUsername=${agentUserAccountUpn}&optionsOverride.AcquireTokenOptions.ForceRefresh=true`;
      console.log(`**** Calling sidecar endpoint (${authFlow}):`, agentUserTokenSidecarUrl);
      const agentUserTokenResponse = await fetch(agentUserTokenSidecarUrl, {
        method: "GET"
      });

      const agentUserTokenResult = await agentUserTokenResponse.json();
      console.log(`***** Authorization validation (${authFlow}) result:`, agentUserTokenResult);
      console.log("");
    }
    catch (error) {
      console.error(`**** Authorization validation (${authFlow}) failed:`, error instanceof Error ? error.message : error);
    }


    /* Call the sidecar's authorization endpoint to exchange the user's token for a new one (OBO flow)
    To make it work make sure to include the following environment variables:
        - DownstreamApis__MyMCP__Scopes__0 = To the one you configured in the MCP app registration 
     */
    var authorizationTokenForMyMcp;
    try {
      authFlow = "on-behalf-of flow";
      const oboTokenSidecarUrl = `${sidecarUrl}/AuthorizationHeader/MyMCP?AgentIdentity=${agentIdentity}&optionsOverride.AcquireTokenOptions.ForceRefresh=true`;
      console.log(`**** Calling sidecar endpoint (${authFlow}):`, oboTokenSidecarUrl);
      const oboTokenResponse = await fetch(oboTokenSidecarUrl, {
        method: "GET",
        headers: {
          Authorization: authHeader,
        },
      });


      const oboTokenResult = await oboTokenResponse.json();

      /* Check if the response contains "status" and it's not 200 */
      if (oboTokenResult.status && oboTokenResult.status !== 200) {

        console.log(`**** Authorization validation (${authFlow}) failed:`, oboTokenResult);

        /* Add app custom code to the result */
        oboTokenResult.appCustomCode = "Authentication error (2)"

        return NextResponse.json(
          { error: oboTokenResult },
          { status: 401 }
        );
      }
      else {
        authorizationTokenForMyMcp = oboTokenResult.authorizationHeader;
        authorizationTokenForMyMcp = authorizationTokenForMyMcp.replace(/^Bearer\s+/i, '');
        console.log(`***** Authorization validation (${authFlow}) result:`, oboTokenResult.authorizationHeader);
      }
    }
    catch (error) {
      /* If the authorization validation fails, return the error from the sidecar */

      /* Create an error JSON object with following attributes: detail, status and AppCustomCode */
      const errorResult = {
        detail: error instanceof Error ? error.message : "Unknown error",
        status: 500,
        appCustomCode: "Token acquisition error"
      };

      return NextResponse.json(
        { error: errorResult },
        { status: 400 }
      );
    }



    /* Call the sidecar's authorization endpoint to exchange the user's token for a new one (OBO flow) for the Microsoft MCP server
    To make it work make sure to include the following environment variables:
        - DownstreamApis__MicrosoftMCP__Scopes__0 = To the one you configured in the MCP app registration.
          For example, for mail Work IQ use: 16b1878d-62c7-4009-aa25-68989d63bbad/Tools.ListInvoke.All (that's correct, without api:// just the ID) 
          For Work IQ Canlendar use: 910333d2-47e9-43ca-981f-6df2f4531ef4/Tools.ListInvoke.All
     */
    var authorizationTokenForMicrosoftMcp;
    if (microsoftMcpServerUrl != null) {
      try {
        authFlow = "on-behalf-of flow";
        const oboTokenSidecarUrl = `${sidecarUrl}/AuthorizationHeader/MicrosoftMCP?AgentIdentity=${agentIdentity}&optionsOverride.AcquireTokenOptions.ForceRefresh=true`;
        console.log(`**** Calling sidecar endpoint (${authFlow}):`, oboTokenSidecarUrl);
        const oboTokenResponse = await fetch(oboTokenSidecarUrl, {
          method: "GET",
          headers: {
            Authorization: authHeader,
          },
        });


        const oboTokenResult = await oboTokenResponse.json();

        /* Check if the response contains "status" and it's not 200 */
        if (oboTokenResult.status && oboTokenResult.status !== 200) {

          console.log(`**** Authorization validation (${authFlow}) failed:`, oboTokenResult);

          /* Add app custom code to the result */
          oboTokenResult.appCustomCode = "Authentication error (2)"

          return NextResponse.json(
            { error: oboTokenResult },
            { status: 401 }
          );
        }
        else {
          authorizationTokenForMicrosoftMcp = oboTokenResult.authorizationHeader;

          // Remove the Bearer from the authorization header before printing it to the console
          authorizationTokenForMicrosoftMcp = authorizationTokenForMicrosoftMcp.replace(/^Bearer\s+/i, '');

          console.log(`***** Authorization validation (${authFlow}) result:`, oboTokenResult.authorizationHeader);
        }
      }
      catch (error) {
        /* If the authorization validation fails, return the error from the sidecar */

        /* Create an error JSON object with following attributes: detail, status and AppCustomCode */
        const errorResult = {
          detail: error instanceof Error ? error.message : "Unknown error",
          status: 500,
          appCustomCode: "Token acquisition for Microsoft MCP error"
        };

        return NextResponse.json(
          { error: errorResult },
          { status: 400 }
        );
      }
    }


    try {
      /***********/
      const client = new Anthropic({
        apiKey: anthropicApiKey
      });

      const mcpServers: Array<{
        type: "url";
        name: string;
        url: string;
        authorization_token?: string;
      }> = [
          {
            type: "url",
            name: "myMcp",
            url: mcpServerUrl,
            authorization_token: authorizationTokenForMyMcp
          }
        ];

      if (microsoftMcpServerUrl != null) {
        mcpServers.push({
          type: "url",
          name: "microsoftMcp",
          url: microsoftMcpServerUrl,
          authorization_token: authorizationTokenForMicrosoftMcp
        });
      }

      const tools: Array<{
        type: "mcp_toolset";
        mcp_server_name: string;
      }> = [
          {
            type: "mcp_toolset",
            mcp_server_name: "myMcp"
          }
        ];

      if (microsoftMcpServerUrl != null) {
        tools.push({
          type: "mcp_toolset",
          mcp_server_name: "microsoftMcp"
        });
      }

      // Print the list of MCP servers to the console
      console.log("MCP servers configured for the agent:", mcpServers);

      const message = await client.beta.messages.create({
        max_tokens: 1024,
        messages: [{ role: "user", content: Prompt }],
        model: "claude-opus-4-6",
        system: [
          {
            type: "text",
            text: "You can use tools from the connected MCP server. Discover tools from that server and call them when their descriptions indicate they are relevant to the user's request. " + microsoftMcpServerDescription
          }
        ],
        mcp_servers: mcpServers,
        tools: tools,
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
