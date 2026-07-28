import React, { useEffect, useState } from "react";
import { api } from "../../lib/api";
import { Users, MessageSquare, Mail, Inbox, Rocket, EyeOff, Clock } from "lucide-react";

const CARDS = [
  { key: "users", label: "Team Members", Icon: Users },
  { key: "reviews", label: "Total Reviews", Icon: MessageSquare },
  { key: "pending_reviews", label: "Pending Reviews", Icon: Clock },
  { key: "hidden_reviews", label: "Hidden Reviews", Icon: EyeOff },
  { key: "newsletter", label: "Newsletter Subscribers", Icon: Mail },
  { key: "contacts", label: "Contact Submissions", Icon: Inbox },
  { key: "coming_soon", label: "Coming Soon Drops", Icon: Rocket },
];

export default function AdminOverview() {
  const [data, setData] = useState(null);
  useEffect(() => {
    api.get("/admin/overview").then((r) => setData(r.data)).catch(() => setData({}));
  }, []);

  return (
    <div data-testid="admin-overview">
      <h1 className="font-display text-3xl font-bold mb-1">Studio Overview</h1>
      <p className="text-neutral-400 text-sm mb-10">Everything happening across UR SETUP right now.</p>
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
        {CARDS.map(({ key, label, Icon }) => (
          <div key={key} className="border border-white/10 bg-[#0f0f0f] p-6" data-testid={`overview-${key}`}>
            <div className="flex items-center justify-between mb-4">
              <p className="kicker">{label}</p>
              <Icon className="w-4 h-4 text-neutral-500" />
            </div>
            <p className="font-display text-4xl font-extrabold">
              {data ? (data[key] ?? 0) : "—"}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}
