import { describe, expect, it, vi, beforeEach } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

// ─── Mock LLM ─────────────────────────────────────────────────────────────────
vi.mock("./_core/llm", () => ({
  invokeLLM: vi.fn(),
}));

// ─── Mock DB helpers ──────────────────────────────────────────────────────────
vi.mock("./db", () => ({
  saveSummaryHistory: vi.fn().mockResolvedValue(null),
  getUserHistory: vi.fn().mockResolvedValue([]),
  upsertUser: vi.fn(),
  getUserByOpenId: vi.fn(),
  getDb: vi.fn(),
}));

// ─── Mock paywall helpers ──────────────────────────────────────────────────────
vi.mock("./db-paywall", () => ({
  getOrCreateSubscription: vi.fn(),
  getCurrentMonthUsage: vi.fn().mockResolvedValue(0),
  hasReachedLimit: vi.fn().mockResolvedValue(false),
  incrementUsage: vi.fn().mockResolvedValue(null),
}));

// ─── Mock storage ─────────────────────────────────────────────────────────────
vi.mock("./storage", () => ({
  storagePut: vi.fn().mockResolvedValue({ url: "https://cdn.example.com/test.pdf", key: "test.pdf" }),
}));

import { invokeLLM } from "./_core/llm";

// ─── Context helpers ──────────────────────────────────────────────────────────
function makePublicCtx(): TrpcContext {
  return {
    user: null,
    req: { protocol: "https", headers: {} } as TrpcContext["req"],
    res: { clearCookie: vi.fn() } as unknown as TrpcContext["res"],
  };
}

function makeAuthCtx(): TrpcContext {
  return {
    user: {
      id: 1,
      openId: "test-user",
      name: "Test User",
      email: "test@example.com",
      loginMethod: "manus",
      role: "user",
      createdAt: new Date(),
      updatedAt: new Date(),
      lastSignedIn: new Date(),
    },
    req: { protocol: "https", headers: {} } as TrpcContext["req"],
    res: { clearCookie: vi.fn() } as unknown as TrpcContext["res"],
  };
}

