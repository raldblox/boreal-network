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
    <div className="flex max-w-4xl flex-col items-center px-4 text-center" key="overview">
      <motion.div
        animate={{ opacity: 1, y: 0 }}
        className="max-w-4xl font-normal text-[2rem] leading-[1.05] tracking-[-0.02em] text-foreground md:text-[4rem] lg:text-[3rem]"
        data-testid="empty-chat-headline"
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
    </div>
  );
};
