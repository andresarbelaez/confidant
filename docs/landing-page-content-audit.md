# Landing Page Content Audit  
**Role:** Senior content designer / UX writer  
**Scope:** Confidant landing page (hero, philosophy, features, try-it-yourself, download, footer, header)

---

## 1. Clarity

### Strengths
- **Hero:** The main value prop is clear in one sentence: free, private, on-device AI for mental health. The tagline “Because your thoughts deserve to be heard, not stored” is concrete and memorable.
- **Philosophy:** The three-part structure (belief → problem → solution) is easy to follow. “Your thoughts stay yours” is a strong, simple payoff.
- **Features:** Section heading “Built for privacy and reflection” sets expectations; card titles are scannable; “complement — not replace — professional care” clearly positions the product.

### Issues & recommendations
- **Hero H1:** “Confidant is a free, private AI companion for your mental health. It runs entirely on your device.” The second sentence repeats “runs on your device,” which you also say in Philosophy and Features. Consider tightening to one clear statement, e.g. *“A free, private AI companion for your mental health—that runs entirely on your device.”* (One idea per line if you keep two sentences.)
- **Try It Yourself intro:** “See the interface below—then download the app for private conversations.” The dash can feel abrupt. Alternatives: *“Try the interface below. Download the app to keep your conversations private.”* or *“See how it works below, then download for private conversations.”*
- **Overlay message:** “This is a website—not a safe place for private conversations.” “Not a safe place” could sound alarming. Clearer and still direct: *“This is only a preview. Your message isn’t private here. Download the app to chat in full privacy.”*

---

## 2. Legibility & hierarchy

### Strengths
- Section headings use a consistent pattern (serif, 4xl/5xl), which helps scanning.
- Philosophy uses a clear lead (“We believe…”) and a distinct closing line (“Your thoughts stay yours”).
- Feature cards use short titles and one- or two-sentence descriptions.

### Issues & recommendations
- **Features subtitle:** “Putting our values into practice.” is quite abstract and doesn’t add concrete information. Consider something that helps scanning or outcome, e.g. *“Privacy, offline use, and supportive conversation.”* or drop the subtitle if you prefer minimal copy.
- **Download subcopy:** “Free for macOS 11+ and Windows 10+. No account required.” is good. The beta notice and unsigned-app note are dense in one block. A short subhead before the unsigned-app paragraph (e.g. *“About security warnings”*) would help people who are looking for that specifically.

---

## 3. Accuracy & consistency

### Strengths
- Mental health disclaimers appear in the chat preview footer and in the footer (“not a substitute for therapy or professional mental health care”). That’s appropriate and consistent.
- “Complement — not replace — professional care” (Features) matches the disclaimer tone.
- Platform and version requirements (macOS 11+, Windows 10+) are stated.

### Issues & recommendations
- **“Companion” vs “support”:**
  - Hero: “AI companion for your mental health.”
  - Philosophy: “supportive AI companionship.”
  - Features: “Thoughtful support” / “space to process.”
  Using both “companion” and “support” is fine, but be consistent where you can (e.g. “supportive AI companion” in Philosophy to align with hero).
- **Footer disclaimer:** “Confidant is not a substitute for therapy or professional mental health care.” Consider adding “If you’re in crisis, please contact a crisis line or professional.” (or similar) if you want to align with common mental-health product practice. Optional but worth deciding.
- **Chat preview disclaimer:** “For support, please reach out to a qualified professional.” Slightly different wording from the footer (“therapy or professional mental health care”). One shared line (or two variants that are explicitly “in-app” vs “site-wide”) would keep the legal/positioning message consistent.

---

## 4. Tone & voice

### Strengths
- Tone is calm, reassuring, and respectful of privacy and mental health—appropriate for the product.
- First person is used sparingly and where it helps (“We believe,” “We’d love your feedback”).
- No hype or overpromise; “companion” and “support” set realistic expectations.

### Issues & recommendations
- **Features subtitle:** “Putting our values into practice” is company-centric. User-centric options: *“Privacy, offline use, and a space to reflect.”* or *“Designed for privacy and reflection.”*
- **Beta notice:** “We’d love your feedback” is friendly. You could make the action clearer: *“We’d love your feedback—share it on GitHub.”* (The link already says “Share feedback on GitHub,” so this is optional.)

---

## 5. CTAs & navigation

### Strengths
- Primary CTA (“Download for free”) is action-oriented and repeats “free.”
- Header has a clear “Download” button and in-page links (Philosophy, Features, Try it yourself, GitHub).
- Chat overlay CTA (“Download Confidant”) and hint (“Download for private answers”) both point to the same next step.

### Issues & recommendations
- **Nav label:** “Try it yourself” (header) vs “Try It Yourself” (section). Decide on one style (sentence case vs title case) and use it in both nav and section heading.
- **Hero:** “Download for free” and “View on GitHub” are clear. If you want to emphasize “no account,” you could add a small line under the buttons: *“No sign-up. No account.”* — optional.
- **Download section:** The four download options are clear. The file extension (e.g. `.dmg`) next to each is helpful for people checking what they’re getting.

---

## 6. Other

### Redundancy
- “Runs on your device” / “Everything runs on your device” / “Nothing is uploaded. Nothing is stored online” appears in Hero, Philosophy, and Features. Some repetition reinforces the message; too much can feel repetitive. Consider keeping the strongest version in Philosophy and shortening or reframing in Hero and Features (e.g. Hero focuses on “private,” Features card stays short: “Everything stays on your device.”).

### Microcopy
- **Placeholder:** “Share what’s on your mind…” is good and matches the welcome subtitle.
- **Sidebar (preview):** “Log out,” “Settings,” “Delete chat history” are fine for a non-functional preview; consider a tooltip or aria-label that they’re “Preview only” if you’re worried about confusion (optional).
- **Footer links:** “Source,” “License,” “Contributing” are standard and clear.

### Accessibility & inclusivity
- Mental health language is inclusive and doesn’t assume a specific condition.
- Disclaimers are visible and repeated. Consider ensuring they’re also programmatically associated (e.g. `aria-describedby` or a visible “Disclaimer” heading) if you want to strengthen accessibility.

---

## Summary: high-impact tweaks

| Priority | Area | Suggestion |
|----------|------|------------|
| High | Hero H1 | Tighten to avoid repeating “runs on your device”; one crisp value statement. |
| High | Overlay message | Soften “not a safe place”; clarify “preview only / download for privacy.” |
| Medium | Features subtitle | Replace “Putting our values into practice” with user-benefit or remove. |
| Medium | Nav/section heading | Unify “Try it yourself” vs “Try It Yourself” (case). |
| Medium | Disclaimers | Align chat-preview and footer disclaimer wording (and optionally add crisis line). |
| Low | Philosophy/Features | Slightly reduce repetition of “on your device” across sections. |
| Low | Tone | Make Features subtitle more user-centric. |

If you share which sections you want to change first (e.g. hero only, or hero + overlay + features), I can propose exact replacement copy for each.
