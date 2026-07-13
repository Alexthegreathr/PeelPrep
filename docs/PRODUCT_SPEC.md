# PeelPrep Product Specification

## Immediate Product Goal

Build a secure, polished, launchable beta of PeelPrep: an AI-powered interview-preparation platform that transforms an upcoming interview into a personalized research briefing, preparation strategy, and mock-interview experience.

## Beta Scope

The beta includes:

- Authentication
- Protected user dashboard
- Interview creation and draft saving
- Private résumé and document uploads
- Personalized Peel Brief generation
- Predicted interview questions
- Editable candidate story bank
- Typed AI mock interviews
- Structured answer feedback
- Transparent readiness score
- Server-side AI usage limits
- Free, Plus, and Pro subscription logic
- Stripe subscriptions
- Outcome tracking
- Data export and account deletion
- Responsive and accessible design
- Mock AI provider and fictional demo data

## Deferred Features

The first beta will not include:

- Real-time voice conversations
- Real-time (live) video coaching — recorded Video Delivery Analysis is planned as a separate, optional post-core phase (see the "Video Delivery Analysis" section)
- Automatic LinkedIn or private-profile scraping
- Full institutional dashboards
- Advanced organization administration
- Automated training on user outcomes

## Product Overview

PeelPrep helps users prepare for a specific job interview by turning interview information into a personalized preparation plan.

The user provides:

- Company name
- Position title
- Job description or job posting URL
- Interview date and time
- Interview format
- Interview stage
- Interviewer name
- Optional public professional profile URL
- Résumé
- Optional cover letter
- Optional portfolio URL
- Optional notes or application materials

PeelPrep creates a personalized “Peel Brief” that includes:

- Company overview
- Company priorities
- Recent company developments when current information is available
- Role and job-description analysis
- Interviewer professional background
- Likely interviewer perspective
- Predicted interview questions
- Recommended candidate stories
- Questions to ask the interviewer
- Interview preparation checklist
- Readiness score
- Recommended next action
- AI mock-interview options

PeelPrep must only use publicly available professional information about interviewers.

It must not infer or display:

- Protected characteristics
- Private personal information
- Family information
- Health information
- Political beliefs
- Religion
- Sexuality
- Other sensitive personal attributes

AI-generated predictions must be clearly labeled as preparation suggestions rather than verified facts.

---

## Design Direction

Create a sophisticated, modern, lightly banana-themed interface.

The product should feel:

- Professional
- Calm
- Supportive
- Intelligent
- Friendly
- Premium
- Easy to understand

Avoid making the product look childish, gimmicky, or like a generic AI dashboard.

### Color System

- Primary yellow: `#FFD21F`
- Deep navy: `#13213C`
- Warm cream: `#FFF8DF`
- White: `#FFFFFF`
- Muted green: `#4D7B55`
- Brown accent: `#7B4B20`
- Gray text: `#667085`
- Light border: `#E8DDB5`

Use a clean sans-serif font such as:

- Inter
- Geist
- Manrope

Banana branding should appear through:

- A simple PeelPrep logo
- Small peel-shaped accents
- Loading animations
- Progress indicators
- Empty states
- Completion celebrations
- A tasteful mascot used sparingly

Do not place banana illustrations everywhere.

Use:

- Generous spacing
- Strong typography
- Rounded cards
- Subtle shadows
- Clear visual hierarchy
- Accessible contrast

The application must be fully responsive for desktop, tablet, and mobile.

---

## Technology

Use:

- Next.js with App Router
- TypeScript
- Tailwind CSS
- shadcn/ui where helpful
- Supabase for authentication, PostgreSQL, and file storage
- Stripe for subscriptions
- An AI-provider abstraction
- Anthropic as the first production AI provider
- A mock AI provider for development
- Zod for validation
- React Hook Form for forms
- Recharts for analytics
- date-fns for dates
- Server Actions or secure Route Handlers
- Vitest for unit tests
- Playwright for key end-to-end tests

Use Server Components by default.

Use Client Components only when browser state or interactivity requires them.

If a library creates unnecessary complexity, choose a reliable alternative and document the reason.

Never expose:

- AI provider secret keys
- Supabase service-role keys
- Stripe secret keys

These values must never appear in client-side code.

---

## Public Pages

Create the following public pages:

1. Landing page
2. Features page
3. Pricing page
4. How It Works page
5. Privacy page
6. Terms page
7. Sign-up page
8. Login page

### Landing Page

The landing page should include:

