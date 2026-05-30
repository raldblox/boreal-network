import assert from "node:assert/strict";
import { convertToModelMessages } from "ai";
import { postRequestBodySchema } from "@/app/(chat)/api/chat/schema";
import {
  isChatBlobDeliveryUrl,
  prepareChatMessagesForModel,
} from "@/lib/chat-attachment-download";

const requestId = "00000000-0000-4000-8000-000000000010";
const messageId = "00000000-0000-4000-8000-000000000011";

function escapePdfText(value: string) {
  return value.replace(/\\/g, "\\\\").replace(/\(/g, "\\(").replace(/\)/g, "\\)");
}

function createSimplePdf(text: string) {
  const contentStream = `BT /F1 18 Tf 72 720 Td (${escapePdfText(text)}) Tj ET`;
  const objects = [
    "<< /Type /Catalog /Pages 2 0 R >>",
    "<< /Type /Pages /Kids [3 0 R] /Count 1 >>",
    "<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 5 0 R >> >> /Contents 4 0 R >>",
    `<< /Length ${Buffer.byteLength(contentStream, "latin1")} >>\nstream\n${contentStream}\nendstream`,
    "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>",
  ];
  const offsets: number[] = [0];
  let body = "%PDF-1.4\n";

  for (const [index, object] of objects.entries()) {
    offsets.push(Buffer.byteLength(body, "latin1"));
    body += `${index + 1} 0 obj\n${object}\nendobj\n`;
  }

  const xrefOffset = Buffer.byteLength(body, "latin1");
  body += `xref\n0 ${objects.length + 1}\n`;
  body += "0000000000 65535 f \n";

  for (const offset of offsets.slice(1)) {
    body += `${offset.toString().padStart(10, "0")} 00000 n \n`;
  }

  body += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF\n`;

  return Buffer.from(body, "latin1");
}

const legacyFilePayload = postRequestBodySchema.parse({
  id: requestId,
  message: {
    id: messageId,
    role: "user",
    parts: [
      {
        type: "file",
        mediaType: "text/markdown",
        name: "notes.md",
        url: "https://network.boreal.work/api/files/blob?pathname=chat-attachments/test/notes.md&expires=9999999999&signature=test&filename=notes.md",
      },
    ],
  },
  selectedChatModel: "openai/gpt-5.4-nano",
  selectedVisibilityType: "private",
});

assert.equal(legacyFilePayload.message?.parts[0]?.type, "file");

async function main() {
  const originalFetch = globalThis.fetch;

  globalThis.fetch = async () =>
    new Response("# Notes\n\nImportant attachment detail.", {
      headers: {
        "content-type": "text/markdown",
      },
    });

  const preparedMessages = await prepareChatMessagesForModel({
    requestUrl: "https://network.boreal.work/chat/test",
    messages: [
      {
        role: "user",
        parts: [
          {
            type: "file",
            mediaType: "text/markdown",
            filename: "notes.md",
            url: "https://network.boreal.work/api/files/blob?pathname=chat-attachments/test/notes.md&expires=9999999999&signature=test&filename=notes.md",
          },
        ],
      },
    ],
  }).finally(() => {
    globalThis.fetch = originalFetch;
  });

  const [preparedMessage] = preparedMessages;
  const preparedPart = preparedMessage.parts[0] as {
    text?: string;
    type?: string;
  };
  assert.equal(preparedPart.type, "text");
  assert.match(preparedPart.text ?? "", /Important attachment detail/);

  globalThis.fetch = async () =>
    new Response(createSimplePdf("Boreal PDF attachment detail."), {
      headers: {
        "content-type": "application/pdf",
      },
    });

  const preparedPdfMessages = await prepareChatMessagesForModel({
    requestUrl: "https://network.boreal.work/chat/test",
    messages: [
      {
        role: "user",
        parts: [
          {
            type: "file",
            mediaType: "application/pdf",
            filename: "brief.pdf",
            url: "https://network.boreal.work/api/files/blob?pathname=chat-attachments/test/brief.pdf&expires=9999999999&signature=test&filename=brief.pdf",
          },
        ],
      },
    ],
  }).finally(() => {
    globalThis.fetch = originalFetch;
  });

  const pdfPart = preparedPdfMessages[0].parts[0] as {
    text?: string;
    type?: string;
  };
  assert.equal(pdfPart.type, "text");
  assert.match(pdfPart.text ?? "", /Attached PDF file: brief\.pdf/);
  assert.match(pdfPart.text ?? "", /Boreal PDF attachment detail/);

  const modelMessages = await convertToModelMessages([
    {
      role: "user",
      parts: [
        {
          type: "file",
          mediaType: "text/markdown",
          filename: "notes.md",
          url: "https://network.boreal.work/api/files/blob?pathname=chat-attachments/test/notes.md&expires=9999999999&signature=test&filename=notes.md",
        },
      ],
    },
  ]);

  const [modelMessage] = modelMessages;
  assert.equal(modelMessage.role, "user");
  assert.ok(Array.isArray(modelMessage.content));
  assert.deepEqual(modelMessage.content[0], {
    type: "file",
    mediaType: "text/markdown",
    filename: "notes.md",
    data: "https://network.boreal.work/api/files/blob?pathname=chat-attachments/test/notes.md&expires=9999999999&signature=test&filename=notes.md",
  });

  assert.equal(
    isChatBlobDeliveryUrl(
      new URL("https://network.boreal.work/api/files/blob?filename=notes.md"),
      "https://network.boreal.work/chat/test"
    ),
    true
  );
  assert.equal(
    isChatBlobDeliveryUrl(
      new URL("https://example.com/api/files/blob?filename=notes.md"),
      "https://network.boreal.work/chat/test"
    ),
    false
  );

  console.log("Chat attachment contracts passed.");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
