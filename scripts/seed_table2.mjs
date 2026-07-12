// One-time seeder: emits data/incidents/*.yml from the paper's Table II.
// Kill-chain VALUES are transcribed from Table II; justification/evidence are TODO
// for author backfill; URLs are set only where confidently known, else "TODO-verify".
import fs from 'node:fs';
import path from 'node:path';
import yaml from 'js-yaml';
import { ROOT } from './lib.mjs';

const titles = [
  "Not What You Signed Up For (Greshake et al.)","Bing Chat Data Exfiltration","GPT-4V Visual Injection",
  "ArtPrompt","Morris II Worm","APwT (A Jailbroken GenAI Model Can Cause Real Harm)","Slack AI Exfiltration",
  "M365 Copilot ASCII Smuggling","ChatGPT SpAIware","ChatGPT ZombAI C2","Prompt Infection",
  "ZombAIs: Claude Computer Use C2","DeepSeek Account Takeover (XSS)","Freysa AI Heist","ChatGPT Search Manipulation",
  "MCP History Theft","EchoLeak","CamoLeak","CurXecute","ForcedLeak","Invitation Is All You Need","Devin AI RCE",
  "Devin Exposed Port","GitHub Copilot RCE (CVE-2025-53773)","Copilot Backdoor Insertion","AgentFlayer","IdentityMesh",
  "Windsurf SpAIware","HashJack","GeminiJack","AgentHopper","Agentic ProbLLMs","ZombieAgent",
  "Claude Cowork Exfiltration","Reprompt Attack","Notion AI Exfiltration"
];

