# GreenHabit AI — Event site (web_event)

This repository contains a Next.js 14 (App Router) event website for GreenHabit AI with:

- Landing page + user dashboard
- Email/password auth (Firebase)
- Firestore for users, cards and redeem history
- Admin page (password-protected) for adding cards
- Redeem flow and simple API routes

Environment variables (set in Vercel or .env.local):

- NEXT_PUBLIC_FIREBASE_API_KEY
- NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN
- NEXT_PUBLIC_FIREBASE_PROJECT_ID
- NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET
- NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID
- NEXT_PUBLIC_FIREBASE_APP_ID

Deploy:

1. Push to GitHub and import project into Vercel.
2. Set the environment variables in Vercel project settings.
3. Build & deploy.


