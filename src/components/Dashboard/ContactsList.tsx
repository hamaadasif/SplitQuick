"use client";

import { useEffect, useMemo, useState } from "react";
import { db } from "../../lib/firebaseConfig";
import { doc, getDoc } from "firebase/firestore";

type Contact = {
  id: string;
  name?: string;
  email?: string;
  netDebt?: number; // + they owe you, - you owe them
  status?: "settled" | "unsettled";
  ghost?: boolean;
};

export default function ContactsList({
  contacts,
  onSettle,
  onViewHistory,
}: {
  contacts: Contact[];
  onSettle: (contact: Contact) => void;
  onViewHistory: (contact: Contact) => void;
}) {
  const [nameCache, setNameCache] = useState<Record<string, string>>({});

  useEffect(() => {
    (async () => {
      const toFetch = contacts
        .filter(
          (c) =>
            c.id &&
            !c.ghost &&
            !c.id.startsWith("ghost-") &&
            (!c.name || !c.name.trim()) &&
            !nameCache[c.id]
        )
        .map((c) => c.id);

      if (toFetch.length === 0) return;

      const updates: Record<string, string> = {};
      await Promise.all(
        toFetch.map(async (uid) => {
          try {
            const snap = await getDoc(doc(db, "users", uid));
            if (snap.exists()) {
              const data = snap.data() as any;
              const fetched = (data?.name || data?.email || "")
                .toString()
                .trim();
              if (fetched) updates[uid] = fetched;
            }
          } catch (e) {
            console.error("Failed fetching user name for", uid, e);
          }
        })
      );

      if (Object.keys(updates).length) {
        setNameCache((prev) => ({ ...prev, ...updates }));
      }
    })();
  }, [contacts, nameCache]);

  const rows = useMemo(() => {
    return contacts.map((c) => {
      const fetchedName = nameCache[c.id];
      const label =
        (c.name && c.name.trim()) ||
        fetchedName ||
        (c.email && c.email.trim()) ||
        (c.id.startsWith("ghost-") ? c.email || "Ghost contact" : "Unknown");

      const net = Number(c.netDebt || 0);
      const theyOweYou = net > 0;
      const youOweThem = net < 0;

      let summary = "All settled";
      let summaryClass = "text-slate-600";
      if (theyOweYou) {
        summary = `They owe you $${Math.abs(net).toFixed(2)}`;
        summaryClass = "text-emerald-700 font-semibold";
      } else if (youOweThem) {
        summary = `You owe them $${Math.abs(net).toFixed(2)}`;
        summaryClass = "text-rose-700 font-semibold";
      }

      const status = c.status || (net === 0 ? "settled" : "unsettled");

      return {
        ...c,
        label,
        net,
        status,
        summary,
        summaryClass,
      };
    });
  }, [contacts, nameCache]);

  if (!rows || rows.length === 0) {
    return (
      <section className="mt-6">
        <div className="card">
          <div className="card-header">
            <h2 className="h2">Your Contacts</h2>
            <span className="badge badge-amber">0</span>
          </div>
          <div className="card-body">
            <p className="muted">No contacts yet.</p>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="mt-6">
      <div className="card">
        <div className="card-header">
          <h2 className="h2">Your Contacts</h2>
          <span className="badge badge-amber">{rows.length}</span>
        </div>

        <div className="card-body">
          <ul className="space-y-3">
            {rows.map((c) => {
              const statusBadge =
                c.status === "settled" ? "badge-green" : "badge-amber";

              const initial =
                (c.label || "U").trim().charAt(0).toUpperCase() || "U";

              return (
                <li
                  key={c.id}
                  className="rounded-2xl border border-slate-200/70 bg-white p-4 transition hover:bg-slate-50"
                >
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex items-start gap-3">
                      <div className="grid h-10 w-10 shrink-0 place-items-center rounded-2xl bg-slate-100 text-slate-700 ring-1 ring-slate-200/70">
                        <span className="text-sm font-semibold">{initial}</span>
                      </div>

                      <div>
                        <div className="flex flex-wrap items-center gap-2">
                          <div className="font-medium text-slate-900">
                            {c.label}
                          </div>
                          <span className={`badge ${statusBadge}`}>
                            {c.status}
                          </span>
                        </div>

                        <div className={`mt-1 ${c.summaryClass}`}>
                          {c.summary}
                        </div>

                        {c.email && (
                          <div className="mt-0.5 text-xs text-slate-500">
                            {c.email}
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-end">
                      <button
                        onClick={() => onViewHistory(c)}
                        className="btn-secondary"
                      >
                        View History
                      </button>
                      <button
                        onClick={() => onSettle(c)}
                        className="btn-primary"
                      >
                        Settle Debt
                      </button>
                    </div>
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
