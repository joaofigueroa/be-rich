import { describe, expect, it } from "vitest";
import { sanitizePdfBytes } from "./pdf-parser";

describe("PDF parser utilities", () => {
  it("remove bytes inválidos antes da assinatura PDF e resíduos depois do EOF", () => {
    const bytes = new Uint8Array([
      0,
      0,
      0,
      ...new TextEncoder().encode("%PDF-1.7\n1 0 obj\n<<>>\nendobj\n%%EOF"),
      0,
      0,
    ]);

    const sanitized = sanitizePdfBytes(bytes);
    const text = new TextDecoder().decode(sanitized);

    expect(text.startsWith("%PDF-1.7")).toBe(true);
    expect(text.endsWith("%%EOF")).toBe(true);
  });
});
