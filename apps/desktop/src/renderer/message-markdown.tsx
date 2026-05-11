import { Fragment, memo, useMemo, type ReactNode } from "react";

type MessageMarkdownProps = {
  content: string;
  className?: string;
};

type ParsedBlock =
  | {
      content: string;
      type: "paragraph";
    }
  | {
      content: string;
      language: string;
      type: "code";
    }
  | {
      content: string;
      level: 1 | 2 | 3 | 4 | 5 | 6;
      type: "heading";
    }
  | {
      items: string[];
      type: "ordered-list" | "unordered-list";
    }
  | {
      content: string;
      type: "blockquote";
    };

function parseBlocks(content: string) {
  const normalized = content.replace(/\r\n?/g, "\n");
  const lines = normalized.split("\n");
  const blocks: ParsedBlock[] = [];

  let index = 0;

  while (index < lines.length) {
    const line = lines[index] ?? "";
    const trimmed = line.trim();

    if (!trimmed) {
      index += 1;
      continue;
    }

    const fenceMatch = trimmed.match(/^(```|~~~)\s*([\w.+-]*)\s*$/);

    if (fenceMatch) {
      const fence = fenceMatch[1];
      const language = fenceMatch[2] ?? "";
      const codeLines: string[] = [];
      index += 1;

      while (index < lines.length && lines[index]?.trim() !== fence) {
        codeLines.push(lines[index] ?? "");
        index += 1;
      }

      if (index < lines.length) {
        index += 1;
      }

      blocks.push({
        content: codeLines.join("\n"),
        language,
        type: "code",
      });
      continue;
    }

    const headingMatch = line.match(/^(#{1,6})\s+(.+)$/);

    if (headingMatch) {
      blocks.push({
        content: headingMatch[2] ?? "",
        level: headingMatch[1].length as 1 | 2 | 3 | 4 | 5 | 6,
        type: "heading",
      });
      index += 1;
      continue;
    }

    if (/^>\s?/.test(line)) {
      const quoteLines: string[] = [];

      while (index < lines.length && /^>\s?/.test(lines[index] ?? "")) {
        quoteLines.push((lines[index] ?? "").replace(/^>\s?/, ""));
        index += 1;
      }

      blocks.push({
        content: quoteLines.join("\n"),
        type: "blockquote",
      });
      continue;
    }

    if (/^[-*+]\s+/.test(line)) {
      const items: string[] = [];

      while (index < lines.length && /^[-*+]\s+/.test(lines[index] ?? "")) {
        items.push((lines[index] ?? "").replace(/^[-*+]\s+/, ""));
        index += 1;
      }

      blocks.push({
        items,
        type: "unordered-list",
      });
      continue;
    }

    if (/^\d+\.\s+/.test(line)) {
      const items: string[] = [];

      while (index < lines.length && /^\d+\.\s+/.test(lines[index] ?? "")) {
        items.push((lines[index] ?? "").replace(/^\d+\.\s+/, ""));
        index += 1;
      }

      blocks.push({
        items,
        type: "ordered-list",
      });
      continue;
    }

    const paragraphLines: string[] = [];

    while (index < lines.length) {
      const paragraphLine = lines[index] ?? "";
      const paragraphTrimmed = paragraphLine.trim();

      if (
        !paragraphTrimmed ||
        /^(#{1,6})\s+/.test(paragraphLine) ||
        /^(```|~~~)\s*([\w.+-]*)\s*$/.test(paragraphTrimmed) ||
        /^>\s?/.test(paragraphLine) ||
        /^[-*+]\s+/.test(paragraphLine) ||
        /^\d+\.\s+/.test(paragraphLine)
      ) {
        break;
      }

      paragraphLines.push(paragraphLine);
      index += 1;
    }

    blocks.push({
      content: paragraphLines.join("\n"),
      type: "paragraph",
    });
  }

  return blocks;
}

