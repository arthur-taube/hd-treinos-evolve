## Plano: Configurar PWA instalável com ícones

O usuário enviou os 3 ícones necessários. Agora é só configurar.

### Etapa 1: Copiar ícones para `public/icons/`

- `apple-touch-icon.png` → `public/icons/apple-touch-icon.png`
- `icon-192x192.png` → `public/icons/icon-192x192.png`
- `icon-512x512.png` → `public/icons/icon-512x512.png`

### Etapa 2: Criar `public/manifest.json`

```json
{
  "name": "HD Treinos",
  "short_name": "HD Treinos",
  "start_url": "/",
  "display": "standalone",
  "background_color": "#1a1a2e",
  "theme_color": "#1a1a2e",
  "icons": [
    { "src": "/icons/icon-192x192.png", "sizes": "192x192", "type": "image/png" },
    { "src": "/icons/icon-512x512.png", "sizes": "512x512", "type": "image/png" },
    { "src": "/icons/icon-512x512.png", "sizes": "512x512", "type": "image/png", "purpose": "maskable" }
  ]
}
```

### Etapa 3: Atualizar `index.html`

Adicionar no `<head>`:

```html
<link rel="manifest" href="/manifest.json">
<meta name="theme-color" content="#1a1a2e">
<meta name="apple-mobile-web-app-capable" content="yes">
<meta name="apple-mobile-web-app-status-bar-style" content="black-translucent">
<link rel="apple-touch-icon" href="/icons/apple-touch-icon.png">
```

### Nota

Sem service worker -- apenas manifest + meta tags. Isso permite instalação e aparência nativa (sem barra do browser) sem riscos de cache no preview. As funcionalidades PWA só funcionam no app publicado/deployed, não no preview do Lovable.

### Arquivos


| Arquivo                | Ação                    |
| ---------------------- | ----------------------- |
| `public/icons/*.png`   | Copiar 3 ícones         |
| `public/manifest.json` | Criar                   |
| `index.html`           | Adicionar meta tags PWA |
