# 🧪 Telivus AI - Local Testing Guide

## 🚀 Servers Running

**Backend:** http://localhost:8000  
**Frontend:** http://localhost:8080 (or http://localhost:5173)  
**API Docs:** http://localhost:8000/docs

---

## ✅ Pre-Deployment Testing Checklist

### 1. Backend API Testing

#### A. Health Check ✅
Open in browser: http://localhost:8000/health

**Expected Response:**
```json
{
  "status": "healthy",
  "service": "Telivus AI Backend",
  "version": "1.0.0"
}
```

#### B. API Documentation ✅
Open in browser: http://localhost:8000/docs

**What to Check:**
- Swagger UI loads properly
- All endpoints are listed
- Can expand and view endpoint details
- Try the "Try it out" feature on `/health` endpoint

#### C. CORS Test ✅
Open in browser: http://localhost:8000/cors-test

**Expected Response:**
```json
{
  "status": "success",
  "message": "CORS is configured",
  "allowed_origins": [...]
}
```

#### D. Rate Limiting Test ✅
Use PowerShell to test rate limiting:

```powershell
# Make 15 rapid requests (should hit rate limit)
1..15 | ForEach-Object {
    curl http://localhost:8000/health -UseBasicParsing
    Write-Host "Request $_"
}
```

**Expected:** First ~10 succeed, then you get 429 (Too Many Requests)

---

### 2. Frontend Application Testing

Open: http://localhost:8080 or http://localhost:5173

#### A. Landing Page ✅
**Check:**
- [ ] Page loads without errors
- [ ] Logo and branding visible
- [ ] Navigation menu works
- [ ] No console errors (press F12)

#### B. Authentication ✅
**Test Login:**
- [ ] Navigate to login page
- [ ] Try demo credentials (if available)
- [ ] Check if JWT token is stored (DevTools > Application > Local Storage)

#### C. Health Assessment ✅
**Test Main Feature:**
- [ ] Navigate to health assessment
- [ ] Fill in patient information
- [ ] Enter symptoms
- [ ] Submit assessment
- [ ] Verify AI response displays
- [ ] Check loading states work

#### D. PWA Features ✅
- [ ] Check if install prompt appears
- [ ] Check if app works offline (after first load)
- [ ] Verify service worker registered (DevTools > Application > Service Workers)

---

### 3. Integration Testing

#### A. Frontend → Backend Communication ✅

**Test API Calls:**
1. Open browser DevTools (F12) → Network tab
2. Perform a health assessment in the frontend
3. **Check:**
   - [ ] Request shows in Network tab
   - [ ] Request goes to `http://localhost:8000/api/v1/...`
   - [ ] Response status is 200
   - [ ] Response contains expected data
   - [ ] No CORS errors in console

#### B. Caching Behavior ✅

**Test Cache:**
1. Make the same health assessment twice
2. **Check:**
   - [ ] Second request is faster
   - [ ] Cache headers present in response
   - [ ] `X-Cache-Hit` header (if implemented)

#### C. Error Handling ✅

**Test Error States:**
1. Try invalid input (age > 130)
2. Try XSS attempt: `<script>alert('test')</script>` in text fields
3. **Check:**
   - [ ] Validation errors show properly
   - [ ] Malicious input is sanitized
   - [ ] User-friendly error messages
   - [ ] No app crashes

---

### 4. Performance Testing

#### A. Page Load Speed ✅
1. Open DevTools → Network tab
2. Hard refresh (Ctrl+Shift+R)
3. **Check:**
   - [ ] First Contentful Paint < 2s
   - [ ] Time to Interactive < 3s
   - [ ] Total page weight reasonable

#### B. API Response Time ✅
1. In Network tab, check API call durations
2. **Expected:**
   - [ ] Health check: < 100ms
   - [ ] Assessment (uncached): 2-5s (AI processing)
   - [ ] Assessment (cached): < 500ms

---

### 5. Security Testing

#### A. Input Sanitization ✅

**Test XSS Prevention:**
```
Input: <script>alert('XSS')</script>
Expected: Script tags removed, safe text displayed
```

**Test SQL Injection Detection:**
```
Input: '; DROP TABLE users; --
Expected: Input rejected or sanitized
```

#### B. Authentication ✅

**Test Protected Routes:**
1. Try accessing protected endpoint without token
2. **Expected:** 401 Unauthorized response

#### C. Rate Limiting ✅
Already tested above - verify working

---

### 6. Mobile Responsiveness

#### A. Responsive Design ✅
1. Open DevTools (F12) → Toggle device toolbar (Ctrl+Shift+M)
2. Test different sizes:
   - [ ] Mobile (375px)
   - [ ] Tablet (768px)
   - [ ] Desktop (1920px)
3. **Check:**
   - [ ] Layout adjusts properly
   - [ ] All buttons clickable
   - [ ] Text readable
   - [ ] No horizontal scroll

---

## 🐛 Common Issues & Solutions

### Backend Won't Start
```powershell
# Check if port 8000 is in use
netstat -ano | findstr :8000

# Kill process if needed
taskkill /PID <process_id> /F

# Restart backend
cd backend
.\venv\Scripts\Activate.ps1
uvicorn app.main:app --reload
```

### Frontend Won't Start
```powershell
# Check if port is in use
netstat -ano | findstr :8080
netstat -ano | findstr :5173

# Clear node modules and reinstall
rm -r node_modules
rm package-lock.json
npm install
npm run dev
```

### CORS Errors
**If you see CORS errors:**
1. Check `backend/app/main.py` CORS settings
2. Ensure frontend URL is in allowed origins
3. Restart backend after changes

### API Not Responding
**Check:**
1. Backend server is running
2. No errors in terminal
3. Firewall not blocking localhost
4. Correct port number

---

## ✅ Final Checklist Before Deployment

### Backend Ready ✅
- [ ] All endpoints working
- [ ] Rate limiting operational
- [ ] CORS configured for production URL
- [ ] Environment variables set
- [ ] No console errors

### Frontend Ready ✅
- [ ] All pages load correctly
- [ ] API calls work
- [ ] No console errors
- [ ] PWA features functional
- [ ] Build succeeds: `npm run build`

### Integration Ready ✅
- [ ] Frontend ↔️ Backend communication works
- [ ] Authentication flow complete
- [ ] Error handling proper
- [ ] Performance acceptable

---

## 📸 Screenshot Testing Checklist

Take screenshots of these for documentation:

1. **Landing Page** - Homepage loaded
2. **API Docs** - http://localhost:8000/docs
3. **Health Assessment Form** - Main feature
4. **Assessment Results** - AI response displayed
5. **Mobile View** - Responsive layout
6. **Network Tab** - Showing successful API calls
7. **Console** - No errors

---

## 🚀 Ready for Deployment?

Once all tests pass:
1. ✅ Update environment variables for production
2. ✅ Build frontend: `npm run build`
3. ✅ Test production build locally
4. ✅ Deploy to Vercel (Frontend)
5. ✅ Deploy to Render (Backend)
6. ✅ Update CORS settings with production URLs
7. ✅ Test live deployment

---

**Testing Status:** 🟡 IN PROGRESS

Open the URLs above and check each item. Report any issues you find!
