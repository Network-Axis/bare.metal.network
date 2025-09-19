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

- [Configure Docusaurus to use Cloudflare Workers](https://developers.cloudflare.com/workers/framework-guides/web-apps/more-web-frameworks/docusaurus/) & [Pricing](https://developers.cloudflare.com/workers/platform/pricing/)
- [Configure Workers Builds](https://developers.cloudflare.com/workers/ci-cd/#workers-builds) & [Pricing](https://developers.cloudflare.com/workers/ci-cd/builds/limits-and-pricing/)

---

# Local Workflow
```
npm build
npm serve
```

```
npm start
```

```
npm preview
```

```
npm deploy
```