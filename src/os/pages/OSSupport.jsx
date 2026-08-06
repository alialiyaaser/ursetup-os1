import React from "react";
import { useOutletContext } from "react-router-dom";
import { MessageSquare, Send } from "lucide-react";

/**
 * Support Center — placeholder-ready.
 * Will host WhatsApp/Email inbox in the next phase.
 * For now, shows a preview of the integration slots.
 */
export default function OSSupport() {
  const { t, k } = useOutletContext();

  const integrations = [
    { key: "whatsapp", name: "WhatsApp Business", desc: "الرد على العملاء من داخل النظام", Icon: MessageSquare },
    { key: "email", name: "Email Inbox", desc: "SendGrid / Resend", Icon: Send },
  ];

  return (
    <div data-testid="os-support" className="space-y-6">
      <div>
        <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight">{t.support.title}</h1>
        <p className={`mt-1 text-sm ${k.muted}`}>{t.support.subtitle}</p>
      </div>

      <div className="grid sm:grid-cols-2 gap-4">
        {integrations.map((it) => (
          <div key={it.key} className={`border ${k.cardBorder} ${k.cardBg} rounded-xl p-6`} data-testid={`support-${it.key}`}>
            <div className="flex items-center gap-3 mb-2">
              <div className={`w-10 h-10 rounded-lg ${k.accentSoft} flex items-center justify-center`}>
                <it.Icon className="w-5 h-5" />
              </div>
              <div>
                <p className="font-semibold">{it.name}</p>
                <p className={`text-xs ${k.muted}`}>{it.desc}</p>
              </div>
            </div>
            <span className={`inline-block mt-3 text-xs px-2 py-0.5 rounded-full border ${k.chip}`}>
              {t.dashboard.not_connected}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