- Hero section
- Clear problem statement
- Product explanation
- Three-step process
- Peel Brief preview
- AI mock-interview preview
- Pricing summary
- Privacy and trust section
- Final call to action

Suggested headline:

> Know the room. Own the interview.

Suggested supporting copy:

> PeelPrep turns scattered interview research into a personalized briefing, practice plan, and confidence boost.

---

## Authenticated Application Routes

Create these primary authenticated routes:

- `/dashboard`
- `/interviews/new`
- `/interviews/[id]`
- `/interviews/[id]/brief`
- `/interviews/[id]/questions`
- `/interviews/[id]/stories`
- `/interviews/[id]/practice`
- `/interviews/[id]/readiness`
- `/interviews/[id]/outcome`
- `/history`
- `/profile`
- `/billing`
- `/settings`

The desktop application should use a left navigation sidebar.

The mobile application should use a compact header and mobile navigation.

All authenticated routes must be protected on the server.

---

## Dashboard

The dashboard should show:

- Upcoming interview countdown
- Current readiness score
- Next recommended action
- Upcoming interviews
- Recent Peel Briefs
- AI usage remaining
- Practice streak
- Recent outcomes
- Button to add an interview

The dashboard should prioritize the user’s next upcoming interview.

Include useful empty states for first-time users.

---

## Interview Creation Flow

Create a multi-step interview intake flow.

### Step 1: Opportunity

- Company name
- Position title
- Job description
- Job posting URL
- Location
- Employment type

### Step 2: Interview

- Interview date
- Interview time
- Time zone
- Interview format
- Interview stage
- Expected duration
- Video platform or physical location

### Step 3: Interviewer

- Interviewer name
- Interviewer title
- Public professional profile URL
- Optional manually entered professional background
- Option to add multiple interviewers

### Step 4: Candidate Materials

- Select or upload résumé
- Optional cover letter
- Optional portfolio URL
- Optional notes

### Step 5: Confirmation

- Review all information
- Explain which information will be analyzed
- Obtain confirmation before generating the Peel Brief

Users must be able to save their progress as a draft.

---

## Peel Brief

The Peel Brief is the core product.

Create a visually polished briefing with these sections:

1. Interview snapshot
2. Company overview
3. Company priorities
4. Role analysis
5. Interviewer intelligence
6. Likely interview themes
7. Predicted questions
8. Recommended candidate stories
9. Questions to ask
10. Preparation checklist
11. Potential risks or gaps
12. Recommended next action

Every AI-generated section should display:

- Generation timestamp
- Source labels when sources are available
- “AI-generated preparation guidance” label
- Regenerate option when permitted
- Feedback controls
- Copy button

Allow the user to:

- Mark sections complete
- Add private notes
- Save questions
- Connect questions to stories
- Regenerate individual sections
- Export the brief as a PDF
- Print the brief
- View a condensed last-minute version

Do not fabricate source citations.

If current external research is unavailable, state that clearly and rely only on information supplied by the user.

---

## Company Intelligence

Company intelligence should summarize:

- Mission
- Products and services
- Business model
- Industry
- Competitors
- Culture and values
- Recent priorities
- Recent public developments
- Challenges
- Connections between the company and the role

The interface must distinguish between:

- Verified public information
- User-provided information
- AI-generated interpretation

A separate research-provider abstraction should handle external research.

The AI model alone must not be presented as verifying current information.

---

## Interviewer Intelligence

Only use public professional information.

Possible fields include:

- Current role
- Professional history
- Areas of expertise
- Public projects
- Public articles
- Public talks
- Professional interests
- Likely interview perspective

The system must not:

- Search for private addresses
- Display private contact details
- Display family information
- Infer sensitive characteristics
- Make psychological diagnoses
- Present speculation as fact
- Encourage manipulation of the interviewer
- Scrape login-protected professional profiles

Include this visible notice:

> PeelPrep uses public professional context to help you prepare respectfully. Predictions are suggestions, not verified facts about the interviewer.

---

## Role Analysis

Analyze the job description to identify:

- Top responsibilities
- Required skills
- Preferred skills
- Repeated keywords
- Seniority expectations
- Likely evaluation criteria
- Potential interview topics
- Candidate strengths
- Candidate gaps
- Experiences the candidate should emphasize

Compare the résumé with the job description.

Do not claim that the candidate is qualified or unqualified.

Present strengths and gaps as preparation guidance.

---

## Story Mapping

Allow users to create a reusable story bank.

Each story should contain:

- Title
- Situation
- Task
- Action
- Result
- Skills demonstrated
- Measurable result
- Related résumé experience
- Questions the story can answer
- Tags

