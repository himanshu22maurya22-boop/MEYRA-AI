import { MessageAttachment, FileItem } from "../types";

export const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10 MB limit
export const SUPPORTED_IMAGE_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
];

export const SUPPORTED_DOCUMENT_TYPES = [
  "text/plain",
  "text/markdown",
  "text/csv",
  "application/json",
  "text/javascript",
  "text/typescript",
  "text/html",
  "text/css",
  "text/x-python",
  "application/pdf",
];

export interface FileValidationResult {
  valid: boolean;
  error?: string;
  type: "image" | "document" | "unsupported";
}

export function validateFile(file: File): FileValidationResult {
  if (file.size > MAX_FILE_SIZE) {
    return {
      valid: false,
      error: `File "${file.name}" exceeds the 10MB maximum size limit.`,
      type: "unsupported",
    };
  }

  const mime = file.type.toLowerCase();
  const extension = file.name.split(".").pop()?.toLowerCase() || "";

  if (SUPPORTED_IMAGE_TYPES.includes(mime) || ["jpg", "jpeg", "png", "webp", "gif"].includes(extension)) {
    return { valid: true, type: "image" };
  }

  if (
    SUPPORTED_DOCUMENT_TYPES.includes(mime) ||
    ["txt", "md", "csv", "json", "js", "ts", "py", "html", "css", "pdf"].includes(extension)
  ) {
    return { valid: true, type: "document" };
  }

  return {
    valid: false,
    error: `Unsupported file type: .${extension || "unknown"}. Supported types are images (JPG, PNG, WEBP), PDFs, and text/code documents (TXT, MD, CSV, JSON, PY, JS, HTML).`,
    type: "unsupported",
  };
}

/**
 * Reads a file into a MessageAttachment with base64 dataUrl or extracted text.
 */
export async function processUploadedFile(file: File): Promise<MessageAttachment> {
  const validation = validateFile(file);
  if (!validation.valid) {
    throw new Error(validation.error);
  }

  const id = `att_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;

  if (validation.type === "image") {
    const dataUrl = await readFileAsDataUrl(file);
    return {
      id,
      type: "image",
      name: file.name,
      mimeType: file.type || "image/jpeg",
      size: file.size,
      dataUrl,
    };
  } else {
    // Document
    if (file.type === "application/pdf" || file.name.endsWith(".pdf")) {
      // For PDF in browser without heavy pdf.js, we store dataUrl and extracted summary note
      const dataUrl = await readFileAsDataUrl(file);
      return {
        id,
        type: "document",
        name: file.name,
        mimeType: "application/pdf",
        size: file.size,
        dataUrl,
        extractedText: `[Attached PDF Document: ${file.name} (${Math.round(file.size / 1024)} KB). The user has attached this document for analysis, summarization, or questions.]`,
      };
    } else {
      // Text-based code/doc
      const text = await readFileAsText(file);
      return {
        id,
        type: "document",
        name: file.name,
        mimeType: file.type || "text/plain",
        size: file.size,
        extractedText: text,
      };
    }
  }
}

function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(new Error("Failed to read file as data URL"));
    reader.readAsDataURL(file);
  });
}

function readFileAsText(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(new Error("Failed to read file as text"));
    reader.readAsText(file);
  });
}
