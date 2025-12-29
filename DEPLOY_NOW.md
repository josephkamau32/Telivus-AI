# Quick Deployment Commands

## 1. First, tell me your Vercel URL
Your Vercel frontend URL (e.g., https://telivus-ai.vercel.app):
**[REPLACE WITH YOUR URL]**

## 2. Generate SECRET_KEY
Run this in PowerShell:
```powershell
-join ((65..90) + (97..122) + (48..57) | Get-Random -Count 50 | ForEach-Object {[char]$_})
```
Copy the output - you'll need it for Render environment variables.

## 3. Deploy Commands
```powershell
# Navigate to project
cd c:\Users\HP\Documents\Projects\Telivus-AI

# Add all changes
git add backend/ .github/ docker-compose.yml .pre-commit-config.yaml

# Commit
git commit -m "feat: Add A+ improvements - testing, caching, auth, rate limiting"

# Push (triggers Render deployment)
git push origin main
```

## 4. Configure Render Environment
Go to: https://dashboard.render.com → Your Service → Environment

Add these new variables:
```
SECRET_KEY=[paste generated key from step 2]
JWT_ALGORITHM=HS256
ENVIRONMENT=production
DEBUG=False
```

## 5. Verify Deployment
After Render finishes building (5-10 min), test:
```powershell
# Replace with your actual Render URL
curl https://your-app.onrender.com/health
```

Should return: `{"status": "healthy", ...}`

## 6. Update Vercel
Go to Vercel → Your Project → Settings → Environment Variables

Make sure `VITE_API_URL` points to your Render backend:
```
VITE_API_URL=https://your-render-app.onrender.com
```

## Done! 🎉
Your A+ backend is deployed with all improvements!