// ─── Tests ────────────────────────────────────────────────────────────────────
describe("summarize.generate", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("generates a summary for authenticated user with pro plan", async () => {
    const { getOrCreateSubscription } = await import("./db-paywall");
    vi.mocked(getOrCreateSubscription).mockResolvedValueOnce({
      id: 1,
      userId: 1,
      plan: "pro",
      status: "active",
      stripeCustomerId: null,
      stripeSubscriptionId: null,
      currentPeriodStart: null,
      currentPeriodEnd: null,
      canceledAt: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    vi.mocked(invokeLLM).mockResolvedValueOnce({
      id: "test",
      created: Date.now(),
      model: "gemini-2.5-flash",
      choices: [{ index: 0, message: { role: "assistant", content: "This is a summary." }, finish_reason: "stop" }],
    });

    const caller = appRouter.createCaller(makeAuthCtx());
    const result = await caller.summarize.generate({
      text: "This is a long article about artificial intelligence and its impact on modern society.",
      outputType: "summary",
      outputLength: "medium",
      outputTone: "formal",
    });

    expect(result.result).toBe("This is a summary.");
    expect(result.outputType).toBe("summary");
    expect(invokeLLM).toHaveBeenCalledOnce();
  });

  it("generates bullet points as JSON", async () => {
    const { getOrCreateSubscription } = await import("./db-paywall");
    vi.mocked(getOrCreateSubscription).mockResolvedValueOnce({
      id: 1,
      userId: 1,
      plan: "pro",
      status: "active",
      stripeCustomerId: null,
      stripeSubscriptionId: null,
      currentPeriodStart: null,
      currentPeriodEnd: null,
      canceledAt: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    const mockBullets = { bullets: ["First key point", "Second key point", "Third key point"] };
    vi.mocked(invokeLLM).mockResolvedValueOnce({
      id: "test",
      created: Date.now(),
      model: "gemini-2.5-flash",
      choices: [{ index: 0, message: { role: "assistant", content: JSON.stringify(mockBullets) }, finish_reason: "stop" }],
    });

    const caller = appRouter.createCaller(makeAuthCtx());
    const result = await caller.summarize.generate({
      text: "This is a long article about artificial intelligence and its impact on modern society.",
      outputType: "bullets",
      outputLength: "medium",
      outputTone: "formal",
    });

    expect(result.outputType).toBe("bullets");
    const parsed = JSON.parse(result.result);
    expect(parsed.bullets).toHaveLength(3);
    expect(parsed.bullets[0]).toBe("First key point");
  });

  it("generates an ELI5 rewrite", async () => {
    const { getOrCreateSubscription } = await import("./db-paywall");
    vi.mocked(getOrCreateSubscription).mockResolvedValueOnce({
      id: 1,
      userId: 1,
      plan: "pro",
      status: "active",
      stripeCustomerId: null,
      stripeSubscriptionId: null,
      currentPeriodStart: null,
      currentPeriodEnd: null,
      canceledAt: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    vi.mocked(invokeLLM).mockResolvedValueOnce({
      id: "test",
      created: Date.now(),
      model: "gemini-2.5-flash",
      choices: [{ index: 0, message: { role: "assistant", content: "Imagine AI is like a really smart robot..." }, finish_reason: "stop" }],
    });

    const caller = appRouter.createCaller(makeAuthCtx());
    const result = await caller.summarize.generate({
      text: "Artificial intelligence leverages machine learning algorithms to process data.",
      outputType: "rewrite",
      outputLength: "short",
      outputTone: "casual",
      rewriteStyle: "eli5",
    });

    expect(result.result).toContain("robot");
    expect(result.outputType).toBe("rewrite");
  });

  it("throws on unauthenticated access", async () => {
    const caller = appRouter.createCaller(makePublicCtx());
    await expect(
      caller.summarize.generate({
        text: "This is a long article about artificial intelligence and its impact on modern society.",
        outputType: "summary",
        outputLength: "short",
        outputTone: "formal",
      })
    ).rejects.toThrow("Please sign in");
  });

  it("saves history when user is authenticated", async () => {
    const { saveSummaryHistory } = await import("./db");
    const { getOrCreateSubscription } = await import("./db-paywall");
    vi.mocked(getOrCreateSubscription).mockResolvedValueOnce({
      id: 1,
      userId: 1,
      plan: "pro",
      status: "active",
      stripeCustomerId: null,
      stripeSubscriptionId: null,
      currentPeriodStart: null,
      currentPeriodEnd: null,
      canceledAt: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    vi.mocked(invokeLLM).mockResolvedValueOnce({
      id: "test",
      created: Date.now(),
      model: "gemini-2.5-flash",
      choices: [{ index: 0, message: { role: "assistant", content: "Summary for authenticated user." }, finish_reason: "stop" }],
    });

    const caller = appRouter.createCaller(makeAuthCtx());
    await caller.summarize.generate({
      text: "This is a long article about artificial intelligence and its impact on modern society.",
      outputType: "summary",
      outputLength: "medium",
      outputTone: "formal",
    });

    expect(saveSummaryHistory).toHaveBeenCalledOnce();
  });
});

describe("upload.uploadFile", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("rejects files over 5MB", async () => {
    const caller = appRouter.createCaller(makePublicCtx());
    const largeBase64 = Buffer.alloc(6 * 1024 * 1024).toString("base64");

    await expect(
      caller.upload.uploadFile({
        fileName: "large.pdf",
        fileBase64: largeBase64,
        mimeType: "application/pdf",
      })
    ).rejects.toThrow("File size exceeds 5MB limit");
  });

  it("rejects unsupported file types", async () => {
    const caller = appRouter.createCaller(makePublicCtx());
    const smallBase64 = Buffer.alloc(100).toString("base64");

    await expect(
      caller.upload.uploadFile({
        fileName: "image.png",
        fileBase64: smallBase64,
        mimeType: "image/png",
      })
    ).rejects.toThrow("Unsupported file type");
  });

  it("extracts text from plain text files without LLM", async () => {
    const caller = appRouter.createCaller(makePublicCtx());
    const textContent = "Hello, this is a plain text file.";
    const base64 = Buffer.from(textContent).toString("base64");

    const result = await caller.upload.uploadFile({
      fileName: "notes.txt",
      fileBase64: base64,
      mimeType: "text/plain",
    });

    expect(result.extractedText).toBe(textContent);
    expect(result.fileName).toBe("notes.txt");
    expect(invokeLLM).not.toHaveBeenCalled();
  });
});

describe("auth.logout", () => {
  it("clears the session cookie and returns success", async () => {
    const ctx = makePublicCtx();
    const clearCookieSpy = vi.fn();
    ctx.res.clearCookie = clearCookieSpy;

    const caller = appRouter.createCaller(ctx);
    const result = await caller.auth.logout();

    expect(result).toEqual({ success: true });
    expect(clearCookieSpy).toHaveBeenCalledOnce();
  });
});
