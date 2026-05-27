"use client";

import { AvatarCall, type ConnectResponse } from "@runwayml/avatars-react";
import { ArrowRightIcon, VideoIcon } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "@/components/chat/toast";
import { cn } from "@/lib/utils";

type CharacterCallLauncherProps = {
  className?: string;
  fulfillmentId?: string | null;
  requestId: string;
};

type SessionResponse = {
  sessionId: string;
  serverUrl?: string;
  token?: string;
  roomName?: string;
  message?: string;
  cause?: string;
};

export function CharacterCallLauncher({
  className,
  fulfillmentId,
  requestId,
}: CharacterCallLauncherProps) {
  const [avatarId, setAvatarId] = useState("");
  const [activeAvatarId, setActiveAvatarId] = useState<string | null>(null);
  const [sessionId, setSessionId] = useState<string | null>(null);

  const connect = async (nextAvatarId: string): Promise<ConnectResponse> => {
    const response = await fetch("/api/services/character-call-starter/session", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        avatarId: nextAvatarId,
        fulfillmentId: fulfillmentId ?? undefined,
        requestId,
      }),
    });
    const data = (await response.json().catch(() => null)) as
      | SessionResponse
      | null;

    if (!response.ok || !data) {
      throw new Error(
        data?.cause || data?.message || "Runway session could not start."
      );
    }

    if (!data.serverUrl || !data.token || !data.roomName) {
      throw new Error("Runway did not return complete session credentials.");
    }

    setSessionId(data.sessionId);

    return {
      sessionId: data.sessionId,
      serverUrl: data.serverUrl,
      token: data.token,
      roomName: data.roomName,
    };
  };

  const startCall = () => {
    const normalizedAvatarId = avatarId.trim();
    if (!normalizedAvatarId) {
      toast({
        type: "error",
        description: "Paste an existing Runway avatar id first.",
      });
      return;
    }

    setSessionId(null);
    setActiveAvatarId(normalizedAvatarId);
  };

  return (
    <div
      className={cn(
        "overflow-hidden rounded-[24px] border border-cyan-300/35 bg-cyan-50/70 dark:bg-cyan-500/10",
        className
      )}
    >
      <div className="border-b border-cyan-300/25 px-4 py-4">
        <div className="flex items-start gap-3">
          <div className="flex size-9 shrink-0 items-center justify-center rounded-full bg-cyan-500/12 text-cyan-700 dark:text-cyan-300">
            <VideoIcon className="size-4" />
          </div>
          <div>
            <div className="text-[11px] font-medium uppercase tracking-[0.16em] text-cyan-700 dark:text-cyan-300">
              Runway test call
            </div>
            <p className="mt-1 text-sm leading-6 text-muted-foreground">
              Launch a one-time 5-minute realtime avatar session. Credentials
              are created server-side and are not stored in Boreal artifacts.
            </p>
          </div>
        </div>
      </div>

      <div className="space-y-4 p-4">
        {!activeAvatarId ? (
          <>
            <div className="space-y-2">
              <Label htmlFor={`runway-avatar-id-${requestId}`}>
                Runway avatar id
              </Label>
              <Input
                id={`runway-avatar-id-${requestId}`}
                onChange={(event) => setAvatarId(event.target.value)}
                placeholder="Paste the Runway Character avatar id"
                value={avatarId}
              />
            </div>
            <Button className="rounded-full" onClick={startCall} type="button">
              Start test call
              <ArrowRightIcon className="size-4" />
            </Button>
          </>
        ) : (
          <div className="space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-3 text-xs text-muted-foreground">
              <span>Avatar: {activeAvatarId}</span>
              {sessionId ? <span>Session: {sessionId}</span> : null}
            </div>
            <div className="min-h-[28rem] overflow-hidden rounded-[20px] border border-border/60 bg-background">
              <AvatarCall
                audio
                avatarId={activeAvatarId}
                className="min-h-[28rem]"
                connect={connect}
                onEnd={() => {
                  toast({
                    type: "success",
                    description: "Runway character call ended.",
                  });
                  setActiveAvatarId(null);
                }}
                onError={(error) => {
                  toast({
                    type: "error",
                    description: error.message || "Runway character call failed.",
                  });
                  setActiveAvatarId(null);
                }}
                video
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
