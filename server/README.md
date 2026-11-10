# Running and deploying Career Navigator

For local use, run `node server/nova-local.cjs` and open http://127.0.0.1:8787/. Set `OPENAI_API_KEY` in the server environment to enable Nova. Use `NOVA_PORT` to choose a different port and `OPENAI_MODEL` to override the local model.

## Optional WordPress deployment

Use a dedicated HTTPS WordPress installation with PHP 8.1 or newer, mbstring and OpenSSL. Configure outbound WordPress mail for student verification and recovery. Create a published page with slug `career-navigator` and use pretty permalinks.

1. Run `python3 server/package.py v0.6.11 dist/v0.6.11` from the repository root.
2. Extract `public-runtime.zip` into `wp-content/career-navigator/releases/v0.6.11/`. Point the relative symlink `wp-content/career-navigator/current` to `releases/v0.6.11`.
3. Install the five `server/ignite-career-*.php` files in `wp-content/mu-plugins/`. Review the Academy navigation and CSP plugin against your WordPress theme before enabling them on a shared installation.
4. Check signup, verification email, password recovery, and sign-in using test students. Confirm private API responses bypass your proxy and CDN cache. Keep credentials outside the web root and configure callback access logs to omit OAuth query strings.

The standalone preview works without WordPress. Student accounts, synced workspace and Nova chat, staff beta feedback, and LinkedIn linking use the WordPress integration.

## Server configuration

| Feature | PHP environment settings |
|---|---|
| Nova | `OPENAI_API_KEY` or `ICN_NOVA_OPENAI_KEY_FILE` pointing to a server-readable file |
| Cloudflare Turnstile | `ICN_TURNSTILE_REQUIRED=1`, `ICN_TURNSTILE_SITE_KEY`, and `ICN_TURNSTILE_SECRET_KEY`. Alternatively, set `ICN_TURNSTILE_CREDENTIALS_FILE` to a restricted JSON file with `site_key` and `secret_key`. |
| LinkedIn OpenID Connect | `ICN_LINKEDIN_LINKING=1`, `ICN_LINKEDIN_CLIENT_ID`, and `ICN_LINKEDIN_CLIENT_SECRET`. Alternatively, leave `ICN_LINKEDIN_LINKING` unset and set `ICN_LINKEDIN_CREDENTIALS_FILE` to a restricted JSON file with `client_id` and `client_secret`. Register the callback `/career-navigator/linkedin/callback/` on your exact HTTPS origin. |

Restrict the Turnstile widget to the public hostname and allow `https://challenges.cloudflare.com` in the effective CSP for signup and password recovery. LinkedIn account linking uses OpenID Connect. Direct profile import is disabled. Students can import a LinkedIn profile ZIP or a Word résumé in the résumé workbench.

## Private data

Authenticated storage uses the verified student identity, same-origin JSON requests, WordPress session nonces, and revision checks. Account deletion removes the student’s workspace, Nova transcript, and submitted feedback from the active site. Backup retention is controlled by the operator. Students choose whether to save Nova chat across devices and whether to submit feedback to staff. Messages sent through Nova go to OpenAI with public page context. Treat backups as private and document these behaviors in the deployment’s privacy notice.
