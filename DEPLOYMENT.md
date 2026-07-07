# Manava Production Deployment Guide

**Target Domain**: `andikastudio.online`  
**Deployment Method**: Docker + Cloudflare Tunnel  
**Last Updated**: 2026-07-07

---

## 🔒 Security Fixes Applied

### Critical Issues Fixed (July 2026)
- ✅ **Prisma Studio disabled in production** — removed from Dockerfile CMD
- ✅ **Database port no longer exposed** — only accessible via internal Docker network
- ✅ **Security headers added** — HSTS, X-Frame-Options, CSP, etc. in nginx.conf
- ✅ **Prisma Studio port removed** — port 5555 not exposed in docker-compose.yml

---

## 📋 Pre-Deployment Checklist

### 1. Generate Secure Secrets

Run this script to generate production secrets:

```bash
#!/bin/bash
# generate-secrets.sh

echo "🔐 Generating production secrets..."
echo ""
echo "POSTGRES_PASSWORD=$(openssl rand -base64 32)"
echo "JWT_ACCESS_SECRET=$(openssl rand -base64 32)"
echo "JWT_REFRESH_SECRET=$(openssl rand -base64 32)"
echo ""
echo "⚠️  Save these to your .env file immediately!"
```

### 2. Create Production `.env`

```bash
# Copy template
cp .env.production.example .env

# Edit with your secrets
nano .env
```

**Required variables:**
- `POSTGRES_PASSWORD` — from generate-secrets.sh
- `JWT_ACCESS_SECRET` — from generate-secrets.sh (min 32 chars)
- `JWT_REFRESH_SECRET` — from generate-secrets.sh (min 32 chars)
- `CORS_ORIGIN=https://andikastudio.online`
- `APP_URL=https://andikastudio.online`
- `VITE_API_BASE_URL=https://api.andikastudio.online`

**Optional but recommended:**
- `SMTP_*` — for email notifications (Gmail app password recommended)
- `OPENAI_API_KEY` — for AI-powered CV screening & KPI insights

### 3. Verify `.env` is Gitignored

```bash
# Should return ".env" — never commit this file
grep "^\.env$" .gitignore
```

### 4. Test Build Locally

```bash
# Build all containers
docker compose build

# Verify no errors
docker compose config
```

---

## 🚀 Cloudflare Tunnel Setup

### Step 1: Install Cloudflared

```bash
# macOS
brew install cloudflare/cloudflare/cloudflared

# Linux
wget -q https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-linux-amd64.deb
sudo dpkg -i cloudflared-linux-amd64.deb
```

### Step 2: Authenticate with Cloudflare

```bash
cloudflared tunnel login
```

This opens a browser to authorize. Select **andikastudio.online** domain.

### Step 3: Create Tunnel

```bash
# Create tunnel named "manava-prod"
cloudflared tunnel create manava-prod

# Note the Tunnel ID from output (save this!)
```

### Step 4: Configure DNS

Add CNAME records in Cloudflare dashboard:

```
andikastudio.online        CNAME   <tunnel-id>.cfargotunnel.com
api.andikastudio.online    CNAME   <tunnel-id>.cfargotunnel.com
```

### Step 5: Create Tunnel Config

Create `~/.cloudflared/config.yml`:

```yaml
tunnel: <your-tunnel-id>
credentials-file: /Users/andika/.cloudflared/<your-tunnel-id>.json

ingress:
  # Frontend (SPA)
  - hostname: andikastudio.online
    service: http://localhost:80
    originRequest:
      noTLSVerify: true

  # API Backend
  - hostname: api.andikastudio.online
    service: http://localhost:4000
    originRequest:
      noTLSVerify: true

  # Catch-all (404)
  - service: http_status:404
```

### Step 6: Start Services

```bash
# Terminal 1: Start Docker containers
docker compose up -d

# Wait for health checks to pass
docker compose ps

# Terminal 2: Start Cloudflare Tunnel
cloudflared tunnel run manava-prod
```

### Step 7: Verify Deployment

```bash
# Check frontend
curl -I https://andikastudio.online

# Check API health
curl https://api.andikastudio.online/api/v1/health

# Should return:
# {"success":true,"data":{"status":"ok","env":"production","ts":"2026-07-07T..."}}
```

---

## 🔐 Production Security Hardening

### Environment Variables Validation

The API enforces these at boot (via Zod schema):

| Variable | Validation | Production Value |
|----------|-----------|------------------|
| `NODE_ENV` | enum: development/production/test | **production** |
| `JWT_ACCESS_SECRET` | min 24 chars (recommend 32+) | ✅ Random base64 |
| `JWT_REFRESH_SECRET` | min 24 chars (recommend 32+) | ✅ Random base64 |
| `POSTGRES_PASSWORD` | required | ✅ Random base64 |
| `CORS_ORIGIN` | string | `https://andikastudio.online` |
| `BCRYPT_ROUNDS` | 4-15 (recommend 10-12) | **12** |

### Nginx Security Headers (Applied)

```
Strict-Transport-Security: max-age=31536000; includeSubDomains; preload
X-Content-Type-Options: nosniff
X-Frame-Options: DENY
Referrer-Policy: strict-origin-when-cross-origin
Permissions-Policy: camera=(), microphone=(), geolocation=()
X-XSS-Protection: 1; mode=block
```

