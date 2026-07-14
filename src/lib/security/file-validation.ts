/**
 * Upload validation (SECURITY.md §4): an allowlist checked by
 * extension AND declared MIME AND magic bytes, plus a size cap. A hostile file
 * can at worst fail validation or extraction — it is never executed, and the
 * `{userId}/{documentId}/…` storage path makes traversal structurally
 * impossible.
 */

export const MAX_DOCUMENT_BYTES = 5 * 1024 * 1024; // 5 MB

export type DocumentFileType = "pdf" | "docx" | "txt" | "md";

type Spec = {
  type: DocumentFileType;
  extensions: string[];
  mimeTypes: string[];
  /** Leading magic bytes; null for plain-text formats that have none. */
  magic: number[] | null;
};

const SPECS: Spec[] = [
  {
    type: "pdf",
    extensions: [".pdf"],
    mimeTypes: ["application/pdf"],
    magic: [0x25, 0x50, 0x44, 0x46], // "%PDF"
  },
  {
    type: "docx",
    extensions: [".docx"],
    mimeTypes: [
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    ],
    magic: [0x50, 0x4b, 0x03, 0x04], // ZIP "PK\x03\x04"
  },
  {
    type: "txt",
    extensions: [".txt"],
    mimeTypes: ["text/plain", "application/octet-stream", ""],
    magic: null,
  },
  {
    type: "md",
    extensions: [".md", ".markdown"],
    mimeTypes: ["text/markdown", "text/plain", "application/octet-stream", ""],
    magic: null,
  },
];

export const ACCEPTED_UPLOAD_EXTENSIONS = SPECS.flatMap((s) => s.extensions);

export type FileValidationResult =
  | { ok: true; type: DocumentFileType; extension: string }
  | { ok: false; error: string };

function extensionOf(filename: string): string {
  const dot = filename.lastIndexOf(".");
  return dot === -1 ? "" : filename.slice(dot).toLowerCase();
}

function startsWith(bytes: Uint8Array, magic: number[]): boolean {
  if (bytes.length < magic.length) return false;
  return magic.every((b, i) => bytes[i] === b);
}

function looksLikeText(bytes: Uint8Array): boolean {
  // Reject binary masquerading as text: no NUL bytes in the sampled prefix.
  const sample = bytes.subarray(0, Math.min(bytes.length, 8192));
  return !sample.includes(0x00);
}

export function validateDocumentFile(input: {
  filename: string;
  mimeType: string;
  size: number;
  bytes: Uint8Array;
}): FileValidationResult {
  const { filename, mimeType, size, bytes } = input;

  if (size <= 0) return { ok: false, error: "That file appears to be empty." };
  if (size > MAX_DOCUMENT_BYTES) {
    return { ok: false, error: "Files must be 5 MB or smaller." };
  }

  const extension = extensionOf(filename);
  const spec = SPECS.find((s) => s.extensions.includes(extension));
  if (!spec) {
    return {
      ok: false,
      error: "Unsupported file type. Upload a PDF, DOCX, TXT, or MD file.",
    };
  }

  const declaredMime = (mimeType || "").toLowerCase();
  if (!spec.mimeTypes.includes(declaredMime)) {
    return {
      ok: false,
      error: "The file's type doesn't match its extension.",
    };
  }

  if (spec.magic) {
    if (!startsWith(bytes, spec.magic)) {
      return {
        ok: false,
        error: "The file contents don't match a valid " + spec.type + " file.",
      };
    }
  } else if (!looksLikeText(bytes)) {
    return { ok: false, error: "That doesn't look like a text file." };
  }

  return { ok: true, type: spec.type, extension };
}

/** Sanitize a user filename to a safe slug used inside the storage path. */
export function sanitizeFilename(filename: string): string {
  const extension = extensionOf(filename);
  const base = filename.slice(0, filename.length - extension.length);
  const slug = base
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
  return `${slug || "document"}${extension}`;
}
