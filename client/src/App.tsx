// ===== File: client/src/App.tsx =====
import { ClerkProvider, useUser } from "@clerk/clerk-react";
import { Loader2 } from "lucide-react";
import { GardenPlanner } from "./components/garden/GardenPlanner";
import Header from "./components/Header";
import LandingPage from "./components/LandingPage";
import "./App.css";

// Get Clerk publishable key from environment variable
const clerkPubKey = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY;

if (!clerkPubKey) {
  throw new Error("Missing VITE_CLERK_PUBLISHABLE_KEY environment variable");
}

function AppContent() {
  const { isLoaded, isSignedIn } = useUser();

  if (!isLoaded) {
    return (
      <div className="flex items-center justify-center h-screen bg-gray-100">
        <Loader2 className="h-5 w-5 animate-spin" />
        <span className="ml-2">Loading...</span>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      <Header />
      <main className="flex-1">
        {isSignedIn ? <GardenPlanner /> : <LandingPage />}
      </main>
    </div>
  );
}

function App() {
  return (
    <ClerkProvider publishableKey={clerkPubKey}>
      <AppContent />
    </ClerkProvider>
  );
}

export default App;