The AI should recommend suitable stories for predicted questions.

Users must be able to edit every AI-generated story draft.

Never invent candidate experiences.

If important information is missing, ask the user to provide it.

---

## Predicted Questions

Generate questions in these categories:

- Introductory
- Behavioral
- Situational
- Role-specific
- Technical
- Company-specific
- Interviewer-informed
- Motivation and fit
- Leadership
- Conflict
- Failure
- Closing questions

Each predicted question should include:

- Why it may be asked
- What the interviewer may be evaluating
- Recommended candidate story
- Suggested answer structure
- Practice button
- Save button

Clearly state that predicted questions are preparation suggestions and are not guaranteed to appear in the real interview.

---

## AI Mock Interview

Create a typed AI mock-interview experience for the beta.

Allow the user to choose:

- Interview length
- Question categories
- Difficulty
- Interview stage
- Interviewer style
- Specific weaknesses to practice

Prepare the data model for future audio support, but do not implement real-time audio during the first beta.

The AI interviewer should:

- Ask one question at a time
- Wait for the candidate’s answer
- Ask relevant follow-up questions
- Avoid giving feedback until the selected stopping point
- Stay grounded in the supplied role and company context
- Avoid discriminatory or illegal interview questions
- End with an opportunity for candidate questions

Store:

- Practice session
- Questions asked
- User responses
- Follow-up questions
- Feedback
- Completion status
- Timestamps

---

## Answer Feedback

Evaluate answers using:

- Relevance
- Clarity
- Structure
- Specificity
- Evidence
- Measurable results
- Conciseness
- Authenticity
- Confidence
- Completion of the question

These criteria describe observable qualities of the answer as given. They are not psychological judgments about the person.

Feedback should include:

- What worked
- What was unclear
- What was missing
- One highest-priority improvement
- Improved answer outline
- Optional example answer based only on user-provided facts
- Retry button

Do not encourage users to memorize AI-written answers word for word.

Do not invent experiences, achievements, measurements, or personal details.

---

## Video Delivery Analysis (optional, later phase)

PeelPrep may add an optional Video Delivery Analysis feature that helps users improve observable interview-delivery behaviors by recording practice answers and receiving coaching.

Always use the term "Video Delivery Analysis." Never call it "video recognition."

Position in the product:

- Typed mock interviews remain the first, required practice mode.
- Video Delivery Analysis is optional and arrives in a later, clearly separated phase.
- The initial implementation analyzes recorded responses; it does not provide continuous real-time coaching.
- Users without cameras, and users who decline recording, keep every core feature.
- Video practice is never required for a high readiness score.

The feature must not perform:

- Facial recognition or identity recognition
- Emotion detection
- Personality assessment
- Deception detection
- Psychological analysis

Coaching may be based only on observable signals, such as:

- Approximate camera-facing time ("eye contact" must be described only as an approximation of camera-facing behavior)
- Head positioning
- Frame centering
- Posture stability
- Shoulder alignment
- Excessive movement or stiffness
- Lighting and camera-position issues
- Visible gestures when reliably detectable
- Speaking pace
- Pauses
- Filler words
- Answer length
- Volume consistency

Feedback must never claim that a user:

- Lacks confidence
- Is nervous
- Is dishonest
- Has a certain personality
- Will be liked or disliked by an interviewer
- Is guaranteed to perform well

All feedback is framed as optional coaching derived from observable measurements, with uncertainty and measurement limitations stated plainly.

Privacy requirements:

- Prefer browser-side processing for face and pose landmarks when practical.
- Do not upload raw video unless the user explicitly chooses to save it.
- Delete temporary recordings after processing according to the documented retention policy.
- Store aggregate delivery measurements, not raw landmark frames.
- Never create or store biometric identity templates.
- Obtain separate consent for camera access, microphone access, recording, uploading or saving recordings, and AI analysis.
- Let users delete recordings, transcripts, derived delivery metrics, and AI-generated delivery feedback.

---

## Readiness Score

Create a transparent readiness score from 0 to 100.

Use these weighted categories:

- Company understanding: 15%
- Role understanding: 15%
- Interviewer context: 10%
- Stories prepared: 20%
- Questions practiced: 20%
- Answer quality: 15%
- Questions to ask prepared: 5%

Display:

- Overall score
- Category scores
- Completed tasks
- Missing tasks
- Recommended next action
- Explanation of how the score was calculated

The readiness score must be calculated deterministically from measurable application data.

