# 📁 What to Keep vs Delete

## ✅ KEEP (Essential to Run)

```
manimfixerai2/
├── 📄 package.json               ✅ Keep - root dependencies
├── 📄 .gitignore                 ✅ Keep - updated with all ignores
├── 📄 README.md                  ✅ Keep - project info
│
├── 📁 backend/
│   ├── 📁 src/
│   │   └── 📄 server.ts          ✅ Keep - main backend code
│   ├── 📄 package.json           ✅ Keep - backend dependencies
│   ├── 📄 tsconfig.json          ✅ Keep - TypeScript config
│   └── 📄 .env                   🔒 Keep but NEVER commit!
│
├── 📁 frontend/
│   ├── 📁 src/
│   │   ├── 📄 App.tsx            ✅ Keep - main UI
│   │   ├── 📄 main.tsx           ✅ Keep - entry point
│   │   ├── 📄 App.css            ✅ Keep - styles
│   │   └── 📄 index.css          ✅ Keep - global styles
│   ├── 📄 index.html             ✅ Keep - HTML entry
│   ├── 📄 package.json           ✅ Keep - frontend dependencies
│   ├── 📄 vite.config.ts         ✅ Keep - Vite config
│   ├── 📄 tsconfig.json          ✅ Keep - TypeScript config
│   ├── 📄 tailwind.config.js     ✅ Keep - Tailwind config
│   └── 📄 postcss.config.js      ✅ Keep - PostCSS config
│
└── 📄 main.py                    ⚪ Optional - test script
```

---

## ❌ DELETE or IGNORE (Not Needed)

### 🔄 Auto-Generated (Can Recreate Anytime)
```
❌ node_modules/              → Run: npm install
❌ backend/node_modules/      → Run: npm install
❌ frontend/node_modules/     → Run: npm install
❌ backend/dist/              → Run: npm run build
❌ frontend/dist/             → Run: npm run build
❌ manimenv/                  → Recreate Python env
❌ __pycache__/               → Python auto-generates
```

### 📤 Output Files (Generated During Use)
```
❌ temp/                      → Created when generating videos
❌ public/videos/             → Your generated videos
❌ media/                     → Manim output directory
```

### 📚 Documentation (Guides I Created)
```
❌ TEST_PROMPTS.md
❌ SIMPLE_TEST_PROMPTS.md
❌ QUICK_TEST_GUIDE.md
❌ PRESENTATION_SCRIPT.md
❌ PRESENTATION_SCRIPT_5MIN.md
❌ VOICE_OVER_SETUP.md
❌ AWS_POLLY_SETUP.md
❌ GTTS_SETUP_COMPLETE.md
❌ FULL_NARRATION_FEATURE.md
❌ ERROR_FIXED.md
❌ CRASH_FIXED.md
❌ START_HERE.md
❌ IMPROVED_PROMPTS.md
❌ FILES_CHECKLIST.md
❌ WHAT_TO_KEEP.md (this file!)
```

**Keep if helpful, delete if you want a clean repo!**

---

## 🎯 Quick Actions

### To See What Will Be Committed:
```bash
git status
```

### To See What's Ignored:
```bash
git status --ignored
```

### To Clean Up All Ignored Files:
```bash
# BE CAREFUL! This deletes everything in .gitignore
git clean -fdX
```

### To Delete Specific Folders Manually:
```bash
# Windows
rmdir /s /q node_modules
rmdir /s /q backend\dist
rmdir /s /q frontend\dist
rmdir /s /q temp
rmdir /s /q public\videos
```

---

## 📊 Size Comparison

### Before Cleanup:
```
Total: ~1.2 GB
├── manimenv/      500 MB
├── node_modules/  300 MB
├── media/         200 MB
└── Source code    200 MB
```

### After Cleanup:
```
Total: ~200 KB (Source only!)
└── Source code    200 KB
```

**1000x smaller!** Perfect for Git repository.

---

## 🔒 NEVER Commit These!

```
🔒 backend/.env                        - API keys
🔒 backend/google-tts-credentials.json - Credentials
🔒 Any file with "credentials" in name
🔒 Any file with API keys
```

**Already protected by .gitignore** ✅

---

## ✅ Summary

### ✅ Essential Files (Keep):
- Source code (.ts, .tsx, .py)
- Config files (package.json, tsconfig.json)
- HTML/CSS files
- .gitignore
- README.md

### ❌ Can Delete:
- node_modules/ (300 MB)
- manimenv/ (500 MB)
- dist/ folders
- temp/ folder
- Generated videos
- Documentation MDs (optional)

### 🔒 Never Commit:
- .env files
- Credentials JSON files

---

## 🎓 What to Do Next

1. **Review** what files you want to keep
2. **Delete** documentation files if you don't need them
3. **Commit** only essential files to Git
4. **Run** `git status` to verify
5. **Push** to GitHub (if using)

**Your .gitignore is already updated with all the right patterns!** ✅
