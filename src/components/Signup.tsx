"use client";

import { useState } from "react";
import { auth, db } from "../lib/firebaseConfig";
import { createUserWithEmailAndPassword } from "firebase/auth";
import { doc, setDoc } from "firebase/firestore";
import { useRouter } from "next/navigation";

export default function Signup() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const router = useRouter();

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;

      const userDocRef = doc(db, "users", user.uid);
      await setDoc(userDocRef, {
        name: "",
        email,
        createdAt: new Date(),
      });

      const contactsDocRef = doc(db, "contacts", user.uid);
      await setDoc(contactsDocRef, {
        userId: user.uid,
        contacts: {}, // Empty contacts map
        incomingRequests: {}, // Empty incoming requests map
        outgoingRequests: {}, // Empty outgoing requests map
      });

      setSuccess(true);
    } catch (err) {
      console.error("Error signing up:", err);
      setError("Failed to create account. Please try again.");
    }
  };

  return (
    <div className="max-w-md mx-auto mt-10 p-6 bg-white rounded-md shadow-lg">
      <h2 className="text-2xl font-semibold mb-6">Signup</h2>
      <form onSubmit={handleSignup} className="flex flex-col gap-4">
        <input
          type="email"
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="p-2 border rounded-md"
        />
        <input
          type="password"
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="p-2 border rounded-md"
        />
        <button
          type="submit"
          className="p-2 bg-blue-500 text-white rounded-md"
        >
          Signup
        </button>
      </form>
      {error && <p className="text-red-500 mt-4">{error}</p>}
      {success && (
        <p className="text-green-500 mt-4">Account created successfully! You can now log in.</p>
      )}
      <div className="mt-6 text-center">
      <p>
        Have an account?{" "}
        <a href="/login" className="text-blue-500 underline">
          Login
        </a>
      </p>
      </div>
    </div>
  );
}
