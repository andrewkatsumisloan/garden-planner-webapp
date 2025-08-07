import { SignInButton, UserButton, useUser } from "@clerk/clerk-react";

export function Header() {
  const { isSignedIn } = useUser();

  return (
    <header className="flex items-center justify-between px-6 py-4 bg-white shadow">
      <h1 className="text-3xl font-bold text-green-700">Planty Planny</h1>
      {isSignedIn ? (
        <UserButton afterSignOutUrl="/" />
      ) : (
        <SignInButton mode="modal">
          <button className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors">
            Sign In
          </button>
        </SignInButton>
      )}
    </header>
  );
}

export default Header;
