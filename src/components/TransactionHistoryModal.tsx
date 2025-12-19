"use client";

import { Timestamp } from "firebase/firestore";

type Tx = {
  id: string;
  amount?: number;
  signedAmount?: number;
  description?: string | null;
  createdAt?: Timestamp | { seconds: number; nanoseconds: number } | Date | null;
};

export default function TransactionHistoryModal({
  contact,
  transactions,
  onClose,
}: {
  contact: { id: string; name?: string; email?: string };
  transactions: Tx[];
  onClose: () => void;
}) {
  const title =
    (contact?.name && contact.name.trim()) ||
    (contact?.email && contact.email.trim()) ||
    "Transaction History";

  const renderDate = (value: Tx["createdAt"]) => {
    if (!value) return "—";
    const d =
      value instanceof Date
        ? value
        : "seconds" in (value as any)
        ? new Date((value as any).seconds * 1000)
        : (value as any).toDate?.() ?? null;

    return d ? d.toLocaleString() : "—";
  };

  const rows = (transactions || []).map((t) => {
    const amt =
      typeof t.signedAmount === "number"
        ? t.signedAmount
        : typeof t.amount === "number"
        ? t.amount
        : 0;

    const theyOwe = amt > 0;
    const youOwe = amt < 0;

    return {
      ...t,
      label: theyOwe ? "They owe you" : youOwe ? "You owe them" : "Settled",
      amountText: `$${Math.abs(amt).toFixed(2)}`,
      color:
        amt === 0
          ? "text-slate-600"
          : theyOwe
          ? "text-emerald-600"
          : "text-rose-600",
      when: renderDate(t.createdAt),
    };
  });

  return (
    <div className="modal-backdrop">
      <div className="modal-panel max-w-xl">
        <div className="modal-head">
          <h3 className="modal-title">{title}</h3>
          <button onClick={onClose} className="btn-secondary">
            Close
          </button>
        </div>

        <div className="modal-body max-h-[70vh] overflow-y-auto">
          {rows.length === 0 ? (
            <p className="muted">No transactions yet.</p>
          ) : (
            <ul className="space-y-3">
              {rows.map((t) => (
                <li
                  key={t.id}
                  className="rounded-xl border border-slate-200/70 bg-white p-4"
                >
                  <div className={`font-medium ${t.color}`}>
                    {t.label} {t.amountText}
                  </div>

                  {t.description && (
                    <div className="mt-1 text-sm text-slate-700">
                      {t.description}
                    </div>
                  )}

                  <div className="mt-1 text-xs text-slate-500">
                    {t.when}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="modal-actions">
          <button onClick={onClose} className="btn-secondary">
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
