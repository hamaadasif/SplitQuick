"use client";

import { useEffect, useState } from "react";
import { db } from "../../lib/firebaseConfig";
import { doc, updateDoc, deleteField } from "firebase/firestore";
import { acceptFriendRequest } from "../../utils/acceptFriendRequest";

type RequestItem = {
  id: string;
  name: string;
  email: string;
};

export default function IncomingRequests({
  uid,
  requests,
  onAccept,
  onDecline,
}: {
  uid: string;
  requests: RequestItem[];
  onAccept?: (request: RequestItem) => void;
  onDecline?: (request: RequestItem) => void;
}) {
  const [items, setItems] = useState<RequestItem[]>(requests || []);
  const [loadingId, setLoadingId] = useState<string | null>(null);
  const [err, setErr] = useState<string>("");

  useEffect(() => {
    setItems(requests || []);
  }, [requests]);

  const handleAccept = async (request: RequestItem) => {
    try {
      setErr("");
      setLoadingId(request.id);
      await acceptFriendRequest(uid, request.id);
      setItems((prev) => prev.filter((r) => r.id !== request.id));
      onAccept?.(request);
    } catch (e: any) {
      console.error(e);
      setErr("Failed to accept request. Please try again.");
    } finally {
      setLoadingId(null);
    }
  };

  const handleDecline = async (request: RequestItem) => {
    if (onDecline) {
      onDecline(request);
      return;
    }
    try {
      setErr("");
      setLoadingId(request.id);

      const meRef = doc(db, "contacts", uid);
      const otherRef = doc(db, "contacts", request.id);

      await Promise.all([
        updateDoc(meRef, { [`incomingRequests.${request.id}`]: deleteField() }),
        updateDoc(otherRef, { [`outgoingRequests.${uid}`]: deleteField() }),
      ]);

      setItems((prev) => prev.filter((r) => r.id !== request.id));
    } catch (e: any) {
      console.error(e);
      setErr("Failed to decline request. Please try again.");
    } finally {
      setLoadingId(null);
    }
  };

  if (!items || items.length === 0) return null;

  return (
    <section className="mt-6">
      <div className="card">
        <div className="card-header">
          <div className="flex items-center gap-2">
            <h2 className="h2">Incoming Requests</h2>
            <span className="badge badge-amber">{items.length}</span>
          </div>
          <p className="muted">Approve to add them to your contacts.</p>
        </div>

        <div className="card-body">
          {err && (
            <div className="mb-3 rounded-xl bg-rose-50 px-3 py-2 text-sm text-rose-700 ring-1 ring-rose-200/60">
              {err}
            </div>
          )}

          <ul className="space-y-3">
            {items.map((request) => {
              const isBusy = loadingId === request.id;
              const initial =
                (request.name || request.email || "U")
                  .trim()
                  .charAt(0)
                  .toUpperCase() || "U";

              return (
                <li
                  key={request.id}
                  className="flex flex-col gap-3 rounded-2xl border border-slate-200/70 bg-white p-4 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div className="flex items-start gap-3">
                    <div className="grid h-10 w-10 shrink-0 place-items-center rounded-2xl bg-slate-100 text-slate-700 ring-1 ring-slate-200/70">
                      <span className="text-sm font-semibold">{initial}</span>
                    </div>

                    <div>
                      <div className="font-medium text-slate-900">
                        {request.name}
                      </div>
                      <div className="text-sm text-slate-500">
                        {request.email}
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-end">
                    <button
                      onClick={() => handleDecline(request)}
                      className="btn-danger disabled:opacity-60"
                      disabled={isBusy}
                    >
                      {isBusy ? "Working..." : "Decline"}
                    </button>
                    <button
                      onClick={() => handleAccept(request)}
                      className="btn-success disabled:opacity-60"
                      disabled={isBusy}
                    >
                      {isBusy ? "Working..." : "Accept"}
                    </button>
                  </div>
                </li>
              );
            })}
          </ul>
        </div>
      </div>
    </section>
  );
}
