"use client";

type RequestItem = {
  id: string;
  name: string;
  email: string;
};

export default function OutgoingRequests({ requests }: { requests: RequestItem[] }) {
  if (!requests || requests.length === 0) return null;

  return (
    <section className="mt-6">
      <div className="card">
        <div className="card-header">
          <div className="flex items-center gap-2">
            <h2 className="h2">Outgoing Requests</h2>
            <span className="badge badge-amber">{requests.length}</span>
          </div>
          <p className="muted">Waiting for them to accept.</p>
        </div>

        <div className="card-body">
          <ul className="space-y-3">
            {requests.map((request) => {
              const initial =
                (request.name || request.email || "U")
                  .trim()
                  .charAt(0)
                  .toUpperCase() || "U";

              return (
                <li
                  key={request.id}
                  className="flex items-center justify-between gap-3 rounded-2xl border border-slate-200/70 bg-white p-4"
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

                  <span className="badge badge-amber">Pending</span>
                </li>
              );
            })}
          </ul>
        </div>
      </div>
    </section>
  );
}