The AI may recommend next actions but should not directly invent the numeric score.

The score must never imply that the user is guaranteed to advance or receive an offer.

---

## Outcome Tracking

After the interview, ask the user to record:

- Interview completion date
- Questions encountered
- Interview difficulty
- Answers that went well
- Answers that were difficult
- Candidate confidence
- Whether the candidate advanced
- Whether the candidate received an offer
- Private notes
- Lessons for the next interview

Use this information to improve the user’s future preparation.

Obtain explicit consent before using anonymized outcome information to improve system-wide predictions.

Do not use private user content for model training without explicit consent.

---

## Pricing and AI Limits

Implement three individual subscription tiers.

### Free — $0

- One Peel Brief per month
- One active interview
- Basic company and role analysis
- Limited interviewer intelligence
- Five AI-generated questions per month
- One short AI practice session per month
- Feedback on two answers per month
- Basic readiness score
- Basic checklist

### Plus — $19 per month

- Unlimited active interviews
- Unlimited standard Peel Briefs, subject to reasonable abuse protection
- Detailed company intelligence
- Detailed interviewer intelligence
- Personalized question predictions
- Story mapping
- Questions to ask
- Three full AI mock interviews per month
- Feedback on 20 answers per month
- Readiness tracking
- Outcome history

### Pro — $39 per month

- Everything in Plus
- Higher AI limits under a fair-use policy
- Advanced mock interviews
- Advanced follow-up questions
- Future audio delivery analysis
- Future video delivery analysis
- Advanced readiness analytics
- Long-term performance tracking
- Priority access to new features

All usage limits must be enforced on the server.

Do not rely on UI-only restrictions.

---

## Usage Ledger

Create a reusable database-backed usage-ledger system.

Do not store only a simple counter on the user profile.

Track:

- User
- Interview
- Feature
- Quantity
- Subscription period
- Timestamp
- AI provider
- AI model
- Input-token usage
- Output-token usage
- Estimated cost
- Usage status

Usage-event statuses should include:

- Reserved
- Completed
- Refunded
- Failed

Usage must be reserved atomically before an AI request begins.

If an AI request fails, the reservation should be refunded or marked failed according to the documented policy.

Show remaining usage:

- On the dashboard
- Before users begin an AI feature
- In account or billing settings

When users reach a limit, show an upgrade dialog without deleting their existing work.

Plan permissions must come from centralized server-side configuration.

Do not scatter subscription logic across individual components.

---

## Institutional Architecture

Prepare the database and application architecture for future institutional accounts.

Potential institutional customers include:

- High schools
- Universities
- Career centers
- Bootcamps
- Workforce programs
- Outplacement firms

Future capabilities may include:

- Organization workspaces
- Seat management
- Cohorts
- Usage analytics
- Custom resources
- Administrator dashboards
- Privacy controls
- Institutional billing

The beta does not need a complete institutional dashboard.

The data model should not prevent these capabilities from being added later.

---

## Database

Use Supabase PostgreSQL.

Do not create a duplicate application `users` table.

Use Supabase `auth.users` for authentication identities and create a `profiles` table that references `auth.users.id`.

Design normalized database tables for at least:

- profiles
- organizations
- organization_members
- subscriptions
- plans
- usage_events
- candidate_documents
- interviews
- interviewers
- interview_sources
- peel_briefs
- brief_sections
- questions
- stories
- question_story_links
- practice_sessions
- practice_turns
- answers
- feedback
- readiness_scores
- readiness_components
- checklists
- checklist_items
- outcomes
- user_consents
- audit_logs
- saved_sources
- AI generations
- prompt versions

Use UUIDs.

Include where appropriate:

- `created_at`
- `updated_at`
- Ownership fields
- Organization fields
- Appropriate indexes
- Foreign keys
- Row Level Security policies
- Soft deletion when recovery or audit needs justify it

Users must only be able to access their own data unless access is explicitly authorized through an organization.

---

## AI Architecture

Create a provider-independent AI service layer.

Initially support:

- Anthropic production provider
- Deterministic development mock provider

Prepare the interface for a future OpenAI provider, but it does not need to be fully implemented during the first beta.

Use structured JSON outputs validated with Zod.

Create separate prompts for:

- Company analysis
- Role analysis
- Interviewer analysis
- Question generation
- Story recommendation
- Mock interviewing
- Answer evaluation
- Readiness recommendations
- Brief summarization

Every prompt must:

