"use client";

import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useState, type ReactNode } from "react";
import { DigitalHeartbeatLoader } from "./DigitalHeartbeatLoader";
import { useNetworkStatus } from "./useNetworkStatus";
import "./loader.css";

const SLOW_MESSAGES = [
  "Slow connection detected...",
  "Fetching live traffic data...",
  "Optimizing routes... Please wait.",
];

/** On fast connections the loader stays invisible unless loading
 *  outlasts this grace period — then it flashes in briefly. */
const FAST_GRACE_MS = 250;

function RotatingMessages() {
  const [index, setIndex] = useState(0);

  useEffect(() => {
    const id = setInterval(
      () => setIndex((i) => (i + 1) % SLOW_MESSAGES.length),
      3000,
    );
    return () => clearInterval(id);
  }, []);

  return (
    <div className="nal-msg-slot">
      <AnimatePresence mode="wait">
        <motion.p
          key={index}
          className="nal-msg"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          transition={{ duration: 0.45 }}
        >
          {SLOW_MESSAGES[index]}
        </motion.p>
      </AnimatePresence>
    </div>
  );
}

export function NetworkAwareLoader({
  isLoading,
  children,
  onRetry,
  forceStatus,
}: {
  isLoading: boolean;
  children: ReactNode;
  /** Called by the offline "Retry" button; defaults to a full reload. */
  onRetry?: () => void;
  /** Override the detected network status (for demos and tests). */
  forceStatus?: ReturnType<typeof useNetworkStatus>["status"];
}) {
  const { status: detected, refresh } = useNetworkStatus();
  const status = forceStatus ?? detected;
  const [pastGrace, setPastGrace] = useState(false);

  // FAST connections skip the loader entirely for sub-250ms loads
  useEffect(() => {
    if (!isLoading) {
      setPastGrace(false);
      return;
    }
    const id = setTimeout(() => setPastGrace(true), FAST_GRACE_MS);
    return () => clearTimeout(id);
  }, [isLoading]);

  const showOverlay =
    (isLoading || status === "OFFLINE") &&
    (status !== "FAST" || pastGrace || status === ("OFFLINE" as never));

  function retry() {
    refresh();
    if (navigator.onLine) (onRetry ?? (() => window.location.reload()))();
  }

  return (
    <div className="nal-root">
      {/* Page content stays mounted underneath — visible blurred through the glass */}
      {children}

      <AnimatePresence>
        {showOverlay && (
          <motion.div
            key={`loader-${status}`}
            className="nal-overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: status === "FAST" ? 0.12 : 0.35 }}
          >
            <span className="nal-blob teal" aria-hidden />
            <span className="nal-blob purple" aria-hidden />
            <DigitalHeartbeatLoader flatline={status === "OFFLINE"} />

            {status === "FAST" && <p className="nal-msg">Loading...</p>}

            {status === "MEDIUM" && (
              <motion.p
                className="nal-msg"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.6 }}
              >
                Connecting to CityPulse...
              </motion.p>
            )}

            {status === "SLOW" && <RotatingMessages />}

            {status === "OFFLINE" && (
              <motion.div
                className="nal-offline"
                role="alert"
                initial={{ opacity: 0, y: 14 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4 }}
              >
                <div className="nal-offline-title">You are currently offline.</div>
                <p>
                  Please check your connection to view live parking slots.
                </p>
                <button type="button" className="nal-retry" onClick={retry}>
                  Retry
                </button>
              </motion.div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