// slug|ref|date|category|target|IA|PE|RE|PERSIST|C2|LM|AO|type|url   ('-' = null / TODO-verify)
const rows = `
not-what-you-signed-up-for|43|2023-02|Browser/Search|Bing Chat, plugins|Poisoned webpage|Instr. override|-|-|-|-|Data exfil., fraud|paper|https://arxiv.org/abs/2302.12173
bing-chat-exfil|44|2023-06|Browser/Search|Bing Chat|Poisoned webpage|Instr. override|-|-|-|-|Data exfiltration|blog|https://embracethered.com/blog/posts/2023/bing-chat-data-exfiltration-poc-and-fix/
gpt4v-visual-injection|45|2023-10|Multimodal|GPT-4V|Image (hidden text)|-|-|-|-|-|Response manip.|blog|https://simonwillison.net/2023/Oct/14/multi-modal-prompt-injection/
artprompt|33|2024-02|Multimodal|GPT-4, Claude|ASCII art encoding|Semantic bypass|-|-|-|-|Harmful content|paper|-
morris-ii-worm|7|2024-03|AI Worm|Email assistants|Received email|Role-play JB|-|RAG-dep|-|Self-rep|Data exfil., spam|paper|https://sites.google.com/view/compromptmized
apwt|37|2024-08|AI Agent|GenAI-powered app|Direct prompt|Role-play JB|Context probing|-|-|Perm|DoS, SQL table modification|paper|https://arxiv.org/abs/2408.05061
slack-ai-exfil|46|2024-08|Enterprise|Slack AI|Public channel msg|Instr. override|-|RAG-dep|-|-|Private ch. exfil.|blog|-
m365-ascii-smuggling|47|2024-08|Enterprise|M365 Copilot|Malicious email|Auto tool inv.|-|RAG-dep|-|-|MFA code exfil.|blog|-
chatgpt-spaiware|5|2024-09|Browser/Search|ChatGPT|Browsed webpage|Instr. override|-|RAG-indep|-|-|Persistent exfil.|paper|https://arxiv.org/abs/2412.06090
chatgpt-zombai-c2|48|2024-10|Browser/Search|ChatGPT|Browsed webpage|Instr. override|-|RAG-indep|native|-|Data exfil|blog|-
prompt-infection|49|2024-10|AI Worm|Multi-agent sys.|Webpage/PDF/Email|Instr. override|-|-|-|Cross-agent|Saturation|paper|https://arxiv.org/abs/2410.07283
zombais-claude-c2|50|2024-10|Agentic/CUA|Claude Comp. Use|Visited webpage|Instr. override|-|-|-|-|RCE, malware C2 conn.|blog|-
deepseek-ato-xss|51|2024-11|Browser/Search|DeepSeek AI web app|Direct prompt|Control bypass|-|-|-|-|XSS, account takeover|blog|-
freysa-ai-heist|52|2024-11|Crypto/DeFi|Freysa AI agent|Direct message|Tool confusion|-|-|-|-|Transfer funds|blog|-
chatgpt-search|53|2024-12|Browser/Search|ChatGPT Search|Hidden text on webpage|-|-|-|-|-|Output manipulation|blog|-
mcp-history-theft|54|2025-04|Coding Assist.|MCP-based agents|Malicious MCP server|Control bypass|-|-|-|-|Exfil of conversations|blog|-
echoleak|55|2025-06|Enterprise|M365 Copilot|Markdown email|Auto RAG mix|-|RAG-dep|-|-|Zero-click exfil.|blog|-
camoleak|56|2025-06|Coding Assist.|GitHub Copilot|Untrusted repo content|Control bypass|-|-|-|-|Secret exfil.|blog|-
curxecute|57|2025-07|Coding Assist.|Cursor|Slack/GitHub msg|Approval bypass|-|RAG-indep|-|-|RCE via MCP|blog|-
forcedleak|58|2025-07|Enterprise|SF Agentforce|Web-to-Lead form|Instr. override|-|RAG-dep|-|-|CRM data exfil.|blog|-
invitation-is-all-you-need|6|2025-08|Agentic/CUA|Google Assistant|Calendar invite|Delayed tool inv|-|RAG-dep|-|Perm|IoT manip., surv.|paper|-
devin-ai-rce|59|2025-08|AI Agent|Devin|Browsed website|Control bypass|-|-|-|-|RCE, malware C2 (Sliver)|blog|-
devin-expose-port|60|2025-08|AI Agent|Devin|Untrusted content|Control bypass|-|-|-|Perm|Service exposure|blog|-
github-copilot-rce|61|2025-08|Coding Assist.|GitHub Copilot|Code/issue/webpage|Control bypass|-|RAG-indep|-|-|RCE|cve|-
copilot-backdoor|62|2025-08|Coding Assist.|GitHub Copilot|GitHub issue|Instr. obfusc.|-|-|-|Supply-ch|Backdoor insertion|blog|-
agentflayer|38|2025-08|Coding Assist.|Cursor|Jira ticket|Instr. obfusc.|-|RAG-dep|-|Pipeline|Credential exfil.|blog|-
identitymesh|39|2025-08|Browser/Search|Perplexity Comet|GitHub issue|Instr. override|-|RAG-dep|-|Cross-app|Gmail exfil., phish|blog|-
windsurf-spaiware|63|2025-08|Coding Assist.|Windsurf|Source code|Instr. override|-|RAG-indep|-|-|Persistent exfil.|blog|-
hashjack|64|2025-11|Browser/Search|AI browsers|URL fragment|-|-|-|-|-|Phishing, data theft|blog|-
geminijack|65|2025-12|Enterprise|Google Gemini|Doc/Cal/Email|Zero-click RAG|-|RAG-dep|-|-|Corporate data exfil.|blog|-
agenthopper|66|2025-12|AI Worm|AI code assist.|Git repository|Control bypass|-|Git-repo|-|Git-propag|Exponential spread|blog|-
agentic-probllms|8|2025-12|Agentic/CUA|Claude Comp. Use|Visited webpage|Control bypass|-|-|-|Perm|RCE|blog|-
zombieagent|67|2026-01|Enterprise|ChatGPT|Received email/file|Control bypass|-|RAG-indep|-|Self-rep|Data exfiltration|blog|-
claude-cowork|68|2026-01|Agentic/CUA|Claude Cowork|Skill file (.docx)|Control bypass|-|-|-|-|File exfiltration|blog|-
reprompt-attack|69|2026-01|Enterprise|Microsoft Copilot|URL q-parameter|Control bypass|-|Session|native|-|Continuous exfil.|blog|-
notion-ai-exfil|70|2026-01|Enterprise|Notion AI|Uploaded doc|Control bypass|-|-|-|-|HR data exfil.|blog|-
`.trim().split('\n');

const stage = v => (v === '-' || v === '') ? null : { value: v, justification: 'TODO', evidence: { quote: 'TODO', locator: 'TODO' } };
const dir = path.join(ROOT, 'data', 'incidents');
fs.mkdirSync(dir, { recursive: true });
rows.forEach((line, i) => {
  const [slug, ref, date, category, target, ia, pe, re, per, c2, lm, ao, type, url] = line.split('|');
  const obj = {
    slug, title: titles[i], paper_ref: parseInt(ref, 10), date, category, target,
    source: { url: url === '-' ? 'TODO-verify' : url, type, snapshot: null, archived_at: null, sha256: null },
    stages: {
      initial_access: stage(ia), privilege_escalation: stage(pe), reconnaissance: stage(re),
      persistence: stage(per), command_control: stage(c2), lateral_movement: stage(lm), action_on_objective: stage(ao)
    }
  };
  fs.writeFileSync(path.join(dir, slug + '.yml'), yaml.dump(obj, { lineWidth: -1 }));
});
console.log(`✓ seeded ${rows.length} records from Table II`);
