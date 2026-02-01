# Deploy CaptainNews to Cloudflare Workers

The whole site (HTML, JS, CSS, icons) and `/news.json` run on a single Cloudflare Worker. News data is cached in KV and refreshed every 15 minutes by a cron trigger.

## Prerequisites

- [Node.js](https://nodejs.org/) (v18+)
- [Wrangler](https://developers.cloudflare.com/workers/wrangler/install-and-update/) CLI
- Cloudflare account

## 1. Install Wrangler

```bash
npm install -g wrangler
# or
pnpm add -g wrangler
```

## 2. Login

```bash
wrangler login
```

## 3. Create KV namespace

```bash
wrangler kv namespace create NEWS_KV
```

Copy the **id** from the output (e.g. `abc123def456...`) and put it in `wrangler.toml`:

```toml
kv_namespaces = [
  { binding = "NEWS_KV", id = "YOUR_ACTUAL_KV_ID" }
]
```

## 4. Prepare static assets

All static files must be in `public/`:

- `public/index.html`, `public/contact.html`, `public/policy.html`
- `public/js/`, `public/icons/`, `public/src/`
- `public/manifest.json`

They are already copied there. If you add or change pages, copy them into `public/` before deploying.

## 5. Deploy

```bash
wrangler deploy
```

Or:

```bash
npm run deploy:cloudflare
```

After deploy you get a URL like `https://captainnews.<your-subdomain>.workers.dev`.

## 6. Custom domain (optional)

In Cloudflare Dashboard: Workers & Pages → your worker → Settings → Domains → Add custom domain (e.g. `captainnews.gr`).

## Behavior

- **`/`** → serves `index.html`
- **`/news.json`** → served from KV (cached); if KV is empty, the Worker builds news once and stores it
- **Cron `*/15 * * * *`** → every 15 minutes the Worker fetches RSS feeds, builds the same JSON as `news.json`, and writes it to KV
- All other paths (`/contact.html`, `/policy.html`, `/js/main.js`, `/icons/...`, etc.) → served from `public/` (Assets)

## Frontend and news.json

The site’s `main.js` fetches `news.json` with an optional base path (`window.NEWS_JSON_BASE`). When the site is served from the Worker at the root, `fetch('news.json')` or `fetch('/news.json')` works. No change needed if you use root-relative or same-origin paths.

## Limits

- Free tier: 100,000 requests/day, KV reads/writes included
- Cron: 1 execution per 15 minutes
- Adjust `RSS_FEEDS` and parsing in `worker.js` if you add/change feeds

## Troubleshooting

**Site returns 500 or "Worker error"**
- Open your Worker in Cloudflare Dashboard → Workers & Pages → your worker → Logs (Real-time). Reproduce the request and check the error message.
- If you see **"ASSETS binding missing"**: Wrangler may not have uploaded assets. Use a recent Wrangler: `npm i -g wrangler` and run `wrangler deploy` again. Ensure `public/` exists and contains `index.html`, `js/`, `icons/`, etc.
- If you see **"NEWS_KV is undefined"** or KV errors: Create the KV namespace with `wrangler kv namespace create NEWS_KV` and put the returned **id** in `wrangler.toml` under `kv_namespaces[0].id`, then redeploy.

**Page loads but news don’t appear**
- Open DevTools → Network. Check the request to `news.json`. If it returns 503, the body will include an error (e.g. `buildNewsData failed`). First load builds news and can take 10–20 seconds; if it times out, wait for the cron to run (every 5 min) then refresh.
- In Dashboard → KV → your namespace, check if key `news` exists. If not, trigger the cron once (Workers & Pages → your worker → Triggers → Cron → Run) or visit `/news.json` and wait.

**Wrangler version**
- Use Wrangler 3.x for `[assets]` support. Check with `wrangler --version`. Upgrade: `npm i -g wrangler`.
