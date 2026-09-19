import React, { useState, useEffect, useRef } from "react";
import {
  Folder,
  Upload,
  X,
  Trash2,
  Download,
  FileText,
  Image as ImageIcon,
  Code2,
  Sparkles,
  Search,
  ExternalLink,
  MessageSquare,
  AlertCircle,
} from "lucide-react";
import { FileItem, UserProfile } from "../../types";
import { chatStorage } from "../../services/storage";
import { validateFile, MAX_FILE_SIZE } from "../../services/fileParser";

interface FilesModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: UserProfile | null;
  onAskAboutFile?: (file: FileItem, questionType: "summarize" | "study-notes" | "explain") => void;
}

export const FilesModal: React.FC<FilesModalProps> = ({
  isOpen,
  onClose,
  currentUser,
  onAskAboutFile,
}) => {
  const [files, setFiles] = useState<FileItem[]>([]);
  const [activeFilter, setActiveFilter] = useState<"all" | "image" | "document" | "code" | "generated">("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [previewFile, setPreviewFile] = useState<FileItem | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      setFiles(chatStorage.getFiles(currentUser?.id));
      setUploadError(null);
      setPreviewFile(null);
    }
  }, [isOpen, currentUser]);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const uploaded = e.target.files?.[0];
    if (!uploaded) return;
    setUploadError(null);

    const validation = validateFile(uploaded);
    if (!validation.valid) {
      setUploadError(validation.error || "Unsupported file format.");
      return;
    }

    try {
      let content = "";
      let dataUrl = "";

      if (validation.type === "image") {
        dataUrl = await new Promise((res, rej) => {
          const r = new FileReader();
          r.onload = () => res(r.result as string);
          r.onerror = rej;
          r.readAsDataURL(uploaded);
        });
      } else {
        content = await new Promise((res, rej) => {
          const r = new FileReader();
          r.onload = () => res(r.result as string);
          r.onerror = rej;
          r.readAsText(uploaded);
        });
      }

      const newFileItem: FileItem = {
        id: "file_" + Date.now() + "_" + Math.random().toString(36).substring(2, 6),
        userId: currentUser?.id || "local_user",
        name: uploaded.name,
        type: validation.type === "image" ? "image" : uploaded.name.endsWith(".py") || uploaded.name.endsWith(".js") || uploaded.name.endsWith(".ts") ? "code" : "document",
        mimeType: uploaded.type || "application/octet-stream",
        size: uploaded.size,
        content: content || undefined,
        dataUrl: dataUrl || undefined,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };

      chatStorage.saveFile(newFileItem);
      setFiles((prev) => [newFileItem, ...prev]);
    } catch (err: any) {
      setUploadError("Failed to read file: " + (err?.message || "Unknown error"));
    } finally {
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  const handleDelete = (id: string) => {
    chatStorage.deleteFile(id);
    setFiles((prev) => prev.filter((f) => f.id !== id));
    if (previewFile?.id === id) setPreviewFile(null);
  };

  const handleDownload = (file: FileItem) => {
    const a = document.createElement("a");
    if (file.dataUrl) {
      a.href = file.dataUrl;
    } else {
      const blob = new Blob([file.content || ""], { type: file.mimeType });
      a.href = URL.createObjectURL(blob);
    }
    a.download = file.name;
    a.click();
  };

  const filteredFiles = files.filter((f) => {
    if (activeFilter !== "all" && f.type !== activeFilter) return false;
    if (searchQuery.trim()) {
      return f.name.toLowerCase().includes(searchQuery.toLowerCase());
    }
    return true;
  });

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in">
      <div className="relative w-full max-w-2xl bg-[#141418] border border-white/10 rounded-2xl shadow-2xl flex flex-col max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/10 bg-neutral-900/50">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-indigo-500/20 text-indigo-400">
              <Folder className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-semibold text-white">MEYRA Files</h3>
              <p className="text-xs text-slate-400">Documents, images, and project assets</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => fileInputRef.current?.click()}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold cursor-pointer transition-colors shadow-sm"
            >
              <Upload className="w-3.5 h-3.5" />
              Upload File
            </button>
            <input
              ref={fileInputRef}
              type="file"
              onChange={handleFileUpload}
              className="hidden"
            />
            <button
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-white/5 transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Filters and Search Bar */}
        <div className="px-6 py-3 border-b border-white/5 bg-neutral-900/40 flex flex-col sm:flex-row items-center justify-between gap-3">
          {/* Categories */}
          <div className="flex items-center gap-1">
            {(["all", "document", "image", "code", "generated"] as const).map((cat) => (
              <button
                key={cat}
                onClick={() => setActiveFilter(cat)}
                className={`px-2.5 py-1 rounded-lg text-xs font-medium capitalize transition-colors cursor-pointer ${
                  activeFilter === cat
                    ? "bg-indigo-600 text-white"
                    : "text-slate-400 hover:text-white hover:bg-white/5"
                }`}
              >
                {cat}
              </button>
            ))}
          </div>

          {/* Search Box */}
          <div className="relative w-full sm:w-48">
            <Search className="w-3.5 h-3.5 absolute left-2.5 top-2.5 text-slate-500" />
            <input
              type="text"
              placeholder="Search files..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-8 pr-3 py-1.5 rounded-xl bg-black border border-white/10 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
            />
          </div>
        </div>

        {/* Error notification */}
        {uploadError && (
          <div className="mx-6 mt-3 p-3 rounded-xl bg-rose-950/40 border border-rose-500/30 flex items-center gap-2 text-xs text-rose-200">
            <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
            <span>{uploadError}</span>
          </div>
        )}

        {/* Files Grid / List */}
        <div className="flex-1 overflow-y-auto p-6">
          {filteredFiles.length === 0 ? (
            <div className="py-12 text-center text-slate-500 text-xs flex flex-col items-center gap-3">
              <Folder className="w-10 h-10 text-slate-600 stroke-[1.5]" />
              <p>No files found in this category.</p>
              <button
                onClick={() => fileInputRef.current?.click()}
                className="px-3 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 text-xs font-medium cursor-pointer"
              >
                Upload a document or image
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {filteredFiles.map((file) => {
                const isImage = file.type === "image";
                const isCode = file.type === "code";

                return (
                  <div
                    key={file.id}
                    className="p-3.5 rounded-2xl bg-neutral-900/60 border border-white/5 hover:border-white/10 transition-all flex flex-col justify-between gap-3 group"
                  >
                    <div className="flex items-start gap-3">
                      <div className="p-2.5 rounded-xl bg-black border border-white/10 text-indigo-400 shrink-0">
                        {isImage ? (
                          <ImageIcon className="w-4 h-4" />
                        ) : isCode ? (
                          <Code2 className="w-4 h-4" />
                        ) : (
                          <FileText className="w-4 h-4" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <h4 className="text-xs font-semibold text-white truncate" title={file.name}>
                          {file.name}
                        </h4>
                        <p className="text-[10px] text-slate-400 mt-0.5">
                          {Math.round(file.size / 1024)} KB · {new Date(file.createdAt).toLocaleDateString()}
                        </p>
                      </div>
                    </div>

                    {/* Quick image preview */}
                    {isImage && file.dataUrl && (
                      <div className="w-full h-24 rounded-xl overflow-hidden bg-black/50 border border-white/5">
                        <img
                          src={file.dataUrl}
                          alt={file.name}
                          className="w-full h-full object-cover"
                        />
                      </div>
                    )}

                    {/* Action buttons */}
                    <div className="pt-2 border-t border-white/5 flex items-center justify-between text-xs">
                      {/* Ask MEYRA actions */}
                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => onAskAboutFile?.(file, "summarize")}
                          className="px-2 py-1 rounded bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-300 text-[10px] font-medium transition-colors cursor-pointer"
                          title="Ask MEYRA to summarize this file"
                        >
                          Summarize
                        </button>
                        <button
                          type="button"
                          onClick={() => onAskAboutFile?.(file, "study-notes")}
                          className="px-2 py-1 rounded bg-white/5 hover:bg-white/10 text-slate-300 text-[10px] font-medium transition-colors cursor-pointer"
                          title="Ask MEYRA to generate study notes"
                        >
                          Study Notes
                        </button>
                      </div>

                      {/* File actions */}
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => handleDownload(file)}
                          className="p-1 text-slate-400 hover:text-white rounded hover:bg-white/5 cursor-pointer"
                          title="Download"
                        >
                          <Download className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleDelete(file.id)}
                          className="p-1 text-slate-400 hover:text-rose-400 rounded hover:bg-white/5 cursor-pointer"
                          title="Delete"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-3.5 border-t border-white/10 bg-neutral-900/50 flex justify-between items-center text-xs text-slate-400">
          <span>Supported: PDF, Images (JPG, PNG), TXT, Markdown, JSON, Code</span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-xl bg-white/10 hover:bg-white/15 text-white font-semibold cursor-pointer transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
