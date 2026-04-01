# Smart Content Summarizer - TODO

## Backend
- [x] Add summarization history table to drizzle schema
- [x] Add tRPC procedure: summarize (summary, bullets, rewrite)
- [x] Add tRPC procedure: file upload & text extraction (PDF/DOC)
- [x] AI integration using invokeLLM for all output types
- [x] Structured JSON responses for bullet points

## Frontend
- [x] Design system: deep indigo/violet gradient theme, elegant typography
- [x] Landing/hero section with app title and CTA
- [x] Text input area with live character count
- [x] File upload zone (PDF/DOC) with size validation (max 5MB)
- [x] Output type selector: Summary / Bullet Points / Rewrite
- [x] Length toggle: Short / Medium
- [x] Tone toggle: Formal / Casual
- [x] Generate button with loading state
- [x] Real-time progress indicator / animated steps
- [x] Output panel with rendered result
- [x] One-click copy to clipboard
- [x] Download as .txt file
- [ ] History panel (optional, logged-in users)

## Testing
- [x] Vitest: summarize procedure unit test
- [x] Vitest: file upload validation test

## Polish
- [x] Responsive design (mobile-first)
- [x] Empty/error states
- [x] Micro-animations (framer-motion)
- [x] Accessibility (focus rings, ARIA labels)

## Paywall & Stripe Integration
- [x] Set up Stripe feature integration
- [x] Add subscriptions table to database schema
- [x] Add usage tracking table to database
- [x] Create subscription management tRPC procedures
- [ ] Create Stripe checkout & webhook handlers (future)
- [x] Build pricing page with tiers
- [x] Build upgrade prompt modal
- [ ] Build subscription dashboard (future)
- [x] Enforce usage limits on generation
- [x] Add paywall tests
