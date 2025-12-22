"use client";

import { useEffect, useMemo, useState } from "react";
import { db } from "../lib/firebaseConfig";
import {
  addDoc,
  collection,
  doc,
  getDoc,
  serverTimestamp,
  updateDoc,
} from "firebase/firestore";

type ContactItem = {
  id: string;
  name: string;
  email: string;
  ghost?: boolean;
  type: "confirmed" | "pending" | "ghost";
};

export default function AddDebtModal({
  uid,
  onClose,
  prefillContactId,
  contacts: _unusedContacts,
}: {
  uid: string;
  onClose: () => void;
  prefillContactId?: string;
  contacts?: any[];
}) {
  const [contacts, setContacts] = useState<ContactItem[]>([]);
  const [selectedContactId, setSelectedContactId] = useState("");
  const [amount, setAmount] = useState("");
  const [direction, setDirection] = useState<"owes me" | "I owe">("owes me");
  const [description, setDescription] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    (async () => {
      const userContactsDoc = await getDoc(doc(db, "contacts", uid));
      if (!userContactsDoc.exists()) return;

      const data = userContactsDoc.data() || {};

      const confirmed: ContactItem[] = Object.entries(data.contacts || {}).map(
        ([id, v]: any) => ({
          id,
          name: v.name || v.email || "Unknown",
          email: v.email,
          ghost: !!v.ghost,
          type: v.ghost ? "ghost" : "confirmed",
        })
      );

      const pending: ContactItem[] = Object.entries(
        data.outgoingRequests || {}
      ).map(([id, v]: any) => ({
        id,
        name: v.name || v.email || "Unknown",
        email: v.email,
        type: "pending",
      }));

      const all = [...confirmed, ...pending];
      setContacts(all);

      if (prefillContactId && all.some((c) => c.id === prefillContactId)) {
        setSelectedContactId(prefillContactId);
      }
    })();
  }, [uid, prefillContactId]);

  useEffect(() => {
    if (!prefillContactId) return;
    if (!contacts.some((c) => c.id === prefillContactId)) return;
    setSelectedContactId(prefillContactId);
  }, [prefillContactId, contacts]);

  const selectedContact = useMemo(
    () => contacts.find((c) => c.id === selectedContactId),
    [contacts, selectedContactId]
  );

  const handleAddDebt = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    const debtAmount = parseFloat(amount);
    if (!debtAmount || debtAmount <= 0 || !selectedContact || !selectedContactId) {
      setError("Please enter a valid amount and select a contact.");
      return;
    }

    try {
      const meContactsRef = doc(db, "contacts", uid);
      const meContactsSnap = await getDoc(meContactsRef);
      if (!meContactsSnap.exists()) {
        setError("Your contact document is missing.");
        return;
      }

      const signedAmount = direction === "owes me" ? +debtAmount : -debtAmount;

      if (selectedContact.type === "pending" || selectedContact.type === "ghost") {
        const stagedRef = collection(
          db,
          `contacts/${uid}/staged/${selectedContactId}/transactions`
        );
        await addDoc(stagedRef, {
          amount: debtAmount,
          signedAmount,
          description: description || null,
          createdAt: serverTimestamp(),
          createdBy: uid,
        });

        alert(
          selectedContact.type === "ghost"
            ? "Debt saved for ghost contact (only visible to you)."
            : "Debt saved for pending friend (will share automatically when they accept)."
        );
        onClose();
        return;
      }

      const otherUid = selectedContact.id;

      const myTxRef = collection(
        db,
        `contacts/${uid}/contacts/${otherUid}/transactions`
      );
      await addDoc(myTxRef, {
        amount: debtAmount,
        signedAmount,
        description: description || null,
        createdAt: serverTimestamp(),
        createdBy: uid,
      });

      const theirTxRef = collection(
        db,
        `contacts/${otherUid}/contacts/${uid}/transactions`
      );
      await addDoc(theirTxRef, {
        amount: debtAmount,
        signedAmount: -signedAmount,
        description: description || null,
        createdAt: serverTimestamp(),
        createdBy: uid,
      });

      const meData = meContactsSnap.data()!;
      const myContactEntry = meData.contacts?.[otherUid] || {};
      const myNewNet = (myContactEntry.netDebt || 0) + signedAmount;

      await updateDoc(meContactsRef, {
        [`contacts.${otherUid}.netDebt`]: myNewNet,
        [`contacts.${otherUid}.status`]: myNewNet === 0 ? "settled" : "unsettled",
      });

      const otherContactsRef = doc(db, "contacts", otherUid);
      const otherContactsSnap = await getDoc(otherContactsRef);
      if (otherContactsSnap.exists()) {
        const otherData = otherContactsSnap.data()!;
        const otherEntry = otherData.contacts?.[uid] || {};
        const otherNewNet = (otherEntry.netDebt || 0) - signedAmount;

        await updateDoc(otherContactsRef, {
          [`contacts.${uid}.netDebt`]: otherNewNet,
          [`contacts.${uid}.status`]:
            otherNewNet === 0 ? "settled" : "unsettled",
        });
      }

      alert("Debt added.");
      onClose();
    } catch (err) {
      console.error("Error adding debt:", err);
      setError("Failed to add debt. Please try again.");
    }
  };

  return (
    <div className="modal-backdrop">
      <div className="modal-panel">
        <div className="modal-head">
          <h2 className="modal-title">Add a Debt</h2>
          <button onClick={onClose} className="btn-secondary">
            Cancel
          </button>
        </div>

        <form onSubmit={handleAddDebt} className="modal-body space-y-4">
          <div className="field">
            <label className="label">Contact</label>
            <select
              value={selectedContactId}
              onChange={(e) => setSelectedContactId(e.target.value)}
              className="select"
            >
              <option value="">Select a contact</option>
              {contacts.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name} ({c.email})
                  {c.type === "ghost" ? " • ghost" : ""}
                  {c.type === "pending" ? " • pending" : ""}
                </option>
              ))}
            </select>
          </div>

          <div className="field">
            <label className="label">Direction</label>
            <select
              value={direction}
              onChange={(e) =>
                setDirection(e.target.value as "owes me" | "I owe")
              }
              className="select"
            >
              <option value="owes me">They owe me</option>
              <option value="I owe">I owe them</option>
            </select>
          </div>

          <div className="field">
            <label className="label">Amount</label>
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

          <div className="field">
            <label className="label">Description (optional)</label>
            <input
              type="text"
              placeholder="Dinner, rent, tickets."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="input"
            />
          </div>

          {error && <p className="helper-error">{error}</p>}

          <div className="modal-actions">
            <button type="button" onClick={onClose} className="btn-secondary">
              Cancel
            </button>
            <button type="submit" className="btn-success">
              Save Debt
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
