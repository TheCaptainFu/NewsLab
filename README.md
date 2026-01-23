# 📰 CaptainNews.gr

A modern, beautiful Greek news aggregator that pulls articles from 23 RSS feeds across 7 categories.

## 🚀 Features

- ✅ **23 RSS feeds** from top Greek news sources
- ✅ **7 categories**: Πολιτικά Ελλάδα, Αθλητισμός, Παναθηναϊκός, Οικονομία, Πολιτικά Παγκοσμίως, Καιρός, Tech
- ✅ **Auto-refresh** every 5 minutes
- ✅ **Beautiful UI** with Tailwind CSS
- ✅ **Category filtering**
- ✅ **Load more** functionality
- ✅ **Caching** with localStorage
- ✅ **PWA ready** (installable on mobile)
- ✅ **Responsive design**

## 📊 The RSS Problem & Solution

### The Issue
RSS feeds have 20+ articles each, but free RSS-to-JSON services (like rss2json.com) only return ~10 articles per feed.

**You're missing 50% of available content!**

### The Solution
Use **Cloudflare Workers** (100% free) to fetch ALL articles directly from RSS feeds.

**Result:**
- Before: ~230 articles
- After: ~460 articles (2x more!)

## 🏗️ Setup Options

### Option 1: Full Setup (Recommended - Gets ALL Articles)

1. **Deploy Cloudflare Worker** (5 min, FREE)
   - See `CLOUDFLARE_SETUP.md` for step-by-step
   - Gets ALL 460+ articles

2. **Deploy to GitHub Pages**
   ```bash
   git init
   git add .
   git commit -m "Initial commit"
   git push -u origin main
   # Enable GitHub Pages in repo settings
   ```

3. **Update Worker URL** in `js/main.js` line ~14

### Option 2: Simple Setup (Limited Articles)

Just use GitHub Pages without Cloudflare Worker:
- Gets ~230 articles (rss2json.com limitation)
- 100% static hosting
- No additional setup needed

```bash
git init
git add .
git commit -m "Initial commit"
git push -u origin main
# Enable GitHub Pages in repo settings
```

## 📁 Project Structure

```
News/
├── index.html              # Main page
├── js/
│   └── main.js            # App logic
├── icons/                 # App icons
├── manifest.json          # PWA manifest
├── cloudflare-worker.js   # Cloudflare Worker code
└── CLOUDFLARE_SETUP.md    # Setup instructions
```

## 🔧 Configuration

### Add/Remove RSS Feeds

Edit `js/main.js` (line ~19) and `cloudflare-worker.js` (line ~5):

```javascript
const RSS_FEEDS = {
    yourCategory: {
        title: 'Your Category',
        color: 'blue',
        feeds: [
            'https://example.com/feed.xml'
        ]
    }
};
```

### Change Auto-Refresh Interval

Edit `js/main.js` (line ~585):

```javascript
autoRefreshInterval = setInterval(() => {
    getNews(true);
}, 300000); // 300000ms = 5 minutes
```

## 🎨 Customization

### Colors
- Categories use Tailwind CSS colors
- Available: purple, green, lime, yellow, blue, cyan, pink
- Change in `RSS_FEEDS` object

### Fonts
- Headlines: Roboto Condensed
- Body: Roboto
- Change in `index.html` <style> section

## 📱 PWA Support

The site is installable as a Progressive Web App:
- Works offline (with cached articles)
- Install on mobile home screen
- Native app-like experience

## 🚀 Deployment

### GitHub Pages
```bash
git push origin main
# Settings → Pages → Source: main branch
```

### Netlify
```bash
# Connect GitHub repo
# Build command: (none)
# Publish directory: /
```

### Vercel
```bash
vercel --prod
```

## 📊 Performance

### With Cloudflare Worker:
- **First load**: ~2-3 seconds
- **Cached loads**: <100ms
- **Articles**: 460+
- **Coverage**: 100% of RSS content

### Without Cloudflare Worker:
- **First load**: ~3-4 seconds  
- **Cached loads**: <100ms
- **Articles**: ~230
- **Coverage**: ~50% of RSS content

## 🔍 Troubleshooting

### Not getting all articles?
- Check if Cloudflare Worker is deployed
- Verify `CLOUDFLARE_WORKER_URL` in `js/main.js`
- Console should show: `🚀 Fetching from Cloudflare Worker...`

### Some feeds failing?
- Normal! Some RSS feeds may be temporarily down
- App continues with working feeds
- Check console for specific errors

### Auto-refresh not working?
- Check browser console for errors
- Verify you're not blocking background timers
- Clear cache and reload

## 📚 Documentation

- `CLOUDFLARE_SETUP.md` - How to deploy Cloudflare Worker
- `cloudflare-worker.js` - Worker source code
- Comments in `js/main.js` - Frontend logic

## 🌟 News Sources

### Πολιτικά Ελλάδα (3 feeds)
- ERT News
- Documento
- To Vima

### Αθλητισμός (3 feeds)
- Gazzetta
- SDNA
- Newsit

### Παναθηναϊκός (4 feeds)
- Olaprasina1908
- Trifilara
- Gazzetta Panathinaikos
- Newsit Panathinaikos

### Οικονομία Παγκοσμίως (3 feeds)
- Reuters Business
- Financial Times
- Capital.gr

### Πολιτικά Παγκοσμίως (3 feeds)
- BBC World
- Euronews
- The Guardian

### Καιρός Ελλάδα (4 feeds)
- Meteo.gr
- ERT Kairos
- Protothema Kairos
- Newsit Kairos

### Tech News (3 feeds)
- Insomnia.gr
- PCMag Greece
- Techgear.gr

## 📄 License

MIT License - Feel free to use this project however you want!

## 🙏 Credits

Built with:
- Tailwind CSS
- Font Awesome
- rss2json.com (fallback)
- Cloudflare Workers

---

**Ready to get started?** 

1. Read `CLOUDFLARE_SETUP.md`
2. Deploy Cloudflare Worker (5 min)
3. Push to GitHub Pages
4. Enjoy 460+ articles! 🎉
