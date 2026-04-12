"use client";

import { ReactNode } from "react";
import { MsalProvider } from "@azure/msal-react";
import { PublicClientApplication } from "@azure/msal-browser";
import { msalConfig } from "@/app/authConfig";

const msalInstance = new PublicClientApplication(msalConfig);

export default function MsalProviderWrapper({ children }: { children: ReactNode }) {
  return <MsalProvider instance={msalInstance}>{children}</MsalProvider>;
}
