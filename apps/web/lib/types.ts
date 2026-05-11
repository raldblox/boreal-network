import type { InferUITool, UIMessage } from "ai";
import { z } from "zod";
import type { ArtifactKind } from "@/components/chat/artifact";
import type { createRequestBrief } from "./ai/tools/create-request-brief";
import type { createDocument } from "./ai/tools/create-document";
import type { requestSuggestions } from "./ai/tools/request-suggestions";
import type { updateRequestBrief } from "./ai/tools/update-request-brief";
import type { updateRequestBudgetTiming } from "./ai/tools/update-request-budget-timing";
import type { updateRequestConstraints } from "./ai/tools/update-request-constraints";
import type { updateRequestRouteSummary } from "./ai/tools/update-request-route-summary";
import type { updateDocument } from "./ai/tools/update-document";
import type { Suggestion } from "./db/schema";

export const messageMetadataSchema = z.object({
  createdAt: z.string(),
});

export type MessageMetadata = z.infer<typeof messageMetadataSchema>;

type createDocumentTool = InferUITool<ReturnType<typeof createDocument>>;
type createRequestBriefTool = InferUITool<ReturnType<typeof createRequestBrief>>;
type updateDocumentTool = InferUITool<ReturnType<typeof updateDocument>>;
type updateRequestBriefTool = InferUITool<ReturnType<typeof updateRequestBrief>>;
type updateRequestConstraintsTool = InferUITool<
  ReturnType<typeof updateRequestConstraints>
>;
type updateRequestBudgetTimingTool = InferUITool<
  ReturnType<typeof updateRequestBudgetTiming>
>;
type updateRequestRouteSummaryTool = InferUITool<
  ReturnType<typeof updateRequestRouteSummary>
>;
type requestSuggestionsTool = InferUITool<
  ReturnType<typeof requestSuggestions>
>;

export type ChatTools = {
  createDocument: createDocumentTool;
  createRequestBrief: createRequestBriefTool;
  updateDocument: updateDocumentTool;
  updateRequestBrief: updateRequestBriefTool;
  updateRequestConstraints: updateRequestConstraintsTool;
  updateRequestBudgetTiming: updateRequestBudgetTimingTool;
  updateRequestRouteSummary: updateRequestRouteSummaryTool;
  requestSuggestions: requestSuggestionsTool;
};

export type CustomUIDataTypes = {
  textDelta: string;
  imageDelta: string;
  sheetDelta: string;
  codeDelta: string;
  suggestion: Suggestion;
  appendMessage: string;
  id: string;
  title: string;
  kind: ArtifactKind;
  clear: null;
  finish: null;
  "chat-title": string;
};

export type ChatMessage = UIMessage<
  MessageMetadata,
  CustomUIDataTypes,
  ChatTools
>;

export type Attachment = {
  name: string;
  url: string;
  contentType: string;
};
