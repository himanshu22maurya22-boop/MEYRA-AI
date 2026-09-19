import React, { useState, useEffect } from "react";
import {
  Sparkles,
  X,
  Download,
  FolderPlus,
  RefreshCw,
  AlertCircle,
  Check,
  Image as ImageIcon,
  Palette,
  Layers,
  Trash2,
  ExternalLink,
} from "lucide-react";
import { generateImageApi } from "../../services/api";
import { chatStorage } from "../../services/storage";
import { FileItem, UserProfile } from "../../types";

interface ImageGenModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: UserProfile | null;
}

type ArtStyle = "default" | "photorealistic" | "anime" | "3d-render" | "cinematic" | "minimalist";

export const ImageGenModal: React.FC<ImageGenModalProps> = ({
  isOpen,
  onClose,
  currentUser,
}) => {
  const [activeTab, setActiveTab] = useState<"generate" | "library">("generate");
  const [prompt, setPrompt] = useState("");
  const [aspectRatio, setAspectRatio] = useState<"1:1" | "16:9" | "4:3" | "9:16">("1:1");
  const [style, setStyle] = useState<ArtStyle>("default");
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedUrl, setGeneratedUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [savedSuccess, setSavedSuccess] = useState(false);
  const [libraryImages, setLibraryImages] = useState<FileItem[]>([]);
  const [selectedPreviewImage, setSelectedPreviewImage] = useState<FileItem | null>(null);

  const loadLibrary = () => {
    const files = chatStorage.getFiles(currentUser?.id);
    const fileImages = files.filter(
      (f) => f.type === "generated" || f.mimeType.startsWith("image/")
    );
    const artworks = chatStorage.getSavedArtworks(currentUser?.id);
    const artworkAsFiles: FileItem[] = artworks.map((art) => ({
      id: art.id,
      userId: art.userId || currentUser?.id || "local_user",
      name: `Artwork: ${art.prompt.slice(0, 24)}...`,
      type: "generated",
      mimeType: "image/png",
      size: Math.round((art.imageUrl.length * 3) / 4),
      dataUrl: art.imageUrl,
      createdAt: art.createdAt,
      updatedAt: art.createdAt,
    }));

    // Combine and deduplicate by dataUrl
    const seenUrls = new Set<string>();
    const combined: FileItem[] = [];
    for (const img of [...artworkAsFiles, ...fileImages]) {
      if (img.dataUrl && !seenUrls.has(img.dataUrl)) {
        seenUrls.add(img.dataUrl);
        combined.push(img);
      }
    }
    setLibraryImages(combined);
  };

  useEffect(() => {
    if (isOpen) {
      loadLibrary();
      setError(null);
      setSavedSuccess(false);
    }
  }, [isOpen, currentUser]);

  if (!isOpen) return null;

  const handleGenerate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!prompt.trim() || isGenerating) return;

    setIsGenerating(true);
    setGeneratedUrl(null);
    setError(null);
    setSavedSuccess(false);

    try {
      const res = await generateImageApi({
        prompt: prompt.trim(),
        aspectRatio,
        style,
        token: currentUser?.authToken,
      });

      setGeneratedUrl(res.imageUrl);

      // Auto-save generated image to user's isolated library
      const newFile: FileItem = {
        id: "gen_img_" + Date.now(),
        userId: currentUser?.id || "local_user",
        name: `AI_Image_${prompt.slice(0, 20).replace(/[^a-zA-Z0-9]/g, "_")}.png`,
        type: "generated",
        mimeType: "image/png",
        size: Math.round((res.imageUrl.length * 3) / 4),
        dataUrl: res.imageUrl,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };
      chatStorage.saveFile(newFile);
      chatStorage.saveArtwork({
        id: newFile.id,
        userId: currentUser?.id,
        prompt: prompt.trim(),
        imageUrl: res.imageUrl,
        aspectRatio,
        style,
        createdAt: Date.now(),
      });
      loadLibrary();
      setSavedSuccess(true);
    } catch (err: any) {
      setGeneratedUrl(null);
      setError(err?.message || "Failed to generate image. Please check API key permissions.");
    } finally {
      setIsGenerating(false);
    }
  };

  const handleDownloadUrl = (url: string, filename = "MEYRA_Artwork.png") => {
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.click();
  };

  const handleDeleteLibraryItem = (id: string) => {
    chatStorage.deleteFile(id, currentUser?.id);
    chatStorage.deleteArtwork(id, currentUser?.id);
    loadLibrary();
    if (selectedPreviewImage?.id === id) {
      setSelectedPreviewImage(null);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-fade-in">
      <div className="relative w-full max-w-2xl bg-[#121217] border border-white/10 rounded-2xl shadow-2xl flex flex-col max-h-[92vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/10 bg-neutral-900/50">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-purple-500/20 text-purple-400">
              <ImageIcon className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-semibold text-white">MEYRA Image Studio</h3>
              <p className="text-xs text-slate-400">AI visual synthesis & personal artwork library</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-white/5 transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Tab navigation */}
        <div className="flex items-center gap-2 px-6 py-2.5 bg-black/40 border-b border-white/5 text-xs font-semibold">
          <button
            type="button"
            onClick={() => setActiveTab("generate")}
            className={`px-3.5 py-1.5 rounded-xl transition-all cursor-pointer flex items-center gap-1.5 ${
              activeTab === "generate"
                ? "bg-purple-600/30 text-purple-200 border border-purple-500/40"
                : "text-slate-400 hover:text-white"
            }`}
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>Generate Artwork</span>
          </button>
          <button
            type="button"
            onClick={() => {
              setActiveTab("library");
              loadLibrary();
            }}
            className={`px-3.5 py-1.5 rounded-xl transition-all cursor-pointer flex items-center gap-1.5 ${
              activeTab === "library"
                ? "bg-purple-600/30 text-purple-200 border border-purple-500/40"
                : "text-slate-400 hover:text-white"
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            <span>Saved Artwork Library ({libraryImages.length})</span>
          </button>
        </div>

        {/* Tab 1: Generate */}
        {activeTab === "generate" && (
          <div className="flex-1 overflow-y-auto p-6 space-y-4">
            <form onSubmit={handleGenerate} className="space-y-3.5">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Visual Prompt
                </label>
                <textarea
                  value={prompt}
                  onChange={(e) => {
                    setPrompt(e.target.value);
                    if (generatedUrl) {
                      setGeneratedUrl(null);
                      setSavedSuccess(false);
                    }
                  }}
                  placeholder="e.g., 'A hyper-futuristic floating city surrounded by bioluminescent clouds at twilight, cinematic 8k'"
                  rows={3}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-neutral-900 border border-white/10 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-purple-500 resize-none"
                  required
                />
              </div>

              {/* Style preset buttons */}
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5 flex items-center gap-1.5">
                  <Palette className="w-3.5 h-3.5 text-purple-400" />
                  Art Style Preset
                </label>
                <div className="grid grid-cols-3 sm:grid-cols-6 gap-1.5">
                  {(
                    [
                      { id: "default", label: "Default" },
                      { id: "photorealistic", label: "Photo 8K" },
                      { id: "anime", label: "Anime" },
                      { id: "3d-render", label: "3D Render" },
                      { id: "cinematic", label: "Cinematic" },
                      { id: "minimalist", label: "Minimal" },
                    ] as const
                  ).map((s) => (
                    <button
                      key={s.id}
                      type="button"
                      onClick={() => setStyle(s.id as ArtStyle)}
                      className={`py-1.5 text-xs rounded-xl border font-medium transition-all cursor-pointer ${
                        style === s.id
                          ? "bg-purple-600/30 border-purple-500 text-purple-200 shadow-sm"
                          : "bg-neutral-900 border-white/10 text-slate-400 hover:text-white"
                      }`}
                    >
                      {s.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Aspect Ratio Picker */}
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Aspect Ratio
                </label>
                <div className="grid grid-cols-4 gap-2">
                  {(["1:1", "16:9", "4:3", "9:16"] as const).map((ratio) => (
                    <button
                      key={ratio}
                      type="button"
                      onClick={() => setAspectRatio(ratio)}
                      className={`py-1.5 text-xs rounded-xl border font-mono transition-all cursor-pointer ${
                        aspectRatio === ratio
                          ? "bg-purple-600/30 border-purple-500 text-purple-200"
                          : "bg-neutral-900 border-white/10 text-slate-400 hover:text-white hover:bg-white/5"
                      }`}
                    >
                      {ratio}
                    </button>
                  ))}
                </div>
              </div>

              <button
                type="submit"
                disabled={!prompt.trim() || isGenerating}
                className="w-full py-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 disabled:opacity-40 text-xs font-semibold text-white shadow-lg shadow-purple-600/30 flex items-center justify-center gap-2 cursor-pointer transition-all"
              >
                {isGenerating ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>Synthesizing Artwork with Gemini...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4" />
                    <span>Generate Artwork</span>
                  </>
                )}
              </button>
            </form>

            {/* Error diagnostic notice */}
            {error && (
              <div className="p-3.5 rounded-xl bg-rose-950/40 border border-rose-500/30 flex flex-col gap-1.5 text-xs text-rose-200 animate-fade-in">
                <div className="flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                  <span className="font-semibold text-white">Generation Notice</span>
                </div>
                <p className="text-[11px] text-slate-300 leading-relaxed">{error}</p>
              </div>
            )}

            {/* Loading / Generating State */}
            {isGenerating && (
              <div className="mt-2 p-6 rounded-2xl bg-neutral-900/80 border border-purple-500/20 flex flex-col items-center justify-center text-center space-y-3 min-h-64 animate-pulse">
                <div className="w-12 h-12 rounded-2xl bg-purple-600/20 border border-purple-500/40 flex items-center justify-center">
                  <Sparkles className="w-6 h-6 text-purple-400 animate-spin" />
                </div>
                <div className="space-y-1">
                  <p className="text-xs font-semibold text-white">Synthesizing Artwork with Gemini...</p>
                  <p className="text-[11px] text-slate-400 max-w-sm">
                    Creating bespoke artwork for &ldquo;{prompt.trim().slice(0, 55)}{prompt.trim().length > 55 ? "..." : ""}&rdquo;
                  </p>
                  <p className="text-[10px] text-purple-400 font-mono">
                    Art Style: {style} • Aspect Ratio: {aspectRatio}
                  </p>
                </div>
              </div>
            )}

            {/* Result View */}
            {!isGenerating && generatedUrl && (
              <div className="mt-2 p-4 rounded-2xl bg-neutral-900/80 border border-white/10 space-y-3 animate-fade-in">
                <div className="w-full rounded-xl overflow-hidden bg-black flex items-center justify-center border border-white/5 p-1">
                  <img src={generatedUrl} alt={prompt} className="max-h-80 object-contain rounded-lg shadow-2xl" />
                </div>

                <div className="flex items-center justify-between gap-2 text-xs">
                  <span className="text-emerald-400 flex items-center gap-1 text-[11px] font-medium">
                    <Check className="w-3.5 h-3.5" />
                    Saved to Personal Library
                  </span>

                  <button
                    type="button"
                    onClick={() => handleDownloadUrl(generatedUrl, `MEYRA_${Date.now()}.png`)}
                    className="flex items-center gap-1.5 px-4 py-1.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-semibold shadow-sm cursor-pointer transition-colors"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>Download Artwork</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Tab 2: Saved Artwork Library */}
        {activeTab === "library" && (
          <div className="flex-1 overflow-y-auto p-6 space-y-4">
            <div className="flex items-center justify-between text-xs text-slate-400">
              <span>
                Isolated to:{" "}
                <span className="font-medium text-white">
                  {currentUser?.name || currentUser?.email || "Local User"}
                </span>
              </span>
              <span>{libraryImages.length} items</span>
            </div>

            {libraryImages.length === 0 ? (
              <div className="py-16 text-center space-y-3">
                <ImageIcon className="w-10 h-10 text-slate-600 mx-auto" />
                <p className="text-xs text-slate-400">No generated artwork saved in your library yet.</p>
                <button
                  type="button"
                  onClick={() => setActiveTab("generate")}
                  className="px-3.5 py-1.5 rounded-xl bg-purple-600/20 text-purple-300 text-xs font-semibold hover:bg-purple-600/30 transition-colors cursor-pointer"
                >
                  Generate your first image
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {libraryImages.map((img) => (
                  <div
                    key={img.id}
                    className="group relative rounded-xl overflow-hidden border border-white/10 bg-neutral-900 aspect-square flex items-center justify-center cursor-pointer hover:border-purple-500/50 transition-all"
                  >
                    {img.dataUrl ? (
                      <img
                        src={img.dataUrl}
                        alt={img.name}
                        className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                      />
                    ) : (
                      <ImageIcon className="w-8 h-8 text-slate-600" />
                    )}

                    {/* Hover Overlay */}
                    <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col justify-between p-2">
                      <p className="text-[10px] text-white font-medium truncate">{img.name}</p>
                      <div className="flex items-center justify-end gap-1.5">
                        {img.dataUrl && (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDownloadUrl(img.dataUrl!, img.name);
                            }}
                            className="p-1.5 rounded-lg bg-white/20 text-white hover:bg-white/30"
                            title="Download"
                          >
                            <Download className="w-3.5 h-3.5" />
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteLibraryItem(img.id);
                          }}
                          className="p-1.5 rounded-lg bg-rose-500/30 text-rose-300 hover:bg-rose-500/50"
                          title="Delete"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Footer */}
        <div className="px-6 py-3 border-t border-white/10 bg-neutral-900/50 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-xl bg-white/10 hover:bg-white/15 text-xs font-semibold text-white cursor-pointer transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
