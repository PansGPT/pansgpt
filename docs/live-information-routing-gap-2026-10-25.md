# Open finding: current-information routing — 25 October 2026

The user supplied two local screenshots and request logs during roadmap/Git delivery. This record preserves the original finding. The subsequent [local correction and verification](general-web-routing-2026-10-25.md) supersedes its implementation-pending status; hosted rollout remains open.

Evidence:

- A football-score question entered `intent=uncertain`, `requires_rag=True`, `requires_tools=False` despite a 0.95 routing confidence. That confidence represents the model's self-reported route confidence, not validated correctness.
- Course retrieval retained four candidates and the final response displayed an unrelated pharmacology document as a source. The relevance fallback/threshold accepted inappropriate material for an out-of-domain request.
- The first request spent eight seconds timing out HyDE and another 25 seconds waiting for the primary generation model before falling back. Approximately 42 seconds elapsed from classification completion to final generation usage.
- Adding “search the web” still entered course retrieval. Empty retrieval invoked the absence-policy web fallback, which returned no usable references; the router emitted its canned course-material absence response.
- A read-only local configuration check found web search enabled, no configured Tavily key and Tavily privacy eligibility false. No secrets were printed. The existing search implementation additionally appends a pharmacology query suffix and limits searches to biomedical authority domains. A “web fallback invoked” log therefore does not prove that a network search occurred or that general web search is supported.

Agreed product direction: the user selected “Allow general questions; verify current facts with web search.” General-question support is approved; an eligible configured search provider and routing/search changes are still required.

Proposed correction under that direction:

- Keep semantic interpretation; separate course evidence, current web evidence, conversational answers and clarification/out-of-scope handling. Do not add greeting/sports phrase lists.
- A general current-fact request should use an eligible appropriately scoped web capability, or receive an immediate accurate capability explanation when unavailable. It should not search pharmacy documents or attach unrelated citations. Resolve relative dates against the actual request date/timezone before searching.
- Preserve privacy gates. Distinguish missing configuration, privacy hold, provider failure, quota and genuinely empty search results; do not collapse all into “topic not found in course materials.”
- Test paraphrases, follow-ups, mixed clinical/general requests, explicit document constraints, unavailable providers, stale/current dates and absence of irrelevant citations. Review reranker timeout behavior alongside routing; model failover remains a separate latency issue.

At the time this finding was recorded, no routing/search code or provider configuration had changed. The later local correction adds evidence-source routing and the explicitly approved public-query exception; see the linked verification record. Phase 11 and hosted release gates remain open.

Notion handoff: add this as an open AI-routing issue and raise it above tone controls. Record a Decision Log entry allowing general questions with current facts verified through eligible backend web search; the rejected alternative is limiting all interactions to pharmacy/study scope. Update the roadmap and core-scope Knowledge Base wording, without claiming that general web search is already implemented or configured. Verified only for screenshot/log/code inspection and the non-secret configuration check. No Notion connector is available in this session.
