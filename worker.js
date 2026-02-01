/**
 * CaptainNews.gr – Cloudflare Worker
 * Serves static site from Assets, /news.json from KV, and refreshes news via cron.
 */

const RSS_FEEDS = {
  breaking: {
    title: 'ΕΚΤΑΚΤΗ ΕΠΙΚΑΙΡΟΤΗΤΑ & ΕΛΛΑΔΑ',
    color: 'red',
    feeds: [
      'https://www.newsit.gr/feed/',
      'https://www.protothema.gr/greece/rss/',
      'https://www.in.gr/feed/',
      'https://www.ethnos.gr/rss/greece/'
    ]
  },
  politicsGR: {
    title: 'ΠΟΛΙΤΙΚΑ (ΕΛΛΑΔΑ)',
    color: 'purple',
    feeds: [
      'https://www.tanea.gr/category/politics/feed/',
      'https://www.naftemporiki.gr/politics/feed/',
      'https://www.tovima.gr/category/politics/feed/',
      'https://www.ethnos.gr/rss/politics/'
    ]
  },
  worldPolitics: {
    title: 'ΠΟΛΙΤΙΚΑ (ΠΑΓΚΟΣΜΙΩΣ)',
    color: 'blue',
    feeds: [
      'https://gr.euronews.com/rss?format=all',
      'https://rss.dw.com/rdf/rss-gr-all',
      'https://feeds.bbci.co.uk/news/world/rss.xml',
      'https://feeds.reuters.com/Reuters/worldNews'
    ]
  },
  sports: {
    title: 'ΑΘΛΗΤΙΣΜΟΣ & SUPER LEAGUE',
    color: 'green',
    feeds: [
      'https://www.gazzetta.gr/rss/',
      'https://www.sdna.gr/rss/',
      'https://www.sport24.gr/rss/default.xml',
      'https://www.newsit.gr/category/athlitika/feed/'
    ]
  },
  panathinaikos: {
    title: 'ΠΑΝΑΘΗΝΑΪΚΟΣ',
    color: 'lime',
    feeds: [
      'https://olaprasina1908.gr/feed/',
      'https://trifilara.gr/feed/',
      'https://www.gazzetta.gr/rss/panathinaikos',
      'https://panathinaikos24.gr/feed/'
    ]
  },
  tech: {
    title: 'ΤΕΧΝΟΛΟΓΙΑ & SCIENCE',
    color: 'pink',
    feeds: [
      'https://www.insomnia.gr/rss/index.xml/',
      'https://www.techgear.gr/feed',
      'https://www.digitallife.gr/feed',
      'https://gr.pcmag.com/feed.xml'
    ]
  }
};

const DOMAIN_SOURCE_MAP = {
  'newsit.gr': 'NewsIT',
  'protothema.gr': 'Πρώτο Θέμα',
  'in.gr': 'In.gr',
  'ethnos.gr': 'Εθνος',
  'tanea.gr': 'Τα Νέα',
  'naftemporiki.gr': 'Ναυτεμπορική',
  'tovima.gr': 'Το Βήμα',
  'gr.euronews.com': 'Euronews',
  'euronews.com': 'Euronews',
  'dw.com': 'DW',
  'bbci.co.uk': 'BBC News',
  'reuters.com': 'Reuters',
  'gazzetta.gr': 'Gazzetta',
  'sdna.gr': 'SDNA',
  'sport24.gr': 'Sport24',
  'olaprasina1908.gr': 'Όλα Πράσινα',
  'trifilara.gr': 'Trifilara',
  'panathinaikos24.gr': 'Panathinaikos24',
  'insomnia.gr': 'Insomnia',
  'techgear.gr': 'Techgear',
  'digitallife.gr': 'Digital Life',
  'pcmag.com': 'PC Magazine'
};

function getSourceName(url) {
  try {
    const host = new URL(url).hostname.replace(/^www\./, '');
    for (const [key, value] of Object.entries(DOMAIN_SOURCE_MAP)) {
      if (host === key || host.endsWith('.' + key)) return value;
    }
    const parts = host.split('.');
    if (parts.length >= 2) {
      const name = parts[parts.length - 2];
      return name.charAt(0).toUpperCase() + name.slice(1);
    }
    return host.split('.')[0].charAt(0).toUpperCase() + host.split('.')[0].slice(1);
  } catch (_) {
    return 'Άγνωστη πηγή';
  }
}

