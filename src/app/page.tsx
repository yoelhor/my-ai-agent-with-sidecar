"use client";

import { useIsAuthenticated, useMsal } from "@azure/msal-react";
import { loginRequest } from "@/app/authConfig"  
import styles from "./page.module.css";

export default function Home() {
  const { instance, accounts } = useMsal();
  const isAuthenticated = useIsAuthenticated();

  const handleLogin = () => {
    instance.loginRedirect(loginRequest);
  };

  const handleLogout = () => {
    instance.logoutRedirect();
  };

  return (
    <div className={styles.page}>
      <main className={styles.main}>
        <h1>My AI Agent Service</h1>

        {isAuthenticated ? (
          <div>
            <p>Welcome, <strong>{accounts[0]?.name ?? accounts[0]?.username}</strong></p>
            <button className={styles.primary} onClick={handleLogout}>
              Sign Out
            </button>
          </div>
        ) : (
          <div>
            <p>Please sign in to continue.</p>
            <button className={styles.primary} onClick={handleLogin}>
              Sign In
            </button>
          </div>
        )}
      </main>
    </div>
  );
}
