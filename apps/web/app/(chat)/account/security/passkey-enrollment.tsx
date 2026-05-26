"use client";

import {
  startRegistration,
  type PublicKeyCredentialCreationOptionsJSON,
} from "@simplewebauthn/browser";
import { KeyRoundIcon, LoaderIcon } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "@/components/chat/toast";
import { Button } from "@/components/ui/button";

type RegistrationStartResponse = {
  challengeId: string;
  options: PublicKeyCredentialCreationOptionsJSON;
};

export function PasskeyEnrollment() {
  const router = useRouter();
  const [isEnrolling, setIsEnrolling] = useState(false);

  async function enrollPasskey() {
    setIsEnrolling(true);

    try {
      const startResponse = await fetch("/api/account/passkeys", {
        method: "POST",
      });

      if (!startResponse.ok) {
        throw new Error("Failed to start passkey enrollment.");
      }

      const { challengeId, options } =
        (await startResponse.json()) as RegistrationStartResponse;
      const registrationResponse = await startRegistration({
        optionsJSON: options,
      });
      const verifyResponse = await fetch("/api/account/passkeys/verify", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          challengeId,
          response: registrationResponse,
        }),
      });

      if (!verifyResponse.ok) {
        throw new Error("Failed to verify passkey enrollment.");
      }

      toast({
        type: "success",
        description: "Passkey added. Future sign-ins will ask for it.",
      });
      router.refresh();
    } catch (error) {
      toast({
        type: "error",
        description:
          error instanceof Error
            ? error.message
            : "Passkey enrollment failed.",
      });
    } finally {
      setIsEnrolling(false);
    }
  }

  return (
    <Button
      disabled={isEnrolling}
      onClick={enrollPasskey}
      type="button"
      variant="outline"
    >
      {isEnrolling ? (
        <LoaderIcon className="size-4 animate-spin" />
      ) : (
        <KeyRoundIcon className="size-4" />
      )}
      {isEnrolling ? "Adding passkey..." : "Add passkey"}
    </Button>
  );
}
