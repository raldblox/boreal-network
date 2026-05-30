import { motion } from "framer-motion";
import type { RequestStatus } from "@/lib/request";

export const Greeting = ({
  isRequestMode,
  requestStatus,
}: {
  isRequestMode: boolean;
  requestStatus?: RequestStatus | null;
}) => {
  const isDraftRequest = requestStatus === "draft";
  const isOpenedRequest = Boolean(requestStatus && requestStatus !== "draft");
  const isPendingRequestStart = isRequestMode && !requestStatus;

  return (
    <div className="flex max-w-2xl flex-col items-center px-4 text-center" key="overview">
      <motion.div
        animate={{ opacity: 1, y: 0 }}
        className="font-semibold text-3xl tracking-tight text-foreground [font-family:var(--font-display)] md:text-5xl"
        initial={{ opacity: 0, y: 10 }}
        transition={{ delay: 0.18, duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
      >
        {isDraftRequest
          ? "Shape the request"
          : isPendingRequestStart
            ? "What needs to get done?"
          : isOpenedRequest
            ? "Active request room"
            : "What needs to get done?"}
      </motion.div>
      <motion.div
        animate={{ opacity: 1, y: 0 }}
        className="mt-4 max-w-xl text-muted-foreground/82 text-sm leading-7 md:text-[15px]"
        initial={{ opacity: 0, y: 10 }}
        transition={{ delay: 0.3, duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
      >
        {isDraftRequest
          ? "Keep the ask, done condition, constraints, budget, timing, and proof visible before it opens."
          : isPendingRequestStart
            ? "Describe the work, done condition, constraints, budget, timing, and proof."
            : isOpenedRequest
            ? "Move the request forward here. Post updates, adjust details, ask for recent activity, or decide the next step."
            : "Ask a question or start a request when the work needs execution, proof, and follow-through."}
      </motion.div>
    </div>
  );
};
