# Career Navigator design

Career Navigator is a task-oriented application. Learners establish a baseline, choose a target role, build a roadmap, and use it to prepare for interviews and applications. The overview leads with the assessment and keeps the demo as a secondary action. Other routes retain their existing content and workflow.

## Visual system

- Keep the Cause-Finder logo and the circuit-inspired overview illustration. Use the logo in the shell and reserve the orbital artwork for larger viewports.
- Use the existing Inter, Arial, sans-serif stack. Keep shell labels compact, body text readable at 1rem where practical, and page headings distinct from section headings. Use balanced wrapping for short headings and a comfortable measure for supporting prose.
- Keep the original `--cf-main`, `--cf-section`, and `--cf-card` navy surfaces, `--cf-electric` cyan for navigation and selection, and `--cf-lime` for primary learner actions. Use `--cf-shell` for navigation and `--cf-focus` for keyboard focus.
- Use `--cf-gutter` for shared page insets and `--cf-action-size` for primary controls and compact navigation targets. Use one shared surface for adjacent overview metrics, with dividers and tabular numerals.

## Interaction and layout

- Above 960px, use the persistent left navigation with an independently scrollable section list. At 960px and below, expose the same links through the Sections disclosure. Selecting a route closes the list, and Escape returns focus to the disclosure button.
- Keep a single main heading, a keyboard skip link, and a visible current-route indication. Route changes focus the main content.
- Below 600px, use a single-column overview, a two-column metrics strip, and the floating Nova launcher. Keep action bars in the document flow so the launcher cannot pin them underneath itself.
- Use `--cf-motion` for short press feedback. Remove this movement when reduced motion is requested. Preserve the existing print layout.

## Learner workflows

- Keep role filters mounted during result updates and announce the count through a polite status. An empty result offers a reset that returns focus to search.
- On the résumé route, show the work area before optional guidance. Report file reading, errors, and completion beside the relevant import control.
- Put the scripted assessment question and progress before its voice controls. Keep live Nova in the persistent launcher on that route.
- Keep crosswalk table headers semantic and provide a named, focusable scroll region with a small-screen cue.
- Label pre-baseline estimates as illustrative. After assessment, lead with the roadmap and offer interview practice after the planned work is marked complete.
