# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

- **Tech recruiters** (HR and technical recruiters at companies hiring for internships or junior roles in ML, data and AI). They arrive from a resume, LinkedIn or an application, have little time, and need to know in seconds who this is, what he builds, and how to reach him.
- **Community and network** (classmates, LinkedIn connections, people who arrive out of curiosity). They browse the projects and the interactive demos.

Later, other people will use the same app to publish their own portfolio and build resumes from it (multi-user is phase 3). The first surface serves one owner: Enrique R. Susin.

## Product Purpose

A portfolio site that is also a resume generator. Skills, projects, research and experience are entered once; the site shows them as a visual portfolio, and for each job application the owner picks what is relevant and generates a tailored resume in Portuguese or English (phase 2).

Success for the portfolio: a recruiter understands who Enrique is and what he does, and gets in touch (email or LinkedIn).

## Positioning

AI combined with product and design sense. Enrique takes machine learning work (topic modeling with BERTopic, privacy attacks on federated learning, RAG) and turns it into things people can understand and use: explanatory sites for his research, and the LibrasMap accessibility product for the Deaf community. The portfolio must make that pairing evident, not just list ML skills.

## Operating Context

- Visitors usually come from a link in a resume, LinkedIn or a job application; many on a phone.
- The site and every resume exist in Portuguese (default) and English.
- Projects with live sites: How Brazil talks about superbugs (amr-topic-modeling.vercel.app) and DLG / lab (dlgsimulator.vercel.app).

## Capabilities and Constraints

- Next.js 16 (App Router), TypeScript, Tailwind 4, hosted on Vercel. 3D through Three.js (React Three Fiber) is a stated part of the vision.
- Content lives in `content/<slug>/portfolio.json`, validated by Zod; pages read it only through the portfolio repository.
- Phone number is shown on resumes only, never on the public site.
- Resume builder (phase 2) and multi-user accounts (phase 3) do not exist yet.

## Brand Commitments

- The visual identity comes from the owner's own room and drawings (references in `design/references/`). It is binding, and it overrides the skills' generic palette and calibration warnings:
  - Ballpoint (BIC) blue as the signature ink, with a ballpoint orange-red as the second pen.
  - The seafoam Telecaster he painted with blue line flowers.
  - Sticky-note colours: highlighter lime, sky blue, hot pink, yellow, orange.
  - Graphite black, sketchbook paper, a lilac coloured-pencil wash.
  - A bright daylight room: white wall, cool blue/violet light.
- His drawings (ballpoint faces and butterflies, coloured-pencil self-portrait with guitars, frogs on post-its, graphite whale shark, crow on a lime post-it) may be used on the site as real artwork. They are his, and he approved using them (2026-11-15). They are part of the wall, never a section of their own: the site is about his projects.
- Personality to carry: music (guitars, bass, home recording), drawing, books (Neil Gaiman, Coraline), playful creatures, handwritten notes pinned to the wall.
- Rejected directions (2026-11-15): the "embedding atlas" (not personal enough), and the painted-Telecaster world with a procedural 3D guitar (generic-looking, poor model, colours did not work).
- The wall of sticky notes was also set aside (2026-11-15, kept on branch `design/quadro`).
- Chosen direction (2026-11-15): music. A record shelf in 3D, with a turntable. Every project and every theme is a vinyl record with its own sleeve. Hovering pulls a record out, and clicking puts the vinyl on the turntable and opens its liner notes as side A and side B. The covers carry his drawings and his projects' real images. The turntable is "Modern vinyl player" by alpaca. (Sketchfab, CC BY 4.0), credited on the page.
- The owner's earlier project sites are content references only and must not drive the style.
- Design work follows the `impeccable`, `design-taste-frontend` and `emil-design-eng` skills.

## Evidence on Hand

- Resume content (2026) transcribed in `content/enrique-susin/portfolio.json`.
- Paper: PROPOR 2026, ACL Anthology (https://aclanthology.org/2026.propor-1.10/).
- Real numbers from the AMR study: 70,103 Portuguese texts; +24% topic diversity and +12.5% coherence vs GSDMM.
- Live demos and public code (github.com/Eni19).
- No portrait photo, testimonials, employer logos or press. Do not invent any.

## Product Principles

1. Contact is the goal: every path ends at a way to reach Enrique.
2. Show the work doing its job (real numbers, real demos, real outputs) instead of claiming skills.
3. Research made legible: depth for engineers, clarity for recruiters, on the same page.
4. Both languages are first-class; nothing ships in only one.
5. One source of truth: the portfolio and every resume come from the same content.

## Accessibility & Inclusion

WCAG AA as a floor. Respect `prefers-reduced-motion` and keep all content readable without WebGL. LibrasMap is an accessibility project, so the site itself must model good accessibility.
