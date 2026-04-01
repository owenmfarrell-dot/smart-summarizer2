import { motion } from "framer-motion";
import { Check, Zap, Crown, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/_core/hooks/useAuth";
import { getLoginUrl } from "@/const";

interface PricingTier {
  name: string;
  price: number;
  period: string;
  description: string;
  features: string[];
  cta: string;
  highlighted: boolean;
  icon: React.ReactNode;
}

const PRICING_TIERS: PricingTier[] = [
  {
    name: "Free",
    price: 0,
    period: "forever",
    description: "Perfect for trying it out",
    features: [
      "5 generations per month",
      "All output types",
      "Basic tone & length controls",
      "Copy & download results",
      "Community support",
    ],
    cta: "Get Started",
    highlighted: false,
    icon: <Zap className="w-5 h-5" />,
  },
  {
    name: "Pro",
    price: 999,
    period: "month",
    description: "For power users & professionals",
    features: [
      "Unlimited generations",
      "All output types",
      "Advanced tone & length controls",
      "Priority support",
      "Copy & download results",
      "Shareable links (coming soon)",
      "API access (coming soon)",
    ],
    cta: "Upgrade to Pro",
    highlighted: true,
    icon: <Crown className="w-5 h-5" />,
  },
];

export default function Pricing() {
  const { user, isAuthenticated } = useAuth();

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Background decoration */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-primary/5 rounded-full blur-3xl" />
        <div className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-primary/4 rounded-full blur-3xl" />
      </div>

      <div className="relative z-10">
        {/* Header */}
        <header className="border-b border-border/50 bg-background/80 backdrop-blur-xl sticky top-0">
          <div className="container flex items-center justify-between h-14">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-primary/20 border border-primary/30 flex items-center justify-center">
                <Zap className="w-4 h-4 text-primary" />
              </div>
              <span className="font-bold text-base tracking-tight">
                <span className="gradient-text">Smart</span>
                <span className="text-foreground/80"> Summarizer</span>
              </span>
            </div>
            <Button
              variant="outline"
              size="sm"
              className="h-8 px-3 text-xs"
              onClick={() => (window.location.href = "/")}
            >
              Back to App
            </Button>
          </div>
        </header>

        {/* Hero */}
        <section className="py-16 text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="container max-w-3xl mx-auto"
          >
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full border border-primary/30 bg-primary/10 text-xs text-primary font-medium mb-5">
              <Crown className="w-3.5 h-3.5" />
              Simple, Transparent Pricing
            </div>
            <h1 className="text-4xl sm:text-5xl font-extrabold tracking-tight mb-4 leading-tight">
              Choose your plan
            </h1>
            <p className="text-base text-muted-foreground max-w-xl mx-auto leading-relaxed">
              Start free with 5 generations per month. Upgrade to Pro for unlimited access and priority support.
            </p>
          </motion.div>
        </section>

        {/* Pricing Cards */}
        <section className="py-12 pb-20">
          <div className="container max-w-5xl mx-auto">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-4xl mx-auto">
              {PRICING_TIERS.map((tier, idx) => (
                <motion.div
                  key={tier.name}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: idx * 0.1 }}
                  className={`relative rounded-2xl border transition-all duration-300 ${
                    tier.highlighted
                      ? "border-primary/50 bg-card shadow-2xl scale-105 md:scale-100 md:col-span-2 lg:col-span-1"
                      : "border-border bg-card"
                  }`}
                >
                  {/* Highlighted badge */}
                  {tier.highlighted && (
                    <div className="absolute -top-4 left-1/2 -translate-x-1/2">
                      <Badge className="bg-primary text-primary-foreground gap-1.5 px-3 py-1">
                        <Crown className="w-3 h-3" />
                        Most Popular
                      </Badge>
                    </div>
                  )}

                  {/* Glow effect for highlighted */}
                  {tier.highlighted && (
                    <div className="absolute inset-0 rounded-2xl bg-primary/5 blur-xl -z-10" />
                  )}

                  <div className="p-8">
                    {/* Header */}
                    <div className="flex items-start justify-between mb-6">
                      <div>
                        <div className="flex items-center gap-2.5 mb-2">
                          <span className={tier.highlighted ? "text-primary" : "text-muted-foreground"}>
                            {tier.icon}
                          </span>
                          <h3 className="text-xl font-bold">{tier.name}</h3>
                        </div>
                        <p className="text-sm text-muted-foreground">{tier.description}</p>
                      </div>
                    </div>

                    {/* Price */}
                    <div className="mb-6">
                      <div className="flex items-baseline gap-1">
                        <span className="text-4xl font-bold">
                          {tier.price === 0 ? "Free" : `$${(tier.price / 100).toFixed(2)}`}
                        </span>
                        {tier.price > 0 && (
                          <span className="text-muted-foreground text-sm">/ {tier.period}</span>
                        )}
                      </div>
                    </div>

                    {/* CTA Button */}
                    <Button
                      className={`w-full mb-8 gap-2 rounded-xl h-10 font-semibold transition-all duration-200 ${
                        tier.highlighted
                          ? "bg-primary hover:bg-primary/90 text-primary-foreground shadow-lg"
                          : "border border-border bg-muted/20 hover:bg-muted/40 text-foreground"
                      }`}
                      onClick={() => {
                        if (isAuthenticated) {
                          // TODO: Redirect to checkout or subscription page
                          alert("Checkout flow coming soon!");
                        } else {
                          window.location.href = getLoginUrl();
                        }
                      }}
                    >
                      {tier.cta}
                      <ArrowRight className="w-4 h-4" />
                    </Button>

                    {/* Features */}
                    <div className="space-y-3.5 border-t border-border/50 pt-8">
                      {tier.features.map((feature, i) => (
                        <motion.div
                          key={i}
                          initial={{ opacity: 0, x: -8 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: idx * 0.1 + i * 0.05 }}
                          className="flex items-start gap-3"
                        >
                          <Check className="w-4 h-4 text-primary flex-shrink-0 mt-0.5" />
                          <span className="text-sm text-foreground/90">{feature}</span>
                        </motion.div>
                      ))}
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>

            {/* FAQ or additional info */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="mt-16 text-center"
            >
              <p className="text-sm text-muted-foreground">
                All plans include a 7-day free trial. No credit card required.
              </p>
              <p className="text-xs text-muted-foreground/60 mt-2">
                Billed monthly. Cancel anytime. See{" "}
                <a href="#" className="text-primary hover:underline">
                  terms
                </a>
                .
              </p>
            </motion.div>
          </div>
        </section>
      </div>
    </div>
  );
}
