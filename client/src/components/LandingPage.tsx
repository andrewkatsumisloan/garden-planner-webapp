import { SignInButton } from "@clerk/clerk-react";

export function LandingPage() {
  return (
    <section className="flex flex-col items-center justify-center text-center py-20 px-4 bg-gradient-to-b from-green-50 to-white">
      <h2 className="text-5xl font-extrabold text-green-800 mb-6">
        Plan your dream garden with <span className="text-green-600">Planty Planny</span>
      </h2>
      <p className="text-lg text-gray-600 max-w-2xl mb-8">
        Planty Planny helps you map out beds, organize plants, and grow the garden of your dreams.
      </p>
      <SignInButton mode="modal">
        <button className="px-8 py-3 bg-green-600 text-white rounded-lg shadow-lg hover:bg-green-700 transition-colors">
          Get Started
        </button>
      </SignInButton>
      <div className="mt-12 grid gap-8 md:grid-cols-3 max-w-5xl">
        <div className="p-6 bg-white rounded-lg shadow">
          <h3 className="font-semibold text-xl mb-2">Design</h3>
          <p className="text-gray-600">Drag and drop to map out your garden beds effortlessly.</p>
        </div>
        <div className="p-6 bg-white rounded-lg shadow">
          <h3 className="font-semibold text-xl mb-2">Organize</h3>
          <p className="text-gray-600">Track plant varieties and companion planting combinations.</p>
        </div>
        <div className="p-6 bg-white rounded-lg shadow">
          <h3 className="font-semibold text-xl mb-2">Grow</h3>
          <p className="text-gray-600">Monitor growth stages and plan for future seasons.</p>
        </div>
      </div>
    </section>
  );
}

export default LandingPage;
