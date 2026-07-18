import { describe, it, expect } from "vitest";
import { sanitizeAndValidateInput, handleReasoningEngine } from "../artifacts/vibe-stadium/src/lib/assistantEngine";

describe("Assistant Security Input & XSS Validation Tests", () => {
  it("should validate and clean standard user inquiries", () => {
    const res = sanitizeAndValidateInput("Where is Food & Merch West?");
    expect(res.isValid).toBe(true);
    expect(res.sanitized).toBe("Where is Food & Merch West?");
  });

  it("should detect and block script injection attempts", () => {
    const res = sanitizeAndValidateInput("<script>alert('xss')</script> Show me exit");
    expect(res.isValid).toBe(false);
    expect(res.error).toContain("Malicious script tags detected");
  });

  it("should detect and block javascript URI schemes", () => {
    const res = sanitizeAndValidateInput("javascript:console.log('xss')");
    expect(res.isValid).toBe(false);
    expect(res.error).toContain("Javascript protocols are not allowed");
  });

  it("should detect and block inline event handlers", () => {
    const res = sanitizeAndValidateInput("<img src=x onerror=alert(1)>");
    expect(res.isValid).toBe(false);
    expect(res.error).toContain("HTML inline events are not allowed");
  });

  it("should strip harmless HTML elements to prevent HTML injections", () => {
    const res = sanitizeAndValidateInput("<b>Hello</b> where is gate?");
    expect(res.isValid).toBe(true);
    expect(res.sanitized).toBe("Hello where is gate?");
  });
});

describe("Assistant Intent Classification & Routing Tests", () => {
  const mockZones = [
    { id: "medical-zone", name: "Medical Center", capacityCurrent: 9 },
    { id: "amenity-west", name: "Food & Merch West", capacityCurrent: 33 },
    { id: "amenity-east", name: "Food & Merch East", capacityCurrent: 68 }
  ];

  it("should classify emergency query and return high urgency flag", () => {
    const res = handleReasoningEngine("I hurt my leg and need medical help", mockZones, "en");
    expect(res.matches).toBe(true);
    expect(res.isEmergency).toBe(true);
    expect(res.text).toContain("EMERGENCY RESPONSE INITIATED");
  });

  it("should classify sanitation query and query medical-zone density", () => {
    const res = handleReasoningEngine("where is the nearest washroom?", mockZones, "en");
    expect(res.matches).toBe(true);
    expect(res.isEmergency).toBe(false);
    expect(res.text).toContain("Medical Center");
    expect(res.text).toContain("9% density");
  });

  it("should classify dining query and list correct food zone densities", () => {
    const res = handleReasoningEngine("I am hungry, where can I eat food?", mockZones, "en");
    expect(res.matches).toBe(true);
    expect(res.isEmergency).toBe(false);
    expect(res.text).toContain("Food & Merch West");
    expect(res.text).toContain("33% density");
  });
});
