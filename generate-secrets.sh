#!/bin/bash
# generate-secrets.sh
# Production secret generator for Manava deployment
# Run this once before first deployment to generate secure random secrets

set -e

echo "🔐 Manava Production Secret Generator"
echo "═══════════════════════════════════════════════════════════════"
echo ""
echo "⚠️  SECURITY WARNING:"
echo "   - Save these secrets to .env immediately"
echo "   - NEVER commit .env to git"
echo "   - These secrets cannot be recovered if lost"
echo ""
echo "═══════════════════════════════════════════════════════════════"
echo ""

# Generate secrets using openssl
POSTGRES_PASSWORD=$(openssl rand -base64 32 | tr -d "=+/" | cut -c1-32)
JWT_ACCESS_SECRET=$(openssl rand -base64 32 | tr -d "=+/" | cut -c1-32)
JWT_REFRESH_SECRET=$(openssl rand -base64 32 | tr -d "=+/" | cut -c1-32)

echo "# ═══════════════════════════════════════════════════════════════"
echo "# Generated Secrets — $(date '+%Y-%m-%d %H:%M:%S')"
echo "# ═══════════════════════════════════════════════════════════════"
echo ""
echo "POSTGRES_PASSWORD=$POSTGRES_PASSWORD"
echo "JWT_ACCESS_SECRET=$JWT_ACCESS_SECRET"
echo "JWT_REFRESH_SECRET=$JWT_REFRESH_SECRET"
echo ""
echo "# ═══════════════════════════════════════════════════════════════"
echo ""
echo "✅ Secrets generated successfully!"
echo ""
echo "📋 Next steps:"
echo "   1. Copy .env.production.example to .env"
echo "   2. Paste the above secrets into .env"
echo "   3. Set CORS_ORIGIN=https://andikastudio.online"
echo "   4. Set APP_URL=https://andikastudio.online"
echo "   5. Set VITE_API_BASE_URL=https://api.andikastudio.online"
echo "   6. (Optional) Add SMTP and OpenAI credentials"
echo ""
echo "⚠️  Keep .env secure — never commit to version control!"
