"use client";

import { useState } from "react";
import { db } from "../lib/firebaseConfig";
import { doc, updateDoc, getDoc } from "firebase/firestore";

export default function SettleDebtModal({
  uid,
  contact,
  onClose,
}: {
  uid: string;
  contact: any;
  onClose: () => void;
}) {
  const [amount, setAmount] = useState("");
  const [error, setError] = useState("");

  const handleSettle = async (e: React.FormEvent) => {
    e.preventDefault();
    const settleAmount = parseFloat(amount);

    if (!settleAmount || settleAmount <= 0) {
      setError("Please enter a valid amount.");
      return;
    }

    try {
      const userContactDocRef = doc(db, "contacts", uid);
      const contactContactDocRef = doc(db, "contacts", contact.id);

      const userContactDoc = await getDoc(userContactDocRef);
      const contactContactDoc = await getDoc(contactContactDocRef);

      if (!userContactDoc.exists() || !contactContactDoc.exists()) {
        setError("Contact data not found.");
        return;
      }

      const userContactData = userContactDoc.data();
      const contactContactData = contactContactDoc.data();

      const currentDebt = userContactData.contacts[contact.id]?.netDebt || 0;

      const effectiveSettleAmount = Math.min(Math.abs(currentDebt), settleAmount);
      const updatedUserNetDebt = currentDebt > 0
        ? currentDebt - effectiveSettleAmount
        : currentDebt + effectiveSettleAmount;

      const updatedContactNetDebt = -updatedUserNetDebt;

      await updateDoc(userContactDocRef, {
        [`contacts.${contact.id}.netDebt`]: updatedUserNetDebt,
        [`contacts.${contact.id}.status`]:
          updatedUserNetDebt === 0 ? "settled" : "unsettled",
      });

      await updateDoc(contactContactDocRef, {
        [`contacts.${uid}.netDebt`]: updatedContactNetDebt,
        [`contacts.${uid}.status`]:
          updatedContactNetDebt === 0 ? "settled" : "unsettled",
      });

      alert("Debt settled successfully!");
      onClose();
    } catch (err) {
      console.error("Error settling debt:", err);
      setError("Failed to settle debt. Please try again.");
    }
  };

  const debtDirection =
  contact.netDebt > 0
    ? `${contact.name} owes you`
    : contact.netDebt < 0
    ? `You owe ${contact.name}`
    : "Debt is settled";

  return (
    <div className="modal-backdrop">
      <div className="modal-panel max-w-md">
        <div className="modal-head">
          <h2 className="modal-title">{debtDirection}</h2>
          <button onClick={onClose} className="btn-secondary">
            Cancel
          </button>
        </div>

        <form onSubmit={handleSettle} className="modal-body space-y-4">
          <div className="rounded-xl bg-slate-50 p-4 text-center">
            <div className="text-sm text-slate-600">Current balance</div>
            <div className="mt-1 text-2xl font-semibold text-slate-900">
              ${Math.abs(contact.netDebt).toFixed(2)}
            </div>
          </div>

          <div className="field">
            <label className="label">Amount to settle</label>
            <input
              type="number"
              min="0"
              step="0.01"
              placeholder="0.00"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="input"
            />
          </div>

          {error && <p className="helper-error">{error}</p>}

          <div className="modal-actions">
            <button
              type="button"
              onClick={onClose}
              className="btn-secondary"
            >
              Cancel
            </button>
            <button type="submit" className="btn-success">
              Settle Debt
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}