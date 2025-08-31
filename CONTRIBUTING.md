Install node

```
fnm list
fnm install 24
fnm default 24
```

Create the repository
```
npx create-docusaurus@latest bare-metal-networking classic
```

Install mermaid
```
npm install --save @docusaurus/theme-mermaid
```

Configure mermaid
```typescript file=docusaurus.config.js
export default {
  markdown: {
    mermaid: true,
  },
  themes: ['@docusaurus/theme-mermaid'],
};
```


---

<<<<<<< HEAD
- [Configure Docusaurus to use Cloudflare Workers](https://developers.cloudflare.com/workers/framework-guides/web-apps/more-web-frameworks/docusaurus/) & [Pricing](https://developers.cloudflare.com/workers/platform/pricing/)
- [Configure Workers Builds](https://developers.cloudflare.com/workers/ci-cd/#workers-builds) & [Pricing](https://developers.cloudflare.com/workers/ci-cd/builds/limits-and-pricing/)
=======
# Running the Project

## Running Locally

1. **Prerequisites:** Install Node.js 24 or above. Install PNPM globally (`npm install -g pnpm`) if not already available.
2. **Clone the repository:** `git clone https://github.com/cassamajor/bare-metal-networking.git` (or your fork of it), then `cd ebpf.guide`.
3. **Install dependencies:** Run `pnpm install` to fetch all Docusaurus and project dependencies.
4. **Set environment variables:** Copy `.env.example` to `.env` and fill in any secrets (Algolia DocSearch `APP_ID` and `API_KEY`, Google Analytics `GTAG_TRACKING_ID`). If you leave them as defaults, search and analytics will be disabled but the site will still work.
5. **Start the dev server:** Run `pnpm run dev`. This will start Docusaurus on localhost (usually at `http://localhost:3000`).
6. **Open the site:** Navigate to `http://localhost:3000` in your browser. You should see the home page. Navigate around to ensure docs, labs, and blog pages render without errors.

During development, any changes you save to files (Markdown/MDX, components, etc.) will hot-reload in the browser.

## Building for Production

- **Build:** Run `pnpm run build`. This will generate a static site in the `build/` directory (HTML, JS, CSS, etc.).
- **Serve (for testing):** Run `pnpm run serve` to test the production build locally. Visit `http://localhost:3000` to verify everything looks correct.

## Deployment (Cloudflare Pages)

The site is ready to deploy on Cloudflare Pages:

**Using Cloudflare Pages (Git Integration):**
1. In Cloudflare Pages, create a new project connected to your GitHub repo.
2. Set the build command to `pnpm run build` and publish directory to `build`.
3. Configure environment variables in the Pages settings for `DOCSEARCH_APP_ID`, `DOCSEARCH_API_KEY`, and `GTAG_TRACKING_ID` (matching your `.env`).
4. Every push to the `main` branch will trigger Pages to build and deploy. Pull requests will get unique preview URLs automatically.

**Using GitHub Actions (as configured in this repo):**
1. Add repository secrets: `CLOUDFLARE_API_TOKEN` (an API token with Pages deployment permissions).
2. Add repository variables: `CLOUDFLARE_ACCOUNT_ID` and `CLOUDFLARE_PROJECT_NAME` corresponding to your Cloudflare Pages project.
3. Create two GitHub Environments in your repo: **production** and **preview** (the action expects these).
4. On pushing to `main`, the **Deploy to Cloudflare Pages** workflow will run. It builds the site and deploys to Cloudflare Pages using the credentials. For any pull request, it will deploy to a preview environment and comment with the preview URL.

Monitor the GitHub Actions logs for deployment status. On success, your site should be live on your Cloudflare Pages domain.

## Post-Deployment

- Test the live site (navigate through pages, try the search functionality).
- If Algolia DocSearch or Google Analytics keys were configured, ensure those features work (search bar should retrieve results, GA should start logging visits).
- The site is now ready for your users. Enjoy the course content, and feel free to continue enhancing it!
>>>>>>> a38475d (Add config changes and resolve errors)
