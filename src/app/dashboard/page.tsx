"use client";

import { useAuth } from "../../hooks/useAuth";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { signOut } from "firebase/auth";
import {
  doc,
  getDoc,
  updateDoc,
  deleteField,
  collection,
  getDocs,
  query,
  orderBy,
} from "firebase/firestore";
import { auth, db } from "../../lib/firebaseConfig";

import DashboardHeader from "../../components/Dashboard/DashboardHeader";
import ContactsList from "../../components/Dashboard/ContactsList";
import IncomingRequests from "../../components/Dashboard/IncomingRequests";
import OutgoingRequests from "../../components/Dashboard/OutgoingRequests";
import AddDebtModal from "../../components/AddDebtModal";
import AddContactModal from "../../components/AddContactModal";
import SettleDebtModal from "../../components/SettleDebtModal";
import TransactionHistoryModal from "../../components/TransactionHistoryModal";
import UserDetailsModal from "../../components/UserDetailsModal";

export default function Dashboard() {
  const { user, loading } = useAuth();
  const router = useRouter();

  const [contacts, setContacts] = useState<any[]>([]);
  const [incomingRequests, setIncomingRequests] = useState<any[]>([]);
  const [outgoingRequests, setOutgoingRequests] = useState<any[]>([]);
  const [transactions, setTransactions] = useState<any[]>([]);

  const [showAddDebtModal, setShowAddDebtModal] = useState(false);
  const [showAddContactModal, setShowAddContactModal] = useState(false);
  const [showSettleModal, setShowSettleModal] = useState(false);
  const [showTransactionHistoryModal, setShowTransactionHistoryModal] =
    useState(false);

  const [selectedContact, setSelectedContact] = useState<any>(null);
  const [showUserDetailsModal, setShowUserDetailsModal] = useState(false);

  useEffect(() => {
    if (!loading && !user) {
      router.push("/login");
    } else if (user) {
      fetchContactsAndRequests(user.uid);
    }
  }, [user, loading, router]);

  const fetchContactsAndRequests = async (uid: string) => {
    try {
      const userDocRef = doc(db, "users", uid);
      const userDoc = await getDoc(userDocRef);

      if (userDoc.exists()) {
        const userData = userDoc.data();

        if (!userData.name || userData.name.trim() === "") {
          setShowUserDetailsModal(true);
          return;
        }

        const contactsDocRef = doc(db, "contacts", uid);
        const contactsDoc = await getDoc(contactsDocRef);

        if (contactsDoc.exists()) {
          const data = contactsDoc.data();

          setContacts(
            Object.entries(data.contacts || {}).map(([id, details]) => ({
              id,
              ...(details as any),
            }))
          );

          setIncomingRequests(
            Object.entries(data.incomingRequests || {}).map(([id, details]) => ({
              id,
              ...(details as any),
            }))
          );

          setOutgoingRequests(
            Object.entries(data.outgoingRequests || {}).map(([id, details]) => ({
              id,
              ...(details as any),
            }))
          );
        }
      }
    } catch (err) {
      console.error("Error fetching contacts and requests:", err);
    }
  };

  const fetchTransactions = async (uid: string, contactId: string) => {
    try {
      const transactionsRef = collection(
        db,
        `contacts/${uid}/contacts/${contactId}/transactions`
      );
      const qRef = query(transactionsRef, orderBy("createdAt", "desc"));
      const snap = await getDocs(qRef);

      setTransactions(
        snap.docs.map((d) => {
          const data = d.data() as any;
          return {
            id: d.id,
            amount: data.amount ?? null,
            signedAmount: data.signedAmount ?? null,
            description: data.description ?? null,
            createdAt: data.createdAt ?? null,
          };
        })
      );
    } catch (err) {
      console.error("Error fetching transactions:", err);
    }
  };

  const handleDeclineRequest = async (request: any) => {
    try {
        if (!user?.uid) return;

        const myUid = user.uid;
        const otherUid = request.id;

        await updateDoc(doc(db, "contacts", myUid), {
          [`incomingRequests.${otherUid}`]: deleteField(),
        });

        await updateDoc(doc(db, "contacts", otherUid), {
          [`outgoingRequests.${myUid}`]: deleteField(),
        });

        fetchContactsAndRequests(myUid);
      } catch (err) {
        console.error("Error declining request:", err);
      }
  };

  const handleLogout = async () => {
    try {
      await signOut(auth);
      router.push("/login");
    } catch (err) {
      console.error("Failed to log out:", err);
    }
  };

  return (
    <main className="page">
      <div className="page-container py-6 space-y-6">
        {showUserDetailsModal && (
          <UserDetailsModal
            onSave={(name) => {
              if (!user?.uid) return;
              const userDocRef = doc(db, "users", user.uid);
              updateDoc(userDocRef, { name }).then(() => {
                setShowUserDetailsModal(false);
                fetchContactsAndRequests(user.uid);
              });
            }}
          />
        )}

        {!showUserDetailsModal && user && (
          <>
            {showAddDebtModal && (
              <AddDebtModal
                uid={user.uid}
                onClose={() => setShowAddDebtModal(false)}
                prefillContactId={selectedContact?.id}
              />
            )}

            {showAddContactModal && (
              <AddContactModal
                uid={user.uid}
                onClose={() => setShowAddContactModal(false)}
              />
            )}

            {showSettleModal && selectedContact && (
              <SettleDebtModal
                uid={user.uid}
                contact={selectedContact}
                onClose={() => setShowSettleModal(false)}
              />
            )}

            {showTransactionHistoryModal && selectedContact && (
              <TransactionHistoryModal
                uid={user.uid}
                contact={selectedContact}
                transactions={transactions}
                onClose={() => setShowTransactionHistoryModal(false)}
              />
            )}

            <DashboardHeader onLogout={handleLogout} />

            <div className="flex flex-wrap gap-3">
              <button
                onClick={() => {
                  setSelectedContact(null);
                  setShowAddDebtModal(true);
                }}
                className="btn-success"
              >
                + Add Debt
              </button>

              <button
                onClick={() => setShowAddContactModal(true)}
                className="btn-primary"
              >
                + Add Contact
              </button>
            </div>

            <IncomingRequests
              uid={user.uid}
              requests={incomingRequests}
              onDecline={handleDeclineRequest}
            />

            <OutgoingRequests requests={outgoingRequests} />

            <ContactsList
              contacts={contacts}
              onSettle={(contact) => {
                setSelectedContact(contact);
                setShowSettleModal(true);
              }}
              onViewHistory={(contact) => {
                setSelectedContact(contact);
                fetchTransactions(user.uid, contact.id);
                setShowTransactionHistoryModal(true);
              }}
              onAddDebt={(contact) => {
                setSelectedContact(contact);
                setShowAddDebtModal(true);
              }}
            />
          </>
        )}
      </div>
    </main>
  );
}
