# Queued quiz capacity incident — 28 October 2026

Read-only runtime inspection confirmed a healthy local worker/subscription and a saved interactive quiz repeatedly deferred at zero questions. The backend recorded `Waiting for AI service capacity`; the preparation component replaced it with generic queue copy.

At diagnosis, the configured Groq model had accounted for 197,675 tokens against the application's 200,000 daily ceiling. Both configured Google models had active cooldowns. Today's completed jobs comprised 15 automatic inventory jobs and one interactive job. These observations establish background consumption and current admission blockage; they do not establish an upstream account-wide daily quota exhaustion or attribute every token to inventory.

## Correction

Automatic inventory is now explicitly opt-in through `ENABLE_QUIZ_INVENTORY=false` by default. Guards cover scheduling, cron warming, reconciliation and previously queued deliveries. Existing validated inventory remains reusable and saved jobs/questions remain intact. Operator-enabled inventory still shares provider allowances and must be budgeted deliberately. Provider limits, privacy eligibility, course grounding and complete-set start rules are unchanged.

The preparation screen explains AI-service availability/usage-limit waits, including at zero progress. It retains saved progress, cancellation and automatic retry. No public DTO or schema change.

## Verification and remaining limitation

743 API tests passed; 61 service-dependent tests skipped. New regressions verify disabled warming performs no retrieval/scheduling and old inventory deliveries do not claim a job. Seven browser preparation journeys passed, including the zero-progress capacity explanation, all themes, cancellation and complete-set start restrictions. Web TypeScript and changed-component ESLint passed. Local worker restarted and subscribed successfully; the interactive request was picked up and still deferred on capacity at the first observation. This change cannot refund prior consumption or certify provider recovery.

Files: config.py, quiz_bank.py, workers/quiz.py, workers/quiz_inventory.py, API environment example/README, quiz preparation component, API/database/browser tests and this log.

Observed normal retry at 14:34 local time: primary Google returned a provider-unavailable deferral; secondary Google timed out for both batches. The worker retained the saved request and scheduled a 120-second retry. Inventory stayed untouched after restart. Completion is still blocked by provider availability/capacity, not by an absent worker.

The Next.js production build also passed. After tightening test preconditions to enable quiz/AI while disabling only inventory, all 62 quiz unit tests and changed Python lint passed again.

## Notion synchronization pending

No Notion connector is available; no entries were posted.

- Session / Change Log: Stop automatic quiz inventory exhausting shared capacity; show actual service wait. Date: 2026-10-28. Area: Quiz / Worker / UI. Files: above. Verified: local checks above; live completion remains unverified.
- Decision Log: Make speculative warming opt-in because an idle queue does not imply spare daily quota. Alternatives: keep warming every ten minutes, raise limits without evidence, or disable safe question reuse.
- Product Roadmap & Features: Inventory guard and truthful preparation state locally verified; saved request recovery and hosted end-to-end completion remain open.
- Knowledge Base: No stack change; no update needed.
