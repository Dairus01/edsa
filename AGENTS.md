## Browser Automation

Use `agent-browser` for interactive browser testing after the deterministic Playwright suite passes.

Before using it:

1. Run `agent-browser --help`.
2. Run `agent-browser skills get core --full`.
3. Use accessibility snapshots and semantic locators instead of brittle CSS selectors.
4. Re-run `snapshot -i` after navigation or major UI changes.
5. Capture screenshots, accessibility reports, console output, page errors, and Web Vitals.
