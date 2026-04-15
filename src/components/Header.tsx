"use client";

import { useIsAuthenticated, useMsal } from "@azure/msal-react";
import { loginRequest } from "@/app/authConfig";
import { Container, Navbar, Nav, Button } from "react-bootstrap";

export default function Header() {
  const { instance, accounts } = useMsal();
  const isAuthenticated = useIsAuthenticated();

  const handleLogin = () => instance.loginRedirect(loginRequest);
  const handleLogout = () => instance.logoutRedirect();

  const handleShowToken = async () => {
    try {
      const response = await instance.acquireTokenSilent({
        ...loginRequest,
        account: accounts[0],
      });
      window.open(`https://jwt.ms/#access_token=${response.accessToken}`, "_blank");
    } catch (e) {
      console.error("Failed to acquire token silently", e);
    }
  };

  return (
    <Navbar bg="dark" variant="dark" expand="md" className="shadow-sm">
      <Container>
        <Navbar.Brand href="/">
          <strong>My AI Agent Service</strong>
        </Navbar.Brand>
        <Navbar.Toggle aria-controls="main-nav" />
        <Navbar.Collapse id="main-nav" className="justify-content-end">
          <Nav className="align-items-center">
            {isAuthenticated ? (
              <>
                <Navbar.Text className="me-3">
                  Signed in as{" "}
                  <a
                    href="#"
                    onClick={(e) => { e.preventDefault(); handleShowToken(); }}
                    style={{ color: "#fff", textDecoration: "underline", cursor: "pointer" }}
                  >
                    <strong>{accounts[0]?.name ?? accounts[0]?.username}</strong>
                  </a>
                </Navbar.Text>
                <Button variant="outline-light" size="sm" onClick={handleLogout}>
                  Sign Out
                </Button>
              </>
            ) : (
              <Button variant="light" size="sm" onClick={handleLogin}>
                Sign In
              </Button>
            )}
          </Nav>
        </Navbar.Collapse>
      </Container>
    </Navbar>
  );
}
