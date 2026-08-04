# Second-pass venue sweep — gaps vs. the Promptware Archive (110 incidents)

Date: 2026-08-04. Method: pulled full program/proceedings listings for every venue in the
paper's selection criteria (2023–2026), keyword-filtered, diffed against
`data/incidents/*.yml` (URL + title). Judged against the Section-5 scope rules in `CLAUDE.md`.

Sources swept: USENIX Sec 24/25/26 (1,230 papers), NDSS 24/25/26 (616), CCS 24/25 (815),
IEEE S&P 24/25/26 (771), AsiaCCS 24/25, ACSAC 24/25, RAID 24/25, EuroS&P 24/25 (dblp),
Black Hat USA 23/24/25/26 + Asia 24/25/26 + EU 24/25, DEF CON 31–34, CCC 37C3/38C3/39C3
(media.ccc.de API), RSAC 24/25/26, embracethered.com sitemap (230 posts, 64 matched),
Microsoft Security Blog, Unit 42.

---

## Tier A — in scope, missing, high confidence (add)

| # | Item | Venue / date | Why it belongs | Kill-chain angle |
|---|---|---|---|---|
| A1 | **Living off Microsoft Copilot** — Michael Bargury, Tamir Ishay Sharbat | Black Hat USA'24 + DEF CON 32 (2024-08) | Prompt injection into a victim's M365 Copilot via email/plugins; LOLCopilot toolkit; spear-phishing + exfil | IA=I, priv-esc IR, recon (probes tenant data), AoO=Data exfil. Archive has *15 Ways to Break Your Copilot* but **not** this one — separate BH'24 briefings. |
| A2 | **The Double (AI) Agent: Flipping a GenAI Agent Behavior from Serving an Application to Attacking It using PromptWares** — Stav Cohen, Ron Bitton, Ben Nassi | Black Hat EU'24 (2024-12), slides `i.blackhat.com/EU-24/Presentations/EU-24-Cohen-TheDoubleAIAgent.pdf` | **Origin of the term "promptware"** in an industrial venue — the SoK's own terminology lineage. Plan-and-execute agent (e-commerce chatbot) flipped to attack its host app; DoS + unauthorized discounts | IA=D/I, AoO=Financial / Misc (DoS). Big omission given the §III argument. |
| A3 | **NEW IMPORTANT INSTRUCTIONS: Real-World Exploits and Mitigations in LLM Applications** — Johann Rehberger | 37C3 (CCC), 2023-12 | CCC is an explicitly listed venue; archive's only CCC entry is 39C3. 2023 anchor point for the industrial-venue timeline | Data exfil / scams / RCE across ChatGPT, Bard, Bing Chat. |
| A4 | **Fun-tuning: Characterizing the Vulnerability of Proprietary LLMs to Optimization-Based Prompt Injection Attacks via the Fine-Tuning Interface** — Labunets et al. | IEEE S&P'25 | Optimized indirect injection against **production Gemini** by abusing the fine-tuning API loss signal | IA=I with a novel evasion/optimization technique — fills a gap in §IV-A "evasion". |
| A5 | **Fooling AI Agents: Web-Based Indirect Prompt Injection Observed in the Wild** — Unit 42 (Palo Alto) | Unit 42 blog, 2026 | Palo Alto is a listed venue with **zero** archive coverage. First documented *in-the-wild* (not researcher-demo) indirect injection — supports "not merely theoretical" | IA=I, real-world. |
| A6 | **When AI Remembers Too Much — Persistent Behaviors in Agents' Memory** — Unit 42 | Unit 42 blog, 2025-10 | Indirect injection → silent long-term memory poisoning of a production agent | Persistence = Independent (memory). |
| A7 | **Updating the taxonomy of failure modes in agentic AI systems: what a year of red teaming taught us** — Microsoft AI Red Team | Microsoft Security Blog, 2026-06 | Microsoft is a listed venue with **zero** archive coverage. Reports XPIA + memory poisoning as highest-frequency and most often **combined** across production red teams — independent support for the multistage claim | Cross-stage evidence; cite in §V/§VI. |
| A8 | **Odysseus: Jailbreaking Commercial Multimodal LLM-integrated Systems via Dual Steganography** | NDSS'26 | Commercial multimodal systems; steganographic payload = injection + evasion + priv-esc | IA=I (image), priv-esc, multimodal §IV-A. |
| A9 | **Les Dissonances: Cross-Tool Harvesting and Polluting in Pool-of-Tools Empowered LLM Agents** | NDSS'26 | Cross-tool contamination inside agent tool pools; published analogue of the archive's cross-agent priv-esc entry | Recon + on-app lateral movement. |
| A10 | **Site Isolation is Dead: How Site Isolation is Broken in Agentic Browsers and Extensions** | IEEE S&P'26 | Agentic browsers (Comet-class); complements `hashjack`, `identitymesh`, `pleasefix` | IA=I, AoO=Data exfil, possible xA. |
| A11 | **AI Search's Dark Side: How We Turned AI's "Web Browsing" Into a Gateway for Targeting 1B+ Users** | Black Hat EU'25 | Production AI search/browsing at 1B-user scale | IA=I via retrieved web content. |
| A12 | **"Do Not Mention This to the User": Detecting and Understanding Malicious Agent Skills in the Wild** | USENIX Sec'26 | In-the-wild malicious Agent Skills — measurement counterpart to `scary-agent-skills` and `promptware-eod` | IA=I, persistence (channel). |
| A13 | **Bypassing Prompt Guards in Production with Controlled-Release Prompting** | USENIX Sec'26 | Bypass of **production** guardrails (the deployed defense layer §VI reviews) | Priv-esc / evasion. |
| A14 | **When AI Stops Answering and Starts Acting: Field Notes from Red-Teaming the Agentic Era** | USENIX Sec'26 | Practitioner field report on production agents; same genre as included industrial talks | Multi-stage. |
| A15 | **Sirens' Whisper: Inaudible Near-Ultrasonic Jailbreaks of Speech-Driven LLMs** | USENIX Sec'26 | Audio-modality injection; archive has only one audio entry (`audiohijack-lalm`) | IA=I (audio), evasion. |
| A16 | **AI Meets Git: Unmasking Security Flaws in Qodo Merge** | 38C3 (CCC), 2024-12 | Commercial AI code-review bot driven by attacker-controlled PR content; only 38C3 promptware talk | IA=I, AoO=Data exfil / RCE. |
| A17 | **AI ClickFix TTP (Claude)** — Rehberger | embracethered, 2025 | ETR post not in the archive; prompt-driven social engineering against a production assistant | IA + AoO. |
| A18 | **Anthropic Filesystem MCP Server Sandbox Bypass** — Rehberger | embracethered, 2025 | MCP server escape via injected instructions; sibling of `anthropic-slack-mcp-leak` | AoO=RCE-adjacent, config abuse. |
| A19 | **GitHub Custom Copilot Instructions (repo-level persistence)** — Rehberger | embracethered, 2025 | `.github/copilot-instructions.md` as a re-arming retrieval channel | Persistence = Dependent (channel). |
| A20 | **Hijacking LiteLLM for Fun and Profit** — Rehberger | embracethered, 2026 | Widely deployed LLM gateway | AoO=RCE / exfil. |
| A21 | **Claude: hidden prompt injection via ASCII smuggling** (2024) and **Anthropic fixes Claude data exfiltration via images** (2023) — Rehberger | embracethered | Two production-Claude incidents with no archive rows | IA=I + evasion; AoO=Data exfil. |
| A22 | **Bing Chat "bank robbery"**, **Google Docs AI scam**, **Azure OpenAI Playground exfil**, **GCP Generative AI Studio exfil**, **Google Colab image-render exfil** — Rehberger | embracethered 2023–24 | Five production-app incidents from the 2023–24 window the paper says is under-covered | IA=I, AoO=Data exfil / Misinformation. |

