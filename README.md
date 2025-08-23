# Partials for header and footer

This site now uses shared partials loaded client-side for the header and footer.

Edit these files to change header/footer globally:
- partials/header.html
- partials/footer.html

How it works
- Each page contains empty tags:
  <header data-include="partials/header.html"></header>
  <footer data-include="partials/footer.html"></footer>
- partials/includes.js fetches and injects the partial HTML at load time and sets the active nav link based on the current page.

Notes
- Works when served via HTTP(S). If opening files directly via file:// in some browsers, fetch() may be blocked by CORS. Use a local server:
  python3 -m http.server 8080
- To add a new page and highlight its nav item, add data-active="{key}" on the relevant <a> in header.html and extend the map in partials/includes.js.

