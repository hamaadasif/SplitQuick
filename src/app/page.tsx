"use client";

import { useAuth } from "../hooks/useAuth";
import { useRouter } from "next/navigation";
import { signOut } from "firebase/auth";

export default function HomePage() {
  const { user } = useAuth();
  const router = useRouter();

  const handleSignOut = async () => {
    try {
      await signOut();
      router.push("/");
    } catch (err) {
      console.error("Error signing out:", err);
    }
  };

  return (
    <main className="min-h-screen bg-gray-100">
      <header className="bg-white shadow p-4 flex justify-between items-center">
        {/* Left Side: Icon and App Name */}
        <div className="flex items-center space-x-2">
          <div className="w-8 h-8 bg-blue-500 rounded-full"></div> {/* Replace with actual icon */}
          <h1 className="text-xl font-bold text-blue-600">SplitQuick</h1>
        </div>

        <nav className="flex space-x-4 items-center">
          <a
            href="https://hamaadasif.com"
            target="_blank"
            rel="noopener noreferrer"
            className="text-gray-700 hover:text-blue-500"
          >
            Contact
          </a>
          {user ? (
            <>
              <button
                onClick={() => router.push("/dashboard")}
                className="px-4 py-2 bg-blue-500 text-white rounded-md"
              >
                Dashboard
              </button>
              <button
                onClick={handleSignOut}
                className="px-4 py-2 bg-red-500 text-white rounded-md"
              >
                Sign Out
              </button>
            </>
          ) : (
            <>
              <button
                onClick={() => router.push("/login")}
                className="px-4 py-2 bg-gray-100 text-blue-500 rounded-md hover:bg-gray-200"
              >
                Login
              </button>
              <button
                onClick={() => router.push("/signup")}
                className="px-4 py-2 bg-blue-500 text-white rounded-md"
              >
                Sign Up
              </button>
            </>
          )}
        </nav>
      </header>

      <div className="flex flex-col justify-center items-center p-8 text-center">
        <div className="max-w-2xl bg-white shadow-lg rounded-lg p-6">
          <h2 className="text-3xl font-bold mb-4">Welcome to SplitQuick</h2>
          <p className="text-gray-600 mb-6">
            SplitQuick is a personal project by{" "}
            <a
              href="https://hamaadasif.com"
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-500 underline"
            >
              Hamaad Asif
            </a>{" "}
            to simplify tracking and settling debts with friends, family, and colleagues. 
            This project is an exercise in improving finance management and technical development skills.
          </p>
        </div>
      </div>
    </main>
  );
}
