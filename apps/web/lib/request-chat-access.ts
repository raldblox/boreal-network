export function canUseRequestChatTranscript({
  hasRequest,
  chatOwnerUserId,
  viewerUserId,
}: {
  hasRequest: boolean;
  chatOwnerUserId: string | null | undefined;
  viewerUserId: string | null | undefined;
}) {
  return !hasRequest || Boolean(viewerUserId && viewerUserId === chatOwnerUserId);
}

export function canReadChatEnvelope({
  hasRequest,
  requestStatus,
  requestVisibility,
  chatVisibility,
  chatOwnerUserId,
  viewerUserId,
}: {
  hasRequest: boolean;
  requestStatus?: string | null;
  requestVisibility?: string | null;
  chatVisibility: string;
  chatOwnerUserId: string | null | undefined;
  viewerUserId: string | null | undefined;
}) {
  const isOwner = Boolean(viewerUserId && viewerUserId === chatOwnerUserId);

  if (isOwner) {
    return true;
  }

  if (hasRequest) {
    return requestVisibility === "public" && requestStatus !== "draft";
  }

  return chatVisibility === "public";
}
