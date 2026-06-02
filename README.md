# B Socio Studio

**Be Seen. Be Social.**

B Socio Studio is a private internal agency operating system for managing clients, content planning, AI-ready prompts, approvals, tasks, analytics, reports, team roles, and billing notes.

Production domain:

```text
https://studio.bsocio.in
```

This app is not a public SaaS. Only the owner/admin and approved team members should use it.

## Tech Stack

- Next.js App Router
- JavaScript
- Tailwind CSS
- MongoDB Atlas with Mongoose
- Email/password auth with bcryptjs
- JWT session cookie auth
- Vercel deployment

## Main Features

- Private login/register flow with admin approval
- Email verification before admin approval
- Password reset links through Resend email
- `ADMIN_EMAIL` auto-approved as `Owner/Admin`
- Pending, rejected, and suspended user blocking
- Owner/Admin audit logs for sensitive actions
- Internal notifications for approvals, tasks, and reminders
- Role and permission based access
- Team management with skills, permissions, and assigned clients
- Privacy-safe approved team directory, where team members cannot see each other's email or phone number
- Internal team group chat with availability status
- Client/topic chat channels, pinned messages, read counts, and file/image sharing
- Client management with package and billing fields
- Client pipeline statuses: Lead, Onboarding, Active, Paused, Lost
- Renewal reminders, contract URL, package usage tracking, and client document storage
- Dashboard outstanding balance from client balances and unpaid invoices
- Invoice maker with itemized invoices, print/save PDF view, email share link, and WhatsApp share link
- Catalogue/menu builder for client menus, price lists, service lists, and product catalogues
- Client visibility for owner/admin, assigned team members, and all-team clients
- Content generator for captions, hashtags, ideas, reels, stories, ad copy, WhatsApp messages, and Google review requests
- AI image prompt studio with future OpenAI Image API placeholder
- Reel script studio with future video API placeholder
- Dedicated Reels production board for scripts, shooting, editing, review, approvals, and posted status
- Manual trends board
- Content calendar with approval workflow
- Agency tasks
- Manual analytics tracker with charts
- Weekly/monthly style client report generator
- Dedicated Financials overview for outstanding balances, invoice follow-ups, packages, and revenue tracking
- Approvals page for user and content review
- Chat page for internal team messages and client-based chat rooms
- Global search across clients, tasks, reports, captions, hashtags, and content ideas
- Global search includes catalogues and menu items
- Visible language selector: English, Punjabi, Hindi
- Mobile responsive dashboard with hamburger sidebar

## Required Environment Variables

Create `.env.local` locally and add these values:

```env
MONGODB_URI=mongodb+srv://username:password@cluster0.xxxxx.mongodb.net/b-socio-studio?retryWrites=true&w=majority
JWT_SECRET=replace_with_a_long_random_secret
ADMIN_EMAIL=owner@example.com
NEXT_PUBLIC_APP_NAME=B Socio Studio
NEXT_PUBLIC_APP_URL=http://localhost:3000
RESEND_API_KEY=
EMAIL_FROM=
OPENAI_API_KEY=
META_APP_ID=
META_APP_SECRET=
META_REDIRECT_URI=
RUNWAY_API_KEY=
```

For production on Vercel, use:

```env
NEXT_PUBLIC_APP_URL=https://studio.bsocio.in
```

`ADMIN_EMAIL` is very important. The user who registers with this email is automatically approved as `Owner/Admin`. All other users stay pending until approved from the Team or Approvals page.

## Local Setup

1. Install dependencies:

```bash
npm install
```

2. Copy the environment example:

```bash
copy .env.example .env.local
```

3. Add your MongoDB URI, JWT secret, and admin email in `.env.local`.

4. Run the app:

```bash
npm run dev
```

5. Open:

```text
http://localhost:3000
```

6. Register with the same email as `ADMIN_EMAIL`.

7. Login and approve team members from `/team` or `/approvals`.

## MongoDB Atlas Setup

1. Go to MongoDB Atlas and create a free cluster.
2. Create a database user in **Database Access**.
3. Add your IP in **Network Access** for local testing.
4. For Vercel, add `0.0.0.0/0` in **Network Access** so Vercel serverless functions can connect.
5. Copy the `mongodb+srv://...` connection string.
6. Put it in `MONGODB_URI`.

Example:

```env
MONGODB_URI=mongodb+srv://myuser:mypassword@cluster0.xxxxx.mongodb.net/b-socio-studio?retryWrites=true&w=majority
```

## GitHub Upload

Commit these project files:

```text
app/
components/
lib/
models/
public/
.env.example
.gitignore
eslint.config.mjs
jsconfig.json
next.config.js
package.json
package-lock.json
postcss.config.js
proxy.js
tailwind.config.js
README.md
```

Do not upload:

```text
.env
.env.local
.next/
node_modules/
.vercel/
```

## Vercel Deployment

1. Import the GitHub repository in Vercel.
2. Framework preset: **Next.js**.
3. Root directory: project root.
4. Build command:

```bash
npm run build
```

5. Output directory: leave blank/default.
6. Add all environment variables in **Project Settings > Environment Variables**.
7. Deploy.
8. Add custom domain:

```text
studio.bsocio.in
```

9. In your domain DNS, point `studio` to Vercel using the record Vercel gives you.

## Approval Flow

- New users register normally.
- Non-admin users get `pending` status.
- Pending users only see the waiting screen.
- Rejected or suspended users only see the inactive account screen.
- Owner/Admin can approve, reject, suspend, change role, change permissions, and assign clients.
- Owner/Admin can permanently delete records; team members can update assigned work but cannot permanently delete core data.
- API routes check approval and permissions on the server.
- Team members can see approved team members, roles, skills, client counts, and availability only.
- Team member email and phone fields are shown only to Owner/Admin and to the member viewing their own profile.
- Internal chat messages are saved in MongoDB and are only available to approved users in the same agency.

## Email Verification And Password Reset

Email sending uses Resend. Add these variables in Vercel to enable real emails:

```env
RESEND_API_KEY=
EMAIL_FROM=B Socio Studio <noreply@studio.bsocio.in>
```

If these are blank, the app still builds and runs, but verification/reset email routes will show a clear configuration message.

## Future API Integrations

Image generation:

- Add `OPENAI_API_KEY`.
- Implement the real image call inside `/app/api/ai-image/generate-image/route.js`.
- If the key is missing, the route returns a clear configuration message instead of fake success.

Instagram/Facebook analytics:

- Add Meta app credentials.
- Connect Meta OAuth using `META_APP_ID`, `META_APP_SECRET`, and `META_REDIRECT_URI`.
- Save imported analytics into the existing analytics collection.

Video/Reel generation:

- Add `RUNWAY_API_KEY` or another video provider key.
- Connect it from the Reel Studio backend route.
- The current version generates scripts, shot lists, captions, and cover prompts.

## Production Checklist

- `MONGODB_URI` is set in Vercel.
- `JWT_SECRET` is long and private.
- `ADMIN_EMAIL` matches the owner email exactly.
- `NEXT_PUBLIC_APP_URL=https://studio.bsocio.in`.
- MongoDB Atlas network access allows Vercel.
- Register the owner/admin first.
- Approve team accounts before they can access dashboard data.