- Be grounded in supplied context
- Avoid inventing facts
- Mark uncertainty
- Refuse to infer sensitive personal information
- Avoid illegal or discriminatory interview guidance
- Request clarification when candidate facts are missing
- Distinguish facts from interpretation
- Avoid generating fake sources

Store:

- Prompt version
- AI provider
- Model
- Input-token count
- Output-token count
- Estimated cost
- Generation duration
- Generation timestamp
- Success or failure state

Do not store hidden chain-of-thought reasoning.

---

## Research Architecture

Create a separate research-provider abstraction.

The beta may use:

- User-provided text
- User-provided public URLs
- Manually entered public professional background
- Fictional mock research data in demo mode

Do not scrape login-protected websites.

Do not pretend that AI-generated knowledge is verified current research.

If current research is unavailable, the application must say so clearly.

Sources must be saved separately from AI interpretation.

Do not fabricate source titles, URLs, dates, or citations.

---

## Privacy and Security

Treat the following as sensitive user data:

- Résumés
- Cover letters
- Interview information
- Candidate answers
- Practice-session content
- Future recordings
- Interview outcomes
- Private notes

Implement:

- Supabase Row Level Security
- Protected file storage
- Signed file URLs
- Server-side authorization
- Secure secret management
- Rate limiting
- Input validation
- File-type validation
- File-size validation
- Secure Stripe webhook verification
- Audit logging for important actions
- Account deletion
- Data export
- Document deletion
- Future recording deletion
- Consent management
- Safe error handling

Do not:

- Expose interviewer information publicly
- Train on user content without explicit consent
- Depend on client-side authorization
- Store secrets in source control
- Return sensitive internal errors to users

Include a delete-interview option that removes associated generated content and uploaded materials according to the deletion policy.

---

## Payments

Implement Stripe support for:

- Checkout
- Customer portal
- Subscription creation
- Subscription upgrades
- Subscription downgrades
- Cancellation
- Webhook synchronization
- Failed-payment handling
- Trial-ready architecture

The application database must become the application’s source of subscription state after verified Stripe webhook processing.

Do not trust client redirects or checkout success pages as proof of payment.

Webhook processing must:

- Verify Stripe signatures
- Be idempotent
- Record processed event identifiers
- Safely handle retries
- Update subscription state consistently

---

## Administration

Create a protected administrative area for authorized administrators.

The beta administration area may include:

- User count
- Subscription counts
- AI usage
- Estimated AI cost
- Application errors
- User feedback reports
- Feature usage
- Ability to disable a compromised account
- Ability to adjust usage limits
- Prompt-version monitoring

Keep the first admin area small and focused.

Normal users must never be able to access administration routes or administration data.

Admin authorization must be verified on the server.

---

## Development and Demo Mode

Provide seeded fictional demo data, including:

- A sample interview
- A sample company
- A fictional interviewer
- A sample résumé
- A completed Peel Brief
- Predicted questions
- Candidate stories
- A mock-interview session
- A readiness score

Clearly label all demo data as fictional.

Create a deterministic mock AI provider so the project can be demonstrated without paid API calls.

The interface must clearly indicate when mock or demo mode is active.

---

## Testing

Add tests for:

- Authentication
- Protected routes
- Interview ownership
- Creating interviews
- Saving interview drafts
- Private document access
- Generating Peel Briefs
- AI output validation
- AI limit enforcement
- Subscription access
- Story mapping
- Readiness calculation
- Stripe webhook verification
- Row Level Security assumptions
- Interview deletion
- Account deletion

Add an end-to-end test covering this workflow:

1. User signs up
2. User creates an interview
3. User uploads or selects a résumé
4. User generates a Peel Brief
5. User saves a predicted question
6. User completes a typed practice answer
7. User receives feedback
8. Readiness score updates
9. User records an interview outcome

---

## Deliverables

Deliver:

1. Complete source code
2. README
3. Local setup instructions
4. Environment-variable template
5. Supabase migration files
6. Seed script
7. Stripe setup instructions
8. AI-provider setup instructions
9. Testing instructions
10. Deployment instructions
11. Privacy and safety notes
12. Known limitations
13. Recommended next steps

Use clean, maintainable TypeScript.

Avoid:

- Giant components
- Duplicated business logic
- Client-side-only authorization
- Hard-coded subscription permissions
- Exposed secrets
- Fake citations
- Invented candidate experiences
- Sensitive interviewer profiling
- Unrestricted AI endpoints
- Unclear loading states
- Silent failures
- Disconnected placeholder screens
- Unlabeled mock behavior

The finished beta should be a genuinely functional product rather than a collection of disconnected screens.

