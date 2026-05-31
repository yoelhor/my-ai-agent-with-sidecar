This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Prepare you environment 

# Microsoft Work IQ

To access Microsoft 365 tenant data, the WorkIQ CLI and MCP Server need to be consented to permissions that require administrative rights on the tenant. See the [Tenant Administrator Enablement Guide](https://github.com/microsoft/work-iq/blob/main/ADMIN-INSTRUCTIONS.md) for detailed instructions on granting admin consent, including a quick one-click consent URL.

## Getting Started

First, install dependencies 

```bash
npm install
```

Then run the development server:

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.



# Web API environment variables

- **SIDECAR_URL** — Endpoint URL for the Microsoft Entra SDK for Agent ID sidecar. Supports both local (localhost) and remote (cloud-hosted) targets.
- **MCP_SERVER_URL** — Endpoint URL of the custom Model Context Protocol (MCP) server.
- **ANTHROPIC_API_KEY** — Authentication key for the Anthropic API.
AgentIdentity — The Microsoft Entra agent identity used to obtain access tokens via the On-Behalf-Of (OBO) flow for delegated access, and the client credentials flow for application-only access.
- **AgentUserAccountIdentity** — The Entra agent identity representing a dedicated agent user account, required for agent user account scenarios.
- **AgentUserAccountUpn** — The User Principal Name (UPN) of the agent user account.
- [Optional] **Microsoft_MCP_SERVER_URL** — Endpoint URL of a Microsoft-hosted MCP server (e.g., Work IQ).
- [Optional] **Microsoft_MCP_SERVER_DESCRIPTION** — Human-readable description of the Microsoft MCP server, surfaced in the agent's system prompt to inform tool selection.

# Environment variables for the sidecar

Before running the application, make sure your sidecar is configured with the right environment variables for each flow:

## Custom MCP — On-Behalf-Of (OBO) flow

This flow exchanges the signed-in user's token for a new one scoped to your MCP server. Set:

- **DownstreamApis__MyMCP__Scopes__0** — The scope you defined in your MCP app registration. If you don't have a custom one yet, https://graph.microsoft.com/User.Read works as a placeholder.

## Microsoft MCP (e.g., Work IQ) — On-Behalf-Of (OBO) flow

Same idea, but targeting a Microsoft-hosted MCP server. Set:

- **DownstreamApis__MicrosoftMCP__Scopes__0** — The scope for the specific Work IQ service you're integrating with. For Mail, use `16b1878d-62c7-4009-aa25-68989d63bbad/Tools.ListInvoke.All`; for Calendar, use `910333d2-47e9-43ca-981f-6df2f4531ef4/Tools.ListInvoke.All`. Note that these scopes use a bare GUID — no `api://` prefix.

## Agent user account flow

When your agent needs to act as a dedicated user account, point the sidecar's authorization endpoint to the right scope. Set:

- **DownstreamApis__AgentUserToken__Scopes__0** — The scope for the resource you're accessing, e.g., https://graph.microsoft.com/User.Read or a custom API scope like api://12345678-1223-9876-5432-123456778812/mymcp.read.

- Leave **DownstreamApis__AgentUserToken__RequestAppToken** unset (or explicitly false) — this flow is user-delegated, not app-only.

## Application-only access (client credentials flow)

When the agent needs to act as itself — with no user in the loop, use application permissions. Set:

- **DownstreamApis__AppToken__RequestAppToken** = true
- **DownstreamApis__AppToken__Scopes__0** — Your API's `.default` scope, e.g., `api://057837bb-97ba-4e52-8d90-74d4b2cb487c/.default` or `https://graph.microsoft.com/.default`. The /.default scope is required here because application permissions don't support individual scope selection the way delegated permissions do.