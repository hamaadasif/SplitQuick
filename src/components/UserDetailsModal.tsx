"use client";

import { useState } from "react";

export default function UserDetailsModal({
  onSave,
}: {
  onSave: (name: string) => void;
}) {
  const [name, setName] = useState("");
  const [error, setError] = useState("");

  const handleSave = () => {
    if (!name.trim()) {
      setError("Name is required.");
      return;
    }
    onSave(name.trim());
  };

  return (
    <div className="fixed inset-0 bg-gray-900 bg-opacity-50 flex items-center justify-center">
      <div className="bg-white p-6 rounded-lg shadow-lg w-1/3">
        <h2 className="text-xl font-semibold mb-4">Set Your Name</h2>
        <p className="mb-4 text-gray-600">Please enter your name to use the dashboard.</p>
        <input
          type="text"
          placeholder="Enter your name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="p-2 border rounded-md w-full mb-4"
        />
        {error && <p className="text-red-500">{error}</p>}
        <button
          onClick={handleSave}
          className="p-2 bg-blue-500 text-white rounded-md w-full"
        >
          Save
        </button>
      </div>
    </div>
  );
}