## Tier B — borderline, decide after reading the source

| Item | Venue | The question |
|---|---|---|
| **HouYi: Prompt Injection Attack against LLM-Integrated Applications** (Liu, Deng, Li et al.) | arXiv 2306.05499, 2023 | 36 real commercial apps tested, 31 vulnerable, 10 vendors confirmed incl. **Notion**. In scope by target; venue is arXiv-only (archive already admits arXiv). **Highest-value Tier-B item.** |
| **Imprompter: Tricking LLM Agents into Improper Tool Use** (Fu et al.) | arXiv 2410.14923, 2024 | Obfuscated adversarial injection exfiltrating PII from **production Mistral LeChat**. Same arXiv caveat. |
| **MASTERKEY: Automated Jailbreaking of LLM Chatbots** | NDSS'24 | Jailbreak-technique paper, but demonstrated against production Bard / Bing Chat / ChatGPT. Protocol excludes "pure jailbreak-technique papers" — this one has production targets. |
| **Great, Now Write an Article About That: The Crescendo Multi-Turn LLM Jailbreak** | USENIX Sec'25 (Microsoft) | Paper cites multi-turn jailbreaking as [46]; confirm whether [46] *is* Crescendo. If not, it is the canonical production multi-turn priv-esc reference. |
| **Wrestling with a Python: Escaping Copilot Studio's AI-Guarded Sandbox** | DEF CON 34 (2026-08) | Sandbox escape in a production Copilot product — is the entry vector a prompt? |
| **Your WAF Blocked Us, That Was The Exploit — Remote Agent Takeover via Cloudflare, Sentry and Claude Zero-Day** | DEF CON 34 | Sounds like a full IA→AoO chain on production Claude; needs the talk. |
| **LGTM: Bypassing an LLM Build Gate When Prompt Injection Fails** | DEF CON 34 | Explicitly about what happens *after* PI fails — useful contrast case. |
| **The Sandbox is a Suggestion: Deconstructing AI Agent Sandboxes**; **Hacking Your Life with AI Can Get You Hacked: AI Orchestration Platforms Ship RCE by Design** | DEF CON 34 | Both plausibly promptware-initiated RCE; both need the source. |
| **IDEsaster 2.0: Another Novel Vulnerability Class in AI IDEs**; **Remote Server, Local Root. Welcome to MCP.** | Black Hat Asia'26 | Could be classic vulns in AI products (out) rather than promptware (in). |
| **Token Injection: Crashing LLM Inference with Special Tokens** | Black Hat EU'25 | Special-token injection at the inference layer — "prompt-initiated" per the definition, or a framework attack (excluded, cf. [21])? Same question as `thinktrap-dos`, which you kept. |
| **MetaBreak: Jailbreaking Online LLM Services via Special Token Manipulation** | IEEE S&P'26 | Academic twin of the above. |
| **URLcoat: Exploiting Web Search Capability to Jailbreak LLMs** | IEEE S&P'26 | Jailbreak delivered through the retrieval channel = IA(I)+priv-esc on production search-enabled models. |
| **AI Agent, AI Spy**; **Skynet Starter Kit: From Embodied AI Jailbreak to Remote Takeover of Humanoid Robots** | 39C3 | Skynet overlaps `kinetic-prompt-injection` (BH'26). Robot-hardware precedent was excluded, but this one *starts* from a jailbreak. |
| **ObliInjection** (NDSS'26), **Prompt Injection Attack to Tool Selection / ToolHijacker** (NDSS'26), **JudgeDeceiver** (CCS'24), **FragFuse** (USENIX'26), **Cordyceps** (USENIX'26) | academic | Novel primitives, but prototype-only unless they include a production demo — the `[25]`-style exclusion. Check each for a real-app section. |
| **Autonomy Comes with Costs: DoS via Resource Abuse in LLM Agents**; **When AIOps Become "AI Oops"**; **Context Contamination in LLM Analysis of Network Security Logs**; **Measuring Real-World Prompt Injection in LLM-based Resume Screening**; **MUZZLE**; **MASLeak** | USENIX Sec'26 | All plausible; each hinges on whether the target is a deployed product. |
| Unit 42: **Double Agents / Hijacking Vertex AI**, **Fuzzing "AI Judges"**, **AWS AgentCore IAM God Mode**, **OpenClaw supply-chain risk**, **Amazon Bedrock multi-agent**, **High-risk GenAI browser extensions** | Unit 42 blog | Listed venue at zero coverage. Pick the 2–3 that are true injection chains rather than misconfiguration. |
| Microsoft: **Detecting and analyzing prompt abuse in AI tools** (2026-03), **Lessons from red-teaming 100 generative AI products** (2025-01), **Skeleton Key jailbreak** (2024-06), **MSRC advisory CVE-2025-32711** | Microsoft blog | Same — listed venue at zero coverage. Skeleton Key is production-model priv-esc. |

## Tier C — checked and out of scope (recorded so they don't get re-reviewed)

- **Attacker-authored apps**: Malla (USENIX'24), Instruction Backdoor Attacks Against Customized LLMs (USENIX'24), Malicious LLM-Based Conversational AI (USENIX'25), On the (In)Security of LLM App Stores + GPTracker (S&P'25), RogueGPT (RSAC'25) — same rule that removed `thief-gpt`.
- **Side channels**: What Was Your Prompt? (USENIX'24), Your AI Assistant Has a Big Mouth (DEF CON 32), Network-Level Prompt and Trait Leakage (USENIX'26), KV-cache leakage (NDSS'25) — excluded by [20].
- **Training/supply-chain poisoning**: The Philosopher's Stone (NDSS'25), MoEvil (ACSAC'25), Multi-Turn Hidden Backdoor (AsiaCCS'24), Loading Models Launching Shells (DEF CON 33), Model Files → RCE (BH Asia'26) — excluded by [22].
- **Infrastructure RCE, not prompt-initiated**: ShadowMQ (BH Asia'26), Breaking AI Inference Systems / Pwn2Own Berlin (BH EU'25), Breaking Out of the AI Cage — NVIDIA (BH USA'25), Isolation or Hallucination (BH USA'24), llama.cpp/Ollama (DEF CON 34).
- **Benchmark / measurement / defense-only**: Formalizing and Benchmarking PI (USENIX'24), StruQ, SecAlign, DataSentinel, PromptLocate, AttnTrace, IsolateGPT, ACE, SAGA, AgentSentinel, Attention Is All You Need to Defend, SelfDefend, JBShield, "How Not to Detect Prompt Injections with an LLM" → **useful for §VI defenses, not Table II**.
- **RAG-poisoning prototypes with no production target**: PoisonedRAG, Machine Against the RAG, Topic-FlipRAG (USENIX'25), Confundo (USENIX'26).
- Re-confirmed still excluded: Beyond Jailbreak (NDSS'26), M365 Copilot image-gen without auth (ETR), Dill With It / pickle talks (BH EU'25).

## Tier D — source fixes for existing rows (no new incidents)

Approved sources located during the sweep for currently `TODO-verify` / `questioned` rows:

| Slug | Approved source located |
|---|---|
| `echoleak` | Aim Labs, **"AI Enterprise Compromise — 0click Exploit Methods", Black Hat USA'25**; talk "0click Enterprise compromise – thank you, AI!"; MSRC **CVE-2025-32711** |
| `agentflayer` | Zenity Labs, Black Hat USA'25 — real scope is **ChatGPT connectors, Copilot Studio, Cursor+Jira MCP, Salesforce Einstein, Gemini, M365 Copilot**, not Cursor alone; `target` field is too narrow |
| `curxecute`, `forcedleak`, `camoleak`, `copilot-backdoor`, `identitymesh`, `hashjack`, `geminijack`, `notion-ai-exfil`, `claude-cowork`, `reprompt-attack`, `zombieagent`, `mcp-history-theft` | vendor-blog primaries exist (Aim, Zenity, Noma, Legit, Brave, Pillar, PromptArmor); each still needs the URL attached and the coding re-derived from the source |

DEF CON 34 runs 2026-08-06/09 — `defcon-talk-copirate-365` on embracethered indicates a Rehberger DEF CON 34 talk to add once slides post.

---

### One paper-text note (not archive)

Abstract says "at least **twenty-one** documented attacks that traverse four or more stages";
§I says "at least **fifteen**". Same claim, two numbers.

---

## Coding log — 2026-08-04 (updated as sources are read)

**Added (7 new rows + 1 recode), archive now 117, validated and built:**

| Slug | Date | Coding |
|---|---|---|
| `google-docs-ai-scam` | 2023-07 | I / IR / — / — / — / — / Misinformation |
| `claude-image-markdown-exfil` | 2023-08 | I / IR / — / — / — / — / Data exfiltration |
| `azure-openai-playground-exfil` | 2023-09 | D / — / — / — / — / — / Data exfiltration |
| `gcp-vertex-ai-studio-exfil` | 2023-10 | D / — / — / — / — / — / Data exfiltration |
| `claude-ascii-smuggling` | 2024-02 | I / — / — / — / — / — / Misc (unintended behavior) |
| `google-colab-gemini-exfil` | 2024-07 | I / IR / — / — / — / — / Data exfiltration |
| `ai-clickfix-computer-use` | 2025-05 | I / Misc. / — / — / — / — / RCE |
| `copilot-backdoor` (recode) | 2025-04 | I / — / — / Dependent (channel) / — / — / Backdoor insertion |

**Dropped after reading the source — corrections to Tier A above:**

- *Anthropic Filesystem MCP server bypass* — `.startsWith` path-validation bug; author calls it "a typical classical security issue". No prompt injection.
- *Hijacking LiteLLM* — AI-gateway compromise requiring gateway access; excluded as an attack on the framework [21].
- *Bing Chat bank robbery* — jailbreak role-play with no action on objective (your call).
- *Odysseus* (NDSS'26) — image-steganography **jailbreak** of GPT-4o / Gemini / Grok to elicit unsafe content; no application privileges, tools or data abused. Same class as ArtPrompt, which was removed in 426cd80.
- *Les Dissonances* (NDSS'26) — scans 66 LangChain / Llama-Index community tools; framework-and-tool measurement study, no production application compromised.
- *The Double (AI) Agent* (BH EU'24) — **this is APwT**, which was already in the archive as `apwt.yml` and deliberately removed as out of scope in 426cd80. Not a gap. The URL/title diff could not see it because removed rows leave no file.

**Method note:** the original sweep diffed against `data/incidents/*.yml` only. Items previously reviewed and *removed* are invisible to that diff. Removed set to check against: ArtPrompt, APwT, Slack AI, Freysa, ChatGPT Search, Thief GPT, Air Canada, images-and-sounds-ipi.
