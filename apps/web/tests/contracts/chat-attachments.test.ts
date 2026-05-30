import assert from "node:assert/strict";
import { convertToModelMessages } from "ai";
import { postRequestBodySchema } from "@/app/(chat)/api/chat/schema";
import { isChatBlobDeliveryUrl } from "@/lib/chat-attachment-download";

const requestId = "00000000-0000-4000-8000-000000000010";
const messageId = "00000000-0000-4000-8000-000000000011";

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
