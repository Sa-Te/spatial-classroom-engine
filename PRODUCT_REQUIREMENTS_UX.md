# PRODUCT_REQUIREMENTS_UX.md — Spatial Classroom Engine

> Product scope, personas, user flows, accessibility, and acceptance criteria

## 1. PRODUCT_REQUIREMENTS_UX.md

> *“**Repository destination:** `/PRODUCT_REQUIREMENTS_UX.md`”*

## 2. Product vision

Virtual learning should feel present and engaging without requiring a large installer or per-user cloud GPU. The Spatial Classroom Engine gives learners an AI tutor/avatar inside a lightweight browser classroom, while retaining a complete text/2D mode for accessibility and weak devices.

The product succeeds only if it improves learning or teacher workflow. A beautiful 3D room with weak pedagogy is a technology demo, not success.

### 2.1 Product promise

A learner can:

1.  choose a teacher/avatar;

2.  choose **Discuss a topic** or **Study my material**;

3.  enter a classroom;

4.  converse by text, and later voice;

5.  see structured explanations or cited source pages on the board;

6.  continue if 3D, microphone, search, or AI voice is unavailable;

7.  later learn with a small group in the same room.

## 3. MVP definition

The first complete MVP is:

> *“One browser, one learner, two teacher choices, one lightweight classroom, topic mode, typed conversation, deterministic mock mode, optional Gemini text mode, and a fully usable 2D fallback.”*

PDFs are the next release, not part of the first walking demo. Multiplayer and voice follow only after topic and PDF flows are stable.

## 4. Personas

### 4.1 Independent learner

Wants low-friction explanation and follow-up questions. May prefer text, have an older laptop, or feel uncomfortable using a microphone. Needs clarity about what is AI-generated.

### 4.2 Student studying a document

Has lecture notes or a study guide. Needs page-cited answers, the ability to inspect the exact source, and an honest “not found” rather than hallucination.

### 4.3 Teacher/facilitator

Wants to choose approved material, control whether AI/search/voice is enabled, understand sources, and stop the AI immediately. Does not want extra administrative burden.

### 4.4 Small study group

Two to eight learners. Needs understandable presence, shared lesson state, speaking indicators, moderation basics, reconnect, and text fallback.

### 4.5 Open-source contributor

Needs a ten-minute mock-mode setup, deterministic tests, small tickets, licensed assets, and no requirement for paid keys.

### 4.6 Operator

Needs health checks, migrations, backups, redacted logs, cost limits, feature kill switches, rollbacks, and incident guidance.

## 5. Jobs to be done

- “Help me understand a topic at my level through a conversation.”

- “Teach me from this PDF and show where every important claim came from.”

- “Let my study group share the same lesson and talk naturally.”

- “Let me continue by text when audio, 3D, or a provider fails.”

- “Let a teacher control the material, mode, sources, and AI availability.”

## 6. Primary flows

### 6.1 A. Topic discussion

1.  Landing page explains that the teacher is AI.

2.  Learner selects one of two teacher cards.

3.  Learner chooses **Discuss a topic**.

4.  Learner enters topic and optional level.

5.  Learner selects **Start class**.

6.  Classroom loads semantic shell first, then optional 3D.

7.  Teacher greets learner and frames the discussion.

8.  Learner sends text; teacher responds.

9.  Teacher may place allow-listed Markdown content on board.

10. Learner leaves, resets, or reports a problem.

### 6.2 B. Study my material

1.  Select teacher.

2.  Choose **Study my material**.

3.  Select one text-based PDF.

4.  See selecting, uploading, processing, ready, or failed state.

5.  Enter classroom after ready.

6.  Tutor summarizes with page citations.

7.  Learner asks questions.

8.  Citation chip opens exact source page and extracted-text alternative.

9.  Unsupported/scanned file receives actionable guidance.

10. Learner can delete material and understands retention.

### 6.3 C. Multiplayer

1.  Host creates class and shares short link/code.

2.  Participants choose display name and join.

3.  All see participant list and accessible connection status.

4.  Avatar/marker appears at safe spawn.

5.  Board and tutor state converge.

6.  Host has limited explicit controls.

7.  Reconnecting learner receives current snapshot.

### 6.4 D. Voice

1.  Classroom works before microphone request.

2.  Learner explicitly selects **Use microphone** or **Continue with text**.

3.  Browser asks permission.

4.  Learner sees device, mute, speaking, reconnect status.

5.  AI teacher speaks and displays same answer as text.

6.  Push-to-talk and interruption are available.

7.  Spatial audio can be disabled.

8.  Permission/provider failure leaves text class active.

### 6.5 E. Web-assisted answer

1.  Learner asks a freshness-dependent question or explicitly requests search.

2.  If teacher policy permits, UI says **Searching the web for current information…**.

