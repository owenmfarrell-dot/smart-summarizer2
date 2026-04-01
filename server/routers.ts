import { z } from "zod";
import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, protectedProcedure, router } from "./_core/trpc";
import { invokeLLM, type Message } from "./_core/llm";
import { saveSummaryHistory, getUserHistory } from "./db";
import { storagePut } from "./storage";
import { getOrCreateSubscription, getCurrentMonthUsage, hasReachedLimit, incrementUsage } from "./db-paywall";
import { nanoid } from "nanoid";
import { TRPCError } from "@trpc/server";

// ─── Summarize Router ────────────────────────────────────────────────────────

const summarizeInput = z.object({
  text: z.string().min(10, "Text must be at least 10 characters").max(50000, "Text too long"),
  outputType: z.enum(["summary", "bullets", "rewrite"]),
  outputLength: z.enum(["short", "medium"]).default("medium"),
  outputTone: z.enum(["formal", "casual"]).default("formal"),
  rewriteStyle: z.enum(["eli5", "formal"]).optional(),
});

function buildSystemPrompt(
  outputType: string,
  outputLength: string,
  outputTone: string,
  rewriteStyle?: string
): string {
  const lengthGuide = outputLength === "short"
    ? "Keep the output concise and brief."
    : "Provide a moderately detailed output.";

  const toneGuide = outputTone === "formal"
    ? "Use professional, formal language."
    : "Use friendly, conversational language.";

  if (outputType === "summary") {
    return `You are an expert content summarizer. Summarize the given text into exactly 3-5 clear, informative sentences that capture the most important ideas. ${lengthGuide} ${toneGuide} Return only the summary text, no preamble.`;
  }

  if (outputType === "bullets") {
    const bulletCount = outputLength === "short" ? "5-7" : "7-10";
    return `You are an expert at extracting key insights. Extract the ${bulletCount} most important key takeaways from the given text as bullet points. ${toneGuide} Return a JSON object with a single key "bullets" containing an array of strings. Each string is one bullet point (without bullet symbols). Example: {"bullets": ["First key point", "Second key point"]}`;
  }

  if (outputType === "rewrite") {
    if (rewriteStyle === "eli5") {
      return `You are an expert at simplifying complex content. Rewrite the given text in a simple, easy-to-understand way as if explaining to a 10-year-old (ELI5 style). Use simple words, short sentences, and relatable analogies. ${lengthGuide} Return only the rewritten text, no preamble.`;
    } else {
      return `You are an expert content editor. Rewrite the given text in a polished, formal, and professional tone suitable for business or academic contexts. Improve clarity and structure. ${lengthGuide} Return only the rewritten text, no preamble.`;
    }
  }

  return "You are a helpful assistant. Process the given text.";
}

const summarizeRouter = router({
  generate: publicProcedure
    .input(summarizeInput)
    .mutation(async ({ input, ctx }) => {
      // Check paywall limits
      if (!ctx.user) {
        throw new TRPCError({
          code: "UNAUTHORIZED",
          message: "Please sign in to generate content.",
        });
      }

      const subscription = await getOrCreateSubscription(ctx.user.id);
      if (!subscription) {
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Failed to load subscription" });
      }

      const reachedLimit = await hasReachedLimit(ctx.user.id, subscription);
      if (reachedLimit) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Free tier limit reached (5 per month). Upgrade to Pro for unlimited generations.",
        });
      }

      const systemPrompt = buildSystemPrompt(
        input.outputType,
        input.outputLength,
        input.outputTone,
        input.rewriteStyle
      );

      let result: string;

      if (input.outputType === "bullets") {
        const response = await invokeLLM({
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: input.text },
          ],
          response_format: {
            type: "json_schema",
            json_schema: {
              name: "bullets_output",
              strict: true,
              schema: {
                type: "object",
                properties: {
                  bullets: {
                    type: "array",
                    items: { type: "string" },
                    description: "Array of key bullet point takeaways",
                  },
                },
                required: ["bullets"],
                additionalProperties: false,
              },
            },
          },
        });
        const content = (response.choices[0]?.message?.content as string) ?? "{}";
        result = content;
      } else {
        const response = await invokeLLM({
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: input.text },
          ],
        });
        result = (response.choices[0]?.message?.content as string) ?? "";
      }

      // Save to history and increment usage
      if (ctx.user) {
        await saveSummaryHistory({
          userId: ctx.user.id,
          inputText: input.text.slice(0, 5000),
          outputType: input.outputType,
          outputLength: input.outputLength,
          outputTone: input.outputTone,
          rewriteStyle: input.rewriteStyle ?? null,
          result: result.slice(0, 10000),
          charCount: input.text.length,
        }).catch(() => {/* non-critical */});

        // Increment usage for the month
        await incrementUsage(ctx.user.id).catch(() => {/* non-critical */});
      }

      return { result, outputType: input.outputType };
    }),

  history: protectedProcedure.query(async ({ ctx }) => {
    return getUserHistory(ctx.user.id, 20);
  }),
});

