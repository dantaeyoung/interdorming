# Deployment Guide

## The MIME Type Error

The error you're seeing:
```
Failed to load module script: Expected a JavaScript module script but the server responded with a MIME type of "text/vnd.trolltech.linguist"
```

This occurs when the deployment server doesn't recognize `.js` files and serves them with an incorrect MIME type.

## Solutions

### Solution 1: Use Netlify or Vercel (Recommended)

The project now includes configuration files for popular hosting platforms:

- **Netlify**: Uses `netlify.toml` (already configured)
- **Vercel**: Uses `vercel.json` (already configured)

Simply deploy to these platforms and they will automatically use the correct configuration.

### Solution 2: Apache Server

If deploying to an Apache server, the `.htaccess` file in the `dist` folder will configure the correct MIME types.

Make sure your Apache server has `mod_rewrite` and `mod_headers` enabled:
```bash
sudo a2enmod rewrite
sudo a2enmod headers
sudo systemctl restart apache2
```

### Solution 3: Nginx Server

If using Nginx, add this to your server configuration:

```nginx
server {
    listen 80;
    server_name your-domain.com;
    root /path/to/dist;
    index index.html;

    # Correct MIME types
    types {
        application/javascript js;
        text/css css;
        application/json json;
    }

    # SPA routing
    location / {
        try_files $uri $uri/ /index.html;
    }
}
```

### Solution 4: Static File Hosting (GitHub Pages, etc.)

The `_headers` file in the `dist` folder provides configuration for static hosting platforms that support it.

## Build and Deploy

1. **Build the project:**
   ```bash
   npm run build
   ```

2. **Deploy the `dist` folder** to your hosting platform

3. **Verify** that your server serves:
   - `.js` files as `application/javascript`
   - `.css` files as `text/css`
   - `.json` files as `application/json`

## Testing Locally

To test the production build locally:
```bash
npm run preview
```

This will serve the built `dist` folder on http://localhost:4173

## Troubleshooting

If the error persists after deployment:

1. **Check server MIME types**: Use browser DevTools Network tab to verify the Content-Type header
2. **Clear browser cache**: The old incorrect MIME type might be cached
3. **Contact hosting support**: Ask them to ensure `.js` files are served with `application/javascript` MIME type

## Configuration Files Included

- `netlify.toml` - Netlify configuration
- `vercel.json` - Vercel configuration
- `public/.htaccess` - Apache server configuration
- `public/_headers` - Static hosting headers
- `vite.config.ts` - Vite build configuration with proper headers
