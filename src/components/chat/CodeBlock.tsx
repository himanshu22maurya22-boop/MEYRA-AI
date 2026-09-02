import React, { useState } from "react";
import { Check, Copy, Terminal } from "lucide-react";

interface CodeBlockProps {
  language?: string;
  value: string;
}

export const CodeBlock: React.FC<CodeBlockProps> = ({ language = "plaintext", value }) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error("Failed to copy text:", err);
    }
  };

  const cleanLanguage = (language || "code").replace("language-", "");

  return (
    <div
      id={`codeblock-${cleanLanguage}`}
      className="my-4 rounded-xl border border-white/10 bg-[#131316] overflow-hidden shadow-2xl"
    >
      {/* Header bar */}
      <div className="flex items-center justify-between px-4 py-2 bg-white/5 border-b border-white/5 text-xs font-mono text-slate-400">
        <div className="flex items-center gap-2">
          <Terminal className="w-3.5 h-3.5 text-indigo-400" />
          <span className="font-semibold text-slate-300 lowercase">{cleanLanguage}</span>
        </div>

        <button
          id={`copy-code-btn-${cleanLanguage}`}
          type="button"
          onClick={handleCopy}
          className="flex items-center gap-1.5 px-2.5 py-1 text-xs text-slate-300 hover:text-white bg-white/5 hover:bg-white/10 border border-white/10 rounded-md transition-colors cursor-pointer"
          title="Copy code to clipboard"
        >
          {copied ? (
            <>
              <Check className="w-3.5 h-3.5 text-emerald-400" />
              <span className="text-emerald-400 font-medium">Copied!</span>
            </>
          ) : (
            <>
              <Copy className="w-3.5 h-3.5" />
              <span>Copy</span>
            </>
          )}
        </button>
      </div>

      {/* Code content container */}
      <div className="p-4 overflow-x-auto font-mono text-sm leading-relaxed text-slate-200">
        <pre className="m-0 p-0 font-mono">
          <code>{value}</code>
        </pre>
      </div>
    </div>
  );
};
