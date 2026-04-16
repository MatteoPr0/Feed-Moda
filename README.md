# Feed Moda — PWA discovery

Per vedere subito il frontend in locale:

```bash
python3 -m http.server 5173
```

Poi apri nel browser:

- http://localhost:5173

## Cosa vedrai

- Home discovery in stile Android 16/17 (dark glassmorphism)
- Feed dinamico con ranking per gusto moda/design
- Feed **live** da RSS reali con fallback multi-endpoint (diretto + proxy CORS)
- Modalità focus e install prompt PWA
- Fallback editoriale offline se le fonti RSS non rispondono

## Miglior modo per vederla su GitHub

Il modo migliore è **GitHub Pages con deploy automatico da GitHub Actions**.

1. Vai in **Settings → Pages** e in **Source** scegli **GitHub Actions**.
2. Fai merge su `main` (o lancia il workflow manualmente da **Actions**).
3. Dopo il deploy, l'app sarà disponibile su:
   - `https://<tuo-username>.github.io/<nome-repo>/`

> In questo repository è già presente il workflow `.github/workflows/deploy-pages.yml`.
