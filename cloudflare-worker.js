// Cloudflare Worker for CaptainNews.gr RSS Parser
// Deploy this to Cloudflare Workers (FREE tier)
// This gets ALL articles from your RSS feeds

// RSS Feed Categories
const RSS_FEEDS = {
    politicsGR: {
        title: 'Πολιτικά Ελλάδα',
        color: 'purple',
        feeds: [
            'https://www.ertnews.gr/category/politiki/feed/',
            'https://www.documentonews.gr/category/politiki/feed/',
            'https://www.tovima.gr/category/politics/feed/'
        ]
    },
    sports: {
        title: 'Αθλητισμός',
        color: 'green',
        feeds: [
            'https://www.gazzetta.gr/rss/',
            'https://www.sdna.gr/rss/',
            'https://www.newsit.gr/category/athlitika/feed/'
        ]
    },
    panathinaikos: {
        title: 'Παναθηναϊκός',
        color: 'lime',
        feeds: [
            'https://olaprasina1908.gr/feed/',
            'https://trifilara.gr/feed/',
            'https://www.gazzetta.gr/rss/panathinaikos',
            'https://www.newsit.gr/tag/panathinaikos/feed/'
        ]
    },
    economy: {
        title: 'Οικονομία Παγκοσμίως',
        color: 'yellow',
        feeds: [
            'http://feeds.reuters.com/reuters/businessNews',
            'https://www.ft.com/?format=rss',
            'https://www.capital.gr/rss?category=25'
        ]
    },
    worldPolitics: {
        title: 'Πολιτικά Παγκοσμίως',
        color: 'blue',
        feeds: [
            'http://feeds.bbci.co.uk/news/world/rss.xml',
            'https://gr.euronews.com/rss?format=all',
            'https://www.theguardian.com/world/rss'
        ]
    },
    weather: {
        title: 'Καιρός Ελλάδα',
        color: 'cyan',
        feeds: [
            'https://www.meteo.gr/rss/',
            'https://www.ertnews.gr/category/ellada/kairos/feed/',
            'https://www.protothema.gr/tag/kairos/rss/',
            'https://www.newsit.gr/category/kairos/feed/'
        ]
    },
    tech: {
        title: 'Tech News',
        color: 'pink',
        feeds: [
            'https://www.insomnia.gr/rss/index.xml/',
            'https://gr.pcmag.com/feed.xml',
            'https://www.techgear.gr/feed'
        ]
    }
};

// Parse RSS XML to JSON
function parseRSS(xml) {
    const items = [];
    const itemRegex = /<item>([\s\S]*?)<\/item>/gi;
    const matches = xml.matchAll(itemRegex);
    
    for (const match of matches) {
        const itemXml = match[1];
        
        // Extract fields
        const title = extractTag(itemXml, 'title');
        const link = extractTag(itemXml, 'link');
        const pubDate = extractTag(itemXml, 'pubDate') || extractTag(itemXml, 'dc:date');
        const description = extractTag(itemXml, 'description') || extractTag(itemXml, 'content:encoded');
        const thumbnail = extractImage(itemXml);
        
        if (title && link) {
            items.push({
                title: cleanText(title),
                link: cleanText(link),
                pubDate: pubDate || new Date().toISOString(),
                description: cleanText(description || ''),
                thumbnail: thumbnail
            });
        }
    }
    
    return items;
}

// Extract XML tag content
function extractTag(xml, tag) {
    const regex = new RegExp(`<${tag}[^>]*>(.*?)<\/${tag}>`, 'is');
    const match = xml.match(regex);
    return match ? match[1] : '';
}

// Extract image from various sources
function extractImage(xml) {
    // Try media:content
    let match = xml.match(/<media:content[^>]+url="([^"]+)"/i);
    if (match) return match[1];
    
    // Try enclosure
    match = xml.match(/<enclosure[^>]+url="([^"]+)"/i);
    if (match) return match[1];
    
    // Try img tag in description/content
    match = xml.match(/<img[^>]+src="([^"]+)"/i);
    if (match) return match[1];
    
    return null;
}

// Clean CDATA and HTML entities
function cleanText(text) {
    return text
        .replace(/<!\[CDATA\[(.*?)\]\]>/g, '$1')
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .replace(/&amp;/g, '&')
        .replace(/&quot;/g, '"')
        .replace(/&#039;/g, "'")
        .trim();
}

// Fetch and parse a single RSS feed
async function fetchFeed(url) {
    try {
        const response = await fetch(url, {
            headers: {
                'User-Agent': 'CaptainNews.gr RSS Reader/1.0'
            }
        });
        
        if (!response.ok) {
            console.log(`Failed to fetch ${url}: ${response.status}`);
            return [];
        }
        
        const xml = await response.text();
        const items = parseRSS(xml);
        console.log(`✅ ${url}: ${items.length} articles`);
        return items;
    } catch (error) {
        console.log(`❌ ${url}: ${error.message}`);
        return [];
    }
}

// Remove duplicates
function removeDuplicates(articles) {
    const seen = new Set();
    return articles.filter(article => {
        const key = article.title.toLowerCase().trim();
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
    });
}

// Main handler
addEventListener('fetch', event => {
    event.respondWith(handleRequest(event.request));
});

async function handleRequest(request) {
    // Enable CORS
    const corsHeaders = {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Content-Type': 'application/json'
    };
    
    // Handle CORS preflight
    if (request.method === 'OPTIONS') {
        return new Response(null, { headers: corsHeaders });
    }
    
    const url = new URL(request.url);
    
    // Root endpoint - API info
    if (url.pathname === '/') {
        return new Response(JSON.stringify({
            name: 'CaptainNews.gr RSS Worker',
            version: '1.0.0',
            endpoints: {
                news: '/api/news'
            }
        }), { headers: corsHeaders });
    }
    
    // News endpoint
    if (url.pathname === '/api/news') {
        try {
            const allCategories = {};
            let totalArticles = 0;
            
            // Fetch all feeds for each category
            for (const [key, category] of Object.entries(RSS_FEEDS)) {
                const feedPromises = category.feeds.map(url => fetchFeed(url));
                const results = await Promise.all(feedPromises);
                
                // Combine and dedupe
                let articles = results.flat();
                articles = removeDuplicates(articles);
                
                // Sort by date (newest first)
                articles.sort((a, b) => new Date(b.pubDate) - new Date(a.pubDate));
                
                totalArticles += articles.length;
                
                allCategories[key] = {
                    ...category,
                    articles: articles
                };
            }
            
            return new Response(JSON.stringify({
                success: true,
                totalArticles: totalArticles,
                data: allCategories
            }), { headers: corsHeaders });
            
        } catch (error) {
            return new Response(JSON.stringify({
                success: false,
                error: error.message
            }), { 
                status: 500,
                headers: corsHeaders 
            });
        }
    }
    
    // 404
    return new Response('Not Found', { 
        status: 404,
        headers: corsHeaders 
    });
}
