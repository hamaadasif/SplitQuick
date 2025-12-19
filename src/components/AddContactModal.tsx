"use client";

import { useState } from "react";
import { db } from "../lib/firebaseConfig";
import {
  doc,
  getDoc,
  updateDoc,
  setDoc,
  collection,
  query,
  where,
  getDocs,
  serverTimestamp,
} from "firebase/firestore";

function sanitizeEmailForId(email: string) {
  return email.toLowerCase().replace(/[^a-z0-9._-]/gi, "_");
}

function makePairLedgerId(a: string, b: string) {
  return [a, b].sort().join("__");
}

function makeGhostLedgerId(ownerUid: string, email: string) {
  return `ghost__${ownerUid}__${sanitizeEmailForId(email)}`;
}

export default function AddContactModal({
  uid,
  onClose,
}: {
  uid: string;
  onClose: () => void;
}) {
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");

  const handleAddContact = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!email) {
      setError("Please enter the contact's email.");
      return;
    }

    try {
      const currentUserDocRef = doc(db, "users", uid);
      const currentUserDoc = await getDoc(currentUserDocRef);
      if (!currentUserDoc.exists()) {
        setError("Your account information could not be retrieved.");
        return;
      }
      const currentUserData = currentUserDoc.data();
      const currentUserName = currentUserData.name || "Unknown Name";
      const currentUserEmail = currentUserData.email;

      const userContactsDocRef = doc(db, "contacts", uid);
      const userContactsDoc = await getDoc(userContactsDocRef);
      if (!userContactsDoc.exists()) {
        await setDoc(userContactsDocRef, {
          userId: uid,
          contacts: {},
          incomingRequests: {},
          outgoingRequests: {},
        });
      }

      const usersCollectionRef = collection(db, "users");
      const q = query(usersCollectionRef, where("email", "==", email));
      const querySnapshot = await getDocs(q);

      if (querySnapshot.empty) {
        const ghostId = `ghost-${email}`;

        const ghostData = {
          name: email,
          email,
          netDebt: 0,
          status: "settled",
          ghost: true,
        };
        await updateDoc(userContactsDocRef, {
          [`contacts.${ghostId}`]: ghostData,
        });

        const ghostLedgerId = makeGhostLedgerId(uid, email);
        await setDoc(
          doc(db, "ledgers", ghostLedgerId),
          {
            participants: [uid],
            status: "ghost",
            createdBy: uid,
            inviteEmail: email,
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
          },
          { merge: true }
        );

        alert("Ghost contact added successfully!");
        onClose();
        return;
      }

      const contactDoc = querySnapshot.docs[0];
      const contactId = contactDoc.id;
      const contactData = contactDoc.data();
      const contactName = contactData.name || "Unknown Name";
      const contactEmail = contactData.email;

      await updateDoc(userContactsDocRef, {
        [`outgoingRequests.${contactId}`]: {
          name: contactName,
          email: contactEmail,
        },
      });

      const contactContactsDocRef = doc(db, "contacts", contactId);
      const contactContactsDoc = await getDoc(contactContactsDocRef);
      if (!contactContactsDoc.exists()) {
        await setDoc(contactContactsDocRef, {
          userId: contactId,
          contacts: {},
          incomingRequests: {},
          outgoingRequests: {},
        });
      }
      await updateDoc(contactContactsDocRef, {
        [`incomingRequests.${uid}`]: {
          name: currentUserName,
          email: currentUserEmail,
        },
      });

      const pairLedgerId = makePairLedgerId(uid, contactId);
      await setDoc(
        doc(db, "ledgers", pairLedgerId),
        {
          participants: [uid, contactId],
          status: "pending",
          createdBy: uid,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        },
        { merge: true }
      );

      alert("Friend request sent!");
      onClose();
    } catch (err) {
      console.error("Error adding contact:", err);
      setError("Failed to add contact. Please try again.");
    }
  };

  return (
    <div className="modal-backdrop">
      <div className="modal-panel max-w-md">
        <div className="modal-head">
          <h2 className="modal-title">Add Contact</h2>
          <button onClick={onClose} className="btn-secondary">
            Cancel
          </button>
        </div>

        <form onSubmit={handleAddContact} className="modal-body space-y-4">
          <div className="field">
            <label className="label">Email address</label>
            <input
              type="email"
              placeholder="name@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
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
            <button type="submit" className="btn-primary">
              Add Contact
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}