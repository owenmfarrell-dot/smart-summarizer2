import { motion, AnimatePresence } from "framer-motion";
import { X, Crown, Zap, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

interface UpgradeModalProps {
  isOpen: boolean;
  onClose: () => void;
  onUpgrade: () => void;
  remaining: number;
  limit: number;
}

export function UpgradeModal({ isOpen, onClose, onUpgrade, remaining, limit }: UpgradeModalProps) {
  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40"
          />

          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="fixed inset-0 flex items-center justify-center z-50 p-4"
          >
            <div className="bg-card border border-border rounded-2xl shadow-2xl max-w-sm w-full overflow-hidden">
              {/* Header */}
              <div className="relative p-6 border-b border-border/50 bg-muted/20">
                <button
                  onClick={onClose}
                  className="absolute top-4 right-4 p-1 hover:bg-muted rounded-lg transition-colors"
                >
                  <X className="w-4 h-4 text-muted-foreground" />
                </button>

                <div className="flex items-center gap-2.5 mb-2">
                  <div className="w-10 h-10 rounded-lg bg-primary/20 border border-primary/30 flex items-center justify-center">
                    <Crown className="w-5 h-5 text-primary" />
                  </div>
                  <h2 className="text-lg font-bold">Upgrade to Pro</h2>
                </div>
                <p className="text-sm text-muted-foreground">
                  You've used {limit - remaining} of {limit} free generations this month
                </p>
              </div>

              {/* Content */}
              <div className="p-6">
                {/* Usage indicator */}
                <div className="mb-6">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium">Monthly usage</span>
                    <span className="text-xs text-muted-foreground">
                      {limit - remaining} / {limit}
                    </span>
                  </div>
                  <div className="h-2 rounded-full bg-muted overflow-hidden">
                    <motion.div
                      className="h-full bg-primary"
                      animate={{ width: `${Math.round(((limit - remaining) / limit) * 100)}%` }}
                      transition={{ duration: 0.3 }}
                    />
                  </div>
                </div>

                {/* Benefits */}
                <div className="space-y-3 mb-6 p-4 rounded-lg bg-primary/5 border border-primary/10">
                  <div className="flex items-start gap-2.5">
                    <Zap className="w-4 h-4 text-primary flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="text-sm font-medium">Unlimited generations</p>
                      <p className="text-xs text-muted-foreground">No monthly limits</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-2.5">
                    <Zap className="w-4 h-4 text-primary flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="text-sm font-medium">Priority support</p>
                      <p className="text-xs text-muted-foreground">Get help faster</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-2.5">
                    <Zap className="w-4 h-4 text-primary flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="text-sm font-medium">Advanced controls</p>
                      <p className="text-xs text-muted-foreground">More tone & length options</p>
                    </div>
                  </div>
                </div>

                {/* Price */}
                <div className="mb-6 p-4 rounded-lg border border-border/50 bg-muted/20">
                  <div className="flex items-baseline gap-1">
                    <span className="text-3xl font-bold">$9.99</span>
                    <span className="text-muted-foreground text-sm">/month</span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">7-day free trial • Cancel anytime</p>
                </div>

                {/* Actions */}
                <div className="flex gap-3">
                  <Button
                    variant="outline"
                    className="flex-1 border-border/60"
                    onClick={onClose}
                  >
                    Maybe later
                  </Button>
                  <Button
                    className="flex-1 bg-primary hover:bg-primary/90 text-primary-foreground gap-2 rounded-lg"
                    onClick={onUpgrade}
                  >
                    Upgrade now
                    <ArrowRight className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
