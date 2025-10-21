Local and Production OAuth setup for Google Calendar integration

Why this matters
----------------
Google's OAuth iframe (idpiframe) requires that the page origin (protocol+host+port) be registered as an Authorized JavaScript origin in the Google Cloud OAuth client configuration. If not registered, GAPI will fail with `idpiframe_initialization_failed: Not a valid origin for the client` and the user will see blocked frames or CSP reports.

Quick setup
-----------
1. Open Google Cloud Console -> APIs & Services -> Credentials
2. Select your OAuth 2.0 Client ID used by the app (the one set in REACT_APP_GOOGLE_CLIENT_ID)
3. Under "Authorized JavaScript origins" add:
   - http://localhost:3000
   - http://localhost:3001
   - http://127.0.0.1:3000
   - http://127.0.0.1:3001
   - https://your-production-domain.com  (replace with your production domain)
4. Under "Authorized redirect URIs", add the redirect paths your app might use (if any). For client-side `gapi` redirect flows you may not need to add a specific redirect path; adding the origin is the key step.

Firebase Console
----------------
If you use Firebase Authentication, also add your hosting domain to
Firebase Console -> Authentication -> Sign-in method -> Authorized domains.

CSP notes
---------
- We updated `public/index.html` and `firebase.json` to explicitly allow the Google API domains used by `gapi` and the idpiframe. If you still see CSP reports, ensure your deployment environment (hosting, proxies, or server) doesn't inject or override stricter CSP headers.
- Important domains included: `https://apis.google.com`, `https://www.gstatic.com`, `https://accounts.google.com`, `https://www.googleapis.com`, `https://content.googleapis.com`.

If problems persist
-------------------
- Check the browser console network and CSP report logs. They show exactly which origin or resource was blocked.
- If CSP reports show `script-src-elem` or `frame-src` blocking, verify the final response headers delivered by your hosting provider. Local dev server may not reflect `firebase.json` headers.
- As a fallback, implement server-side OAuth (exchange code for token on server) to avoid gapi idpiframe if necessary.

Contact
-------
If you'd like, I can (optionally) add a dev-only meta tag or helper that disables CSP in local dev for easier testing, or wire a server-side OAuth exchange flow. Tell me which approach you prefer.