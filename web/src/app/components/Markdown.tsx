"use client";

import React from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

import DOMPurify from "dompurify";
import { generateHTML } from "@tiptap/html";
import StarterKit from "@tiptap/starter-kit";

const ALLOWED_PROTOCOLS = new Set(["http:", "https:", "mailto:", "tel:"]);

function safeUrlTransform(url: string) {
  try {
    // allow relative and hash links
    if (url.startsWith("/") || url.startsWith("#")) return url;

    const parsed = new URL(url);
    if (!ALLOWED_PROTOCOLS.has(parsed.protocol)) return "";
    return url;
  } catch {
    return "";
  }
}

function tryParseTiptapDoc(s: string): any | null {
  if (!s) return null;
  try {
    const parsed = JSON.parse(s);
    return parsed && parsed.type === "doc" ? parsed : null;
  } catch {
    return null;
  }
}

export function Markdown({
  children,
  className = "",
}: {
  children: string;
  className?: string;
}) {
  const tiptapDoc = tryParseTiptapDoc(children);

  // ✅ New notes: Tiptap JSON -> HTML -> sanitize -> render
  if (tiptapDoc) {
    const rawHtml = generateHTML(tiptapDoc, [StarterKit]);

    const safeHtml = DOMPurify.sanitize(rawHtml, {
      USE_PROFILES: { html: true },
    });

    return (
      <div
        className={`note-html ${className}`}
        // safeHtml is sanitized
        dangerouslySetInnerHTML={{ __html: safeHtml }}
      />
    );
  }

  // ✅ Old notes: Markdown -> react-markdown (your current behavior)
  return (
    <div className={className}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        skipHtml
        urlTransform={safeUrlTransform}
        components={{
          a: ({ ...props }) => (
            <a
              {...props}
              onClick={(e) => {
                e.stopPropagation();
                props.onClick?.(e);
              }}
              target="_blank"
              rel="noopener noreferrer"
              className="text-indigo-300 underline underline-offset-2 hover:text-indigo-200"
            />
          ),
          code: ({ children }) => (
            <code className="rounded bg-white/10 px-1 py-0.5 text-[0.95em]">
              {children}
            </code>
          ),
          pre: ({ children }) => (
            <pre className="mt-2 overflow-auto rounded-xl border border-white/10 bg-white/[0.04] p-3 text-xs">
              {children}
            </pre>
          ),
          blockquote: ({ children }) => (
            <blockquote className="border-l-2 border-white/15 pl-3 text-zinc-200/90">
              {children}
            </blockquote>
          ),
          ul: ({ children }) => (
            <ul className="list-disc pl-5">{children}</ul>
          ),
          ol: ({ children }) => (
            <ol className="list-decimal pl-5">{children}</ol>
          ),
          li: ({ children }) => <li className="my-1">{children}</li>,
          h1: ({ children }) => (
            <h1 className="mb-1 mt-2 text-base font-semibold">{children}</h1>
          ),
          h2: ({ children }) => (
            <h2 className="mb-1 mt-2 text-sm font-semibold">{children}</h2>
          ),
          p: ({ children }) => <p className="my-1">{children}</p>,
        }}
      >
        {children}
      </ReactMarkdown>
    </div>
  );
}