// ─── Upload Router ────────────────────────────────────────────────────────────

const uploadRouter = router({
  uploadFile: publicProcedure
    .input(z.object({
      fileName: z.string(),
      fileBase64: z.string(),
      mimeType: z.string(),
    }))
    .mutation(async ({ input }) => {
      const MAX_SIZE = 5 * 1024 * 1024; // 5MB
      const buffer = Buffer.from(input.fileBase64, "base64");

      if (buffer.byteLength > MAX_SIZE) {
        throw new Error("File size exceeds 5MB limit");
      }

      const allowedTypes = [
        "application/pdf",
        "application/msword",
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        "text/plain",
      ];

      if (!allowedTypes.includes(input.mimeType)) {
        throw new Error("Unsupported file type. Please upload PDF, DOC, DOCX, or TXT files.");
      }

      const key = `uploads/${nanoid()}-${input.fileName}`;
      const { url } = await storagePut(key, buffer, input.mimeType);

      // Extract text from the uploaded file via LLM (for PDF/DOC)
      let extractedText = "";

      if (input.mimeType === "text/plain") {
        extractedText = buffer.toString("utf-8");
      } else {
        // Use LLM with file_url content type for PDF/DOC extraction
        const response = await invokeLLM({
          messages: [
            {
              role: "system",
              content: "Extract and return all the text content from this document. Return only the extracted text, preserving paragraphs. Do not add any commentary or formatting.",
            },
            {
              role: "user",
              content: [
                {
                  type: "file_url" as const,
                  file_url: {
                    url,
                    mime_type: input.mimeType as "application/pdf",
                  },
                },
              ],
            } as Message,
          ],
        });
        extractedText = (response.choices[0]?.message?.content as string) ?? "";
      }

      return {
        extractedText,
        fileName: input.fileName,
        fileSize: buffer.byteLength,
        fileUrl: url,
      };
    }),
});

// ─── Subscription Router ─────────────────────────────────────────────────────

const subscriptionRouter = router({
  getSubscription: protectedProcedure.query(async ({ ctx }) => {
    const subscription = await getOrCreateSubscription(ctx.user.id);
    const usage = await getCurrentMonthUsage(ctx.user.id);
    return {
      ...subscription,
      usage,
      limit: subscription?.plan === "pro" ? Infinity : 5,
    };
  }),

  getUsage: protectedProcedure.query(async ({ ctx }) => {
    const subscription = await getOrCreateSubscription(ctx.user.id);
    const usage = await getCurrentMonthUsage(ctx.user.id);
    const limit = subscription?.plan === "pro" ? Infinity : 5;
    return {
      usage,
      limit,
      remaining: Math.max(0, limit - usage),
      isUnlimited: subscription?.plan === "pro",
    };
  }),
});

// ─── App Router ───────────────────────────────────────────────────────────────

export const appRouter = router({
  system: systemRouter,
  auth: router({
    me: publicProcedure.query(opts => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return { success: true } as const;
    }),
  }),
  summarize: summarizeRouter,
  upload: uploadRouter,
  subscription: subscriptionRouter,
});

export type AppRouter = typeof appRouter;