function renderInline(content: string, keyPrefix: string) {
  const nodes: ReactNode[] = [];
  const tokenPattern =
    /(`[^`]+`)|(\[([^\]]+)\]\((https?:\/\/[^\s)]+)\))|(\*\*([^*]+)\*\*)|(\*([^*]+)\*)/g;

  let lastIndex = 0;
  let match: RegExpExecArray | null = null;

  while ((match = tokenPattern.exec(content)) !== null) {
    if (match.index > lastIndex) {
      nodes.push(content.slice(lastIndex, match.index));
    }

    if (match[1]) {
      nodes.push(
        <code
          key={`${keyPrefix}-code-${match.index}`}
          className="rounded-md border border-border/80 bg-secondary px-1.5 py-0.5 font-mono text-[0.92em] text-foreground"
        >
          {match[1].slice(1, -1)}
        </code>,
      );
    } else if (match[2] && match[3] && match[4]) {
      nodes.push(
        <a
          key={`${keyPrefix}-link-${match.index}`}
          href={match[4]}
          target="_blank"
          rel="noreferrer"
          className="text-foreground underline decoration-border underline-offset-4 transition-colors hover:text-primary"
        >
          {match[3]}
        </a>,
      );
    } else if (match[5] && match[6]) {
      nodes.push(
        <strong
          key={`${keyPrefix}-strong-${match.index}`}
          className="font-semibold text-foreground"
        >
          {match[6]}
        </strong>,
      );
    } else if (match[7] && match[8]) {
      nodes.push(
        <em key={`${keyPrefix}-em-${match.index}`} className="italic">
          {match[8]}
        </em>,
      );
    }

    lastIndex = tokenPattern.lastIndex;
  }

  if (lastIndex < content.length) {
    nodes.push(content.slice(lastIndex));
  }

  return nodes.length > 0 ? nodes : content;
}

function renderBlock(block: ParsedBlock, index: number) {
  if (block.type === "heading") {
    const headingClassName =
      block.level === 1
        ? "text-xl font-semibold tracking-tight"
        : block.level === 2
          ? "text-lg font-semibold tracking-tight"
          : "text-base font-semibold";

    return (
      <h3
        key={`heading-${index}`}
        className={`${headingClassName} whitespace-pre-wrap text-foreground`}
      >
        {renderInline(block.content, `heading-${index}`)}
      </h3>
    );
  }

  if (block.type === "code") {
    return (
      <div
        key={`code-${index}`}
        className="overflow-hidden rounded-xl border border-border/80 bg-[#0b1220]"
      >
        {block.language ? (
          <div className="border-b border-white/8 px-3 py-2 text-[11px] font-medium uppercase tracking-[0.18em] text-slate-400">
            {block.language}
          </div>
        ) : null}
        <pre className="m-0 overflow-x-auto px-4 py-3 font-mono text-[13px] leading-6 text-slate-100">
          <code>{block.content}</code>
        </pre>
      </div>
    );
  }

  if (block.type === "blockquote") {
    return (
      <blockquote
        key={`quote-${index}`}
        className="border-l-2 border-border pl-4 text-sm leading-6 text-muted-foreground"
      >
        <div className="whitespace-pre-wrap">
          {renderInline(block.content, `quote-${index}`)}
        </div>
      </blockquote>
    );
  }

  if (block.type === "unordered-list" || block.type === "ordered-list") {
    const ListTag = block.type === "ordered-list" ? "ol" : "ul";
    const listClassName =
      block.type === "ordered-list"
        ? "list-decimal pl-5"
        : "list-disc pl-5";

    return (
      <ListTag
        key={`list-${index}`}
        className={`${listClassName} space-y-1 text-sm leading-6 marker:text-muted-foreground`}
      >
        {block.items.map((item, itemIndex) => (
          <li key={`item-${index}-${itemIndex}`} className="pl-1">
            <span className="whitespace-pre-wrap">
              {renderInline(item, `item-${index}-${itemIndex}`)}
            </span>
          </li>
        ))}
      </ListTag>
    );
  }

  if (block.type === "paragraph") {
    return (
      <p
        key={`paragraph-${index}`}
        className="m-0 whitespace-pre-wrap text-sm leading-6 text-foreground"
      >
        {renderInline(block.content, `paragraph-${index}`)}
      </p>
    );
  }

  return null;
}

export const MessageMarkdown = memo(function MessageMarkdown({
  content,
  className,
}: MessageMarkdownProps) {
  const blocks = useMemo(() => parseBlocks(content), [content]);

  return (
    <div className={className ? `space-y-3 ${className}` : "space-y-3"}>
      {blocks.length === 0 ? (
        <p className="m-0 whitespace-pre-wrap text-sm leading-6 text-foreground">
          {content}
        </p>
      ) : (
        blocks.map((block, index) => (
          <Fragment key={`block-${index}`}>{renderBlock(block, index)}</Fragment>
        ))
      )}
    </div>
  );
});
