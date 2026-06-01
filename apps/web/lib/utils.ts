import type {
  UIMessage,
  UIMessagePart,
} from 'ai';
import { type ClassValue, clsx } from 'clsx';
import { formatISO } from 'date-fns';
import { twMerge } from 'tailwind-merge';
import type { DBMessage, Document } from '@/lib/db/schema';
import { ChatbotError, type ErrorCode } from './errors';
import type { ChatMessage, ChatTools, CustomUIDataTypes } from './types';

function getFallbackErrorCode(status: number): ErrorCode {
  switch (status) {
    case 400:
      return 'bad_request:api';
    case 401:
      return 'unauthorized:chat';
    case 403:
      return 'forbidden:chat';
    case 404:
      return 'not_found:chat';
    case 429:
      return 'rate_limit:api';
    case 503:
      return 'offline:chat';
    default:
      return 'offline:chat';
  }
}

async function getResponseError(response: Response) {
  const bodyText = await response.text().catch(() => '');

  if (bodyText.trim().startsWith('{')) {
    try {
      const payload = JSON.parse(bodyText) as {
        cause?: unknown;
        code?: unknown;
      };
      if (
        typeof payload.code === 'string' &&
        /^[a-z_]+:[a-z_]+$/.test(payload.code)
      ) {
        return new ChatbotError(
          payload.code as ErrorCode,
          typeof payload.cause === 'string' ? payload.cause : undefined,
        );
      }
    } catch {
      // Fall through to the status-based error. Non-JSON bodies are expected
      // when an upstream framework error page escapes a route handler.
    }
  }

  const safeCause =
    bodyText.trim().length > 0 && !bodyText.trimStart().startsWith('<')
      ? bodyText.trim().slice(0, 240)
      : `HTTP ${response.status} ${response.statusText || 'request failed'}`;

  return new ChatbotError(getFallbackErrorCode(response.status), safeCause);
}

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export const fetcher = async (url: string) => {
  const response = await fetch(url);

  if (!response.ok) {
    throw await getResponseError(response);
  }

  return response.json();
};

export async function fetchWithErrorHandlers(
  input: RequestInfo | URL,
  init?: RequestInit,
) {
  try {
    const response = await fetch(input, init);

    if (!response.ok) {
      throw await getResponseError(response);
    }

    return response;
  } catch (error: unknown) {
    if (typeof navigator !== 'undefined' && !navigator.onLine) {
      throw new ChatbotError('offline:chat');
    }

    throw error;
  }
}

export function generateUUID(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

export function getDocumentTimestampByIndex(
  documents: Document[],
  index: number,
) {
  if (!documents) { return new Date(); }
  if (index > documents.length) { return new Date(); }

  return documents[index].createdAt;
}

export function sanitizeText(text: string) {
  return text.replace('<has_function_call>', '');
}

export function convertToUIMessages(messages: DBMessage[]): ChatMessage[] {
  return messages.map((message) => ({
    id: message.id,
    role: message.role as 'user' | 'assistant' | 'system',
    parts: message.parts as UIMessagePart<CustomUIDataTypes, ChatTools>[],
    metadata: {
      createdAt: formatISO(message.createdAt),
    },
  }));
}

export function getTextFromMessage(message: ChatMessage | UIMessage): string {
  return message.parts
    .filter((part) => part.type === 'text')
    .map((part) => (part as { type: 'text'; text: string}).text)
    .join('');
}
