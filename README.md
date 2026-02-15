# BTOW

Self-host your own link-in-bio for free.

## Self-Host in 5 Minutes

1. Clone the repository
2. Run `docker compose up -d`
3. Configure your links in `data/links.json`
4. Deploy to any host (Railway, Fly.io, VPS, etc.)

## Generating Secrets

Generate a secure secret for your environment:

```bash
openssl rand -base64 32
```

## Stack

| Component | Technology |
|-----------|------------|
| Frontend | React + Vite |
| Backend | Go + Gin |
| Database | SQLite |
| Auth | JWT |

## Ports

| Service | Port |
|---------|------|
| Frontend | 5173 |
| Backend | 8080 |
