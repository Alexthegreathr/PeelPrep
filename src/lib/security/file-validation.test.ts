import { describe, expect, it } from "vitest";

import {
  validateDocumentFile,
  sanitizeFilename,
  MAX_DOCUMENT_BYTES,
} from "./file-validation";

const enc = (s: string) => new TextEncoder().encode(s);
const PDF = enc("%PDF-1.7\n%âãÏÓ\n1 0 obj");
const DOCX = new Uint8Array([0x50, 0x4b, 0x03, 0x04, 0x14, 0x00, 0x00]);
const TXT = enc("My resume\nExperience: things");

describe("validateDocumentFile", () => {
  it("accepts a valid PDF", () => {
    const r = validateDocumentFile({
      filename: "resume.pdf",
      mimeType: "application/pdf",
      size: PDF.length,
      bytes: PDF,
    });
    expect(r.ok && r.type).toBe("pdf");
  });

  it("accepts a valid DOCX (zip magic)", () => {
    const r = validateDocumentFile({
      filename: "resume.docx",
      mimeType:
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      size: DOCX.length,
      bytes: DOCX,
    });
    expect(r.ok && r.type).toBe("docx");
  });

  it("accepts TXT and MD", () => {
    expect(
      validateDocumentFile({
        filename: "notes.txt",
        mimeType: "text/plain",
        size: TXT.length,
        bytes: TXT,
      }).ok,
    ).toBe(true);
    expect(
      validateDocumentFile({
        filename: "notes.md",
        mimeType: "text/markdown",
        size: TXT.length,
        bytes: TXT,
      }).ok,
    ).toBe(true);
  });

  it("rejects an unsupported extension", () => {
    const r = validateDocumentFile({
      filename: "malware.exe",
      mimeType: "application/octet-stream",
      size: 10,
      bytes: enc("MZ"),
    });
    expect(r.ok).toBe(false);
  });

  it("rejects a spoofed extension (magic-byte mismatch)", () => {
    // A .pdf whose bytes are not a real PDF.
    const r = validateDocumentFile({
      filename: "fake.pdf",
      mimeType: "application/pdf",
      size: 10,
      bytes: enc("not a pdf"),
    });
    expect(r.ok).toBe(false);
  });

  it("rejects a MIME/extension mismatch", () => {
    const r = validateDocumentFile({
      filename: "resume.pdf",
      mimeType: "image/png",
      size: PDF.length,
      bytes: PDF,
    });
    expect(r.ok).toBe(false);
  });

  it("rejects binary content claiming to be text", () => {
    const r = validateDocumentFile({
      filename: "notes.txt",
      mimeType: "text/plain",
      size: 4,
      bytes: new Uint8Array([0x00, 0x01, 0x02, 0x03]),
    });
    expect(r.ok).toBe(false);
  });

  it("rejects oversized and empty files", () => {
    expect(
      validateDocumentFile({
        filename: "big.pdf",
        mimeType: "application/pdf",
        size: MAX_DOCUMENT_BYTES + 1,
        bytes: PDF,
      }).ok,
    ).toBe(false);
    expect(
      validateDocumentFile({
        filename: "empty.pdf",
        mimeType: "application/pdf",
        size: 0,
        bytes: new Uint8Array(),
      }).ok,
    ).toBe(false);
  });
});

describe("sanitizeFilename", () => {
  it("slugifies and keeps the extension", () => {
    expect(sanitizeFilename("My Résumé (final).pdf")).toMatch(
      /^my-r.*-final\.pdf$/,
    );
  });
  it("blocks path traversal characters", () => {
    const out = sanitizeFilename("../../etc/passwd.txt");
    expect(out).not.toContain("/");
    expect(out).not.toContain("..");
    expect(out.endsWith(".txt")).toBe(true);
  });
  it("falls back to a default base", () => {
    expect(sanitizeFilename("!!!.md")).toBe("document.md");
  });
});
