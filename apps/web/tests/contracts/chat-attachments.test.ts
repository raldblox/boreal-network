import assert from "node:assert/strict";
import { convertToModelMessages } from "ai";
import { postRequestBodySchema } from "@/app/(chat)/api/chat/schema";
import { desktopTurnPersistBodySchema } from "@/app/(chat)/api/chat/desktop-turn/schema";
import {
  getChatImageDimensionError,
  maxChatAttachmentBytes,
  maxChatDocxTextExtractionBytes,
  maxChatImageInputBytes,
  maxChatImageSourcePixels,
  readChatImageDimensionsFromBytes,
  validateChatAttachmentFile,
  validateChatAttachmentSelectionFile,
} from "@/lib/chat-attachment-policy";
import {
  getChatAttachmentUrlRejection,
  isChatBlobDeliveryUrl,
  prepareChatMessagesForModel,
  readChatBlobDeliveryUrl,
} from "@/lib/chat-attachment-download";

const requestId = "00000000-0000-4000-8000-000000000010";
const messageId = "00000000-0000-4000-8000-000000000011";
const tinyPng = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+/p9sAAAAASUVORK5CYII=",
  "base64"
);

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

function createStoredDocxXml(
  text: string,
  {
    uncompressedSizeOverride,
  }: {
    uncompressedSizeOverride?: number;
  } = {}
) {
  const filename = "word/document.xml";
  const content = Buffer.from(
    [
      '<?xml version="1.0" encoding="UTF-8"?>',
      '<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">',
      "<w:body>",
      "<w:p><w:r><w:t>",
      text
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;"),
      "</w:t></w:r></w:p>",
      "</w:body>",
      "</w:document>",
    ].join(""),
    "utf8"
  );
  const filenameBytes = Buffer.from(filename, "utf8");
  const localHeader = Buffer.alloc(30);

  localHeader.writeUInt32LE(0x0403_4b50, 0);
  localHeader.writeUInt16LE(20, 4);
  localHeader.writeUInt16LE(0, 6);
  localHeader.writeUInt16LE(0, 8);
  localHeader.writeUInt32LE(0, 10);
  localHeader.writeUInt32LE(0, 14);
  localHeader.writeUInt32LE(content.byteLength, 18);
  localHeader.writeUInt32LE(
    uncompressedSizeOverride ?? content.byteLength,
    22
  );
  localHeader.writeUInt16LE(filenameBytes.byteLength, 26);
  localHeader.writeUInt16LE(0, 28);

  const localFile = Buffer.concat([localHeader, filenameBytes, content]);
  const centralHeader = Buffer.alloc(46);

  centralHeader.writeUInt32LE(0x0201_4b50, 0);
  centralHeader.writeUInt16LE(20, 4);
  centralHeader.writeUInt16LE(20, 6);
  centralHeader.writeUInt16LE(0, 8);
  centralHeader.writeUInt16LE(0, 10);
  centralHeader.writeUInt32LE(0, 12);
  centralHeader.writeUInt32LE(0, 16);
  centralHeader.writeUInt32LE(content.byteLength, 20);
  centralHeader.writeUInt32LE(
    uncompressedSizeOverride ?? content.byteLength,
    24
  );
  centralHeader.writeUInt16LE(filenameBytes.byteLength, 28);
  centralHeader.writeUInt16LE(0, 30);
  centralHeader.writeUInt16LE(0, 32);
  centralHeader.writeUInt16LE(0, 34);
  centralHeader.writeUInt16LE(0, 36);
  centralHeader.writeUInt32LE(0, 38);
  centralHeader.writeUInt32LE(0, 42);

  const centralDirectory = Buffer.concat([centralHeader, filenameBytes]);
  const endRecord = Buffer.alloc(22);

  endRecord.writeUInt32LE(0x0605_4b50, 0);
  endRecord.writeUInt16LE(0, 4);
  endRecord.writeUInt16LE(0, 6);
  endRecord.writeUInt16LE(1, 8);
  endRecord.writeUInt16LE(1, 10);
  endRecord.writeUInt32LE(centralDirectory.byteLength, 12);
  endRecord.writeUInt32LE(localFile.byteLength, 16);
  endRecord.writeUInt16LE(0, 20);

  return Buffer.concat([localFile, centralDirectory, endRecord]);
}

function createPngHeader({ height, width }: { height: number; width: number }) {
  const bytes = Buffer.alloc(24);
  bytes.set([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a], 0);
  bytes.write("IHDR", 12, "ascii");
  bytes.writeUInt32BE(width, 16);
  bytes.writeUInt32BE(height, 20);
  return bytes;
}

