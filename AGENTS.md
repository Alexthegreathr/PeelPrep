<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# PeelPrep Project Rules

PeelPrep is a secure AI-powered interview preparation web application.

## Working process

- Read all files in `docs/` before planning or implementing features.
- Work on only one approved phase at a time.
- Do not begin later phases without explicit approval.
- During the planning phase, create documentation only. Do not implement application features.
- Inspect existing code before making changes.
- Do not silently replace real functionality with placeholders.
- Clearly label mock and demo behavior.

## Engineering standards

- Use Next.js App Router and strict TypeScript.
- Read the relevant documentation in `node_modules/next/dist/docs/` before using Next.js APIs.
- Use Server Components by default.
- Use Client Components only when browser state or interactivity requires them.
- Keep components and functions focused and reasonably small.
- Avoid duplicated business logic.
- Validate external input with Zod.
- Handle loading, empty, success, and error states clearly.
- Maintain responsive and accessible interfaces.

## Security rules

- Never expose secret keys in client-side code.
- Never commit `.env` or real credentials.
- Never rely on client-side authorization.
- Verify authentication and ownership on the server.
- Use Supabase Row Level Security for private user data.
- Treat résumés, interview details, recordings, and outcomes as sensitive.
- Never fabricate citations, candidate experiences, or interviewer information.
- Never infer sensitive personal characteristics about interviewers.

## Quality checks

At the end of every implementation phase:

1. Run formatting or verify formatting.
2. Run ESLint.
3. Run TypeScript checking.
4. Run relevant tests.
5. Run the production build.
6. Report all failures honestly.
7. List changed files and remaining limitations.
8. Stop before beginning the next phase.
