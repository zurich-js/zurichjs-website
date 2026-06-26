import { motion, AnimatePresence } from "framer-motion";
import { Trophy, X, ArrowRight } from "lucide-react";
import { useState, useEffect, useCallback } from "react";
import { createPortal } from "react-dom";

import useEvents from "@/hooks/useEvents";

/**
 * One-time interstitial shown to first-time visitors of the ZurichJS *meetup*
 * site, nudging the (likely larger, better-ranked) inbound search traffic that
 * actually meant to reach the ZurichJS *conference* site over to conf.zurichjs.com.
 *
 * Shown at most once per browser via a localStorage flag. All outbound clicks
 * carry UTM tags so the conference site can attribute the redirected traffic.
 */

const SEEN_STORAGE_KEY = "zurichjs_conf_redirect_modal_seen";

const CONF_URL = "https://conf.zurichjs.com";
const UTM_PARAMS =
  "?utm_source=zurichjs&utm_medium=website&utm_campaign=conf2026&utm_content=welcome_modal";
const CONF_CTA_URL = `${CONF_URL}${UTM_PARAMS}`;

/** Delay before showing so it doesn't fight with first paint / layout shift. */
const SHOW_DELAY_MS = 1200;

export default function ConfRedirectModal() {
  const { track } = useEvents();
  const [isOpen, setIsOpen] = useState(false);

  // First-time-visitor check — localStorage only, so it stays hydration-safe.
  useEffect(() => {
    let alreadySeen = false;
    try {
      alreadySeen = localStorage.getItem(SEEN_STORAGE_KEY) === "true";
    } catch {
      // Private mode / storage disabled — fail closed and don't nag.
      alreadySeen = true;
    }
    if (alreadySeen) return;

    const timer = setTimeout(() => setIsOpen(true), SHOW_DELAY_MS);
    return () => clearTimeout(timer);
  }, []);

  // Persist the "seen" flag the first time it actually opens, and track it.
  useEffect(() => {
    if (!isOpen) return;
    try {
      localStorage.setItem(SEEN_STORAGE_KEY, "true");
    } catch {
      // Ignore — best-effort.
    }
    track("conf_redirect_modal_shown", { location: "meetup_website" });
  }, [isOpen, track]);

  const close = useCallback(
    (reason: "dismiss" | "cta") => {
      if (reason === "dismiss") {
        track("conf_redirect_modal_dismissed", { location: "meetup_website" });
      }
      setIsOpen(false);
    },
    [track],
  );

  const handleCtaClick = useCallback(() => {
    track("conf_redirect_modal_cta_clicked", {
      location: "meetup_website",
      destination: CONF_URL,
    });
    close("cta");
  }, [track, close]);

  // Escape to dismiss.
  useEffect(() => {
    if (!isOpen) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") close("dismiss");
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [isOpen, close]);

  if (typeof document === "undefined") return null;

  return createPortal(
    <AnimatePresence>
      {isOpen && (
        <motion.div
          className="fixed inset-0 z-[100] flex items-center justify-center p-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
        >
          {/* Backdrop */}
          <button
            type="button"
            aria-label="Close"
            className="absolute inset-0 bg-black/60 backdrop-blur-sm cursor-pointer"
            onClick={() => close("dismiss")}
          />

          {/* Dialog */}
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-labelledby="conf-redirect-title"
            aria-describedby="conf-redirect-desc"
            className="relative w-full max-w-lg overflow-hidden rounded-2xl bg-white shadow-2xl"
            initial={{ opacity: 0, scale: 0.95, y: 12 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 12 }}
            transition={{ duration: 0.2 }}
          >
            <button
              type="button"
              aria-label="Close"
              onClick={() => close("dismiss")}
              className="absolute right-3 top-3 z-10 rounded-full p-1.5 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-700 focus:outline-none focus:ring-2 focus:ring-black/30 cursor-pointer"
            >
              <X size={20} aria-hidden="true" />
            </button>

            {/* Award banner */}
            <div className="bg-black px-6 py-4">
              <span className="inline-flex items-center gap-2 rounded-full bg-[#F7DF1E] px-3 py-1 text-xs font-bold text-black">
                <Trophy size={14} aria-hidden="true" />
                OSS Awards · JSNation
              </span>
            </div>

            <div className="px-6 py-6 sm:px-8">
              <h2 id="conf-redirect-title" className="text-2xl font-bold leading-tight text-black">
                Did you mean the ZurichJS Conference?
              </h2>
              <p id="conf-redirect-desc" className="mt-3 text-gray-700">
                You&apos;re on the ZurichJS <strong>meetup</strong> site. If you were looking for
                our conference — speakers, tickets, and the full programme — that lives at a
                different address.
              </p>
              <p className="mt-3 text-sm text-gray-600">
                ZurichJS won the <strong>highest impact community globally</strong> award at the OSS
                Awards during JSNation. ZurichJS Conf 2026 is us taking that impact to the next
                level. 🚀
              </p>

              <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center">
                <a
                  href={CONF_CTA_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={handleCtaClick}
                  className="inline-flex flex-1 items-center justify-center gap-2 rounded-md bg-black px-5 py-3 font-semibold text-white transition-colors hover:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-black focus:ring-offset-2"
                >
                  Take me to the conference
                  <ArrowRight size={18} aria-hidden="true" />
                </a>
                <button
                  type="button"
                  onClick={() => close("dismiss")}
                  className="rounded-md px-5 py-3 font-medium text-gray-600 transition-colors hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-black/30 cursor-pointer"
                >
                  Stay on the meetup site
                </button>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body,
  );
}
