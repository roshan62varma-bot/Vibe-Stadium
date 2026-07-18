import { describe, it, expect } from "vitest";
import { getTypographyTokens } from "../artifacts/vibe-stadium/src/lib/translations";

describe("Multi-Language Typography & Layout Direction Tests", () => {
  it("should return LTR and Outfit/Inter tokens for English (en)", () => {
    const tokens = getTypographyTokens("en");
    expect(tokens.direction).toBe("ltr");
    expect(tokens.fontFamily).toContain("Outfit");
    expect(tokens.fontFamily).toContain("Inter");
    expect(tokens.letterSpacing).toBe("-0.02em");
  });

  it("should return LTR and Outfit/Arial tokens for Spanish (es)", () => {
    const tokens = getTypographyTokens("es");
    expect(tokens.direction).toBe("ltr");
    expect(tokens.fontFamily).toContain("Outfit");
    expect(tokens.fontFamily).toContain("Arial");
    expect(tokens.letterSpacing).toBe("0.01em");
  });

  it("should return LTR and Outfit/Helvetica tokens for French (fr)", () => {
    const tokens = getTypographyTokens("fr");
    expect(tokens.direction).toBe("ltr");
    expect(tokens.fontFamily).toContain("Outfit");
    expect(tokens.fontFamily).toContain("Helvetica");
    expect(tokens.letterSpacing).toBe("-0.01em");
  });

  it("should return LTR and Outfit/Segoe UI tokens for Portuguese (pt)", () => {
    const tokens = getTypographyTokens("pt");
    expect(tokens.direction).toBe("ltr");
    expect(tokens.fontFamily).toContain("Outfit");
    expect(tokens.fontFamily).toContain("Segoe UI");
    expect(tokens.letterSpacing).toBe("0px");
  });

  it("should return RTL and Cairo/Amiri tokens for Arabic (ar)", () => {
    const tokens = getTypographyTokens("ar");
    expect(tokens.direction).toBe("rtl");
    expect(tokens.fontFamily).toContain("Cairo");
    expect(tokens.fontFamily).toContain("Amiri");
    expect(tokens.letterSpacing).toBe("normal");
  });

  it("should handle empty or completely invalid language strings gracefully by falling back to English LTR", () => {
    const tokensInvalid = getTypographyTokens("invalid-lang-code");
    expect(tokensInvalid.direction).toBe("ltr");
    expect(tokensInvalid.fontFamily).toContain("Inter");

    const tokensEmpty = getTypographyTokens("");
    expect(tokensEmpty.direction).toBe("ltr");
    
    const tokensLong = getTypographyTokens("a".repeat(1000));
    expect(tokensLong.direction).toBe("ltr");
  });
});
