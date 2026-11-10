# IgniteCyber Career Navigator

Local beta 0.2.0 · career modules added October 28, 2026. Source research remains dated October 21, 2026.

An independent, local interactive career planning tool for IgniteCyber Academy. It connects a learning baseline to cybersecurity roles, evolving AI responsibilities, competency gaps, study sprints, portfolio evidence, framework references, and optional credentials.

## Cause-Finder visual theme

The local interface now uses the original logo and navy, electric blue, and lime theme from [Cause-Finder](https://cause-finder.com/). Brand assets are bundled locally; the guest preview works without external runtime requests. See `assets/BRAND-SOURCE.md` for provenance and `cause-finder-theme.css` for the applied tokens. Include both the theme stylesheet and `assets/cause-finder-logo.png` in any Academy deployment.

## Open locally

Start a loopback preview from the repository root:

```sh
python3 -m http.server 8787 --bind 127.0.0.1
```

Open that URL in a browser. Choose another unused port if necessary. The server is bound to the local computer. No package installation, account, API key, build process, or external network connection is needed to use the application. External references open the providers’ websites.

You can also open `index.html` directly. Browser storage behavior under `file://` varies; a local server gives a consistent origin. Keep the same port to retain the same browser workspace. Back up before changing origins or computers.

## Guided assessment with Nova

The assessment now opens as a one-prompt-at-a-time conversation with Nova, an original animated SVG cyber mentor. Choose a focused 8-competency interview or the full 16-competency baseline. The interview begins with security and network foundations, then orders competencies by missing baseline data and gaps for the selected role. It does not claim psychometric adaptive testing or generated AI dialogue.

Each competency pairs a self-rating with a practical reasoning question and scripted feedback. Learners can skip, go back, revisit ratings, save a partial baseline, expand into remaining competencies, or switch to the original full form. Both views update the same learner profile. Skip controls leave the specific input unassessed; they do not infer a score.

The optional read-aloud feature uses the browser Speech Synthesis API and accepts only English voices marked `localService: true`. If none is available, the text conversation remains usable. Voice starts only after a user action; no microphone, remote speech service, or live AI endpoint is used. Avatar speaking animation follows speech lifecycle events; reduced-motion preferences suppress animation. On-device availability varies by browser/OS. The implementation follows the [documented localService distinction](https://developer.mozilla.org/en-US/docs/Web/API/SpeechSynthesisVoice/localService).

Interview position is stored separately under `ignitecyber.guide.v1`. Standard JSON backups include the actual assessment answers and ratings, but not the presentation cursor. Reload resumes the cursor on the same browser/origin, with voice off. Imports, demo loading, and reset restart the interview presentation while preserving imported or newly selected profile data.

Additional runtime files are `guided-assessment.js` and `guided-assessment.css`. Guided-specific logic and browser checks are in `tests/guide.test.cjs` and `tests/guide-browser.test.cjs`. The speech lifecycle is tested with simulated local voices; a specific device voice is not guaranteed.

## Career readiness modules · local beta 0.2.0

The sidebar, Overview, and My Roadmap now link to Interview Studio, Résumé & Job Match, and Beta Feedback. All three use the selected career role and the existing learner profile; none changes a learner’s assessed proficiency automatically.

### Interview Studio

- 46 original educational prompts: 16 technical competencies, 13 core-domain scenarios, 13 AI-domain scenarios, and 4 behavioral prompts. Core roles and AI roles use distinct domain scenarios.
- Question ordering uses current roadmap gaps. Competency and question-type filters support targeted practice, including skills identified in a job description.
- Nova’s on-device read-aloud can speak the interview prompt and coaching context using the same voice controls as the guided assessment.
- Practice mode provides outlines, follow-up questions, a four-item self-reflection rubric, and links to portfolio evidence. Mock mode sequences two technical prompts, one domain scenario, and two behavioral prompts; guidance appears after finishing.
- Responses are editable drafts scoped by role and question. Mocks reuse those saved drafts; beginning another mock does not erase them. The completion log records date and answered count, not frozen historical answer transcripts. Export the Markdown notes to preserve a specific rehearsal.
- No automated semantic grading, hiring prediction, camera, microphone, or live AI service is used.

### Résumé & Job Match Workbench

Paste résumé and job text or import `.txt` / `.md` files under 250 KB. Review and edit the extracted requirements before comparing. Limits are 60,000 résumé characters, 40,000 job-description characters, and 12,000 characters in the requirement list; up to 40 requirements are compared.

A built-in dictionary identifies skill, tool, and credential terms and shows matching résumé excerpts. A generic SIEM mention does not substitute for a specific Splunk requirement. Text overlap is not proof of experience or qualification; unknown terms and requirements such as years, education, or eligibility require manual review. The matcher can miss paraphrases and does not evaluate negation or the quality of a claim. It does not inspect PDF/DOCX layout or calculate an ATS pass score.

Changing either text or the requirement list invalidates the review. Changing the target role requires a new comparison. Missing terms link to Interview Studio and, where they intersect remaining role gaps, to roadmap activities. A bullet composer connects an evidence note with learner-supplied action, work, tools, and outcome. Only a learner-confirmed factual statement can be appended to the résumé draft; editing its facts clears that confirmation. No achievements or metrics are generated.

Download the résumé as plain text and the comparison as Markdown, or print the current review. Document-format imports and model-generated rewrites are future work.

### Beta Feedback

Capture area, feedback type, summary, details, expected result, and an optional usefulness rating. Records include the selected role, source page, date, and beta version. Records remain local and can be marked resolved or reopened. JSON/CSV exports include feedback only; résumé text, interview drafts, and personal profile fields are not attached automatically. CSV cells that could be interpreted as formulas are escaped.

### Persistence and compatibility

New data is stored in the existing browser profile under optional `careerTools.version: 1`. Legacy schema-1 backups without this field load with empty new modules. The normal workspace JSON backup includes all three modules, with validation before replacement. The backup file limit is now 8 MB. Interview drafts are capped at 100, mock completion entries at 30, and feedback records at 100 per local workspace. Export before clearing the workspace or replacing its profile. Browser storage remains unencrypted and scoped to the origin.

New runtime files: `career-tools-model.js`, `career-tools-ui.js`, and `career-tools.css`. The model provides a pure question catalog, matching functions, evidence access, and validation. New checks are in `tests/career-tools.test.cjs` and `tests/career-tools-browser.test.cjs`. `data/interview-questions.json` is a portable, generated question-bank export.

## Included

- 48 attributed primary-source pages with findings, review date, and limitations.
- Comparison of SkillBit, TryHackMe, Hack The Box, SANS/GIAC, Immersive, OffSec, LetsDefend, Centri/Security Blue Team, PortSwigger, and CyberSeek/CISA.
- 13 domains, 26 core/AI role profiles, and 169 role-to-competency associations.
- 16 self-rating competencies and 16 original formative knowledge checks.
- 32 original study sprints with prerequisites plus a separate capstone for every role.
- 22 optional credential candidates with issuer references and eligibility notes.
- 12 framework lenses: NICE, CSF, AI RMF, ATT&CK, ATLAS, D3FEND, OWASP LLM Top 10, ECSF, SAIF, ISO/IEC 42001, CIS Controls, and the SANS Secure AI Blueprint.
- Searchable role and source catalogs, framework filters, evidence notebook, assessment snapshots, pace/resource preferences, and credential tracking.
- Local browser persistence, validated JSON import/export, CSV mapping export, and printable roadmaps.

The **Research & sources** screen is the research report. It contains the platform comparison, SANS tool findings, domain-by-domain AI evolution, design rationale, methodology, and source register. The **Workspace** screen contains the proposed Academy integration phases.

## Research findings that affect the design

The [live SANS careers page](https://www.sans.org/white-papers/sans-ai-cybersecurity-careers-guide) is updated October 19, 2026. It distinguishes four standalone AI job titles, five existing cyber jobs gaining AI duties, and one untitled work area. Older search results describe a May edition. The linked PDF could not be retrieved in this research session, so the prototype does not reproduce its detailed role cards, employer list, salaries, or vacancy estimates.

[SANS workforce assessments](https://www.sans.org/for-organizations/team-development/cybersecurity-assessments) distinguish ASAP practical role assessment from CyberTalent topic questions. The [free AI resources page](https://www.sans.org/mlp/free-ai-security-resources) links a curated NotebookLM experience; it requires Google login and was not tested. The [AI readiness check](https://www.sans.org/go/readiness-for-ai-automated-attacks), AI Security Maturity Model, and Secure AI Blueprint serve different purposes. Research did not verify one SANS product that provides every capability of an AI career navigator.

[NICE’s current versions page](https://www.nist.gov/itl/applied-cybersecurity/nice/nice-framework-resource-center/nice-framework-current-versions) identifies components v2.2.0 with an inconsistent year label. The [official April 2026 release notice](https://www.nist.gov/news-events/news/2026/04/nice-releases-nice-framework-components-v220) is recorded separately. This prototype uses named role anchors. It does not import the full TKS dataset or invent official TKS IDs.

[Security Blue Team’s BTL1 page](https://www.securityblue.team/certifications/blue-team-level-1) redirects to Centri. The source record retains both names.

## Scoring and dynamic mapping

Self-ratings use 0–4, converted to 0–100. Without a question response, the score is the rating × 25. With a response, the score is 75% of that value plus 25 points for a correct answer, or zero points for an incorrect answer. An unanswered self-rating contributes zero; a correct question alone earns at most 25 points. Missing and assessed-zero states remain distinct.

Role alignment is the sum of each skill score capped at that role’s target, divided by the sum of target scores. Targets are original curriculum recommendations. Partial baselines are permitted and coverage is displayed. A single question per competency cannot establish practical mastery, and no psychometric calibration or hiring prediction is implied.

The engine selects a study sprint for every competency gap, expands unmet dependencies, skips prerequisites already satisfied by baseline proficiency, and adds a role capstone. Estimated durations are original assumptions. Completing a sprint reduces remaining hours but does not inflate competency scores. Reassess to update the baseline. Existing credential claims grant no automatic proficiency credit.

The engine runs deterministically in the browser. It does not call an AI model. “AI” describes the work and skills being learned, not a hidden AI recommendation service.

## Files

| File | Purpose |
|---|---|
| `index.html` / `styles.css` / `app.js` | Static interface, interactions, persistence, exports |
| `catalog.js` | Attributed source register and original structured curriculum |
| `engine.js` | Pure scoring, prerequisite planning, validation, and CSV functions |
| `data/catalog.json` | Generated portable research and curriculum data |
| `data/role-framework-mapping.csv` | Generated role/competency associations |
| `data/starter-roadmaps.json` | Generated unassessed plans for all roles |
| `scripts/export-data.cjs` | Regenerate data exports from the catalog |
| `tests/engine.test.cjs` | Curriculum integrity and algorithm checks |
| `tests/browser.test.cjs` | Local Playwright workflow and layout verification |
| `job-search/` | 90-day job search playbook and application tracker |
| `server/` | Local Nova service, WordPress plugins, and release packager |

Regenerate data exports with `node scripts/export-data.cjs`.

Run logic checks with `node --test tests/engine.test.cjs tests/guide.test.cjs tests/career-tools.test.cjs`. Browser checks require Playwright to be available in Node’s module search path and the local server to be running. Override `CAREER_TEST_URL` for another port. Run `node tests/browser.test.cjs`; it creates an isolated test browser profile and does not change the learner’s normal browser workspace.

## Boundaries

All role targets, competency/credential relevance, topic crosswalks, study sprints, duration estimates, and capstones are proposed by IgniteCyber. They are not official or endorsed crosswalks. Frameworks are used for different purposes, not treated as interchangeable certifications. Source pages establish what providers publicly describe, not independently verified performance.

The assessment, credentials held, completions, and evidence notes are self-reported. Source curricula, proprietary labs, private partner agreements, and paid standards text were not copied. No provider API, learning record, account, or subscription was accessed.

Browser storage is local to the origin, unencrypted, and not an authenticated multi-user record. Use synthetic or non-sensitive portfolio notes during the pilot. The optional WordPress integration provides authenticated private student storage.


## Student accounts and deployment

Published at https://ignitecyber.academy/career-navigator/ with email-verified student sign-in, private cross-device workspace sync and explicit central beta feedback submission. The local app continues to work in guest mode. See [account setup and operations](server/README.md) for student/staff instructions, privacy behavior, tests and deployment details.

The local **Military-to-Cyber** sidebar entry opens Nova’s three-step pilot for U.S. veterans, transitioning service members, Guard and Reserve members, and military spouses. Try a fictional profile or start with your own experience. Choose a commercial cyber, AI security, federal civilian, or defense contractor roadmap, add a sanitized portfolio note, and use the note in Nova’s Interview Studio and the résumé composer. Carlo Anez is the lead mentor and practitioner. Program cards point to providers for current eligibility and availability. Intake results are included in the existing workspace JSON backup.

With the local server running, use `node tests/military-browser.test.cjs` with Playwright on the Node module path to exercise the four sample profiles and manual intake.

### Live Nova coaching

Run the local server from this directory. Stop any previous local preview using port 8787 first. In zsh, enter your key at the hidden prompt:

```zsh
(
  read -rs 'OPENAI_API_KEY?OpenAI API key: '
  printf '\n'
  export OPENAI_API_KEY
  exec node server/nova-local.cjs
)
```

Open http://127.0.0.1:8787/#military and click **Ask Nova AI** in the Nova panel. The server binds to loopback. It reads the key from its environment and sends requests to OpenAI's Responses API. Nova sends chat messages, the selected role, and public page context to OpenAI. Guest chat history stays in the current tab. On the WordPress deployment, verified students can opt in to saving one chat across devices. Use `OPENAI_MODEL` to override the default `gpt-5-mini`. Running `node server/nova-local.cjs` without a key starts the preview in setup mode.

## License

The project source and original documentation are available under the [MIT License](LICENSE). Cause-Finder and IgniteCyber names, logos, and other brand identifiers retain their respective trademark rights. Third-party frameworks and provider references retain their own terms.
