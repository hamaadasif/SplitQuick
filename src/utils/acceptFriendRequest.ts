// src/utils/acceptFriendRequest.ts
import { db } from "../lib/firebaseConfig";
import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  serverTimestamp,
  updateDoc,
  deleteField,          // ✅ use the real deleteField
} from "firebase/firestore";

/**
 * Accept an incoming friend request.
 * uid = current user (recipient)
 * otherUid = requester
 */
export async function acceptFriendRequest(uid: string, otherUid: string) {
  const meRef = doc(db, "contacts", uid);
  const otherRef = doc(db, "contacts", otherUid);

  const [meSnap, otherSnap] = await Promise.all([getDoc(meRef), getDoc(otherRef)]);
  if (!meSnap.exists()) throw new Error("Your contacts doc is missing.");
  if (!otherSnap.exists()) throw new Error("Other user contacts doc is missing.");

  const me = meSnap.data() || {};
  const other = otherSnap.data() || {};

  // Ensure minimal contact entries exist (names/emails are optional niceties)
  const myEntry = me.contacts?.[otherUid] || { netDebt: 0, status: "settled" };
  const theirEntry = other.contacts?.[uid] || { netDebt: 0, status: "settled" };

  await Promise.all([
    updateDoc(meRef, {
      [`contacts.${otherUid}.netDebt`]: myEntry.netDebt || 0,
      [`contacts.${otherUid}.status`]: myEntry.status || "settled",
    }),
    updateDoc(otherRef, {
      [`contacts.${uid}.netDebt`]: theirEntry.netDebt || 0,
      [`contacts.${uid}.status`]: theirEntry.status || "settled",
    }),
  ]);

  // Remove request entries on both sides (✅ deleteField)
  await Promise.all([
    updateDoc(meRef, { [`incomingRequests.${otherUid}`]: deleteField() }),
    updateDoc(otherRef, { [`outgoingRequests.${uid}`]: deleteField() }),
  ]);

  // --- Migrate staged transactions (both directions) ---
  const theirStagedSnap = await getDocs(
    collection(db, `contacts/${otherUid}/staged/${uid}/transactions`)
  );
  const yourStagedSnap = await getDocs(
    collection(db, `contacts/${uid}/staged/${otherUid}/transactions`)
  );

  let netChangeForMe = 0;
  let netChangeForOther = 0;

  const moveBatch = async (
    fromUid: string,
    toUid: string,
    stagedSnap: typeof theirStagedSnap
  ) => {
    for (const d of stagedSnap.docs) {
      const t = d.data() as {
        amount: number;
        signedAmount: number;
        description?: string | null;
        createdAt?: any;
        createdBy: string;
      };

      // Write to creator (same sign)
      await addDoc(
        collection(db, `contacts/${fromUid}/contacts/${toUid}/transactions`),
        {
          amount: t.amount,
          signedAmount: t.signedAmount,
          description: t.description ?? null,
          createdAt: t.createdAt || serverTimestamp(),
          createdBy: t.createdBy,
          migratedAt: serverTimestamp(),
        }
      );

      // Mirrored to counterparty (flipped sign)
      await addDoc(
        collection(db, `contacts/${toUid}/contacts/${fromUid}/transactions`),
        {
          amount: t.amount,
          signedAmount: -t.signedAmount,
          description: t.description ?? null,
          createdAt: t.createdAt || serverTimestamp(),
          createdBy: t.createdBy,
          migratedAt: serverTimestamp(),
        }
      );

      // Track totals from *my* perspective
      if (fromUid === uid) {
        netChangeForMe += t.signedAmount;
        netChangeForOther -= t.signedAmount;
      } else {
        netChangeForMe -= t.signedAmount;
        netChangeForOther += t.signedAmount;
      }

      await deleteDoc(d.ref);
    }
  };

  await moveBatch(otherUid, uid, theirStagedSnap);
  await moveBatch(uid, otherUid, yourStagedSnap);

  // Update netDebt + status for both
  const meAfter = (me.contacts?.[otherUid]?.netDebt || 0) + netChangeForMe;
  const otherAfter = (other.contacts?.[uid]?.netDebt || 0) + netChangeForOther;

  await Promise.all([
    updateDoc(meRef, {
      [`contacts.${otherUid}.netDebt`]: meAfter,
      [`contacts.${otherUid}.status`]: meAfter === 0 ? "settled" : "unsettled",
    }),
    updateDoc(otherRef, {
      [`contacts.${uid}.netDebt`]: otherAfter,
      [`contacts.${uid}.status`]: otherAfter === 0 ? "settled" : "unsettled",
    }),
  ]);
}