function extractTag(xml, tag) {
  const regex = new RegExp(`<${tag}[^>]*>([\\s\\S]*?)<\\/${tag}>`, 'i');
  const m = xml.match(regex);
  return m ? m[1].trim() : '';
}

function extractImage(xml) {
  let m = xml.match(/<media:content[^>]+url="([^"]+)"/i);
  if (m) return m[1];
  m = xml.match(/<enclosure[^>]+url="([^"]+)"/i);
  if (m) return m[1];
  m = xml.match(/<img[^>]+src="([^"]+)"/i);
  if (m) return m[1];
  return null;
}

function stripHtml(html) {
  if (!html) return '';
  return html
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .trim()
    .slice(0, 300);
}

function parseRSS(xml, sourceName) {
  const items = [];
  const itemRegex = /<item>([\s\S]*?)<\/item>/gi;
  let m;
  while ((m = itemRegex.exec(xml)) !== null) {
    const block = m[1];
    const title = stripHtml(extractTag(block, 'title'));
    const link = extractTag(block, 'link').replace(/<[^>]+>/g, '').trim();
    const pubDate = extractTag(block, 'pubDate') || extractTag(block, 'dc:date') || new Date().toISOString();
    const desc = extractTag(block, 'description') || extractTag(block, 'content:encoded');
    if (title && link) {
      items.push({
        title,
        link,
        pubDate,
        description: stripHtml(desc).slice(0, 500),
        thumbnail: extractImage(block),
        source: sourceName
      });
    }
  }
  return items;
}

async function fetchFeed(url) {
  try {
    const res = await fetch(url, {
      headers: { 'User-Agent': 'CaptainNews.gr/1.0 (Cloudflare Worker)' },
      signal: AbortSignal.timeout(8000)
    });
    if (!res.ok) return [];
    const xml = await res.text();
    const sourceName = getSourceName(url);
    return parseRSS(xml, sourceName);
  } catch (_) {
    return [];
  }
}

function removeDuplicates(articles) {
  const seen = new Set();
  return articles.filter((a) => {
    const key = a.title.toLowerCase().trim();
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

async function buildNewsData() {
  const categories = {};
  let totalArticles = 0;
  let totalFeeds = 0;
  let successfulFeeds = 0;

  for (const [key, cat] of Object.entries(RSS_FEEDS)) {
    const results = await Promise.allSettled(cat.feeds.map((url) => fetchFeed(url)));
    let articles = results
      .filter((r) => r.status === 'fulfilled' && r.value.length > 0)
      .flatMap((r) => r.value);
    totalFeeds += cat.feeds.length;
    successfulFeeds += results.filter((r) => r.status === 'fulfilled' && r.value.length > 0).length;
    articles = removeDuplicates(articles);
    articles.sort((a, b) => new Date(b.pubDate) - new Date(a.pubDate));
    articles = articles.slice(0, 30);
    totalArticles += articles.length;
    categories[key] = { title: cat.title, color: cat.color, articles };
  }

  return {
    lastUpdated: new Date().toISOString(),
    totalArticles,
    totalFeeds,
    successfulFeeds,
    categories
  };
}

const KV_KEY_NEWS = 'news';

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);

    // Root: serve index.html
    if (url.pathname === '/' || url.pathname === '') {
      return env.ASSETS.fetch(new Request(url.origin + '/index.html'));
    }

    // Serve news.json from KV (or build on first run)
    if (url.pathname === '/news.json' || url.pathname === '/news.json/') {
      let json = await env.NEWS_KV.get(KV_KEY_NEWS);
      if (!json) {
        const data = await buildNewsData();
        json = JSON.stringify(data);
        await env.NEWS_KV.put(KV_KEY_NEWS, json, { expirationTtl: 60 * 60 * 24 * 7 });
      }
      return new Response(json, {
        headers: {
          'Content-Type': 'application/json',
          'Cache-Control': 'public, max-age=300'
        }
      });
    }

    // Static assets
    return env.ASSETS.fetch(request);
  },

  async scheduled(event, env, ctx) {
    try {
      const data = await buildNewsData();
      await env.NEWS_KV.put(KV_KEY_NEWS, JSON.stringify(data), { expirationTtl: 60 * 60 * 24 * 7 });
    } catch (err) {
      console.error('Scheduled news update failed:', err);
    }
  }
};
