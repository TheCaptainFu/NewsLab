const Parser = require('rss-parser');
const fs = require('fs');

// RSS Feed Categories (copied from main.js)
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
            'http://feeds.bbci.co.uk/news/world/rss.xml',
            'http://feeds.reuters.com/Reuters/worldNews'
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

// Initialize RSS Parser with custom fields
const parser = new Parser({
    timeout: 5000,
    customFields: {
        item: [
            ['media:content', 'media:content'],
            ['media:thumbnail', 'media:thumbnail'],
            ['content:encoded', 'contentEncoded']
        ]
    }
});

// Extract image from RSS item (multiple methods)
function extractImage(item) {
    // 1. Try enclosure (podcast/image attachments)
    if (item.enclosure && item.enclosure.url) {
        const type = item.enclosure.type || '';
        if (type.startsWith('image/') || !type) {
            return item.enclosure.url;
        }
    }
    
    // 2. Try media:content
    if (item['media:content'] && item['media:content']['$'] && item['media:content']['$'].url) {
        return item['media:content']['$'].url;
    }
    
    // 3. Try media:thumbnail
    if (item['media:thumbnail'] && item['media:thumbnail']['$'] && item['media:thumbnail']['$'].url) {
        return item['media:thumbnail']['$'].url;
    }
    
    // 4. Try content:encoded with regex
    if (item.contentEncoded) {
        const imgMatch = item.contentEncoded.match(/<img[^>]+src=["']([^"']+)["']/i);
        if (imgMatch) return imgMatch[1];
    }
    
    // 5. Try content field with regex
    if (item.content) {
        const imgMatch = item.content.match(/<img[^>]+src=["']([^"']+)["']/i);
        if (imgMatch) return imgMatch[1];
    }
    
    // 6. Try description with regex
    if (item.description || item.summary) {
        const desc = item.description || item.summary;
        const imgMatch = desc.match(/<img[^>]+src=["']([^"']+)["']/i);
        if (imgMatch) return imgMatch[1];
    }
    
    return null;
}

// Extract source name from URL or feed title
function getSourceName(url, feedTitle) {
    // Try to get from feed title first
    if (feedTitle) {
        // Clean up common RSS feed title patterns
        const cleaned = feedTitle
            .replace(/^\s*RSS\s*[-–—]\s*/i, '')
            .replace(/\s*RSS\s*Feed\s*$/i, '')
            .replace(/\s*-\s*.*$/, '')
            .trim();
        if (cleaned) return cleaned;
    }
    
    // Extract domain from URL
    try {
        const urlObj = new URL(url);
        let domain = urlObj.hostname.replace(/^www\./, '');
        
        // Map common domains to readable names
        const domainMap = {
            'newsit.gr': 'NewsIT',
            'protothema.gr': 'Πρώτο Θέμα',
            'in.gr': 'In.gr',
            'ethnos.gr': 'Εθνος',
            'tanea.gr': 'Τα Νέα',
            'naftemporiki.gr': 'Ναυτεμπορική',
            'tovima.gr': 'Το Βήμα',
            'euronews.com': 'Euronews',
            'dw.com': 'DW',
            'bbci.co.uk': 'BBC',
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
        
        if (domainMap[domain]) {
            return domainMap[domain];
        }
        
        // Fallback: capitalize first letter
        return domain.split('.')[0].charAt(0).toUpperCase() + domain.split('.')[0].slice(1);
    } catch (e) {
        return 'Άγνωστη πηγή';
    }
}

// Fetch single RSS feed with timeout
async function fetchFeed(url) {
    try {
        console.log(`  Fetching: ${url}`);
        const feed = await parser.parseURL(url);
        const sourceName = getSourceName(url, feed.title);
        
        const articles = feed.items.map(item => ({
            title: item.title || '',
            link: item.link || item.guid || '',
            pubDate: item.pubDate || item.isoDate || new Date().toISOString(),
            description: item.contentSnippet || item.description || '',
            thumbnail: extractImage(item),
            source: sourceName
        })).filter(article => article.title && article.link);
        
        console.log(`    ✅ ${articles.length} articles from ${sourceName}`);
        return articles;
    } catch (error) {
        console.error(`    ❌ Failed: ${error.message}`);
        return [];
    }
}

// Remove duplicate articles (by title)
function removeDuplicates(articles) {
    const seen = new Set();
    return articles.filter(article => {
        const normalizedTitle = article.title.toLowerCase().trim();
        if (seen.has(normalizedTitle)) {
            return false;
        }
        seen.add(normalizedTitle);
        return true;
    });
}

// Main aggregation function
async function aggregateNews() {
    console.log('🚀 CaptainNews RSS Aggregator Started');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
    
    const startTime = Date.now();
    const allCategories = {};
    let totalArticles = 0;
    let totalFeeds = 0;
    let successfulFeeds = 0;
    
    // Process each category
    for (const [key, category] of Object.entries(RSS_FEEDS)) {
        console.log(`📂 ${category.title}`);
        
        const categoryPromises = category.feeds.map(url => fetchFeed(url));
        const results = await Promise.allSettled(categoryPromises);
        
        // Combine all articles from this category
        let allArticles = results
            .filter(result => result.status === 'fulfilled')
            .flatMap(result => result.value);
        
        totalFeeds += category.feeds.length;
        successfulFeeds += results.filter(r => r.status === 'fulfilled' && r.value.length > 0).length;
        
        // Remove duplicates
        const beforeDedupe = allArticles.length;
        allArticles = removeDuplicates(allArticles);
        
        // Sort by date (newest first)
        allArticles.sort((a, b) => {
            try {
                return new Date(b.pubDate) - new Date(a.pubDate);
            } catch (e) {
                return 0;
            }
        });
        
        // Limit to top 30 articles per category
        allArticles = allArticles.slice(0, 30);
        
        totalArticles += allArticles.length;
        
        console.log(`  📊 ${allArticles.length} articles (removed ${beforeDedupe - allArticles.length} duplicates)\n`);
        
        allCategories[key] = {
            title: category.title,
            color: category.color,
            articles: allArticles
        };
    }
    
    // Add metadata
    const newsData = {
        lastUpdated: new Date().toISOString(),
        totalArticles,
        totalFeeds,
        successfulFeeds,
        categories: allCategories
    };
    
    // Save to JSON file
    fs.writeFileSync('news.json', JSON.stringify(newsData, null, 2));
    
    const totalTime = ((Date.now() - startTime) / 1000).toFixed(2);
    
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('📈 AGGREGATION COMPLETE');
    console.log(`   ✅ Successful feeds: ${successfulFeeds}/${totalFeeds}`);
    console.log(`   📰 Total articles: ${totalArticles}`);
    console.log(`   ⏱️  Total time: ${totalTime}s`);
    console.log(`   💾 Saved to: news.json`);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
}

// Run aggregation
aggregateNews().catch(error => {
    console.error('❌ Fatal error:', error);
    process.exit(1);
});
