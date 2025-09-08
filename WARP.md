# WARP.md

This file provides guidance to WARP (warp.dev) when working with code in this repository.

Repository purpose and stack
- Static site (HTML/CSS/JS) with client-side partials for header and footer
- No package manager or build system; development is done by serving the folder over HTTP

Common commands
- Serve locally (avoid file:// to allow fetch of partials per README):
```bash path=null start=null
python3 -m http.server 8080
```
  - Then open http://localhost:8080/
- Reproduce the GitHub Pages "build" artifact (mirrors pages.yml excluding large media):
```bash path=null start=null
rsync -a --delete \
  --exclude 'media/**' \
  --exclude 'uploads/**' \
  ./ ./_site/
```
- Tests and lint: none configured in this repo

Architecture overview
- Pages and partials
  - Top-level pages: index.html, gallery.html, contact.html (plus 404.html)
  - Each page includes empty tags that are hydrated at runtime:
    - <header data-include="partials/header.html"></header>
    - <footer data-include="partials/footer.html"></footer>
  - partials/includes.js fetches and injects these partials using fetch with no-cache, and sets the active nav item via a pathname→key map
    - To add a page to the nav highlight logic, add a link with data-active="{key}" in partials/header.html and extend the map in partials/includes.js
- Client logic in partials/includes.js
  - Partials injector: injectPartial(el, url) fetches and sets innerHTML with error fallback markup; setActiveNav() maps current path to a data-active key and applies .active and aria-current
  - Pausable animated images: overlays a canvas snapshot on top of any .image-container img, .placeholder-image img, or .modal-img to simulate pause; accessible via role="button", tabindex, Space/Enter; click-to-toggle is disabled for grid images to avoid clashing with the gallery modal, but enabled for placeholders and the modal image
    - Public API exposed at window.PausableImages: pause, resume, toggle, enhance
  - Home background rotator: only runs on the home page; alternates between two fixed-position layers (.bg-a, .bg-b) with randomized transition effects; honors prefers-reduced-motion; preloads next image and falls back on errors
    - Image list is hard-coded under images = [ 'media/…' ]
    - Effects are realized via CSS classes fx-*, with per-transition CSS variables (e.g., --tiltY, --shiftX) set on the fly
- Styling (styles.css)
  - Global variables, typography, and accessibility helpers (skip-link, focus-visible)
  - Header/footer layout, sticky header, nav active state, responsive adjustments
  - Gallery: masonry via CSS columns; .image-container drives object-fit: cover; modal styles for image zoom viewer
  - Background rotator effects: .bg-rotator with two layers (.bg-a/.bg-b); effect classes fx-fade, fx-zoom-in/out, fx-slide-*, fx-blur, fx-rotate, fx-carousell, fx-carousell-vertical
  - Backdrop utilities (.backdrop, .backdrop--blur, .backdrop--tight) to maintain text readability over imagery; reduced-motion support
- Page-embedded modal scripts
  - index.html and gallery.html include inline scripts for an image modal viewer (open on grid image click, close with Escape, click-outside, or close button)

Deployment workflows (GitHub Actions)
- .github/workflows/pages.yml
  - Builds a _site artifact that excludes media/ and uploads/, then deploys to GitHub Pages on push to main or manual dispatch
  - Use the rsync command above to preview the artifact locally
- .github/workflows/static.yml
  - Simpler Pages deploy that uploads the entire repository as the artifact
- .github/workflows/deploy-cpanel-sftp.yml
  - Deploys the repository (root) to cPanel via FTPS into ./public_html/
  - Excludes: .git*, .github/**, .cpanel.yml, media/**, uploads/**
  - Requires repository secrets: FTP_SERVER, FTP_USERNAME, SFTP_PASSWORD

Notes from README
- Because partials are fetched at runtime, serving via file:// may fail due to CORS; use a local HTTP server instead (see command above)
- To add a new page and highlight its nav item, extend partials/header.html and the map in partials/includes.js

Extension points and gotchas
- Adding navigation entries: update both partials/header.html (add <a data-active="…">) and the pathname→key map in partials/includes.js
- Background rotator assets: images are referenced from media/; the Pages workflow that excludes media/ is best for light-weight previews, whereas cPanel deploy is suited for the full site with assets
- Gallery modal vs. pausable images: click-to-pause is intentionally disabled for grid images to avoid conflicting with the modal open-on-click behavior; keyboard toggle remains available

