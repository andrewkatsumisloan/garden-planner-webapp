import { SignInButton, UserButton, useUser } from "@clerk/clerk-react";
import { Leaf } from "lucide-react";

export function Header() {
  const { isSignedIn } = useUser();

  return (
    <header className="flex items-center justify-between px-6 py-4 bg-gradient-to-r from-green-600 to-emerald-500 shadow">
      <div className="flex items-center gap-2">
        <Leaf className="h-8 w-8 text-white" />
        <h1 className="text-3xl font-bold text-white">Garden Planner</h1>
      </div>
      {isSignedIn ? (
        <UserButton afterSignOutUrl="/" />
      ) : (
        <SignInButton mode="modal">
          <button className="px-4 py-2 bg-white/20 text-white font-medium rounded-md border border-white/30 backdrop-blur-sm hover:bg-white/30 transition-colors">
            Sign In
          </button>
        </SignInButton>
      )}
    </header>
  );
}

export default Header;
