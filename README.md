# NXOR-SITE
streetware site 

## Quick start

This repo contains a minimal static site for NXOR.

- Open `index.html` in a Live Preview or any static server.
- Edit `style.css` for look and feel.

### Preview locally (VS Code)
- Right-click `index.html` → "Open with Live Server" (if you use the extension), or use the built-in Simple Browser.

### Preview locally (terminal)
Use any static server. For example, with Python installed:

```bash
python3 -m http.server 8080
```

Then visit http://localhost:8080

## Files
- `index.html` – Static layout and content
- `style.css` – Brutalist black/white styling

## Assets
Place these in the repo root next to `index.html`:

- `NXOR-logo.png` – the black spiky NXOR PNG
- `feature1.jpg`, `feature2.jpg`, `feature3.jpg`, `feature4.jpg` – large feature collection images (500x500px minimum, arranged in 2x2 grid)
- `product1.jpg`, `product2.jpg`, ... – dark, minimal product images

## Next steps
- Add more product cards in `index.html`
- Convert to React + Vite
- Hook up cart/checkout logic