3.  Answer marks web-derived claims with clickable citations.

4.  Study-material and web citations are visually distinct.

5.  If search fails, tutor states the limitation and does not pretend it searched.

## 7. Information architecture

### 7.1 Landing/setup screen

- product explanation and AI disclosure;

- teacher selection;

- mode selection;

- topic field or PDF upload;

- optional level/preferences;

- privacy/help links;

- Start class.

### 7.2 Classroom

- session title and AI badge;

- connection/reconnect state;

- teacher/avatar region;

- board/source region;

- chat/transcript;

- participant list later;

- text input/send;

- microphone/mute/spatial controls later;

- 2D/3D and reduced-motion controls;

- leave, reset, report, help.

### 7.3 Settings

- 2D/3D;

- reduced motion;

- graphics quality;

- spatial audio on/off;

- captions/text always on;

- microphone/device;

- delete material/session where available.

## 8. Teacher content model

``` text
id
name
shortDescription
teachingStyle
supportedLevels
avatarAssetId
thumbnailAssetId
promptVersion
voiceId (later; provider-neutral reference)
locale
safetyProfile
```

Initial teachers should differ in communication style, not claim false credentials or identities. Example:

- **Maya — Clear Guide:** concise explanations, checks understanding frequently.

- **Rowan — Curious Coach:** uses questions and examples to help the learner reason.

All teacher surfaces display **AI tutor** clearly.

## 9. Wireframe-level descriptions

### 9.1 Setup desktop

Left/top: product name and short explanation. Main: two large selectable teacher cards with radio semantics. Below: two mode cards. Topic mode reveals labelled field and level selector. PDF mode reveals drop zone/button and limits. Sticky or clear primary **Start class** button. Errors appear next to source and in summary without losing input.

### 9.2 Classroom desktop

Header: class title, AI label, connection, settings, leave. Main split: board/3D region and conversation panel. Participant rail later. The semantic transcript and controls remain DOM elements outside canvas.

### 9.3 Mobile

No forced landscape. Default to 2D or low-quality 3D. Use tabs or stacked sections: **Teacher**, **Board**, **Chat**, **People**. Persistent send and leave controls remain reachable. Never hide critical status behind hover.

## 10. Required UI states and copy

- Primary action: **Start class**

- Modes: **Discuss a topic** / **Study my material**

- Upload progress: **Preparing your material…**

- Ready: **Your material is ready for class.**

- Scanned PDF: **We couldn’t find selectable text in this PDF. OCR isn’t supported yet. Try a text-based PDF.**

- WebGL failure: **3D isn’t available in this browser. You can still use the classroom in text mode.**

- Microphone prompt: **Use your microphone to speak with the class. You can continue with text instead.**

- Microphone failure: **Voice is unavailable right now. Your class is still active—continue by typing.**

- Reconnect: **Reconnecting to the classroom…**

- Reconnected: **You’re back. The classroom is up to date.**

- Search: **Searching the web for current information…**

- Search failure: **Web search is unavailable, so I can’t verify current information right now.**

- Insufficient PDF evidence: **I couldn’t find enough support for that in your material. Try asking about a specific section.**

- Provider outage: **The AI tutor is temporarily unavailable. Your class and material are still open.**

- Citation labels: **Study material · Page 12** / **Web source**

- AI disclosure: **This teacher is AI-generated and can make mistakes. Check important information and review the sources.**

Copy must be plain, specific, non-blaming, and say what the learner can do next.

## 11. Functional requirements

### 11.1 Topic MVP

- Exactly two configured teacher options initially.

- Topic required, bounded, trimmed, and never interpreted as trusted instructions to tools.

- Session creation prevents duplicate submission.

- Deterministic mock tutor works without external credentials.

- Optional configured real provider is server-side.

- Chat supports pending, retry, and failure states.

- 2D mode offers the same essential function as 3D.

- Unknown tutor actions are rejected.

### 11.2 PDF release

- One text-based PDF initially.

- Visible limits before upload.

- Page-aware extraction and cited answer.

- Every displayed citation is validated to stored evidence.

- Source page and text alternative available.

- Cross-session access impossible.

- User can delete material under documented retention.

- OCR and arbitrary formats are explicit non-goals initially.

### 11.3 Multiplayer release

- Initial tested limit: eight participants, revised by measurement.

- Join/leave/reconnect and shared board/chat.

- Host-only controls are visibly identified and enforced server-side.

- Position packets cannot change roles or durable state.

- Reconnect obtains authoritative snapshot.

### 11.4 Voice release

- Permission requested only after explicit user action.

- Text is always available.

- Push-to-talk and mute.

- AI speech has matching visible text.

- Spatial audio has off switch and safe volume.

- No recording by default; recording status cannot be hidden.

## 12. Accessibility requirements

