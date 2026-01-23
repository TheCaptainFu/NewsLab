// DOM Elements
// const fetchBtn = document.getElementById('fetchBtn'); // Commented out - using auto-refresh
const container = document.getElementById('newsContainer');
const loading = document.getElementById('loading');
const categorySelect = document.getElementById('categorySelect');

// Store all articles and track visible count per category
let allCategories = {};
let visibleCount = {};
let selectedCategory = 'all'; // Track selected category
let autoRefreshInterval = null; // Store interval ID for auto-refresh
let newArticlesCount = 0; // Track new articles available
let latestArticleIds = new Set(); // Track current article IDs
let pendingCategories = null; // Store new articles ready to load

// CORS Proxies (multiple for reliability)
const CORS_PROXIES = [
    'https://api.allorigins.win/raw?url=',
    'https://api.codetabs.com/v1/proxy?quest='
];

// RSS Feed Categories
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

// Parse RSS XML directly
function parseRSSXML(xmlText) {
    const parser = new DOMParser();
    const xml = parser.parseFromString(xmlText, 'text/xml');
    
    // Check for parsing errors
    const parseError = xml.querySelector('parsererror');
    if (parseError) {
        throw new Error('XML parsing failed');
    }
    
    const items = [];
    const itemElements = xml.querySelectorAll('item');
    
    itemElements.forEach(item => {
        try {
            const title = item.querySelector('title')?.textContent || '';
            const link = item.querySelector('link')?.textContent || '';
            const pubDate = item.querySelector('pubDate')?.textContent || 
                          item.querySelector('date')?.textContent ||
                          item.querySelector('dc\\:date')?.textContent ||
                          new Date().toISOString();
            
            // Get description from multiple possible fields
            let description = item.querySelector('description')?.textContent || 
                            item.querySelector('content\\:encoded')?.textContent ||
                            item.querySelector('summary')?.textContent || '';
            
            // ULTRA COMPREHENSIVE IMAGE EXTRACTION (15+ methods)
            let thumbnail = null;
            
            // 1. Try media:content (most common in news feeds)
            if (!thumbnail) {
                const mediaContent = item.querySelector('media\\:content, [*|content]');
                if (mediaContent) {
                    thumbnail = mediaContent.getAttribute('url') || 
                               mediaContent.getAttribute('medium') ||
                               null;
                }
            }
            
            // 2. Try media:thumbnail
            if (!thumbnail) {
                const mediaThumbnail = item.querySelector('media\\:thumbnail, [*|thumbnail]');
                if (mediaThumbnail) {
                    thumbnail = mediaThumbnail.getAttribute('url');
                }
            }
            
            // 3. Try enclosure (podcasts/images)
            if (!thumbnail) {
                const enclosure = item.querySelector('enclosure');
                if (enclosure) {
                    const url = enclosure.getAttribute('url');
                    const type = enclosure.getAttribute('type') || '';
                    // Accept any enclosure if no type specified, or if it's an image
                    if (url && (type.startsWith('image/') || !type)) {
                        thumbnail = url;
                    }
                }
            }
            
            // 4. Try itemprop="image" or thumbnailUrl
            if (!thumbnail) {
                const itemProp = item.querySelector('[itemprop="image"], [itemprop="thumbnailUrl"]');
                if (itemProp) {
                    thumbnail = itemProp.getAttribute('content') || 
                               itemProp.getAttribute('src') || 
                               itemProp.getAttribute('href');
                }
            }
            
            // 5. Try content:encoded with multiple patterns
            if (!thumbnail) {
                const contentEncoded = item.querySelector('content\\:encoded');
                if (contentEncoded) {
                    const content = contentEncoded.textContent;
                    
                    // Try img src
                    let imgMatch = content.match(/<img[^>]+src=["']([^"']+)["']/i);
                    if (imgMatch) {
                        thumbnail = imgMatch[1];
                    }
                    
                    // Try data-src (lazy loading)
                    if (!thumbnail) {
                        imgMatch = content.match(/<img[^>]+data-src=["']([^"']+)["']/i);
                        if (imgMatch) thumbnail = imgMatch[1];
                    }
                    
                    // Try srcset (responsive images)
                    if (!thumbnail) {
                        imgMatch = content.match(/srcset=["']([^"'\s]+)/i);
                        if (imgMatch) thumbnail = imgMatch[1];
                    }
                }
            }
            
            // 6. Try description with multiple patterns
            if (!thumbnail && description) {
                // Try img src
                let imgMatch = description.match(/<img[^>]+src=["']([^"']+)["']/i);
                if (imgMatch) {
                    thumbnail = imgMatch[1];
                }
                
                // Try data-src (lazy loading)
                if (!thumbnail) {
                    imgMatch = description.match(/<img[^>]+data-src=["']([^"']+)["']/i);
                    if (imgMatch) thumbnail = imgMatch[1];
                }
                
                // Try background-image in style
                if (!thumbnail) {
                    imgMatch = description.match(/background-image:\s*url\(['"]?([^'")\s]+)['"]?\)/i);
                    if (imgMatch) thumbnail = imgMatch[1];
                }
            }
            
            // 7. Try og:image meta tag
            if (!thumbnail && description) {
                const ogMatch = description.match(/property=["']og:image["'][^>]+content=["']([^"']+)["']/i) ||
                               description.match(/content=["']([^"']+)["'][^>]+property=["']og:image["']/i);
                if (ogMatch) {
                    thumbnail = ogMatch[1];
                }
            }
            
            // 8. Try twitter:image meta tag
            if (!thumbnail && description) {
                const twitterMatch = description.match(/name=["']twitter:image["'][^>]+content=["']([^"']+)["']/i) ||
                                    description.match(/content=["']([^"']+)["'][^>]+name=["']twitter:image["']/i);
                if (twitterMatch) {
                    thumbnail = twitterMatch[1];
                }
            }
            
            // 9. Look for figure/img combinations
            if (!thumbnail && description) {
                const figureMatch = description.match(/<figure[^>]*>.*?<img[^>]+src=["']([^"']+)["']/is);
                if (figureMatch) {
                    thumbnail = figureMatch[1];
                }
            }
            
            // 10. Try link rel="image_src"
            if (!thumbnail && description) {
                const linkMatch = description.match(/<link[^>]+rel=["']image_src["'][^>]+href=["']([^"']+)["']/i) ||
                                 description.match(/<link[^>]+href=["']([^"']+)["'][^>]+rel=["']image_src["']/i);
                if (linkMatch) {
                    thumbnail = linkMatch[1];
                }
            }
            
            // 11. Look for any HTTPS image URL in CDATA
            if (!thumbnail && description) {
                const cdataMatch = description.match(/<!\[CDATA\[.*?(https?:\/\/[^\s<>"]+?\.(?:jpg|jpeg|png|gif|webp|svg)[^\s<>"]*)/is);
                if (cdataMatch) {
                    thumbnail = cdataMatch[1];
                }
            }
            
            // 12. Try direct image URL patterns (without CDATA)
            if (!thumbnail && description) {
                const urlMatch = description.match(/(https?:\/\/[^\s<>"']+?\.(?:jpg|jpeg|png|gif|webp)(?:\?[^\s<>"']*)?)/i);
                if (urlMatch) {
                    thumbnail = urlMatch[1];
                }
            }
            
            // 13. Try thumbnail field (some feeds use this)
            if (!thumbnail) {
                const thumbField = item.querySelector('thumbnail, image, img');
                if (thumbField) {
                    thumbnail = thumbField.getAttribute('url') || 
                               thumbField.getAttribute('href') || 
                               thumbField.textContent?.trim();
                }
            }
            
            // 14. Try WordPress featured image
            if (!thumbnail) {
                const wpImage = item.querySelector('wp\\:featuredImage, [*|featuredImage]');
                if (wpImage) {
                    thumbnail = wpImage.textContent?.trim();
                }
            }
            
            // 15. Try any element with "image" in tag name or attribute
            if (!thumbnail) {
                const imageElem = item.querySelector('[*|image], [image], [thumbnail]');
                if (imageElem) {
                    thumbnail = imageElem.getAttribute('url') || 
                               imageElem.getAttribute('src') || 
                               imageElem.getAttribute('href') ||
                               imageElem.textContent?.trim();
                }
            }
            
            // Clean up thumbnail URL
            if (thumbnail) {
                thumbnail = thumbnail.trim();
                // Remove HTML entities
                thumbnail = thumbnail.replace(/&amp;/g, '&');
                // Ensure it's a valid URL
                if (!thumbnail.startsWith('http')) {
                    thumbnail = null;
                }
                // Remove query params that might break the image (optional)
                // thumbnail = thumbnail.split('?')[0];
            }
            
            if (title && link) {
                items.push({
                    title: title.trim(),
                    link: link.trim(),
                    pubDate: pubDate,
                    description: description.trim(),
                    thumbnail: thumbnail,
                    needsImageFetch: !thumbnail // Flag articles that need image fetching
                });
                
                // Debug: Log articles without images (uncomment to debug)
                // if (!thumbnail) {
                //     console.warn('⚠️ No image found for:', title.substring(0, 50) + '...');
                // }
            }
        } catch (error) {
            console.warn('Failed to parse item:', error);
        }
    });
    
    return items;
}

// Fetch og:image from article page when RSS doesn't provide image
async function fetchArticleImage(articleUrl) {
    try {
        // Use CORS proxy to fetch the article page
        const proxy = CORS_PROXIES[0];
        const proxyUrl = proxy + encodeURIComponent(articleUrl);
        
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 5000);
        
        const response = await fetch(proxyUrl, {
            signal: controller.signal,
            cache: 'force-cache' // Cache to avoid repeated fetches
        });
        
        clearTimeout(timeoutId);
        
        if (!response.ok) return null;
        
        const html = await response.text();
        
        // Try multiple meta tag patterns
        let imageUrl = null;
        
        // 1. Try og:image (most common)
        let match = html.match(/<meta[^>]+property=["']og:image["'][^>]+content=["']([^"']+)["']/i);
        if (match) imageUrl = match[1];
        
        // 2. Try reversed order
        if (!imageUrl) {
            match = html.match(/<meta[^>]+content=["']([^"']+)["'][^>]+property=["']og:image["']/i);
            if (match) imageUrl = match[1];
        }
        
        // 3. Try twitter:image
        if (!imageUrl) {
            match = html.match(/<meta[^>]+name=["']twitter:image["'][^>]+content=["']([^"']+)["']/i);
            if (match) imageUrl = match[1];
        }
        
        // 4. Try itemprop="image"
        if (!imageUrl) {
            match = html.match(/<meta[^>]+itemprop=["']image["'][^>]+content=["']([^"']+)["']/i);
            if (match) imageUrl = match[1];
        }
        
        // 5. Try first img tag in article content
        if (!imageUrl) {
            match = html.match(/<article[^>]*>[\s\S]*?<img[^>]+src=["']([^"']+)["']/i);
            if (match) imageUrl = match[1];
        }
        
        // Validate and clean URL
        if (imageUrl) {
            imageUrl = imageUrl.trim();
            // Make relative URLs absolute
            if (imageUrl.startsWith('//')) {
                imageUrl = 'https:' + imageUrl;
            } else if (imageUrl.startsWith('/')) {
                const urlObj = new URL(articleUrl);
                imageUrl = urlObj.origin + imageUrl;
            }
            
            if (imageUrl.startsWith('http')) {
                return imageUrl;
            }
        }
        
        return null;
    } catch (error) {
        return null; // Silent fail - this is a best-effort feature
    }
}

// Fetch missing images in batches (non-blocking)
async function fetchMissingImages(categories) {
    const articlesToFetch = [];
    
    // Collect articles without images (limit to avoid too many requests)
    for (const [key, category] of Object.entries(categories)) {
        category.articles.forEach((article, index) => {
            if (article.needsImageFetch && index < 10) { // Only first 10 per category
                articlesToFetch.push({ key, article });
            }
        });
    }
    
    if (articlesToFetch.length === 0) return categories;
    
    console.log(`🔍 Fetching images for ${articlesToFetch.length} articles from their pages...`);
    
    // Fetch images in batches of 5 to avoid overwhelming the browser
    const batchSize = 5;
    let fetchedCount = 0;
    
    for (let i = 0; i < articlesToFetch.length; i += batchSize) {
        const batch = articlesToFetch.slice(i, i + batchSize);
        
        await Promise.all(batch.map(async ({ key, article }) => {
            const imageUrl = await fetchArticleImage(article.link);
            if (imageUrl) {
                article.thumbnail = imageUrl;
                article.needsImageFetch = false;
                fetchedCount++;
            }
        }));
        
        // Small delay between batches
        if (i + batchSize < articlesToFetch.length) {
            await new Promise(resolve => setTimeout(resolve, 500));
        }
    }
    
    if (fetchedCount > 0) {
        console.log(`✅ Found ${fetchedCount} additional images from article pages!`);
    }
    
    return categories;
}

// Show floating "New Articles" button
function showNewArticlesButton(count) {
    // Remove existing button if any
    const existing = document.getElementById('new-articles-btn');
    if (existing) {
        existing.remove();
    }
    
    if (count === 0) return;
    
    // Create floating button
    const button = document.createElement('button');
    button.id = 'new-articles-btn';
    button.onclick = () => {
        loadNewArticles();
        button.remove();
    };
    
    button.style.cssText = `
        position: fixed;
        top: 80px;
        left: 50%;
        transform: translateX(-50%);
        z-index: 9999;
        padding: 12px 24px;
        background: linear-gradient(135deg, #3b82f6, #2563eb);
        color: white;
        border: none;
        border-radius: 50px;
        font-size: 14px;
        font-weight: 600;
        cursor: pointer;
        box-shadow: 0 4px 12px rgba(59, 130, 246, 0.4);
        animation: slideDownBounce 0.5s ease-out;
        transition: all 0.3s ease;
    `;
    
    button.innerHTML = `
        <span style="display: flex; align-items: center; gap: 8px;">
            <span style="font-size: 16px;">🔔</span>
            <span>Νέες ειδήσεις διαθέσιμες (${count})</span>
            <span style="font-size: 12px; opacity: 0.8;">↑</span>
        </span>
    `;
    
    // Hover effect
    button.onmouseenter = () => {
        button.style.transform = 'translateX(-50%) scale(1.05)';
        button.style.boxShadow = '0 6px 16px rgba(59, 130, 246, 0.6)';
    };
    button.onmouseleave = () => {
        button.style.transform = 'translateX(-50%) scale(1)';
        button.style.boxShadow = '0 4px 12px rgba(59, 130, 246, 0.4)';
    };
    
    // Add animation style if not exists
    if (!document.getElementById('new-articles-styles')) {
        const style = document.createElement('style');
        style.id = 'new-articles-styles';
        style.textContent = `
            @keyframes slideDownBounce {
                0% {
                    transform: translateX(-50%) translateY(-100px);
                    opacity: 0;
                }
                60% {
                    transform: translateX(-50%) translateY(10px);
                    opacity: 1;
                }
                80% {
                    transform: translateX(-50%) translateY(-5px);
                }
                100% {
                    transform: translateX(-50%) translateY(0);
                }
            }
        `;
        document.head.appendChild(style);
    }
    
    document.body.appendChild(button);
}

// Load new articles when button is clicked
function loadNewArticles() {
    console.log('📥 Loading new articles...');
    newArticlesCount = 0;
    
    if (pendingCategories) {
        // Use pre-loaded articles
        allCategories = pendingCategories;
        pendingCategories = null;
        
        // Update article IDs
        latestArticleIds.clear();
        Object.values(allCategories).forEach(cat => {
            cat.articles.forEach(article => {
                const articleId = article.link + article.title;
                latestArticleIds.add(articleId);
            });
        });
        
        // Save to cache
        saveCacheNews(allCategories);
        
        // Reset visible count
        visibleCount = {};
        
        // Remove old cache info
        const cacheInfo = document.getElementById('cacheInfo');
        if (cacheInfo) cacheInfo.remove();
        
        // Render new content
        renderNews(allCategories);
        updateCacheTimeDisplay();
        
        // Smooth scroll to top
        window.scrollTo({ top: 0, behavior: 'smooth' });
        
        console.log('✅ New articles loaded!');
    }
}

// Check for new articles in background (without updating UI)
async function checkForNewArticles() {
    try {
        console.log('🔍 Checking for new articles in background...');
        
        const newCategories = {};
        
        // 🚀 Fetch ALL feeds in parallel (same ultra-fast approach)
        const allFeedPromises = [];
        const feedToCategoryMap = new Map();
        let feedIndex = 0;
        
        Object.entries(RSS_FEEDS).forEach(([key, category]) => {
            category.feeds.forEach(url => {
                const promise = fetchRSSFeed(url).catch(() => []);
                allFeedPromises.push(promise);
                feedToCategoryMap.set(feedIndex++, { key, categoryTitle: category.title });
            });
        });
        
        const allResults = await Promise.allSettled(allFeedPromises);
        
        // Organize by category
        const categoryResults = {};
        Object.keys(RSS_FEEDS).forEach(key => {
            categoryResults[key] = [];
        });
        
        allResults.forEach((result, index) => {
            const feedInfo = feedToCategoryMap.get(index);
            const articles = result.status === 'fulfilled' ? result.value : [];
            categoryResults[feedInfo.key].push(articles);
        });
        
        // Process each category
        Object.entries(RSS_FEEDS).forEach(([key, category]) => {
            let allArticles = categoryResults[key].flat();
            allArticles = removeDuplicates(allArticles);
            allArticles.sort((a, b) => {
                try {
                    return new Date(b.pubDate) - new Date(a.pubDate);
                } catch (e) {
                    return 0;
                }
            });
            
            newCategories[key] = {
                ...category,
                articles: allArticles
            };
        });
        
        // Compare with current articles
        const newArticleIds = new Set();
        let newCount = 0;
        
        Object.values(newCategories).forEach(cat => {
            cat.articles.forEach(article => {
                const articleId = article.link + article.title;
                newArticleIds.add(articleId);
                
                // If this article wasn't in the old set, it's new!
                if (!latestArticleIds.has(articleId)) {
                    newCount++;
                }
            });
        });
        
        if (newCount > 0) {
            console.log(`✨ Found ${newCount} new articles!`);
            newArticlesCount = newCount;
            
            // Store the new categories for quick loading
            pendingCategories = newCategories;
            
            // Show the button
            showNewArticlesButton(newCount);
        } else {
            console.log('📭 No new articles found');
        }
        
    } catch (error) {
        console.error('⚠️ Error checking for new articles:', error);
    }
}

// Show notification banner at top of page
function showNotification(message, type = 'info', duration = 3000) {
    // Remove existing notification if any
    const existing = document.getElementById('notification-banner');
    if (existing) {
        existing.remove();
    }
    
    // Create notification banner
    const banner = document.createElement('div');
    banner.id = 'notification-banner';
    banner.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        right: 0;
        z-index: 9999;
        padding: 12px 20px;
        text-align: center;
        font-size: 14px;
        font-weight: 500;
        box-shadow: 0 4px 6px rgba(0, 0, 0, 0.3);
        animation: slideDown 0.3s ease-out;
        backdrop-filter: blur(10px);
    `;
    
    // Set colors based on type
    if (type === 'success') {
        banner.style.background = 'linear-gradient(135deg, rgba(34, 197, 94, 0.95), rgba(22, 163, 74, 0.95))';
        banner.style.color = 'white';
    } else if (type === 'info') {
        banner.style.background = 'linear-gradient(135deg, rgba(59, 130, 246, 0.95), rgba(37, 99, 235, 0.95))';
        banner.style.color = 'white';
    } else if (type === 'warning') {
        banner.style.background = 'linear-gradient(135deg, rgba(251, 191, 36, 0.95), rgba(245, 158, 11, 0.95))';
        banner.style.color = 'white';
    }
    
    banner.innerHTML = message;
    
    // Add animation style
    const style = document.createElement('style');
    style.textContent = `
        @keyframes slideDown {
            from {
                transform: translateY(-100%);
                opacity: 0;
            }
            to {
                transform: translateY(0);
                opacity: 1;
            }
        }
        @keyframes slideUp {
            from {
                transform: translateY(0);
                opacity: 1;
            }
            to {
                transform: translateY(-100%);
                opacity: 0;
            }
        }
    `;
    if (!document.getElementById('notification-styles')) {
        style.id = 'notification-styles';
        document.head.appendChild(style);
    }
    
    document.body.appendChild(banner);
    
    // Auto remove after duration
    if (duration > 0) {
        setTimeout(() => {
            banner.style.animation = 'slideUp 0.3s ease-in';
            setTimeout(() => banner.remove(), 300);
        }, duration);
    }
}

// Fetch RSS feed with multiple CORS proxy fallback and retry logic
async function fetchRSSFeed(url, retryCount = 0) {
    const maxRetries = 2;
    const timeout = 8000; // Increased to 8 seconds for reliability
    
    // Try each proxy in sequence
    for (let proxyIndex = 0; proxyIndex < CORS_PROXIES.length; proxyIndex++) {
        const proxy = CORS_PROXIES[proxyIndex];
        const proxyUrl = proxy + encodeURIComponent(url);
        
        try {
            // Create abort controller for timeout
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), timeout);
            
            const response = await fetch(proxyUrl, {
                headers: {
                    'Accept': 'application/rss+xml, application/xml, text/xml, */*',
                    'User-Agent': 'Mozilla/5.0 (compatible; NewsAggregator/1.0)'
                },
                signal: controller.signal,
                cache: 'no-cache'
            });
            
            clearTimeout(timeoutId);
            
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}`);
            }
            
            const xmlText = await response.text();
            
            // Validate XML content
            if (!xmlText || xmlText.trim().length < 100) {
                throw new Error('Empty or invalid response');
            }
            
            const items = parseRSSXML(xmlText);
            
            if (items.length === 0) {
                throw new Error('No items parsed from feed');
            }
            
            console.log(`✅ ${url.split('/')[2]}: ${items.length} articles`);
            return items;
            
        } catch (error) {
            const errorMsg = error.name === 'AbortError' ? 'timeout' : error.message;
            
            // If this is the last proxy and we haven't exceeded retries, retry
            if (proxyIndex === CORS_PROXIES.length - 1 && retryCount < maxRetries) {
                console.warn(`⚠️ ${url.split('/')[2]}: ${errorMsg} (retry ${retryCount + 1}/${maxRetries})`);
                await new Promise(resolve => setTimeout(resolve, 1000 * (retryCount + 1))); // Exponential backoff
                return fetchRSSFeed(url, retryCount + 1);
            }
            
            // If not the last proxy, try next one
            if (proxyIndex < CORS_PROXIES.length - 1) {
                console.warn(`⚠️ ${url.split('/')[2]}: ${errorMsg} (trying next proxy...)`);
                continue;
            }
            
            // All proxies failed
            console.error(`❌ ${url.split('/')[2]}: All proxies failed - ${errorMsg}`);
        }
    }
    
    return []; // Return empty array if all attempts failed
}

// Load cached articles from localStorage
function loadCachedNews() {
    try {
        const cached = localStorage.getItem('newsCache');
        const cacheTime = localStorage.getItem('newsCacheTime');
        
        if (cached && cacheTime) {
            const categories = JSON.parse(cached);
            const cachedDate = new Date(parseInt(cacheTime));
            
            // Check if cache is less than 10 minutes old (for better UX)
            const cacheAge = Date.now() - parseInt(cacheTime);
            const isFresh = cacheAge < 600000; // 10 minutes
            
            renderNews(categories);
            
            // Show cache info
            updateCacheTimeDisplay();
            
            if (isFresh) {
                console.log('📦 Using fresh cache (< 10 min old)');
            } else {
                console.log('📦 Using cached data (consider refresh for latest news)');
            }
            
            return true;
        }
        return false;
    } catch (error) {
        console.error('Error loading cache:', error);
        return false;
    }
}

// Function to update or create the cache time display
function updateCacheTimeDisplay() {
    const cacheTime = localStorage.getItem('newsCacheTime');
    if (!cacheTime) return;
    
    const cachedDate = new Date(parseInt(cacheTime));
    
    // Remove old cache info if exists
    let cacheInfo = document.getElementById('cacheInfo');
    if (cacheInfo) {
        cacheInfo.remove();
    }
    
    // Create new cache info
    cacheInfo = document.createElement('div');
    cacheInfo.id = 'cacheInfo';
    cacheInfo.className = 'text-center text-zinc-500 text-xs py-2';
    cacheInfo.innerHTML = `📦 Cached νέα από: ${cachedDate.toLocaleString('el-GR')} | <button onclick="getNews()" class="text-blue-400 hover:underline">Ανανέωση τώρα</button>`;
    container.insertAdjacentElement('beforebegin', cacheInfo);
}

// Save articles to localStorage
function saveCacheNews(categories) {
    try {
        localStorage.setItem('newsCache', JSON.stringify(categories));
        localStorage.setItem('newsCacheTime', Date.now().toString());
    } catch (error) {
        console.error('Error saving cache:', error);
    }
}

// Remove duplicate articles by title
function removeDuplicates(articles) {
    const seen = new Set();
    return articles.filter(article => {
        // Normalize title (lowercase, trim) for better matching
        const normalizedTitle = article.title.toLowerCase().trim();
        
        if (seen.has(normalizedTitle)) {
            return false; // Duplicate found, skip it
        }
        seen.add(normalizedTitle);
        return true;
    });
}

async function getNews(isAutoRefresh = false) {
    // If it's an auto-refresh and loading is visible, skip
    if (isAutoRefresh && !loading.classList.contains('hidden')) {
        console.log('⏭️ Skipping auto-refresh (already loading)');
        return;
    }
    
    // For auto-refresh: load in background, don't show loading state
    if (!isAutoRefresh) {
        loading.classList.remove('hidden');
        container.innerHTML = '';
        
        // Reset visible count for all categories
        visibleCount = {};
        
        // Remove cache info if exists (will be recreated with new timestamp)
        const cacheInfo = document.getElementById('cacheInfo');
        if (cacheInfo) cacheInfo.remove();
    } else {
        // Background refresh - don't clear content, just log
        console.log('🔄 Background refresh started...');
    }

    try {
        const allCategories = {};
        
        console.log('🚀 Fetching RSS feeds directly...');
        console.log('⚡ ULTRA PARALLEL MODE: Loading ALL 24 feeds simultaneously!');
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        
        let totalArticles = 0;
        let totalFeeds = 0;
        let successfulFeeds = 0;
        
        // 🚀 Create array of ALL feed promises from ALL categories at once
        const allFeedPromises = [];
        const feedToCategoryMap = new Map();
        let feedIndex = 0;
        
        Object.entries(RSS_FEEDS).forEach(([key, category]) => {
            category.feeds.forEach(url => {
                totalFeeds++;
                const promise = fetchRSSFeed(url).catch(error => {
                    return [];
                });
                allFeedPromises.push(promise);
                feedToCategoryMap.set(feedIndex++, { key, categoryTitle: category.title, url });
            });
        });
        
        // ⚡ Fetch ALL 24 feeds in parallel (MAXIMUM SPEED!)
        const startTime = Date.now();
        const allResults = await Promise.allSettled(allFeedPromises);
        const loadTime = ((Date.now() - startTime) / 1000).toFixed(2);
        
        console.log(`\n⚡ Loaded ${totalFeeds} feeds in ${loadTime}s (parallel)`);
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
        
        // Organize results by category
        const categoryResults = {};
        Object.keys(RSS_FEEDS).forEach(key => {
            categoryResults[key] = [];
        });
        
        allResults.forEach((result, index) => {
            const feedInfo = feedToCategoryMap.get(index);
            const articles = result.status === 'fulfilled' ? result.value : [];
            categoryResults[feedInfo.key].push({
                url: feedInfo.url,
                articles: articles,
                success: articles.length > 0
            });
        });
        
        // Process each category's results
        Object.entries(RSS_FEEDS).forEach(([key, category]) => {
            const categoryFeeds = categoryResults[key];
            
            console.log(`📂 ${category.title} (${category.feeds.length} feeds)`);
            
            // Combine all articles from this category
            let allArticles = categoryFeeds.flatMap(feed => feed.articles);
            
            // Count successful feeds
            const categorySuccess = categoryFeeds.filter(f => f.success).length;
            successfulFeeds += categorySuccess;
            
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
            
            totalArticles += allArticles.length;
            
            // Calculate statistics
            const duplicatesRemoved = beforeDedupe - allArticles.length;
            const articlesWithImages = allArticles.filter(a => a.thumbnail).length;
            const imagePercentage = allArticles.length > 0 ? Math.round((articlesWithImages / allArticles.length) * 100) : 0;
            const imageStats = ` | 🖼️ ${articlesWithImages}/${allArticles.length} images (${imagePercentage}%)`;
            
            // Logging
            if (categorySuccess === category.feeds.length) {
                console.log(`   ✅ ${categorySuccess}/${category.feeds.length} feeds, ${allArticles.length} articles${duplicatesRemoved > 0 ? ` (-${duplicatesRemoved} dupes)` : ''}${allArticles.length > 0 ? imageStats : ''}`);
            } else if (categorySuccess > 0) {
                console.log(`   ⚠️ ${categorySuccess}/${category.feeds.length} feeds, ${allArticles.length} articles${duplicatesRemoved > 0 ? ` (-${duplicatesRemoved} dupes)` : ''}${allArticles.length > 0 ? imageStats : ''}`);
            } else {
                console.error(`   ❌ 0/${category.feeds.length} feeds working!`);
            }
            
            if (allArticles.length === 0) {
                console.warn(`   ⚠️ No articles! Failed feeds:`);
                categoryFeeds.forEach(feed => {
                    if (!feed.success) {
                        console.warn(`      ❌ ${feed.url}`);
                    }
                });
            }
            
            allCategories[key] = {
                ...category,
                articles: allArticles
            };
        });
        
        // Calculate overall image statistics
        let totalWithImages = 0;
        Object.values(allCategories).forEach(cat => {
            totalWithImages += cat.articles.filter(a => a.thumbnail).length;
        });
        const overallImagePercentage = totalArticles > 0 ? Math.round((totalWithImages / totalArticles) * 100) : 0;
        
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        console.log(`\n📈 SUMMARY:`);
        console.log(`   ✅ Successful feeds: ${successfulFeeds}/${totalFeeds}`);
        console.log(`   📰 Total articles: ${totalArticles}`);
        console.log(`   🖼️ Articles with images: ${totalWithImages}/${totalArticles} (${overallImagePercentage}%)`);
        console.log(`   ${successfulFeeds === totalFeeds ? '✨ All feeds working!' : '⚠️ Some feeds failed - check logs above'}`);
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

        // Fetch missing images from article pages (smart fallback)
        if (!isAutoRefresh) { // Only for manual refresh to avoid too many requests
            await fetchMissingImages(allCategories);
            
            // Recalculate image statistics after fetching
            totalWithImages = 0;
            Object.values(allCategories).forEach(cat => {
                totalWithImages += cat.articles.filter(a => a.thumbnail).length;
            });
            const newImagePercentage = totalArticles > 0 ? Math.round((totalWithImages / totalArticles) * 100) : 0;
            
            console.log(`📊 Updated image coverage: ${totalWithImages}/${totalArticles} (${newImagePercentage}%)`);
        }

        // Save to cache
        saveCacheNews(allCategories);
        
        // Populate dropdown (in case new categories were added)
        populateDropdown();
        
        // Render content (always for manual refresh)
        renderNews(allCategories);
        updateCacheTimeDisplay();
        
        // Track article IDs for new article detection
        latestArticleIds.clear();
        Object.values(allCategories).forEach(cat => {
            cat.articles.forEach(article => {
                const articleId = article.link + article.title;
                latestArticleIds.add(articleId);
            });
        });
        
        // Smooth scroll to top for manual refresh
        if (!isAutoRefresh) {
            window.scrollTo({ top: 0, behavior: 'smooth' });
        }
        
        // Update last refresh time (commented out - no refresh button)
        // updateLastRefreshTime();
        
        // Start background check timer after first successful load
        if (!autoRefreshInterval) {
            startAutoRefresh();
        }

    } catch (error) {
        console.error("❌ Critical error in getNews():", error);
        console.error("Stack trace:", error.stack);
        
        if (isAutoRefresh) {
            // For background refresh: just log error, keep old content
            console.error('⚠️ Auto-refresh failed - will retry in 1 minute');
            console.error('Error details:', error.message);
            container.style.opacity = '1'; // Restore opacity
            
            // Try to load from cache as fallback
            const hasCachedContent = loadCachedNews();
            if (hasCachedContent) {
                console.log('📦 Falling back to cached content');
            }
        } else {
            // For manual refresh: try cache first
            const hasCachedContent = loadCachedNews();
            
            if (hasCachedContent) {
                console.log('📦 Showing cached content after error');
                container.insertAdjacentHTML('afterbegin', `
                    <div class="text-center py-4 bg-yellow-900/20 border border-yellow-700/50 rounded-lg mb-6">
                        <div class="text-yellow-400 text-lg mb-2">⚠️ Σφάλμα φόρτωσης</div>
                        <p class="text-zinc-400 text-sm mb-2">Εμφανίζονται cached νέα</p>
                        <button onclick="getNews()" class="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white px-4 py-2 rounded-lg text-sm transition-all">
                            Δοκιμάστε Ξανά
                        </button>
                    </div>
                `);
            } else {
                // No cache available, show error
                container.innerHTML = `
                    <div class="text-center p-8 bg-[#1a1a1a] border border-red-500/30 rounded-lg">
                        <p class="text-red-400 font-bold mb-2 text-xl">⚠️ Κάτι πήγε στραβά</p>
                        <p class="text-red-300 text-sm mb-1">${error.message}</p>
                        <p class="text-zinc-500 text-xs mb-4">Ελέγξτε τη σύνδεσή σας στο διαδίκτυο</p>
                        <button onclick="getNews()" class="mt-4 bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 text-white px-6 py-2 rounded-lg transition-all">
                            Προσπαθήστε Ξανά
                        </button>
                    </div>`;
            }
        }
    } finally {
        // Hide loading only for manual refresh
        if (!isAutoRefresh) {
            loading.classList.add('hidden');
        }
    }
}

function renderNews(categories) {
    const colorStyles = {
        red: {
            titleClass: 'text-red-400',
            borderHover: 'hover:border-red-500/50',
            titleHover: 'group-hover:text-red-400',
            shadow: 'hover:shadow-red-500/10',
            readMore: 'text-red-400'
        },
        purple: {
            titleClass: 'text-purple-400',
            borderHover: 'hover:border-purple-500/50',
            titleHover: 'group-hover:text-purple-400',
            shadow: 'hover:shadow-purple-500/10',
            readMore: 'text-purple-400'
        },
        green: {
            titleClass: 'text-green-400',
            borderHover: 'hover:border-green-500/50',
            titleHover: 'group-hover:text-green-400',
            shadow: 'hover:shadow-green-500/10',
            readMore: 'text-green-400'
        },
        lime: {
            titleClass: 'text-lime-400',
            borderHover: 'hover:border-lime-500/50',
            titleHover: 'group-hover:text-lime-400',
            shadow: 'hover:shadow-lime-500/10',
            readMore: 'text-lime-400'
        },
        blue: {
            titleClass: 'text-blue-400',
            borderHover: 'hover:border-blue-500/50',
            titleHover: 'group-hover:text-blue-400',
            shadow: 'hover:shadow-blue-500/10',
            readMore: 'text-blue-400'
        },
        pink: {
            titleClass: 'text-pink-400',
            borderHover: 'hover:border-pink-500/50',
            titleHover: 'group-hover:text-pink-400',
            shadow: 'hover:shadow-pink-500/10',
            readMore: 'text-pink-400'
        }
    };

    // Store all categories globally
    allCategories = categories;
    
    // Initialize visible count for each category (9 articles initially)
    for (const key in categories) {
        if (!visibleCount[key]) {
            visibleCount[key] = 9;
        }
    }

    let html = '';

    for (const [key, category] of Object.entries(categories)) {
        // Skip if a specific category is selected and this isn't it
        if (selectedCategory !== 'all' && selectedCategory !== key) continue;
        
        const styles = colorStyles[category.color];
        const totalArticles = category.articles.length;
        const articlesToShow = Math.min(visibleCount[key], totalArticles);
        const articles = category.articles.slice(0, articlesToShow);

        // Show category even if no articles, with a message
        // if (totalArticles === 0) continue;

        html += `
            <section class="mb-12" id="category-${key}">
                <h2 class="text-2xl font-bold ${styles.titleClass} border-b border-zinc-800 pb-3 mb-6 flex items-center gap-2">
                    ${category.title}
                    <span class="text-sm text-zinc-600 font-normal ml-auto">(${articlesToShow}/${totalArticles})</span>
                </h2>
        `;

        // If no articles, show message
        if (totalArticles === 0) {
            html += `
                <div class="text-center p-8 bg-[#1a1a1a] border border-zinc-800 rounded-lg">
                    <p class="text-zinc-500 mb-2">⚠️ Δεν βρέθηκαν άρθρα για αυτή την κατηγορία</p>
                    <p class="text-zinc-600 text-sm">Οι πηγές RSS μπορεί να είναι προσωρινά μη διαθέσιμες</p>
                </div>
            </section>`;
            continue;
        }

        articles.forEach((art, index) => {
            const description = art.description ? stripHtml(art.description).substring(0, 120) + '...' : '';
            const longDescription = art.description ? stripHtml(art.description).substring(0, 250) + '...' : '';
            
            // Parse date (RSS feeds already have correct timezone)
            const date = new Date(art.pubDate);
            
            // Get relative time (e.g., "5 λεπτά πριν", "2 ώρες πριν")
            const relativeTime = getRelativeTime(date);
            
            // Get article image (from various possible sources)
            let thumbnail = art.thumbnail || 
                           (art.enclosure && art.enclosure.thumbnail) || 
                           (art.enclosure && art.enclosure.link) ||
                           null;
            
            // Try to extract image from description HTML if no thumbnail
            if (!thumbnail && art.description) {
                const imgMatch = art.description.match(/<img[^>]+src="([^">]+)"/);
                if (imgMatch) {
                    thumbnail = imgMatch[1];
                }
            }
            
            // If still no image, try content field
            if (!thumbnail && art.content) {
                const imgMatch = art.content.match(/<img[^>]+src="([^">]+)"/);
                if (imgMatch) {
                    thumbnail = imgMatch[1];
                }
            }

            // Determine placeholder icon based on category
            const placeholderIcons = {
                'red': '🚨',     // Breaking News
                'purple': '🏛️',  // Politics Greece
                'blue': '🌍',    // World Politics
                'green': '⚽',    // Sports
                'lime': '☘️',    // Panathinaikos
                'pink': '💻'     // Tech
            };
            const placeholderIcon = placeholderIcons[category.color] || '📰';
            
            // Badge colors for hero article
            const badgeColors = {
                'red': 'bg-red-600',
                'purple': 'bg-purple-600',
                'blue': 'bg-blue-600',
                'green': 'bg-green-600',
                'lime': 'bg-lime-600',
                'pink': 'bg-pink-600'
            };
            const badgeColor = badgeColors[category.color] || 'bg-blue-600';

            // First article = HERO ARTICLE (large, prominent)
            if (index === 0) {
                html += `
                    <div class="mb-8 bg-[#1a1a1a] rounded-xl border border-zinc-800 ${styles.borderHover} transition-all duration-300 hover:shadow-2xl ${styles.shadow} overflow-hidden">
                        <a href="${art.link}" target="_blank" class="block group">
                            <div class="grid md:grid-cols-2 gap-0">
                                ${thumbnail ? `
                                    <div class="relative h-64 md:h-96 overflow-hidden bg-zinc-900 order-1">
                                        <img 
                                            src="${thumbnail}" 
                                            alt="${art.title}"
                                            class="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                                            loading="eager"
                                            onerror="this.parentElement.innerHTML='<div class=\\'w-full h-full flex items-center justify-center bg-gradient-to-br from-zinc-800 to-zinc-900\\'><span class=\\'text-8xl opacity-30\\'>${placeholderIcon}</span></div>'"
                                        />
                                        <div class="absolute top-4 left-4 ${badgeColor} text-white px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wide shadow-lg">
                                            Πρόσφατο
                                        </div>
                                    </div>
                                ` : `
                                    <div class="relative h-64 md:h-96 overflow-hidden bg-gradient-to-br from-zinc-800 to-zinc-900 flex items-center justify-center order-1">
                                        <span class="text-8xl opacity-30 group-hover:scale-110 transition-transform">${placeholderIcon}</span>
                                        <div class="absolute top-4 left-4 ${badgeColor} text-white px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wide shadow-lg">
                                            Πρόσφατο
                                        </div>
                                    </div>
                                `}
                                <div class="p-8 flex flex-col min-h-[300px] order-2">
                                    <h3 class="text-2xl md:text-3xl font-bold text-zinc-100 ${styles.titleHover} transition-colors mb-4 leading-tight">
                                        ${art.title}
                                    </h3>
                                    ${longDescription ? `<p class="text-zinc-400 text-base leading-relaxed mb-6 line-clamp-4">${longDescription}</p>` : ''}
                                    <div class="flex items-center justify-between pt-4 border-t border-zinc-800 mt-auto">
                                        <span class="text-white text-sm font-medium flex items-center gap-2">
                                            <i class="fa-solid fa-clock"></i> ${relativeTime}
                                        </span>
                                        <span class="${styles.readMore} text-sm font-semibold opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-2">
                                            Διαβάστε περισσότερα <i class="fa-solid fa-arrow-right"></i>
                                        </span>
                                    </div>
                                </div>
                            </div>
                        </a>
                    </div>
                    <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4" id="grid-${key}">
                `;
            } 
            // Rest of articles = NORMAL CARDS (smaller, grid layout)
            else {
                html += `
                    <div class="bg-[#1a1a1a] rounded-lg border border-zinc-800 ${styles.borderHover} transition-all duration-200 hover:shadow-xl ${styles.shadow} overflow-hidden">
                        <a href="${art.link}" target="_blank" class="block group">
                            ${thumbnail ? `
                                <div class="relative h-48 overflow-hidden bg-zinc-900">
                                    <img 
                                        src="${thumbnail}" 
                                        alt="${art.title}"
                                        class="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                                        loading="lazy"
                                        onerror="this.parentElement.innerHTML='<div class=\\'w-full h-full flex items-center justify-center bg-gradient-to-br from-zinc-800 to-zinc-900\\'><span class=\\'text-6xl opacity-30\\'>${placeholderIcon}</span></div>'"
                                    />
                                </div>
                            ` : `
                                <div class="relative h-48 overflow-hidden bg-gradient-to-br from-zinc-800 to-zinc-900 flex items-center justify-center">
                                    <span class="text-6xl opacity-30 group-hover:scale-110 transition-transform">${placeholderIcon}</span>
                                </div>
                            `}
                            <div class="p-5 flex flex-col min-h-[200px]">
                                <h3 class="text-base font-bold text-zinc-100 ${styles.titleHover} transition-colors line-clamp-2 mb-3 leading-snug">
                                    ${art.title}
                                </h3>
                                ${description ? `<p class="text-zinc-400 text-sm leading-relaxed mb-3 line-clamp-3">${description}</p>` : ''}
                                <div class="flex items-center justify-between pt-2 border-t border-zinc-800 mt-auto">
                                    <span class="text-white text-xs">🕒 ${relativeTime}</span>
                                    <span class="${styles.readMore} text-xs opacity-0 group-hover:opacity-100 transition-opacity">Διαβάστε →</span>
                                </div>
                            </div>
                        </a>
                    </div>`;
            }
        });

        html += `
                </div>`;
        
        // Add "Load More" button if there are more articles
        if (totalArticles > articlesToShow) {
            const remainingArticles = totalArticles - articlesToShow;
            html += `
                <div class="mt-6 text-center">
                    <button 
                        onclick="loadMoreArticles('${key}')" 
                        class="bg-zinc-800 hover:bg-zinc-700 ${styles.titleClass} px-6 py-3 rounded-lg font-semibold transition-all transform hover:scale-105 active:scale-95 inline-flex items-center gap-2 border border-zinc-700 hover:border-${category.color}-500/50"
                    >
                        <i class="fa-solid fa-plus"></i>
                        Φόρτωση Περισσότερων (${Math.min(9, remainingArticles)} από ${remainingArticles})
                    </button>
                </div>`;
        }
        
        html += `
            </section>
        `;
    }

    container.innerHTML = html;
}

// Helper function to strip HTML tags from descriptions
function stripHtml(html) {
    const tmp = document.createElement('div');
    tmp.innerHTML = html;
    return tmp.textContent || tmp.innerText || '';
}

// Function to calculate relative time in Greek
function getRelativeTime(date) {
    const now = new Date();
    const diffMs = now - date;
    const diffSeconds = Math.floor(diffMs / 1000);
    const diffMinutes = Math.floor(diffSeconds / 60);
    const diffHours = Math.floor(diffMinutes / 60);
    const diffDays = Math.floor(diffHours / 24);
    
    // Handle future dates or very recent (within 30 seconds)
    if (diffSeconds < 30) {
        return 'μόλις τώρα';
    } else if (diffMinutes < 1) {
        return 'πριν από λίγο'; // "a moment ago"
    } else if (diffMinutes < 60) {
        return `${diffMinutes} ${diffMinutes === 1 ? 'λεπτό' : 'λεπτά'} πριν`;
    } else if (diffHours < 24) {
        return `${diffHours} ${diffHours === 1 ? 'ώρα' : 'ώρες'} πριν`;
    } else if (diffDays < 7) {
        return `${diffDays} ${diffDays === 1 ? 'μέρα' : 'μέρες'} πριν`;
    } else {
        // For older articles, show the date
        return date.toLocaleDateString('el-GR', { day: '2-digit', month: '2-digit', year: 'numeric' });
    }
}

// Function to load more articles for a specific category
function loadMoreArticles(categoryKey) {
    // Increase visible count by 9
    visibleCount[categoryKey] += 9;
    
    // Re-render the news
    renderNews(allCategories);
    
    // Scroll to the category
    const categoryElement = document.getElementById(`category-${categoryKey}`);
    if (categoryElement) {
        const scrollPosition = categoryElement.offsetTop - 100;
        window.scrollTo({ top: scrollPosition, behavior: 'smooth' });
    }
}

// Make loadMoreArticles available globally
window.loadMoreArticles = loadMoreArticles;

// Populate dropdown with categories
function populateDropdown() {
    // Clear existing options (except "All")
    categorySelect.innerHTML = '<option value="all">Όλες οι Κατηγορίες</option>';
    
    // Add category options
    for (const [key, category] of Object.entries(RSS_FEEDS)) {
        const option = document.createElement('option');
        option.value = key;
        option.textContent = category.title;
        categorySelect.appendChild(option);
    }
    
    // Restore saved selection
    const saved = localStorage.getItem('selectedCategory');
    if (saved) {
        selectedCategory = saved;
        categorySelect.value = saved;
    }
}

// Filter by selected category
function filterByCategory(categoryKey) {
    selectedCategory = categoryKey;
    localStorage.setItem('selectedCategory', categoryKey);
    
    // Re-render news with selected filter
    if (Object.keys(allCategories).length > 0) {
        renderNews(allCategories);
    }
}

// Make filterByCategory available globally
window.filterByCategory = filterByCategory;

// Background check for new articles (every 1 minute)
function startAutoRefresh() {
    // Clear any existing interval
    if (autoRefreshInterval) {
        clearInterval(autoRefreshInterval);
    }
    
    // Set up background check every 1 minute (60000 ms)
    autoRefreshInterval = setInterval(() => {
        const now = new Date();
        const timeString = now.toLocaleTimeString('el-GR', { hour: '2-digit', minute: '2-digit' });
        console.log(`🔍 Checking for new articles at ${timeString}...`);
        
        checkForNewArticles(); // Check in background, show button if new articles
    }, 60000); // 1 minute
    
    const nextRefresh = new Date(Date.now() + 60000);
    const nextTime = nextRefresh.toLocaleTimeString('el-GR', { hour: '2-digit', minute: '2-digit' });
    console.log(`✅ Background check enabled (every 1 minute)`);
    console.log(`⏰ Next check scheduled for: ${nextTime}`);
}

// Update last refresh time display (commented out - no refresh button)
/*
function updateLastRefreshTime() {
    const now = new Date();
    const timeString = now.toLocaleTimeString('el-GR', { hour: '2-digit', minute: '2-digit' });
    
    // Update button text with last refresh time
    fetchBtn.innerHTML = `<i class="fa-solid fa-sync-alt"></i> Ανανέωση <span class="text-xs opacity-70 ml-1">(${timeString})</span>`;
}
*/

// Event listener (commented out - no refresh button)
// fetchBtn.addEventListener('click', () => getNews(false));

// Make getNews accessible globally for retry button
window.getNews = getNews;

// Load cached news on page load
window.addEventListener('DOMContentLoaded', () => {
    // Populate category dropdown
    populateDropdown();
    
    const hasCache = loadCachedNews();
    if (!hasCache) {
        // No cache, show welcome message
        console.log('No cached news found');
    } else {
        // If we have cache, start auto-refresh
        // updateLastRefreshTime(); // Commented out - no refresh button
        startAutoRefresh();
    }
});
