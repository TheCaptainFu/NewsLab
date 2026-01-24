# 🚀 CaptainNews.gr - Flat Data Deployment Guide

## 📋 Overview

This project uses **GitHub Actions** to automatically aggregate RSS feeds every 5 minutes and save them to a static `news.json` file. The frontend simply fetches this pre-processed data, resulting in **instant load times** and **no CORS issues**.

---

## 🛠️ Setup Instructions

### 1. **Push to GitHub**

```bash
cd /home/captainfu/projects/News

# Initialize git if not already done
git init
git add .
git commit -m "🚀 Migrate to Flat Data architecture with GitHub Actions"

# Create GitHub repo and push
git remote add origin https://github.com/YOUR_USERNAME/captainnews.git
git branch -M main
git push -u origin main
```

### 2. **Enable GitHub Actions**

- Go to your GitHub repository
- Click on **"Actions"** tab
- If prompted, enable GitHub Actions for the repository
- The workflow `.github/workflows/update_news.yml` will automatically be detected

### 3. **Configure GitHub Pages (Optional)**

If you want to host the site on GitHub Pages:

1. Go to **Settings** → **Pages**
2. Source: **Deploy from a branch**
3. Branch: **main** / Folder: **/ (root)**
4. Save

Your site will be available at: `https://YOUR_USERNAME.github.io/captainnews/`

### 4. **Manual First Run**

To test the workflow manually:

1. Go to **Actions** tab
2. Click on **"Update News Feed"** workflow
3. Click **"Run workflow"** button
4. Wait 1-2 minutes
5. Check if `news.json` was updated in the repository

---

## ⚙️ How It Works

### **Server-Side Aggregation (GitHub Actions)**

Every 5 minutes, a GitHub Action:
1. Runs `update-news.js` (Node.js script)
2. Fetches all 24 RSS feeds in parallel
3. Extracts images, deduplicates, sorts by date
4. Saves to `news.json` (commits only if changed)

### **Client-Side Loading (Frontend)**

The browser:
1. Loads `index.html`
2. Fetches `news.json?t=timestamp` (cache busting)
3. Renders articles instantly
4. Auto-refreshes every 5 minutes

---

## 📊 Performance Comparison

| Metric | Old (Client-Side) | New (Flat Data) |
|--------|-------------------|-----------------|
| **First Load** | 8-30s | **< 1s** ⚡ |
| **CORS Issues** | ❌ Yes | ✅ No |
| **Browser Load** | Heavy | Minimal |
| **Server Cost** | Free (GitHub) | Free (GitHub) |

---

## 🔧 Configuration

### Change Update Frequency

Edit `.github/workflows/update_news.yml`:

```yaml
schedule:
  - cron: '*/5 * * * *'  # Every 5 minutes
  # - cron: '*/10 * * * *'  # Every 10 minutes
  # - cron: '0 * * * *'     # Every hour
```

### Add/Remove RSS Feeds

Edit **both** files:
1. `update-news.js` (line 6-60) - Server-side aggregator
2. `js/main.js` (line 17-24) - Client-side color/title mapping

### Change Article Limit

Edit `update-news.js` (line 148):

```javascript
allArticles = allArticles.slice(0, 30);  // Change 30 to desired limit
```

---

## 🧪 Local Testing

### Test the Aggregator

```bash
npm install
node update-news.js
```

Check `news.json` was created with fresh data.

### Test the Frontend

```bash
python3 -m http.server 8000
# Open: http://localhost:8000
```

---

## 📝 File Structure

```
News/
├── .github/
│   └── workflows/
│       └── update_news.yml      # GitHub Actions workflow (runs every 5 min)
├── js/
│   └── main.js                  # Simplified frontend (fetches news.json)
├── update-news.js               # Node.js RSS aggregator
├── news.json                    # Generated data file (auto-updated)
├── package.json                 # Node.js dependencies
└── index.html                   # Main page
```

---

## 🐛 Troubleshooting

### Actions Not Running?

- Check **Actions** tab for errors
- Ensure repository has **write permissions** for GitHub token
- Check workflow file syntax (YAML is sensitive to indentation)

### Old Data Showing?

- Hard refresh browser: `Ctrl+Shift+R`
- Check `news.json` commit timestamp
- Manually trigger workflow to force update

### Some Feeds Failing?

Normal! Some RSS feeds may be down or block automated requests. The aggregator continues with working feeds.

Check logs in **Actions** tab → Latest workflow run.

---

## 🎯 Benefits

✅ **Instant Load** - No RSS fetching in browser  
✅ **No CORS** - All data served from same origin  
✅ **Reliable** - Server-side timeout handling  
✅ **Scalable** - GitHub Actions infrastructure  
✅ **Free** - GitHub Actions free tier: 2000 minutes/month  
✅ **Auto-Update** - Fresh news every 5 minutes  

---

## 📈 GitHub Actions Quota

- **Free tier**: 2000 minutes/month
- **Each run**: ~1-2 minutes
- **Frequency**: Every 5 minutes = 288 runs/day = 8640 runs/month
- **Total usage**: ~8640-17280 minutes/month

**⚠️ This exceeds free tier!**

### Solutions:

1. **Reduce frequency** to every 15 minutes (5760 runs/month)
2. **Add workflow hours** (only run 9am-11pm)
3. **Upgrade to GitHub Pro** (3000 min/month)

### Recommended Cron (Stays within free tier):

```yaml
schedule:
  - cron: '*/15 * * * *'  # Every 15 minutes (within free tier)
```

---

## 🚀 Next Steps

1. Push to GitHub
2. Wait 5 minutes
3. Check `news.json` was committed
4. Visit your site
5. Enjoy instant news! ⚡

---

**Made with ⚓ by CaptainFu**