### Rate Limiting (Applied)

- **Auth endpoints** (`/api/v1/auth/*`): 5 requests / 15 min per IP
- **Public apply** (`/api/v1/applications/apply`): 3 requests / hour per IP

### Network Security

- **Database**: NOT exposed to public internet (internal Docker network only)
- **Prisma Studio**: Disabled in production
- **API**: Only exposed via Cloudflare Tunnel (HTTPS enforced)
- **Frontend**: Only exposed via Cloudflare Tunnel (HTTPS enforced)

---

## 🗄️ Database Management

### Backup Strategy

```bash
# Manual backup
docker exec database pg_dump -U manava manava > backup-$(date +%Y%m%d-%H%M%S).sql

# Restore from backup
docker exec -i database psql -U manava manava < backup-20260707-153000.sql
```

### Automated Backups (Recommended)

Add to crontab:

```bash
# Daily backup at 2 AM
0 2 * * * cd /path/to/manava && docker exec database pg_dump -U manava manava | gzip > backups/daily-$(date +\%Y\%m\%d).sql.gz

# Keep last 7 days
0 3 * * * find /path/to/manava/backups -name "daily-*.sql.gz" -mtime +7 -delete
```

### Accessing Database (Emergency Only)

```bash
# Connect to database container
docker exec -it database psql -U manava -d manava

# Or use pgAdmin/TablePlus with SSH tunnel
ssh -L 5432:localhost:5432 user@your-server
```

⚠️ **Never expose database port publicly in production.**

---

## 📊 Monitoring & Logs

### Docker Logs

```bash
# All services
docker compose logs -f

# Specific service
docker compose logs -f api
docker compose logs -f frontend
docker compose logs -f postgres
```

### Health Checks

```bash
# API health endpoint
curl https://api.andikastudio.online/api/v1/health

# Docker container health
docker compose ps
```

### Error Monitoring (Recommended)

Set up external monitoring:
- **Uptime**: UptimeRobot (free tier covers this)
- **Error tracking**: Sentry (optional, requires integration)
- **Log aggregation**: Papertrail or Logtail (optional)

---

## 🔄 Updating Production

### Rolling Update Strategy

```bash
# Pull latest code
git pull origin main

# Rebuild containers (zero-downtime with depends_on)
docker compose up -d --build

# Verify health
curl https://api.andikastudio.online/api/v1/health
```

### Database Migrations

Migrations run automatically via Dockerfile CMD:

```dockerfile
CMD ["sh", "-c", "npx prisma migrate deploy && node dist/index.js"]
```

⚠️ **Always backup before migrating:**

```bash
# Backup first
docker exec database pg_dump -U manava manava > pre-migration-backup.sql

# Then deploy
docker compose up -d --build api
```

---

## 🚨 Incident Response

### API Down

```bash
# Check container status
docker compose ps

# Check logs
docker compose logs api --tail=100

# Restart if needed
docker compose restart api
```

### Database Connection Issues

```bash
# Check Postgres health
docker compose ps postgres

# Check connection from API
docker exec backend wget -qO- http://localhost:4000/api/v1/health

# Restart database (last resort)
docker compose restart postgres
```

### Cloudflare Tunnel Down

```bash
# Check tunnel status
cloudflared tunnel info manava-prod

# Restart tunnel
pkill cloudflared
cloudflared tunnel run manava-prod
```

---

## 📝 Post-Deployment Verification

After first deployment, verify:

- [ ] Frontend loads at `https://andikastudio.online`
- [ ] API health returns 200 at `https://api.andikastudio.online/api/v1/health`
- [ ] Login works (test with seed account or create new)
- [ ] Database persists after container restart
- [ ] Security headers present (check with `curl -I`)
- [ ] Rate limiting active (test auth endpoint spam)
- [ ] HTTPS enforced (HTTP redirects to HTTPS via Cloudflare)
- [ ] Email sending works (if SMTP configured)
- [ ] Backups scheduled (if using cron)

---

## 🔗 Useful Commands

```bash
# Quick health check
curl -s https://api.andikastudio.online/api/v1/health | jq

# Watch logs live
docker compose logs -f --tail=50

# Restart all services
docker compose restart

# Stop all services
docker compose down

# Nuclear option: stop + remove volumes (DELETES DATA)
docker compose down -v

# Check disk usage
docker system df

# Prune unused images/containers
docker system prune -a
```

---

## 📞 Support & Troubleshooting

- **Logs**: Always check `docker compose logs` first
- **Health endpoint**: `https://api.andikastudio.online/api/v1/health`
- **Cloudflare dashboard**: Check tunnel status, DNS, SSL/TLS mode
- **Database backup**: Daily backups in `./backups/` (if configured)

**Common Issues:**

1. **502 Bad Gateway** → API container crashed or not healthy
2. **CORS errors** → Check `CORS_ORIGIN` matches actual domain
3. **JWT errors** → Check secrets are consistent across container restarts
4. **DB connection refused** → Check `DATABASE_URL` and Postgres health
