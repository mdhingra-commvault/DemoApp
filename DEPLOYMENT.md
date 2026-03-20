# Deploying to Vercel

## Prerequisites

- [Node.js](https://nodejs.org/) (v18 or later)
- A [Vercel](https://vercel.com/) account (free tier works)
- A [GitHub](https://github.com/) or [GitLab](https://gitlab.com/) account
- [Git](https://git-scm.com/) installed on your machine

---

## Option A: Deploy via Vercel Dashboard (Recommended)

### Step 1: Push your project to GitHub

1. Create a new repository on GitHub (do **not** initialize with README).

2. Open a terminal in the project folder and run:

   ```bash
   git init
   git add .
   git commit -m "Initial commit"
   git branch -M main
   git remote add origin https://github.com/<your-username>/<your-repo>.git
   git push -u origin main
   ```

3. Make sure `node_modules` and `dist` are in your `.gitignore`:

   ```
   node_modules
   dist
   ```

### Step 2: Import project in Vercel

1. Go to [vercel.com/new](https://vercel.com/new).
2. Click **"Import Project"** and select your GitHub repository.
3. Vercel will auto-detect the framework as **Vite**.

### Step 3: Configure build settings

Vercel should auto-fill these, but verify they are correct:

| Setting          | Value            |
| ---------------- | ---------------- |
| Framework Preset | Vite             |
| Build Command    | `npm run build`  |
| Output Directory | `dist`           |
| Install Command  | `npm install`    |

### Step 4: Deploy

1. Click **"Deploy"**.
2. Wait for the build to complete (usually under 1 minute).
3. Vercel will give you a live URL like `https://your-project.vercel.app`.

### Automatic Redeployments

Every time you push to `main`, Vercel will automatically rebuild and redeploy your app.

---

## Option B: Deploy via Vercel CLI

### Step 1: Install the Vercel CLI

```bash
npm install -g vercel
```

### Step 2: Log in

```bash
vercel login
```

Follow the prompts to authenticate with your Vercel account.

### Step 3: Deploy (preview)

From the project root folder, run:

```bash
vercel
```

- When prompted for project settings, accept the defaults (Vercel auto-detects Vite).
- This creates a **preview deployment** with a unique URL.

### Step 4: Deploy to production

```bash
vercel --prod
```

This publishes to your production URL.

---

## Notes

- **No environment variables** are needed for this app.
- The `vite.config.js` uses a standard setup — no `base` path changes are required.
- If you add environment variables later, prefix them with `VITE_` so Vite exposes them to the client (e.g., `VITE_API_URL`).

---

## Troubleshooting

| Issue                        | Solution                                                                 |
| ---------------------------- | ------------------------------------------------------------------------ |
| Build fails                  | Run `npm run build` locally first to check for errors                    |
| Blank page after deploy      | Ensure `index.html` is in the project root (not inside `src`)            |
| Styles missing               | Verify `tailwindcss` and `postcss` are in `devDependencies`             |
| Page not found on refresh    | Add a `vercel.json` with rewrites (see below)                            |

If you encounter 404 errors on page refresh (for single-page apps with client-side routing), create a `vercel.json` in the project root:

```json
{
  "rewrites": [
    { "source": "/(.*)", "destination": "/index.html" }
  ]
}
```
