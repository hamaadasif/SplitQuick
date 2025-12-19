"use client";

import { useState } from "react";

export default function AddBalanceForm({ onAddBalance }: { onAddBalance: (balance: { person: string; amount: number }) => void }) {
  const [person, setPerson] = useState("");
  const [amount, setAmount] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!person || !amount) {
      alert("Please fill in all fields!");
      return;
    }

    onAddBalance({ person, amount: parseFloat(amount) });
    setPerson("");
    setAmount("");
  };

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4 mt-4">
      <input
        type="text"
        placeholder="Person's Name"
        value={person}
        onChange={(e) => setPerson(e.target.value)}
        className="p-2 border rounded-md"
      />
      <input
        type="number"
        placeholder="Amount"
        value={amount}
        onChange={(e) => setAmount(e.target.value)}
        className="p-2 border rounded-md"
      />
      <button type="submit" className="p-2 bg-blue-500 text-white rounded-md">
        Add Balance
      </button>
    </form>
  );
}
