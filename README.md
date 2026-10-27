# Design Mentor AI

**Verified proof of design skill.** Designers get mentor-style AI feedback pinned to the exact spots on their screens, and recruiters get scores they can trust: produced on the server from the files as uploaded, with nothing editable afterwards.

Built with React, TypeScript, Vite, Tailwind/shadcn-ui and Supabase (Postgres, Storage, Edge Functions). The vision model is Google Gemini 2.5 Flash.

## What makes it different

| Feature | What it does |
| --- | --- |
| **Feedback pinned to the design** | Every finding comes with a box on the screenshot. Numbered markers show exactly *which* button, heading or gap the feedback is about. |
| **Measured, not just judged** | The AI only locates text; contrast ratios are calculated from the screenshot's real pixel colours with the WCAG formula and labelled *Measured from pixels*. |
| **Whole-flow review** | Upload up to 6 screens in order and they're reviewed as one user journey: consistency between screens, step-to-step transitions, and steps that seem to be missing. |
| **Version history and growth** | Mark an upload as a new version of an earlier design. The app shows the score change, which earlier feedback was fixed, and what got worse. Recruiters see each designer's growth across versions. |
| **Verified scores** | AI scores are written only by edge functions using the service role. Designers can't insert or edit critiques, swap the images behind a score, or edit challenge scores. Older scores are labelled *Unverified*. |
| **Blind review for recruiters** | Hide names, photos, contact details and bios while reviewing, and see how a star rating compares with the AI's verified average. |

## How verification works

1. A designer uploads screenshots into their own storage folder. Storage files and a design's image fields can't be changed afterwards (`drizzle/migrations/0005_…sql`).
2. The browser calls `analyze-design` with only the design's id. The function checks the caller owns the design, downloads the files from storage itself, and saves the critique with `verified = true`.
3. Row-level security blocks browsers from inserting or updating `ai_critiques`. A trigger stops browsers from setting AI fields on `challenge_submissions` and stops designers from setting recruiter fields.
4. Recruiter accounts are approved by hand, because recruiters can see designers' profiles and work.

## Project layout

```
src/
  components/AnnotatedFeedback.tsx   pinned findings on the screenshot
  components/MeasuredChecks.tsx      pixel-measured contrast
  components/FlowReview.tsx          multi-screen journey review
  components/VersionComparison.tsx   what changed since the last version
  lib/measure.ts                     WCAG contrast from pixels (unit tested)
  lib/versions.ts                    version chains and growth
  lib/critiques.ts                   picking and averaging verified scores
supabase/functions/
  analyze-design/                    critique a stored design or a quick upload
  analyze-submission/                score a challenge submission against its brief
  compare-versions/                  compare a design with its previous version
  _shared/                           auth, image loading (with SSRF guard), rate limits, AI call
drizzle/migrations/                  database schema and security rules
```

## Running locally

```sh
npm install
npm run dev      # http://localhost:8080
npm test         # unit tests (vitest)
npm run lint
```

`.env` holds the Supabase URL and publishable key. Both are meant to be public.

## Deploying these changes

1. **Apply the migration** `drizzle/migrations/0005_verified_scores_versions_and_roles.sql`, with `DATABASE_URL=… npx drizzle-kit migrate` or by pasting it into the Supabase SQL editor.
2. **Deploy the edge functions**, including the new `compare-versions` and the shared `_shared/` folder:
   ```sh
   supabase functions deploy analyze-design analyze-submission compare-versions
   ```
   Set these secrets with `supabase secrets set`:
   - `GEMINI_API_KEY`: a key from [Google AI Studio](https://aistudio.google.com/apikey).
   - `ALLOWED_ORIGINS`: the URL(s) the site is served from, comma-separated (for example `https://designmentor.example.com`). Localhost is always allowed.

   Supabase provides `SUPABASE_URL`, `SUPABASE_ANON_KEY` and `SUPABASE_SERVICE_ROLE_KEY` automatically.
3. **Enable Google sign-in** (optional): in Supabase, go to Authentication → Providers → Google and add your Google OAuth client ID and secret. Then add `<your site>/auth` and `http://localhost:8080/auth` under Authentication → URL Configuration → Redirect URLs.
4. **Review existing recruiters.** Before this change, any user could give themselves the recruiter role. List them and remove any you don't recognise:
   ```sql
   select r.user_id, p.email, r.created_at
   from user_roles r left join profiles p using (user_id)
   where r.role = 'recruiter' order by r.created_at;
   ```
5. **Approve new recruiters** from the SQL editor:
   ```sql
   select * from recruiter_applications where status = 'pending';
   select approve_recruiter('<user id>');
   ```

## Limits worth knowing

- Anonymous quick analyses on the landing page are limited to 5 per IP per hour, and signed-in users to 30 per hour.
- Contrast is measured in the browser from signed image URLs. If an image can't be read (for example a third-party host without CORS), the page says so instead of guessing.
- Text boxes come from the model, so a measurement is only as good as the box. Results with no clear second colour are skipped rather than reported.
