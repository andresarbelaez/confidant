# Communicating Confidant's Impact (Without Users or Quantifiable Metrics)

When you don’t yet have users, downloads, or retention, you can still communicate impact by focusing on **problem significance**, **design intent**, **what you’ve built**, and **honest positioning**.

---

## Three-part impact structure

Use this as the main framing for talks, grants, or one-pagers. Each part can be elaborated without user metrics.

| Part | What it means | How to say it in one line |
|------|----------------|----------------------------|
| **1. Innovative AI patterns** | Proposing a non–cloud-based solution as a viable, repeatable pattern. | Confidant demonstrates that full-featured AI (LLM + RAG) can run entirely on-device—a concrete alternative to the default “send data to the cloud.” |
| **2. People & privacy** | Direct benefit: reducing harm and expanding access for people who need private or offline support. | We give people an option where their mental health conversations never leave their device—privacy and access by design. |
| **3. Ecosystem & practice** | Open, auditable, responsible design so others can trust, adapt, or replicate. | We ship open source with safety and accessibility built in, so the pattern is verifiable and reusable. |

### Part 1 — Innovative AI patterns (non–cloud-based solution)

**Impact claim:** Confidant shows that **serious AI assistance doesn’t require the cloud**. We propose and implement a pattern others can follow.

- **On-device LLM + RAG**: Local GGUF model + local embeddings + local vector store (ChromaDB). No API keys, no backend, no data in transit. We prove the stack works for a sensitive, knowledge-heavy use case (mental health).
- **Architecture as argument**: Choices (Tauri, Rust, Python subprocesses, local-only data) are documented. The [tech stack summary](./confidant-tech-stack-summary.md) explains *why* each piece supports privacy and performance—so others can adopt or adapt the pattern.
- **Precedent for the field**: Most “AI for good” demos assume cloud APIs. Confidant is a working counter-example: you can ship a helpful, RAG-capable companion that is private by construction, not by policy.

**In a presentation:** “Our first dimension of impact is **innovative AI patterns**. We’re not just building an app—we’re proposing that non–cloud-based AI is viable. Here’s the stack, and here’s why it matters for privacy and for the ecosystem.”

### Part 2 — People & privacy

**Impact claim:** We reduce privacy harm and expand **access** to reflective, AI-supported conversation for people who can’t or won’t use the cloud.

- **Privacy harm**: Cloud AI stores sensitive health conversations; users have no control. Confidant guarantees zero conversation data leaves the device—no training, no logs, no third parties.
- **Access**: Offline, subscription-free support for people who lack connectivity, can’t pay subscriptions, or don’t trust cloud providers. Impact = **availability of an option** that didn’t exist in this form.
- **Dignity**: “Your thoughts deserve to be heard, not stored.” Mental health support as a right to privacy, not a trade for data.

**In a presentation:** “Second: **people and privacy**. We’re building for people who need a private, offline option—whether for trust, cost, or connectivity. When they adopt Confidant, their data stays theirs.”

### Part 3 — Ecosystem & practice

**Impact claim:** We make the **pattern** auditable and reusable—open source, safety-conscious, and accessible—so impact can scale beyond our own deployment.

- **Open source (MIT)**: Full stack is auditable and forkable. Researchers, nonprofits, or other projects can verify privacy claims and reuse the approach.
- **Responsible design**: Disclaimers (not a substitute for professional care), “Call for Help” with local crisis resources, curated knowledge base. We model how to build mental health AI with guardrails.
- **Accessibility**: Design system and audits (e.g. WCAG 2.1 AA). We expand who *can* use the product when they choose it, and we set a bar for inclusive design in this space.

**In a presentation:** “Third: **ecosystem and practice**. We’re not building a black box. We’re shipping open source with safety and accessibility built in, so others can trust the pattern and build on it.”

---

## 1. Lead with the problem you’re addressing

Impact starts with **why this matters**, not with your numbers.

- **Privacy harm**: Cloud AI stores sensitive health conversations; users have no control. Confidant is built so that **zero** conversation data leaves the device—no training, no logs, no third parties. The “impact” is the *reduction of a real harm* for anyone who chooses this tool.
- **Access**: Offline, subscription-free mental health support for people who can’t or won’t use cloud services (cost, connectivity, or trust). Impact = **availability of an option** that didn’t exist in this form.
- **Dignity**: “Your thoughts deserve to be heard, not stored.” Positioning mental health support as a right to privacy, not a trade for data.

