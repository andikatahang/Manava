# 🚀 Production Deployment Checklist

**Project**: Manava ERP  
**Target**: andikastudio.online  
**Method**: Docker + Cloudflare Tunnel  
**Security Status**: ✅ All Critical Issues Fixed  

---

## ✅ Phase 1: Security Hardening Complete

### Critical Issues Fixed
- ✅ Prisma Studio disabled (removed from production Dockerfile)
- ✅ Database port hidden (removed from docker-compose.yml)
- ✅ Security headers added (HSTS, X-Frame-Options, CSP headers in nginx.conf)

### Files Modified
- ✅ `manava-api/Dockerfile` — Removed Prisma Studio startup
- ✅ `docker-compose.yml` — Removed port 5555 + database port exposure
- ✅ `manava-app/nginx.conf` — Added 6 security headers

---

## 📋 Phase 2: Pre-Deployment Setup (Do This First)

### Step 1: Generate Production Secrets
```bash
cd /Users/andika/Desktop/manava-isd-project/manava
./generate-secrets.sh
```

Copy the output and create `.env` file:
```bash
cp .env.production.example .env
# Edit .env and paste the secrets from script output
```

**Required values to set manually**:
```
POSTGRES_PASSWORD=<from script>
JWT_ACCESS_SECRET=<from script>
JWT_REFRESH_SECRET=<from script>
CORS_ORIGIN=https://andikastudio.online
APP_URL=https://andikastudio.online
VITE_API_BASE_URL=https://api.andikastudio.online
```

### Step 2: Test Local Build
```bash
docker compose build
docker compose config  # Should succeed with no errors
```

### Step 3: Set Up Cloudflare Tunnel
- [ ] Install cloudflared: `brew install cloudflare/cloudflare/cloudflared`
- [ ] Authenticate: `cloudflared tunnel login`
- [ ] Create tunnel: `cloudflared tunnel create manava-prod`
- [ ] Configure DNS: Add CNAME records in Cloudflare dashboard
- [ ] Create tunnel config: `~/.cloudflared/config.yml`

---

## 🔍 Phase 3: Deployment Verification

### Pre-Deploy Checks
```bash
# Check all critical fixes are in place
✅ grep -c "prisma studio" manava-api/Dockerfile  # Should be 0
✅ grep "5555" docker-compose.yml                  # Should not appear
✅ grep "Strict-Transport-Security" manava-app/nginx.conf
```

### Local Test
```bash
docker compose up -d
sleep 10
curl http://localhost:4000/api/v1/health  # Should return 200
docker compose down
```

### Post-Deploy Verification
```bash
# After Cloudflare Tunnel is running
curl -I https://andikastudio.online                          # Should be 200 + security headers
curl https://api.andikastudio.online/api/v1/health | jq      # Should return success
```

---

## 📦 Deployment Files Created

| File | Purpose | Status |
|------|---------|--------|
| `.env.production.example` | Production environment template | ✅ Created |
| `docker-compose.prod.yml` | Production overrides (resource limits, restart policies) | ✅ Created |
| `generate-secrets.sh` | Safe secret generation script | ✅ Created |
| `DEPLOYMENT.md` | Complete deployment guide | ✅ Created |
| `SECURITY-AUDIT.md` | Security verification report | ✅ Created |

---

## 🎯 Next Steps (When Ready)

1. **Commit changes to git**
   ```bash
   git add -A
   git commit -m "fix: disable Prisma Studio & database port, add security headers for production"
   git push origin main
   ```

2. **Generate and secure secrets**
   ```bash
   ./generate-secrets.sh
   cp .env.production.example .env
   # Edit .env with secrets and production URLs
   ```

3. **Test production build locally**
   ```bash
   docker compose build
   docker compose up -d
   # Verify health endpoint
   docker compose down
   ```

4. **Deploy to production**
   ```bash
   # Terminal 1: Start services
   docker compose up -d
   
   # Terminal 2: Start Cloudflare Tunnel
   cloudflared tunnel run manava-prod
   ```

5. **Verify deployment**
   - [ ] Frontend accessible at https://andikastudio.online
   - [ ] API health check returns 200
   - [ ] Login works
   - [ ] Database persists

---

## ⚠️ Important Security Notes

- **Never commit `.env` file** — it's in .gitignore
- **Keep secrets secure** — backup your Cloudflare credentials
- **Monitor logs** — `docker compose logs -f` after deployment
- **Test backups** — ensure daily database backups are configured
- **Update regularly** — keep dependencies and Docker images current

---

## 📞 Support Commands

```bash
# View logs
docker compose logs -f api

# Check service health
docker compose ps

# Restart specific service
docker compose restart api

# View API health
curl https://api.andikastudio.online/api/v1/health

# SSH into container (emergency)
docker exec -it backend sh
```

---

**Ready to deploy?** Start with Phase 2, Step 1: Generate secrets.
