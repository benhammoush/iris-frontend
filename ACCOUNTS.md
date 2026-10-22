# Iris accounts — WL-2

Frontend 1.24.0 introduced the account page at `/account` and an authenticated
Worker transport. Accounts are **disabled by default**. Public browsing does not
require sign-in. Frontend 1.25.0 adds the [private watchlist UI](./WATCHLISTS.md).
Account deletion and hosted-auth acceptance remain WL-4–5/WL-O1 work.

The accepted requirements and private API belong to the
[backend watchlist specification](https://github.com/benhammoush/iris-backend/blob/33148b9d25a31393b5e780b42950e8cfbf449a09/WATCHLISTS.md).
The implemented backend contract was published by backend PR #13. Existing public
generated types and the remote vertical-CI Worker pin are unchanged by WL-2.

## Behavior

- Google popup sign-in and email/password sign-up/sign-in use the Firebase Web
  SDK. Signup requests a verification email. Unverified users can resend it and
  refresh their account status. Password reset uses Firebase's email flow and a
  generic response, without claiming delivery or revealing account existence.
- Explicit Google/password linking reauthenticates the current Firebase user.
  Credential conflicts never trigger account merging, data migration or an
  automatic sign-in with a different provider. Google links require the current
  password; adding a password requires Google reauthentication and uses the
  signed-in user's email. No unlink or email-change UI is included.
- Browser-local SDK persistence keeps users signed in until sign-out. Iris does
  not copy tokens into its own storage or send passwords to the Worker. Private
  view state is cleared and in-flight private requests cancelled on auth changes
  and sign-out. Failed SDK sign-out leaves the private session locked and exposes
  a retry; it must not be presented as successful sign-out on a shared device.
- Authentication and provider linking are serialized by the session, including
  across page navigation. Sign-out clears the private view immediately but waits
  for pending authentication before clearing SDK persistence. Finish or close any
  outstanding sign-in popup and let sign-out complete before leaving a shared device.
- No login/linking/verification operation saves a reference. Private list reads
  occur only while an eligible watchlist page/control is active.
  `authenticatedRequest` obtains a Firebase ID token
  per call, restricts destinations to this environment's Worker watchlist routes,
  omits cookies, disallows redirects and caching, bounds the token/network wait,
  and discards results from an obsolete identity. It never retries mutations.
  Revoked credentials and Worker 401 responses clear the private session.
- Private requests use HTTPS; only localhost/loopback HTTP is allowed by a dev
  build. Public requests remain on the existing anonymous transport. Endpoint
  payloads are validated by watchlist normalizers; generated types do not replace
  runtime validation.

## Environment setup is separate

To prepare a separately approved isolated environment, the frontend build needs
`VITE_ENABLE_ACCOUNTS=true` plus its public Firebase web app configuration:
`VITE_FIREBASE_API_KEY`, `VITE_FIREBASE_AUTH_DOMAIN`, `VITE_FIREBASE_PROJECT_ID`
and `VITE_FIREBASE_APP_ID`. Missing configuration keeps accounts unavailable
without breaking public routes. Disabled builds do not initialize Firebase.
These are public web settings, never service credentials. The project must match
the selected Worker's Firebase audience. No admin private key, provider key or
Firebase service-account JSON may enter Vite variables.

Before hosted activation, configure the isolated Firebase providers, authorized
frontend domains, verification/reset templates and approved return URLs. Verify
real Google popup behavior on mobile/Safari and Firebase's documented
email/password-linking limitation in that project. Do not silently replace popup
with a redirect flow: redirects need separate Vercel/auth-domain compatibility
setup. Popup cancellation/blocking currently has explicit retry guidance.
Production and dev must use separate Firebase projects, and production still
needs separate approval. No hosted resources, remote variables or pins were changed.

The application imports only `firebase/app` and `firebase/auth`, and loads the SDK
only when accounts are enabled. The Firebase umbrella package also installs
unused Firestore dependencies. Its current grpc-js 1.9 constraint produces
GHSA-m9gg-hp2v-232j; a narrow Firestore-only override pins grpc-js 1.14.6 to keep
full and production-only audits clean. Firestore is not initialized or bundled.
Reassess that override when Firebase updates its dependency range.

## Checks and limits

Unit tests cover SDK persistence/reauthentication, conflicts without merging,
verification/reset UI, late authentication versus sign-out, sign-out failure,
private-origin/path restrictions,
credential expiry and stale token/response cancellation across accounts.
The browser account test uses the real Firebase Web SDK with intercepted REST
responses and synthetic credentials; unexpected external requests are aborted.
It exercises signup, verification refresh, persistent reload, sign-out, reset,
sign-in and mobile dark layout. It creates no real accounts or emails.

Mocked SDK and REST tests do not prove hosted OAuth, email delivery, Firebase
project configuration, IAM, real revocation, cross-device sync or deletion.
Those remain acceptance gates; no frontend feature flag enables the backend or
bypasses its authentication checks. See [ENVIRONMENTS.md](./ENVIRONMENTS.md) for
release policy and the owning backend specification for lifecycle requirements.

Official documentation checked during WL-2 (Context7 quota was exhausted):
[web setup](https://firebase.google.com/docs/auth/web/start),
[persistence](https://firebase.google.com/docs/auth/web/auth-state-persistence),
[Google sign-in](https://firebase.google.com/docs/auth/web/google-signin),
[account linking](https://firebase.google.com/docs/auth/web/account-linking) and
[user/email management](https://firebase.google.com/docs/auth/web/manage-users).
