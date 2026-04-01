import { useState, useCallback, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import {
  Sparkles, FileText, Copy, Download, CheckCheck,
  ChevronDown, Zap, BookOpen, RefreshCw, Upload,
  X, AlignLeft, List, Wand2, Clock, User, LogOut
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { UpgradeModal } from "@/components/UpgradeModal";
import { useAuth } from "@/_core/hooks/useAuth";
import { getLoginUrl } from "@/const";

// ─── Types ────────────────────────────────────────────────────────────────────
type OutputType = "summary" | "bullets" | "rewrite";
type OutputLength = "short" | "medium";
type OutputTone = "formal" | "casual";
type RewriteStyle = "eli5" | "formal";

interface GeneratedResult {
  outputType: OutputType;
  content: string;
  bullets?: string[];
  timestamp: Date;
}

// ─── Constants ────────────────────────────────────────────────────────────────
const MAX_CHARS = 50000;
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB

const OUTPUT_TYPES: { id: OutputType; label: string; icon: React.ReactNode; desc: string }[] = [
  { id: "summary", label: "Summary", icon: <AlignLeft className="w-4 h-4" />, desc: "3–5 sentence overview" },
  { id: "bullets", label: "Key Points", icon: <List className="w-4 h-4" />, desc: "Bullet-point takeaways" },
  { id: "rewrite", label: "Rewrite", icon: <Wand2 className="w-4 h-4" />, desc: "Simplified or formal" },
];

const PROGRESS_STEPS = [
  "Analyzing content...",
  "Identifying key concepts...",
  "Generating output...",
  "Polishing result...",
];

// ─── Progress Indicator ───────────────────────────────────────────────────────
function ProgressIndicator({ isLoading }: { isLoading: boolean }) {
  const [step, setStep] = useState(0);

  useState(() => {
    if (!isLoading) { setStep(0); return; }
    const interval = setInterval(() => {
      setStep(s => (s + 1) % PROGRESS_STEPS.length);
    }, 900);
    return () => clearInterval(interval);
  });

  if (!isLoading) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      className="flex flex-col items-center gap-4 py-8"
    >
      <div className="relative w-16 h-16">
        <div className="absolute inset-0 rounded-full border-2 border-primary/20" />
        <div className="absolute inset-0 rounded-full border-2 border-transparent border-t-primary animate-spin" />
        <div className="absolute inset-2 rounded-full border-2 border-transparent border-t-primary/50 animate-spin" style={{ animationDuration: "1.5s", animationDirection: "reverse" }} />
        <Sparkles className="absolute inset-0 m-auto w-5 h-5 text-primary" />
      </div>
      <div className="flex flex-col items-center gap-1">
        <AnimatePresence mode="wait">
          <motion.p
            key={step}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            className="text-sm text-muted-foreground font-medium"
          >
            {PROGRESS_STEPS[step]}
          </motion.p>
        </AnimatePresence>
        <div className="flex gap-1 mt-2">
          {PROGRESS_STEPS.map((_, i) => (
            <motion.div
              key={i}
              className="h-1 rounded-full bg-primary/30"
              animate={{ width: i === step ? 24 : 8, opacity: i === step ? 1 : 0.4 }}
              transition={{ duration: 0.3 }}
            />
          ))}
        </div>
      </div>
    </motion.div>
  );
}

// ─── Output Panel ─────────────────────────────────────────────────────────────
function OutputPanel({ result, onClear }: { result: GeneratedResult; onClear: () => void }) {
  const [copied, setCopied] = useState(false);

  const getPlainText = () => {
    if (result.outputType === "bullets" && result.bullets) {
      return result.bullets.map(b => `• ${b}`).join("\n");
    }
    return result.content;
  };

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(getPlainText());
      setCopied(true);
      toast.success("Copied to clipboard!");
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error("Failed to copy");
    }
  };

  const handleDownload = () => {
    const text = getPlainText();
    const blob = new Blob([text], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `summarizer-${result.outputType}-${Date.now()}.txt`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("Downloaded!");
  };

  const typeLabel = OUTPUT_TYPES.find(t => t.id === result.outputType)?.label ?? "Result";

  return (
    <motion.div
      initial={{ opacity: 0, y: 20, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      className="rounded-2xl border border-border bg-card overflow-hidden"
    >
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-3.5 border-b border-border bg-muted/30">
        <div className="flex items-center gap-2.5">
          <div className="w-2 h-2 rounded-full bg-primary animate-pulse" />
          <span className="text-sm font-semibold text-foreground">{typeLabel}</span>
          <Badge variant="secondary" className="text-xs px-2 py-0 h-5">
            AI Generated
          </Badge>
        </div>
        <div className="flex items-center gap-1.5">
          <Button
            variant="ghost"
            size="sm"
            onClick={handleCopy}
            className="h-7 px-2.5 text-xs gap-1.5 text-muted-foreground hover:text-foreground"
          >
            {copied ? <CheckCheck className="w-3.5 h-3.5 text-green-400" /> : <Copy className="w-3.5 h-3.5" />}
            {copied ? "Copied!" : "Copy"}
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleDownload}
            className="h-7 px-2.5 text-xs gap-1.5 text-muted-foreground hover:text-foreground"
          >
            <Download className="w-3.5 h-3.5" />
            Download
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={onClear}
            className="h-7 w-7 p-0 text-muted-foreground hover:text-foreground"
          >
            <X className="w-3.5 h-3.5" />
          </Button>
        </div>
      </div>

      {/* Content */}
      <div className="p-5">
        {result.outputType === "bullets" && result.bullets ? (
          <ul className="space-y-2.5">
            {result.bullets.map((bullet, i) => (
              <motion.li
                key={i}
                initial={{ opacity: 0, x: -12 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.06 }}
                className="flex items-start gap-3 group"
              >
                <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-primary flex-shrink-0 group-hover:scale-125 transition-transform" />
                <span className="text-sm text-foreground/90 leading-relaxed">{bullet}</span>
              </motion.li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-foreground/90 leading-relaxed whitespace-pre-wrap">{result.content}</p>
        )}
      </div>

      {/* Footer */}
      <div className="px-5 py-2.5 border-t border-border/50 flex items-center gap-1.5 text-xs text-muted-foreground">
        <Clock className="w-3 h-3" />
        Generated {result.timestamp.toLocaleTimeString()}
      </div>
    </motion.div>
  );
}

// ─── Toggle Group ─────────────────────────────────────────────────────────────
function ToggleGroup<T extends string>({
  label, options, value, onChange
}: {
  label: string;
  options: { value: T; label: string }[];
  value: T;
  onChange: (v: T) => void;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">{label}</span>
      <div className="flex rounded-lg border border-border bg-muted/40 p-0.5 gap-0.5">
        {options.map(opt => (
          <button
            key={opt.value}
            onClick={() => onChange(opt.value)}
            className={`flex-1 px-3 py-1.5 rounded-md text-xs font-medium transition-all duration-200 ${
              value === opt.value
                ? "bg-primary text-primary-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            {opt.label}
          </button>
        ))}
      </div>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────
export default function Home() {
  const { user, isAuthenticated, logout } = useAuth();

  // Input state
  const [inputText, setInputText] = useState("");
  const [uploadedFile, setUploadedFile] = useState<{ name: string; size: number } | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Controls
  const [outputType, setOutputType] = useState<OutputType>("summary");
  const [outputLength, setOutputLength] = useState<OutputLength>("medium");
  const [outputTone, setOutputTone] = useState<OutputTone>("formal");
  const [rewriteStyle, setRewriteStyle] = useState<RewriteStyle>("eli5");

  // Results
  const [result, setResult] = useState<GeneratedResult | null>(null);
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  const [usage, setUsage] = useState({ usage: 0, limit: 5, remaining: 5, isUnlimited: false });

  // Mutations
  const usageQuery = trpc.subscription.getUsage.useQuery(undefined, {
    enabled: !!user,
    refetchInterval: 30000, // Refetch every 30s
  });

  const generateMutation = trpc.summarize.generate.useMutation({
    onSuccess: (data) => {
      let bullets: string[] | undefined;
      let content = data.result;

      if (data.outputType === "bullets") {
        try {
          const parsed = JSON.parse(data.result);
          bullets = parsed.bullets ?? [];
          content = bullets!.join("\n");
        } catch {
          bullets = data.result.split("\n").filter(Boolean);
        }
      }

      setResult({
        outputType: data.outputType as OutputType,
        content,
        bullets,
        timestamp: new Date(),
      });
      toast.success("Content generated successfully!");
    },
    onError: (err) => {
      if (err.message?.includes("Free tier limit reached")) {
        setShowUpgradeModal(true);
      } else {
        toast.error(err.message || "Generation failed. Please try again.");
      }
    },
  });

  const uploadMutation = trpc.upload.uploadFile.useMutation({
    onSuccess: (data) => {
      setInputText(data.extractedText);
      setUploadedFile({ name: data.fileName, size: data.fileSize });
      toast.success(`Extracted text from "${data.fileName}"`);
    },
    onError: (err) => {
      toast.error(err.message || "File upload failed.");
    },
  });

  // File handling
  const handleFileUpload = useCallback(async (file: File) => {
    if (file.size > MAX_FILE_SIZE) {
      toast.error("File exceeds 5MB limit.");
      return;
    }

    const allowed = ["application/pdf", "application/msword",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      "text/plain"];

    if (!allowed.includes(file.type)) {
      toast.error("Unsupported file type. Use PDF, DOC, DOCX, or TXT.");
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      const base64 = (reader.result as string).split(",")[1];
      uploadMutation.mutate({
        fileName: file.name,
        fileBase64: base64,
        mimeType: file.type,
      });
    };
    reader.readAsDataURL(file);
  }, [uploadMutation]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFileUpload(file);
  }, [handleFileUpload]);

  const handleGenerate = () => {
    const text = inputText.trim();
    if (!text) {
      toast.error("Please enter or upload some content first.");
      return;
    }
    if (text.length < 10) {
      toast.error("Content is too short. Please provide more text.");
      return;
    }

    generateMutation.mutate({
      text,
      outputType,
      outputLength,
      outputTone,
      rewriteStyle: outputType === "rewrite" ? rewriteStyle : undefined,
    });
  };

  // Update usage state when query completes
  useEffect(() => {
    if (usageQuery.data && user) {
      setUsage(usageQuery.data);
    }
  }, [usageQuery.data, user]);

  const isLoading = generateMutation.isPending || uploadMutation.isPending;
  const charCount = inputText.length;
  const charPercent = Math.min((charCount / MAX_CHARS) * 100, 100);

  return (
    <>
      <UpgradeModal
        isOpen={showUpgradeModal}
        onClose={() => setShowUpgradeModal(false)}
        onUpgrade={() => {
          window.location.href = "/pricing";
        }}
        remaining={usage.remaining}
        limit={usage.limit}
      />

      <div className="min-h-screen bg-background text-foreground">
      {/* Background decoration */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-primary/5 rounded-full blur-3xl" />
        <div className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-primary/4 rounded-full blur-3xl" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-primary/3 rounded-full blur-3xl" />
      </div>

      {/* Navbar */}
      <header className="relative z-10 border-b border-border/50 bg-background/80 backdrop-blur-xl sticky top-0">
        <div className="container flex items-center justify-between h-14">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-primary/20 border border-primary/30 flex items-center justify-center">
              <Sparkles className="w-4 h-4 text-primary" />
            </div>
            <span className="font-bold text-base tracking-tight">
              <span className="gradient-text">Smart</span>
              <span className="text-foreground/80"> Summarizer</span>
            </span>
          </div>

          <div className="flex items-center gap-2">
            {isAuthenticated && user ? (
              <div className="flex items-center gap-2">
                <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-muted/50 border border-border/50">
                  <User className="w-3.5 h-3.5 text-muted-foreground" />
                  <span className="text-xs text-muted-foreground">{user.name ?? user.email ?? "User"}</span>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => logout()}
                  className="h-8 px-2.5 text-xs text-muted-foreground hover:text-foreground gap-1.5"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  Sign out
                </Button>
              </div>
            ) : (
              <Button
                size="sm"
                variant="outline"
                className="h-8 px-3 text-xs gap-1.5 border-border/60"
                onClick={() => window.location.href = getLoginUrl()}
              >
                <User className="w-3.5 h-3.5" />
                Sign in
              </Button>
            )}
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="relative z-10 pt-14 pb-10 text-center">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="container max-w-3xl mx-auto"
        >
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full border border-primary/30 bg-primary/10 text-xs text-primary font-medium mb-5">
            <Zap className="w-3.5 h-3.5" />
            AI-Powered Content Processing
          </div>
          <h1 className="text-4xl sm:text-5xl font-extrabold tracking-tight mb-4 leading-tight">
            Turn long content into
            <br />
            <span className="gradient-text">clear, usable insights</span>
          </h1>
          <p className="text-base text-muted-foreground max-w-xl mx-auto leading-relaxed">
            Paste text or upload a document. Get summaries, key points, and rewritten versions in seconds — tailored to your preferred length and tone.
          </p>
        </motion.div>
      </section>

      {/* Main Content */}
      <main className="relative z-10 pb-20">
        <div className="container max-w-5xl mx-auto">
          <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">

            {/* Left: Input + Controls */}
            <div className="lg:col-span-3 flex flex-col gap-5">

              {/* Input Area */}
              <motion.div
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
                className="rounded-2xl border border-border bg-card overflow-hidden"
              >
                <div className="flex items-center justify-between px-4 py-3 border-b border-border bg-muted/20">
                  <div className="flex items-center gap-2 text-sm font-medium text-foreground/80">
                    <FileText className="w-4 h-4 text-primary" />
                    Content Input
                  </div>
                  {uploadedFile && (
                    <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                      <BookOpen className="w-3.5 h-3.5 text-primary" />
                      {uploadedFile.name}
                      <button
                        onClick={() => { setUploadedFile(null); setInputText(""); }}
                        className="ml-1 hover:text-foreground transition-colors"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  )}
                </div>

                <div className="relative">
                  <Textarea
                    value={inputText}
                    onChange={e => setInputText(e.target.value.slice(0, MAX_CHARS))}
                    placeholder="Paste your article, report, notes, or any text here..."
                    className="min-h-[220px] resize-none border-0 rounded-none bg-transparent text-sm leading-relaxed focus-visible:ring-0 focus-visible:ring-offset-0 p-4 text-foreground/90 placeholder:text-muted-foreground/50"
                    disabled={isLoading}
                  />

                  {/* Char count bar */}
                  <div className="px-4 pb-3">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs text-muted-foreground/60">
                        {charCount.toLocaleString()} / {MAX_CHARS.toLocaleString()} characters
                      </span>
                      {charCount > MAX_CHARS * 0.9 && (
                        <span className="text-xs text-destructive">Near limit</span>
                      )}
                    </div>
                    <div className="h-0.5 rounded-full bg-muted overflow-hidden">
                      <motion.div
                        className="h-full rounded-full bg-primary"
                        animate={{ width: `${charPercent}%` }}
                        transition={{ duration: 0.2 }}
                        style={{
                          background: charPercent > 90
                            ? "oklch(0.60 0.22 25)"
                            : "oklch(0.65 0.22 290)"
                        }}
                      />
                    </div>
                  </div>
                </div>

                {/* File Upload Zone */}
                <div
                  onDragOver={e => { e.preventDefault(); setIsDragging(true); }}
                  onDragLeave={() => setIsDragging(false)}
                  onDrop={handleDrop}
                  className={`mx-4 mb-4 border-2 border-dashed rounded-xl p-4 text-center cursor-pointer transition-all duration-200 ${
                    isDragging
                      ? "border-primary bg-primary/10"
                      : "border-border/50 hover:border-primary/40 hover:bg-muted/20"
                  }`}
                  onClick={() => fileInputRef.current?.click()}
                >
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".pdf,.doc,.docx,.txt"
                    className="hidden"
                    onChange={e => {
                      const file = e.target.files?.[0];
                      if (file) handleFileUpload(file);
                    }}
                  />
                  {uploadMutation.isPending ? (
                    <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
                      <RefreshCw className="w-4 h-4 animate-spin text-primary" />
                      Extracting text...
                    </div>
                  ) : (
                    <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
                      <Upload className="w-4 h-4 text-primary/70" />
                      <span>
                        Drop a file or <span className="text-primary font-medium">browse</span>
                        <span className="text-muted-foreground/60 ml-1">— PDF, DOC, DOCX, TXT · max 5MB</span>
                      </span>
                    </div>
                  )}
                </div>
              </motion.div>

              {/* Output Type Selector */}
              <motion.div
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.15 }}
                className="rounded-2xl border border-border bg-card p-4"
              >
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-3">Output Type</p>
                <div className="grid grid-cols-3 gap-2">
                  {OUTPUT_TYPES.map(type => (
                    <button
                      key={type.id}
                      onClick={() => setOutputType(type.id)}
                      className={`flex flex-col items-center gap-1.5 p-3 rounded-xl border transition-all duration-200 text-center ${
                        outputType === type.id
                          ? "border-primary bg-primary/15 text-foreground shadow-sm"
                          : "border-border/50 bg-muted/20 text-muted-foreground hover:border-primary/30 hover:bg-muted/40"
                      }`}
                    >
                      <span className={outputType === type.id ? "text-primary" : ""}>{type.icon}</span>
                      <span className="text-xs font-semibold">{type.label}</span>
                      <span className="text-xs opacity-60 leading-tight">{type.desc}</span>
                    </button>
                  ))}
                </div>
              </motion.div>

              {/* Controls */}
              <motion.div
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                className="rounded-2xl border border-border bg-card p-4"
              >
                <div className="grid grid-cols-2 gap-4">
                  <ToggleGroup
                    label="Length"
                    options={[
                      { value: "short" as OutputLength, label: "Short" },
                      { value: "medium" as OutputLength, label: "Medium" },
                    ]}
                    value={outputLength}
                    onChange={setOutputLength}
                  />
                  <ToggleGroup
                    label="Tone"
                    options={[
                      { value: "formal" as OutputTone, label: "Formal" },
                      { value: "casual" as OutputTone, label: "Casual" },
                    ]}
                    value={outputTone}
                    onChange={setOutputTone}
                  />
                </div>

                {/* Rewrite style (only when rewrite is selected) */}
                <AnimatePresence>
                  {outputType === "rewrite" && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: "auto" }}
                      exit={{ opacity: 0, height: 0 }}
                      className="mt-4 overflow-hidden"
                    >
                      <ToggleGroup
                        label="Rewrite Style"
                        options={[
                          { value: "eli5" as RewriteStyle, label: "ELI5 (Simplified)" },
                          { value: "formal" as RewriteStyle, label: "Formal" },
                        ]}
                        value={rewriteStyle}
                        onChange={setRewriteStyle}
                      />
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>

              {/* Generate Button */}
              <motion.div
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.25 }}
              >
                <Button
                  onClick={handleGenerate}
                  disabled={isLoading || !inputText.trim()}
                  className="w-full h-12 text-sm font-semibold gap-2.5 rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground shadow-lg transition-all duration-200 disabled:opacity-50"
                  style={{
                    boxShadow: isLoading ? "none" : "0 4px 24px oklch(0.65 0.22 290 / 0.35)"
                  }}
                >
                  {isLoading ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      Generating...
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-4 h-4" />
                      Generate
                    </>
                  )}
                </Button>
              </motion.div>
            </div>

            {/* Right: Output */}
            <div className="lg:col-span-2 flex flex-col gap-5">
              <motion.div
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                className="flex-1"
              >
                <AnimatePresence mode="wait">
                  {generateMutation.isPending ? (
                    <motion.div
                      key="loading"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      className="rounded-2xl border border-border bg-card h-full min-h-[300px] flex items-center justify-center"
                    >
                      <ProgressIndicator isLoading={true} />
                    </motion.div>
                  ) : result ? (
                    <motion.div key="result">
                      <OutputPanel result={result} onClear={() => setResult(null)} />
                    </motion.div>
                  ) : (
                    <motion.div
                      key="empty"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      className="rounded-2xl border border-dashed border-border/50 bg-card/50 min-h-[300px] flex flex-col items-center justify-center gap-4 p-8 text-center"
                    >
                      <div className="w-14 h-14 rounded-2xl bg-muted/50 border border-border flex items-center justify-center">
                        <Sparkles className="w-6 h-6 text-muted-foreground/50" />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-muted-foreground">Your result will appear here</p>
                        <p className="text-xs text-muted-foreground/60 mt-1">Paste content and click Generate</p>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>

              {/* Feature highlights */}
              <motion.div
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
                className="rounded-2xl border border-border/50 bg-card/50 p-4"
              >
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-3">What you can do</p>
                <div className="space-y-2.5">
                  {[
                    { icon: <AlignLeft className="w-3.5 h-3.5" />, text: "3–5 sentence summaries" },
                    { icon: <List className="w-3.5 h-3.5" />, text: "Bullet-point key takeaways" },
                    { icon: <Wand2 className="w-3.5 h-3.5" />, text: "ELI5 or formal rewrites" },
                    { icon: <Upload className="w-3.5 h-3.5" />, text: "PDF & DOC file support" },
                    { icon: <Copy className="w-3.5 h-3.5" />, text: "One-click copy & download" },
                  ].map((item, i) => (
                    <div key={i} className="flex items-center gap-2.5 text-xs text-muted-foreground">
                      <span className="text-primary/70">{item.icon}</span>
                      {item.text}
                    </div>
                  ))}
                </div>
              </motion.div>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="relative z-10 border-t border-border/30 py-6 text-center">
        <p className="text-xs text-muted-foreground/50">
          Smart Summarizer · AI-powered content processing
        </p>
      </footer>
    </div>
    </>
  );
}
