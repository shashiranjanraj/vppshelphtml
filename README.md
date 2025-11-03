# Vivahit Pidit Sangh (VPS) Website

A modern, responsive static website for VPS supporting men experiencing domestic and marital abuse.

Pages:
- Home (`index.html`)
- Stories (`stories.html`) – anonymous submission stored locally in the browser
- Contact (`contact.html`) – hotline, email, and session request modal
- About (`about.html`) – mission and approach
- Team (`team.html`) – 5-6 member profiles

## Run locally

Open any file directly in a browser, or serve the folder:

```bash
# macOS
python3 -m http.server 8080
# then visit http://localhost:8080
```

## Customize
- Hotline: search for `+1 (800) 123-4567` and update.
- Email: search for `help@menssupport.org` and update.
- Team profiles: edit `team.html` with your members.
- Colors/fonts: edit `assets/css/styles.css` and Google Fonts link in `<head>`.

Images are referenced from Unsplash and load at runtime.

## Notes
- Anonymous stories are stored in `localStorage` on the same device/browser.
- No backend is included. If you want real submissions, we can connect a server or a serverless form.