function createJpegHeader({ height, width }: { height: number; width: number }) {
  const bytes = Buffer.alloc(21);
  bytes.set([0xff, 0xd8, 0xff, 0xc0], 0);
  bytes.writeUInt16BE(17, 4);
  bytes[6] = 8;
  bytes.writeUInt16BE(height, 7);
  bytes.writeUInt16BE(width, 9);
  return bytes;
}

function createWebpVp8xHeader({
  height,
  width,
}: {
  height: number;
  width: number;
}) {
  const bytes = Buffer.alloc(30);
  bytes.write("RIFF", 0, "ascii");
  bytes.writeUInt32LE(22, 4);
  bytes.write("WEBP", 8, "ascii");
  bytes.write("VP8X", 12, "ascii");
  bytes.writeUInt32LE(10, 16);
  bytes.writeUIntLE(width - 1, 24, 3);
  bytes.writeUIntLE(height - 1, 27, 3);
  return bytes;
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
const desktopTurnDocumentPayload = desktopTurnPersistBodySchema.parse({
  assistantId: "00000000-0000-4000-8000-000000000012",
  assistantText: "I read the attachment reference.",
  id: requestId,
  message: {
    id: messageId,
    role: "user",
    parts: [
      {
        type: "file",
        mediaType: "application/pdf",
        filename: "brief.pdf",
        url: "https://network.boreal.work/api/files/blob?pathname=chat-attachments/test/brief.pdf&expires=9999999999&signature=test&filename=brief.pdf",
      },
      {
        type: "file",
        mediaType:
          "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        name: "field-notes.docx",
        url: "https://network.boreal.work/api/files/blob?pathname=chat-attachments/test/field-notes.docx&expires=9999999999&signature=test&filename=field-notes.docx",
      },
      {
        type: "file",
        mediaType: "image/webp",
        filename: "reference.webp",
        url: "https://network.boreal.work/api/files/blob?pathname=chat-attachments/test/reference.webp&expires=9999999999&signature=test&filename=reference.webp",
      },
    ],
  },
  selectedVisibilityType: "private",
});
assert.equal(desktopTurnDocumentPayload.message.parts.length, 3);
assert.equal(
  getChatImageDimensionError({ height: 4000, width: 4000 }),
  null
);
assert.match(
  getChatImageDimensionError({
    height: maxChatImageSourcePixels,
    width: 2,
  }) ?? "",
  /too large/
);
assert.deepEqual(
  readChatImageDimensionsFromBytes({
    contentType: "image/png",
    data: createPngHeader({ height: 456, width: 123 }),
  }),
  { height: 456, width: 123 }
);
assert.deepEqual(
  readChatImageDimensionsFromBytes({
    contentType: "image/jpeg",
    data: createJpegHeader({ height: 987, width: 654 }),
  }),
  { height: 987, width: 654 }
);
assert.deepEqual(
  readChatImageDimensionsFromBytes({
    contentType: "image/webp",
    data: createWebpVp8xHeader({ height: 222, width: 111 }),
  }),
  { height: 222, width: 111 }
);
assert.match(
  getChatImageDimensionError(
    readChatImageDimensionsFromBytes({
      contentType: "image/png",
      data: createPngHeader({
        height: maxChatImageSourcePixels,
        width: 2,
      }),
    }) ?? { height: 0, width: 0 }
  ) ?? "",
  /too large/
);
assert.equal(
  validateChatAttachmentSelectionFile({
    name: "large-photo.jpg",
    size: maxChatImageInputBytes + 1,
    type: "image/jpeg",
  }).error,
  null
);
assert.match(
  validateChatAttachmentFile({
    name: "large-photo.jpg",
    size: maxChatImageInputBytes + 1,
    type: "image/jpeg",
  }).error ?? "",
  /Images must be/
);
assert.match(
  validateChatAttachmentSelectionFile({
    name: "too-large-photo.jpg",
    size: maxChatAttachmentBytes + 1,
    type: "image/jpeg",
  }).error ?? "",
  /Images must be/
);

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
        role: "user" as const,
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
        role: "user" as const,
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

  globalThis.fetch = async () =>
    new Response(createStoredDocxXml("Boreal DOCX attachment detail."), {
      headers: {
        "content-type":
          "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      },
    });

  const preparedDocxMessages = await prepareChatMessagesForModel({
    requestUrl: "https://network.boreal.work/chat/test",
    messages: [
      {
        role: "user" as const,
        parts: [
          {
            type: "file",
            mediaType:
              "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
            filename: "brief.docx",
            url: "https://network.boreal.work/api/files/blob?pathname=chat-attachments/test/brief.docx&expires=9999999999&signature=test&filename=brief.docx",
          },
        ],
      },
    ],
  }).finally(() => {
    globalThis.fetch = originalFetch;
  });

  const docxPart = preparedDocxMessages[0].parts[0] as {
    text?: string;
    type?: string;
  };
  assert.equal(docxPart.type, "text");
  assert.match(docxPart.text ?? "", /Attached DOCX file: brief\.docx/);
  assert.match(docxPart.text ?? "", /Boreal DOCX attachment detail/);

  globalThis.fetch = async () =>
    new Response(
      createStoredDocxXml("This should not be inflated.", {
        uncompressedSizeOverride: maxChatDocxTextExtractionBytes + 1,
      }),
      {
        headers: {
          "content-type":
            "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        },
      }
    );

  const oversizedDocxMessages = await prepareChatMessagesForModel({
    requestUrl: "https://network.boreal.work/chat/test",
    messages: [
      {
        role: "user" as const,
        parts: [
          {
            type: "file",
            mediaType:
              "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
            filename: "oversized.docx",
            url: "https://network.boreal.work/api/files/blob?pathname=chat-attachments/test/oversized.docx&expires=9999999999&signature=test&filename=oversized.docx",
          },
        ],
      },
    ],
  }).finally(() => {
    globalThis.fetch = originalFetch;
  });
  const oversizedDocxPart = oversizedDocxMessages[0].parts[0] as {
    text?: string;
    type?: string;
  };
  assert.equal(oversizedDocxPart.type, "text");
  assert.match(
    oversizedDocxPart.text ?? "",
    /No document text was extracted from this DOCX/
  );
  assert.doesNotMatch(
    oversizedDocxPart.text ?? "",
    /This should not be inflated/
  );

  globalThis.fetch = async () =>
    new Response(tinyPng, {
      headers: {
        "content-type": "image/png",
      },
    });

  const preparedImageMessages = await prepareChatMessagesForModel({
    requestUrl: "https://network.boreal.work/chat/test",
    messages: [
      {
        role: "user" as const,
        parts: [
          {
            type: "file",
            mediaType: "image/png",
            filename: "pixel.png",
            url: "https://network.boreal.work/api/files/blob?pathname=chat-attachments/test/pixel.png&expires=9999999999&signature=test&filename=pixel.png",
          },
        ],
      },
    ],
  }).finally(() => {
    globalThis.fetch = originalFetch;
  });

  const imagePart = preparedImageMessages[0].parts[0] as {
    mediaType?: string;
    type?: string;
    url?: string;
  };
  assert.equal(imagePart.type, "file");
  assert.equal(imagePart.mediaType, "image/png");
  assert.match(imagePart.url ?? "", /^data:image\/png;base64,/);

  const imageModelMessages = await convertToModelMessages(
    preparedImageMessages
  );
  const [imageModelMessage] = imageModelMessages;
  assert.equal(imageModelMessage.role, "user");
  assert.ok(Array.isArray(imageModelMessage.content));
  assert.deepEqual(imageModelMessage.content[0], {
    type: "file",
    mediaType: "image/png",
    filename: "pixel.png",
    data: imagePart.url,
  });

  globalThis.fetch = async () => {
    throw new Error("socket hang up");
  };

  const failedImageMessages = await prepareChatMessagesForModel({
    requestUrl: "https://network.boreal.work/chat/test",
    messages: [
      {
        role: "user" as const,
        parts: [
          {
            type: "file",
            mediaType: "image/png",
            filename: "broken.png",
            url: "https://network.boreal.work/api/files/blob?pathname=chat-attachments/test/broken.png&expires=9999999999&signature=test&filename=broken.png",
          },
        ],
      },
    ],
  }).finally(() => {
    globalThis.fetch = originalFetch;
  });
  const failedImagePart = failedImageMessages[0].parts[0] as {
    text?: string;
    type?: string;
  };
  assert.equal(failedImagePart.type, "text");
  assert.match(failedImagePart.text ?? "", /broken\.png could not be read/);

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
  assert.equal(
    getChatAttachmentUrlRejection({
      requestUrl: "https://network.boreal.work/chat/test",
      url: "https://network.boreal.work/api/files/blob?filename=notes.md",
    }),
    null
  );
  assert.match(
    getChatAttachmentUrlRejection({
      requestUrl: "https://network.boreal.work/chat/test",
      url: "https://example.com/api/files/blob?filename=notes.md",
    }) ?? "",
    /uploaded through Boreal/
  );
  assert.match(
    getChatAttachmentUrlRejection({
      requestUrl: "https://network.boreal.work/chat/test",
      url: "not a url",
    }) ?? "",
    /URL is invalid/
  );

  globalThis.fetch = async () => {
    throw new Error("socket hang up");
  };

  await assert.rejects(
    readChatBlobDeliveryUrl(
      new URL(
        "https://network.boreal.work/api/files/blob?pathname=chat-attachments/test/image.png&expires=9999999999&signature=test&filename=image.png"
      )
    ),
    /Attachment could not be read/
  );
  globalThis.fetch = originalFetch;

  console.log("Chat attachment contracts passed.");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