**In a presentation:** Open with 1–2 slides on the problem (privacy, access, trust). Then: “Confidant is built to address this. We’re pre-launch, so we don’t have user counts yet—here’s what we’ve built and how we’re designed for impact.”

---

## 2. Use a simple theory of change

Spell out the **if–then** so impact is logical even without metrics.

| If … | Then … |
|------|--------|
| People have a free, private, offline option for reflective conversation | Some will use it instead of (or in addition to) cloud tools, reducing exposure of sensitive data. |
| The app is open source and auditable | Trust can be verified; researchers and orgs can adapt or extend it. |
| We design for accessibility and safety (e.g. crisis signposting, disclaimers) | When people do use it, the product is aligned with responsible mental health support. |

**In a presentation:** One slide: “Our theory of change” with 3–4 if–then bullets. No numbers required.

---

## 3. Emphasize outputs and design choices (leading indicators)

“Impact” doesn’t only mean “users helped.” It can mean **what exists** and **how it’s built**.

- **A working product**: Fully offline desktop app (Tauri + Rust + local LLM + RAG) that runs without a backend. Demonstrates feasibility.
- **Privacy by design**: Tech stack chosen for on-device processing (see [confidant-tech-stack-summary.md](./confidant-tech-stack-summary.md)). No server, no API keys for chat—architectural guarantees.
- **Safety and responsibility**: Disclaimers (not a substitute for professional care), “Call for Help” with local crisis resources, curated knowledge base. Shows intent to reduce harm.
- **Accessibility**: Design system and audits (e.g. WCAG 2.1 AA), keyboard/screen reader support. Expands who *can* benefit when they do adopt.
- **Open source (MIT)**: Auditable, forkable, reusable. Impact includes **potential** use by others and by the ecosystem.

**In a presentation:** “While we don’t have user metrics yet, here’s what we’ve put in place: …” then 4–5 bullets like the above.

---

## 4. Use comparables and need, not your stats

You don’t need *your* numbers to show the **need**.

- **Mental health need**: Cite prevalence (e.g. NIMH, WHO) and demand for low-barrier, private support.
- **Privacy concerns**: Surveys and headlines about trust in AI and health data; regulatory focus on health privacy.
- **Gap in the market**: Most mental-health-oriented AI is cloud-based and data-hungry. Confidant fills the “private, offline, free” niche.

**In a presentation:** “The need is well documented. We’re building the option that meets it for people who prioritize privacy and offline use.”

---

## 5. Be explicit about stage (builds credibility)

Avoid overclaiming. Clear framing strengthens your story.

- **Pre-launch / beta**: “We’re in beta. We’re not yet reporting user numbers; we’re focused on building a product that can deliver impact when people are ready to adopt it.”
- **Leading indicators**: “Our impact right now is in **readiness**: a working app, open source, designed for privacy and safety. User impact will follow when we have adoption to measure.”
- **Asking for support**: “We’re looking for [feedback / partners / funding] to get to the point where we *can* measure user impact.”

---

## 6. One-page “impact snapshot” (for grants, partners, presentations)

You can compress this into a single page. The **three-part structure** gives you a clean narrative arc.

| Dimension | How we communicate it (without user metrics) |
|-----------|-----------------------------------------------|
| **Problem** | Sensitive mental health conversations are stored in the cloud; many people lack a private, offline option. |
| **Solution** | Confidant: free, open-source, fully offline AI companion with RAG; no data leaves the device. |
| **Impact (3 parts)** | **1. Innovative AI patterns** — We propose and demonstrate a non–cloud-based solution (on-device LLM + RAG) as a viable pattern for the field. **2. People & privacy** — We reduce privacy harm and expand access for anyone who needs a private, offline option. **3. Ecosystem & practice** — We ship open source with safety and accessibility built in so the pattern is auditable and reusable. |
| **Theory of change** | If we provide an auditable, private, accessible option, we reduce privacy harm and expand access when users adopt it; the open pattern allows others to replicate. |
| **Stage** | Pre-launch / beta; building toward measurable user impact. |

---

*Use this doc to prep talks, grant applications, or partner conversations when you need to articulate impact without user or usage metrics.*
