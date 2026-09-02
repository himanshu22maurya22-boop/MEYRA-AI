import React from "react";
import Markdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { CodeBlock } from "./CodeBlock";

interface MarkdownRendererProps {
  content: string;
  className?: string;
}

export const MarkdownRenderer: React.FC<MarkdownRendererProps> = ({ content, className = "" }) => {
  return (
    <div className={`prose-container text-slate-200 ${className}`}>
      <Markdown
        remarkPlugins={[remarkGfm]}
        components={{
          code({ inline, className, children, ...props }: any) {
            const match = /language-(\w+)/.exec(className || "");
            const codeContent = String(children).replace(/\n$/, "");

            if (!inline && (match || codeContent.includes("\n"))) {
              return (
                <CodeBlock
                  language={match ? match[1] : "plaintext"}
                  value={codeContent}
                />
              );
            }

            return (
              <code
                className="px-1.5 py-0.5 mx-0.5 rounded bg-white/10 text-indigo-300 font-mono text-xs border border-white/10"
                {...props}
              >
                {children}
              </code>
            );
          },
          p({ children }) {
            return <p className="mb-3.5 leading-relaxed last:mb-0">{children}</p>;
          },
          h1({ children }) {
            return (
              <h1 className="text-xl sm:text-2xl font-bold mt-6 mb-3 text-white border-b border-white/10 pb-2">
                {children}
              </h1>
            );
          },
          h2({ children }) {
            return (
              <h2 className="text-lg sm:text-xl font-semibold mt-5 mb-2.5 text-white">
                {children}
              </h2>
            );
          },
          h3({ children }) {
            return (
              <h3 className="text-base sm:text-lg font-medium mt-4 mb-2 text-indigo-200">
                {children}
              </h3>
            );
          },
          ul({ children }) {
            return <ul className="list-disc pl-6 mb-4 space-y-1.5">{children}</ul>;
          },
          ol({ children }) {
            return <ol className="list-decimal pl-6 mb-4 space-y-1.5">{children}</ol>;
          },
          li({ children }) {
            return <li className="leading-relaxed">{children}</li>;
          },
          blockquote({ children }) {
            return (
              <blockquote className="border-l-4 border-indigo-500/60 pl-4 py-1 my-3 text-slate-300 italic bg-white/5 rounded-r-lg">
                {children}
              </blockquote>
            );
          },
          table({ children }) {
            return (
              <div className="overflow-x-auto my-4 rounded-lg border border-white/10">
                <table className="min-w-full divide-y divide-white/10 text-sm">
                  {children}
                </table>
              </div>
            );
          },
          thead({ children }) {
            return <thead className="bg-white/5">{children}</thead>;
          },
          th({ children }) {
            return (
              <th className="px-4 py-2.5 text-left font-semibold text-white uppercase tracking-wider text-xs">
                {children}
              </th>
            );
          },
          td({ children }) {
            return (
              <td className="px-4 py-2.5 text-slate-300 border-t border-white/5">
                {children}
              </td>
            );
          },
          a({ href, children }) {
            return (
              <a
                href={href}
                target="_blank"
                rel="noopener noreferrer"
                className="text-indigo-400 hover:text-indigo-300 underline underline-offset-2 transition-colors"
              >
                {children}
              </a>
            );
          },
          hr() {
            return <hr className="my-6 border-white/10" />;
          },
        }}
      >
        {content}
      </Markdown>
    </div>
  );
};
