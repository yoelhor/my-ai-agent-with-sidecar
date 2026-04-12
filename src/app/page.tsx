"use client";

import { useIsAuthenticated } from "@azure/msal-react";
import styles from "./page.module.css";

export default function Home() {
  const isAuthenticated = useIsAuthenticated();

  return (
    <div className={styles.page}>
      <main className={styles.main}>
        {isAuthenticated ? (
          <p>You are signed in. Start using the AI Agent Service.</p>
        ) : (
          <p>Please sign in to continue.</p>
        )}
      </main>
    </div>
  );
}
