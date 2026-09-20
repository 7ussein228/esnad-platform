import { describe, expect, it } from "vitest";
import { slugify, formatCurrency, formatDate, formatDuration, cn } from "@/lib/utils";

describe("slugify", () => {
  it("creates a url-safe slug with a unique suffix", () => {
    const slug = slugify("شرح منهج الدراسات الاجتماعية");
    expect(slug.startsWith("شرح-منهج-الدراسات-الاجتماعية-")).toBe(true);
    expect(slug).toMatch(/-[a-z0-9]{5}$/);
  });

  it("collapses whitespace and dashes", () => {
    expect(slugify("  Hello   World  ")).toMatch(/^hello-world-[a-z0-9]{5}$/);
  });

  it("produces different slugs for the same title (uniqueness)", () => {
    expect(slugify("تاريخ")).not.toBe(slugify("تاريخ"));
  });
});

describe("formatCurrency", () => {
  it("formats EGP amounts as arabic currency strings", () => {
    const out = formatCurrency(199, "EGP");
    expect(typeof out).toBe("string");
    expect(out).toContain("١٩٩");
  });

  it("handles numeric strings and zero", () => {
    expect(formatCurrency("250", "EGP")).toContain("٢٥٠");
    expect(formatCurrency(0, "EGP")).toContain("٠");
  });
});

describe("formatDate", () => {
  it("returns a dash for empty values", () => {
    expect(formatDate(null)).toBe("—");
    expect(formatDate(undefined)).toBe("—");
  });

  it("formats a real date in arabic", () => {
    const out = formatDate(new Date("2026-01-15T00:00:00Z"));
    expect(out).toContain("٢٠٢٦");
  });
});

describe("formatDuration", () => {
  it("formats seconds as m:ss", () => {
    expect(formatDuration(65)).toBe("1:05");
    expect(formatDuration(0)).toBe("0:00");
    expect(formatDuration(600)).toBe("10:00");
  });
});

describe("cn", () => {
  it("joins truthy class names", () => {
    expect(cn("a", false, null, undefined, "b")).toBe("a b");
  });
});