Target WCAG 2.2 AA for essential flows.

- All setup/classroom controls usable by keyboard.

- Canvas is never the only route to an action or information.

- Focus is visible, logical, and restored after dialogs/source viewer.

- Teacher cards use proper selectable semantics.

- Transcript uses appropriate live-region behaviour without excessive interruption.

- Captions and text output accompany voice.

- Reduced motion disables nonessential camera/avatar movement.

- Status is not colour-only.

- Interface works at 200% zoom and narrow widths.

- Spatial audio is never the sole indicator.

- Error messages identify field/problem/recovery.

- Test with axe plus NVDA or VoiceOver and representative disabled users where possible.

## 13. Privacy and safety expectations

- Collect the minimum data needed for the phase.

- Anonymous/pseudonymous local mode first.

- Explain where PDFs/audio/text go before collection.

- No ambient listening or default recording.

- Clear microphone and AI state.

- No emotional profiling, gaze scoring, or covert engagement score.

- AI does not grade, discipline, diagnose, or act as teacher of record.

- Age-appropriate safety/escalation policy before minors use it.

- Teacher/global AI kill switch for pilot.

- Search and citations are visible.

- Retention/deletion are understandable and testable.

- Do not put sensitive content in analytics, logs, traces, or screenshots.

## 14. Analytics without sensitive content

Allowed event examples:

- setup_viewed

- teacher_selected using configuration ID

- mode_selected

- class_start_succeeded/failed with safe reason code

- three_d_enabled/failed

- material_processing_succeeded/failed with category, not filename/text

- citation_opened

- reconnect_started/succeeded

- voice_permission_granted/denied

- text_fallback_used

Do not collect topic text, questions, answers, document content/names, transcript, audio, personal names, raw room IDs, or full URLs in product analytics by default.

## 15. Success metrics

### 15.1 MVP

- New contributor reaches mock classroom in under 15 minutes.

- Learner reaches classroom in no more than four primary actions.

- At least 80% complete a topic setup in small usability tests.

- Mock reply is available without paid key.

- 100% of essential actions work in 2D mode.

- Reference device meets published performance target.

### 15.2 PDF

- At least 8/10 accepted-page accuracy on fixed evaluation.

- Zero fabricated citation IDs.

- Zero cross-session retrieval in tests.

- Clear outcome for malformed/scanned files.

### 15.3 Multiplayer/voice

- State converges within five seconds after ordinary reconnect.

- Eight-user supported test remains functional.

- Voice join success target defined from supported-network pilot.

- Text fallback available for every audio failure.

### 15.4 Educational validation

Measure comprehension, task completion, learner clarity, teacher workload, correction rate, and accessibility barriers. Time spent, avatar novelty, or room movement alone are not learning success.

## 16. Acceptance criteria by phase

### 16.1 Phase 0

Clean clone, documented commands, mock mode, API health, tests/build pass.

### 16.2 Phase 1

Five-minute topic demo works twice; keyboard path and no-WebGL path work; provider failure is transparent.

### 16.3 Phase 2

Fixed PDF evaluation passes citation/isolation thresholds; exact source page opens; deletion verified.

### 16.4 Phase 3

Two browser contexts converge across join/chat/page/movement/reconnect; unauthorized host action rejected.

### 16.5 Phase 4

Ten-minute voice class includes mute, interruption, reconnect, permission denial, spatial toggle, and text fallback.

### 16.6 Phase 5

Search-required/not-required/prompt-injection evaluations pass; every web claim is cited.

### 16.7 Pilot

Security/accessibility/AI/restore/load gates pass; operator can revoke room and disable AI; external data flows can be explained.

## 17. Explicit non-goals

- Full LMS, certificates, attendance, parent dashboards.

- Automated grading and proctoring.

- Arbitrary file formats or OCR in first PDF release.

- More than eight users before load evidence.

- Persistent accounts before anonymous flow is proven.

- User-generated avatars/assets.

- Native UE5 before protocol validation.

- Autonomous undisclosed browsing.

- Default recording.

- Perfect lip sync.

## 18. Open product questions

Resolve by user testing/ADR, not guesswork:

- Does 3D improve comprehension, presence, or motivation enough to justify device cost?

- Should classroom start in 2D on mobile/low-power devices?

- Which two teacher styles users understand and prefer?

- What PDF/page limits fit cost and usefulness?

- Is AI voice worth latency/cost relative to text plus TTS?

- What teacher controls are required for a school pilot?

- Which age group and jurisdiction will the first pilot target?

- What retention default is acceptable for sessions and uploaded material?

## 19. Documentation sync rule

When product behaviour, scope, copy, accessibility, privacy, metrics, or phase acceptance changes, update this PRD, roadmap, technical design, setup guide, tests, ADRs, comments, and historical release documentation in the same change.
