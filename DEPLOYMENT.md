# Deploy Footnote publicly on Vercel

This deploys the current browser-local prototype. Accounts, cross-device sync, shared cloud storage, real AI and map providers are not implemented. No Supabase or AI credentials are required for this version.

1. Push the intended code to GitHub. Import `XuxuZhou02/Your-own-travel-webiste` at Vercel using your GitHub account.
2. Select the branch `claude/clever-volta-hd0ozs` for this version (or a reviewed branch containing it). Use the repository root and Next.js framework preset, `npm ci`, and `npm run build`; retain the default Next.js output settings.
3. Use a Node version supported by Vercel and Next.js. CI currently uses Node 22. No environment variables are needed for the offline prototype.
4. Deploy and inspect the generated HTTPS URL. A production deployment needs your Vercel account/project authorization; local build success is not a public deployment.
5. In a browser, create a trip, reload, confirm a ticket, inspect itinerary changes, add a place and open the album. Test `/space`, `/trips/new` and direct navigation to an existing trip. Data from a different browser will not be present because storage is browser-local.
6. For GitHub integration, verify the chosen production branch in Vercel Settings → Git and deploy the correct branch. Use Vercel's own deployment URL until a custom domain is configured.

Before deploying, run `npm run typecheck`, `npm test`, and `npm run build`. All passed during onboarding, but any later code changes need fresh checks.

For a future multi-user product, implement Supabase authentication and membership/row-level authorization before connecting production storage. Do not put service-role credentials in browser code.
