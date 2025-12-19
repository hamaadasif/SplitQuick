"use client";

export default function DashboardHeader({ onLogout }: { onLogout: () => void }) {
  return (
    <header className="card">
      <div className="card-header">
        <div className="flex items-center gap-3">
          <div className="grid h-10 w-10 place-items-center rounded-2xl bg-blue-50 text-blue-700 ring-1 ring-blue-100">
            <span className="text-sm font-semibold">$</span>
          </div>

          <div>
            <h1 className="h1 leading-tight">Dashboard</h1>
            <p className="muted">Track balances, settle up, and stay synced.</p>
          </div>
        </div>

        <button onClick={onLogout} className="btn-danger">
          Logout
        </button>
      </div>
    </header>
  );
}
