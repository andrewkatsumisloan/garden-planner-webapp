import { useState, useEffect } from "react";
import {
  ClerkProvider,
  SignInButton,
  UserButton,
  useUser,
} from "@clerk/clerk-react";
import "./App.css";

// Get Clerk publishable key from environment variable
const clerkPubKey = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY;

if (!clerkPubKey) {
  throw new Error("Missing VITE_CLERK_PUBLISHABLE_KEY environment variable");
}

// Backend info interface
interface BackendInfo {
  name: string;
  version: string;
  stack: {
    framework: string;
    database: string;
    deployment: string;
  };
}

function LandingContent() {
  const { isLoaded, isSignedIn, user } = useUser();
  const [backendInfo, setBackendInfo] = useState<BackendInfo | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    const fetchBackendInfo = async () => {
      try {
        setIsLoading(true);
        const response = await fetch("http://localhost:8000/api/info");
        const data = await response.json();
        setBackendInfo(data);
      } catch (error) {
        console.error("Error fetching backend info:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchBackendInfo();
  }, []);

  if (!isLoaded) {
    return <div>Loading user...</div>;
  }

  return (
    <div className="landing-container">
      <header>
        <div className="auth-section">
          {isSignedIn ? (
            <UserButton />
          ) : (
            <SignInButton mode="modal">
              <button className="sign-in-button">Sign In</button>
            </SignInButton>
          )}
        </div>
      </header>

      <main>
        <h1>Fullstack AWS Template</h1>
        <p className="description">
          A production-ready template for building modern web applications with
          React, FastAPI, and AWS.
        </p>

        <div className="stack-info">
          <div className="stack-card">
            <h2>Frontend Stack</h2>
            <ul>
              <li>React 19</li>
              <li>TypeScript</li>
              <li>Vite</li>
              <li>Clerk Authentication</li>
              <li>Tailwind CSS</li>
            </ul>
          </div>

          <div className="stack-card">
            <h2>Backend Stack</h2>
            {isLoading ? (
              <p>Loading backend info...</p>
            ) : backendInfo ? (
              <ul>
                <li>{backendInfo.stack.framework}</li>
                <li>{backendInfo.stack.database}</li>
                <li>Python 3.11</li>
                <li>{backendInfo.stack.deployment}</li>
              </ul>
            ) : (
              <p>Could not connect to backend</p>
            )}
          </div>

          <div className="stack-card">
            <h2>Deployment</h2>
            <ul>
              <li>Docker Containers</li>
              <li>AWS Ready</li>
              <li>CI/CD Pipeline</li>
            </ul>
          </div>
        </div>

        {isSignedIn && (
          <div className="welcome-user">
            <h3>Welcome, {user.firstName || user.username}!</h3>
            <p>You're now authenticated with Clerk.</p>
          </div>
        )}

        <div className="getting-started">
          <h2>Getting Started</h2>
          <p>
            This template includes Docker setup for both development and
            production environments. Check the README for detailed instructions
            on deployment and customization.
          </p>
        </div>
      </main>

      <footer>
        <p>Fullstack Template - Created with React, FastAPI, and AWS</p>
      </footer>
    </div>
  );
}

function App() {
  return (
    <ClerkProvider publishableKey={clerkPubKey}>
      <LandingContent />
    </ClerkProvider>
  );
}

export default App;
