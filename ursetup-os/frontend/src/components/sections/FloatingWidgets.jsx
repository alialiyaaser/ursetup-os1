import React, { useEffect, useState } from "react";
import { ArrowUp } from "lucide-react";
import { useLang } from "../../contexts/LangContext";

export default function FloatingWidgets() {
  const { dir } = useLang();
  const [show, setShow] = useState(false);
  useEffect(() => {
    const onScroll = () => setShow(window.scrollY > 600);
    window.addEventListener("scroll", onScroll);
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const side = dir === "rtl" ? "left-5" : "right-5";
  const side2 = dir === "rtl" ? "right-5" : "left-5";

  return (
    <>
      {/* WhatsApp floating */}
      <a
        href="https://wa.me/966500000000"
        target="_blank"
        rel="noreferrer"
        data-testid="whatsapp-float"
        aria-label="WhatsApp"
        className={`fixed bottom-6 ${side2} z-40 w-14 h-14 rounded-full bg-[#25D366] text-black flex items-center justify-center shadow-[0_20px_40px_-10px_rgba(37,211,102,0.55)] hover:scale-110 transition-transform duration-300`}
      >
        <svg viewBox="0 0 24 24" className="w-6 h-6" fill="currentColor">
          <path d="M20.52 3.48A11.94 11.94 0 0 0 12.05 0C5.5 0 .17 5.32.17 11.86c0 2.09.55 4.14 1.6 5.94L0 24l6.36-1.66a11.9 11.9 0 0 0 5.69 1.45h.01c6.55 0 11.87-5.32 11.87-11.87 0-3.17-1.23-6.14-3.41-8.44Zm-8.47 18.28h-.01a9.86 9.86 0 0 1-5.03-1.38l-.36-.21-3.77.99 1.01-3.68-.23-.38a9.87 9.87 0 0 1-1.51-5.24c0-5.45 4.44-9.88 9.9-9.88 2.64 0 5.13 1.03 6.99 2.9a9.79 9.79 0 0 1 2.89 6.99c0 5.45-4.43 9.88-9.88 9.88Zm5.72-7.4c-.31-.16-1.85-.91-2.14-1.02-.29-.11-.5-.16-.71.16-.21.31-.81 1.02-.99 1.23-.18.21-.36.24-.68.08-.31-.16-1.32-.49-2.52-1.55-.93-.83-1.56-1.85-1.74-2.16-.18-.31-.02-.48.14-.63.14-.14.31-.36.47-.55.16-.18.21-.31.31-.52.11-.21.05-.39-.03-.55-.08-.16-.71-1.72-.98-2.35-.26-.62-.52-.54-.71-.55l-.6-.01c-.21 0-.55.08-.83.39-.29.31-1.09 1.06-1.09 2.6 0 1.53 1.12 3.02 1.28 3.23.16.21 2.2 3.36 5.33 4.71.75.32 1.34.51 1.79.66.75.24 1.43.21 1.97.13.6-.09 1.85-.76 2.11-1.49.26-.73.26-1.36.18-1.49-.08-.13-.28-.21-.6-.36Z"/>
        </svg>
      </a>

      {/* Back to top */}
      <button
        onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
        data-testid="back-to-top"
        aria-label="Back to top"
        className={`fixed bottom-6 ${side} z-40 w-12 h-12 rounded-full bg-white text-black flex items-center justify-center transition-all duration-500 ${
          show ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"
        } hover:scale-110`}
      >
        <ArrowUp className="w-4 h-4" />
      </button>
    </>
  );
}
