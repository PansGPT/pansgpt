# Provider privacy register

Decision: **strict ZDR; unverified providers remain blocked**, as explicitly selected by the user on 2026-10-20. No provider account was verified or contacted during remediation. No attestation has been enabled by this change.

| Integration                                              | Attestation                | Current evidence                                                       | Eligibility                                                          |
| -------------------------------------------------------- | -------------------------- | ---------------------------------------------------------------------- | -------------------------------------------------------------------- |
| Google generation, classification, embeddings and vision | `GOOGLE_ZDR_CONFIRMED`     | Unverified account, service tier, retention and abuse-monitoring terms | Blocked                                                              |
| Groq generation, expansion, vision and transcription     | `GROQ_ZDR_CONFIRMED`       | Unverified account settings and endpoint terms                         | Blocked                                                              |
| OpenRouter generation and vision                         | `OPENROUTER_ZDR_CONFIRMED` | Account settings and actual eligible endpoints unverified              | Blocked; requests also require `zdr=true` and `data_collection=deny` |
| OpenAI transcription                                     | `OPENAI_ZDR_CONFIRMED`     | Account eligibility and endpoint coverage unverified                   | Blocked                                                              |
| Tavily search                                            | `TAVILY_ZDR_CONFIRMED`     | Query-retention terms unverified                                       | Blocked                                                              |
| Cohere reranking                                         | `COHERE_ZDR_CONFIRMED`     | Account and endpoint retention terms unverified                        | Blocked                                                              |

Before setting an attestation to true, record the reviewer, review date, account/tier identifier without secrets, covered endpoints, policy/contract links, retention and abuse-monitoring exceptions, training use, and evidence of the relevant account settings. Re-review when an endpoint, account or policy changes. No-training terms alone do not establish ZDR. Keep attestations false when evidence is missing or incompatible.

OpenRouter's [routing documentation](https://openrouter.ai/docs/guides/routing/provider-selection) describes per-request routing controls. Those controls restrict endpoint eligibility; they do not prove this project's account settings. A free model ID may have no ZDR-eligible endpoint. Return unavailable instead of removing the privacy filter or selecting a paid model.

The application stores user-visible conversation history and indexes course materials under its own retention policy. External-provider ZDR does not mean that PansGPT stores no data. Query text and tool argument bodies must not enter operational logs. Test fixtures simulate verified providers only while network access is blocked.

Strict privacy and a $0 budget may leave chat, embeddings or ingestion unavailable. This is the accepted pilot policy. Readiness reports blocked capabilities, and producers/dispatchers leave ingestion in the durable outbox without verified embedding eligibility. Workers skip queued ingestion while blocked; storage cleanup remains available without AI access.
