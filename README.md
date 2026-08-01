# Eagle's Dominion Synergy Assembly

The official web experience for Eagle's Dominion Synergy Assembly (EDSA): a responsive, cinematic church website with accessible navigation, Scripture-led storytelling, service information, and Ezra, an AI Scripture companion.

## Highlights

- Scroll-driven opening sequence with static, reduced-motion, and constrained-network fallbacks
- Responsive editorial sections for EDSA's identity, worship, prayer, community, preaching, generations, and visit information
- Ezra chat with streamed Markdown responses from Google's Gemini API
- Server-only API key handling and same-origin request validation
- Local answers for verified EDSA information such as service times and directions
- Keyboard, touch, reduced-motion, and narrow-screen support
- Playwright coverage for behavior, accessibility, responsive layouts, AI safety controls, and performance budgets

## Technology

- Next.js 16 App Router
- React 19 and TypeScript
- GSAP with ScrollTrigger
- Lenis smooth scrolling
- React Markdown with GitHub Flavored Markdown
- Playwright

## Requirements

- Node.js 20.9 or newer
- npm
- A Gemini API key from [Google AI Studio](https://aistudio.google.com/app/apikey) for model-generated Ezra answers

Verified EDSA facts can still be answered locally without calling Gemini, but general Scripture questions require the API key.

## Local development

```bash
git clone https://github.com/Dairus01/edsa.git
cd edsa
npm install
cp .env.example .env.local
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

Add the key to `.env.local`:

```dotenv
GEMINI_API_KEY=your_gemini_api_key
```

`GEMINI_API_KEY` is the only required environment variable. Ezra is enabled in the application and currently uses `gemma-4-31b-it`. Never expose the key through a `NEXT_PUBLIC_` variable or commit `.env.local`.

## Commands

```bash
npm run dev        # Start the development server
npm run typecheck  # Run TypeScript validation
npm run test:e2e   # Run the Playwright suite
npm run build      # Create a production build
npm run start      # Serve the production build
```

Install Playwright's browser and system dependencies before the first browser test run when necessary:

```bash
npx playwright install --with-deps chromium
```

## Deployment

Vercel is the simplest deployment target because this is a full-stack Next.js application. Ezra depends on the dynamic `/api/ezra` route and will not work on a static-only host.

1. Import this repository into Vercel.
2. Keep the detected framework as Next.js.
3. Add `GEMINI_API_KEY` under Project Settings → Environment Variables.
4. Apply the variable to Production and Preview.
5. Deploy.

The key stays on the server. The browser sends chat history to `/api/ezra`, and that route calls Google's Generative Language API and streams visible answer text back to the chat panel.

## Ezra safeguards

- Validates request shape, size, message roles, IDs, and history bounds
- Rejects foreign browser origins
- Keeps the Gemini key and system prompt out of client bundles
- Filters hidden model reasoning from streamed responses
- Applies one concurrent request per client and a best-effort 50-request/10-minute window
- Provides pastoral, privacy, safeguarding, and professional-care boundaries through the server-side system prompt

The current rate limiter is process-local. This is appropriate for a small demonstration, but a public multi-instance deployment should replace it with a shared store such as Redis so the limit is globally consistent.

## Project structure

```text
src/app/                 Next.js layout, page, styles, and API routes
src/components/          Hero, sections, navigation, motion, and Ezra UI
src/content/             Church, location, Scripture, image, and Ezra content
src/lib/ai/              Gemini transport, validation, prompt, facts, and rate limiting
public/                  Images, branding, video, and hero sequence frames
tests/                   Playwright behavior, visual, performance, and server tests
```

## License

The software source code is available under the [MIT License](LICENSE).

EDSA names, logos, photographs, video, and written church content are excluded from the MIT grant and remain the property of Eagle's Dominion Synergy Assembly or their respective owners. Permission is required before reusing those materials.
