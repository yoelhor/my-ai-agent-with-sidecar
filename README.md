This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Prepare you environment 

# Microsoft Work IQ

To access Microsoft 365 tenant data, the WorkIQ CLI and MCP Server need to be consented to permissions that require administrative rights on the tenant. See the [Tenant Administrator Enablement Guide](https://github.com/microsoft/work-iq/blob/main/ADMIN-INSTRUCTIONS.md) for detailed instructions on granting admin consent, including a quick one-click consent URL.

## Getting Started

First, run the development server:

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.



# Web API environment variables

- SIDECAR_URL — Endpoint URL for the Microsoft Entra SDK for Agent ID sidecar. Supports both local (localhost) and remote (cloud-hosted) targets.
- MCP_SERVER_URL — Endpoint URL of the custom Model Context Protocol (MCP) server.
- ANTHROPIC_API_KEY — Authentication key for the Anthropic API.
AgentIdentity — The Microsoft Entra agent identity used to obtain access tokens via the On-Behalf-Of (OBO) flow for delegated access, and the client credentials flow for application-only access.
- AgentUserAccountIdentity — The Entra agent identity representing a dedicated agent user account, required for agent user account scenarios.
- AgentUserAccountUpn — The User Principal Name (UPN) of the agent user account.
- [Optional] Microsoft_MCP_SERVER_URL — Endpoint URL of a Microsoft-hosted MCP server (e.g., Work IQ).
- [Optional] Microsoft_MCP_SERVER_DESCRIPTION — Human-readable description of the Microsoft MCP server, surfaced in the agent's system prompt to inform tool selection.