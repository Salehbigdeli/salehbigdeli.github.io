# salehbigdeli.github.io

Source for a static blog, built with [Eleventy](https://www.11ty.dev/) from Markdown in `src/posts/`. You do not edit raw HTML for articles.

## Prerequisities

- Node 20+ (`nvm use` if you use nvm; see `.nvmrc`)

## Local development

```bash
npm install
npm run serve
```

Open the URL Eleventy prints (usually [http://localhost:8080](http://localhost:8080)). Edits to Markdown and templates reload automatically.

## Production build

```bash
npm run build
```

The generated site is written to `_site/`.

## Writing a new post

1. Copy `src/_templates/post-starter.md` to `src/posts/your-slug.md` (kebab-case; it becomes `/posts/your-slug/`).
2. Set `title`, `description`, `date`, `category`, and `postTags` in the YAML front matter.
3. Write the body in Markdown. Use fenced code blocks with a language, for example:

   ````markdown
   ```rust
   fn main() {
       println!("Hello");
   }
   ```
   ````

4. Rebuild (or use `npm run serve`). The home page, categories, tags, and `feed.xml` update from your front matter and collection order.

## GitHub Pages

This repository uses [GitHub Actions](https://docs.github.com/en/pages/getting-started-with-github-pages/configuring-a-publishing-source-for-your-github-pages-site#publishing-with-a-custom-github-actions-workflow) to build and deploy.

1. In the repository **Settings → Pages**, set **Build and deployment** → **Source** to **GitHub Actions** (not “Deploy from a branch”).
2. Push to `main`. The workflow in `.github/workflows/pages.yml` runs `npm run build` and publishes `_site/`.

## Project layout (short)

- `src/posts/` — one Markdown file per post (primary author surface).
- `src/posts/posts.11tydata.js` — shared defaults for all posts (layout, URL shape, `post` tag).
- `src/_includes/` — HTML layouts (Nunjucks).
- `src/css/` — site stylesheet, copied to output as-is.
- `src/feed.njk` — RSS feed at `/feed.xml`.
- `.eleventy.js` — Eleventy config (syntax highlighting, collections, URL shape).

The published site is the contents of `_site/` after `npm run build`. Hand-written HTML at the repo root was removed in favor of Markdown sources and layouts.

Do not commit `_site/` or `node_modules/` (see `.gitignore`); CI builds a fresh site on each push.


