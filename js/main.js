// DOM Elements
const fetchBtn = document.getElementById('fetchBtn');
const container = document.getElementById('newsContainer');
const loading = document.getElementById('loading');

// Store all articles and track visible count per category
let allCategories = {};
let visibleCount = {};

// RSS Feed Categories
const RSS_FEEDS = {
    politicsGR: {
        title: '🏛️ Πολιτικά Ελλάδα',
        color: 'purple',
        feeds: [
            'https://www.ertnews.gr/category/politiki/feed/',
            'https://www.documentonews.gr/category/politiki/feed/',
            'https://www.tovima.gr/category/politics/feed/'
        ]
    },
    sports: {
        title: '⚽ Αθλητισμός',
        color: 'green',
        feeds: [
            'https://www.gazzetta.gr/rss/',
            'https://www.sdna.gr/rss/',
            'https://www.newsit.gr/category/athlitika/feed/'
        ]
    },
    panathinaikos: {
        title: '☘️ Παναθηναϊκός',
        color: 'lime',
        feeds: [
            'https://olaprasina1908.gr/feed/',
            'https://trifilara.gr/feed/',
            'https://www.gazzetta.gr/rss/panathinaikos',
            'https://www.newsit.gr/tag/panathinaikos/feed/'
        ]
    },
    economy: {
        title: '💰 Οικονομία Παγκοσμίως',
        color: 'yellow',
        feeds: [
            'http://feeds.reuters.com/reuters/businessNews',
            'https://www.ft.com/?format=rss',
            'https://www.capital.gr/rss?category=25'
        ]
    },
    worldPolitics: {
        title: '🌍 Πολιτικά Παγκοσμίως',
        color: 'blue',
        feeds: [
            'http://feeds.bbci.co.uk/news/world/rss.xml',
            'https://gr.euronews.com/rss?format=all',
            'https://www.theguardian.com/world/rss'
        ]
    },
    weather: {
        title: '🌤️ Καιρός Ελλάδα',
        color: 'cyan',
        feeds: [
            'https://www.meteo.gr/rss/',
            'https://www.ertnews.gr/category/ellada/kairos/feed/',
            'https://www.protothema.gr/tag/kairos/rss/',
            'https://www.newsit.gr/category/kairos/feed/'
        ]
    },
    tech: {
        title: '💻 Tech News',
        color: 'pink',
        feeds: [
            'https://www.insomnia.gr/rss/index.xml/',
            'https://gr.pcmag.com/feed.xml',
            'https://www.techgear.gr/feed'
        ]
    }
};

async function fetchRSSFeed(url) {
    const apiUrl = `https://api.rss2json.com/v1/api.json?rss_url=${encodeURIComponent(url)}`;
    const response = await fetch(apiUrl);
    const data = await response.json();
    
    if (data.status === 'ok') {
        return data.items || [];
    }
    return [];
}

// Load cached articles from localStorage
function loadCachedNews() {
    try {
        const cached = localStorage.getItem('newsCache');
        const cacheTime = localStorage.getItem('newsCacheTime');
        
        if (cached && cacheTime) {
            const categories = JSON.parse(cached);
            const cachedDate = new Date(parseInt(cacheTime));
            
            renderNews(categories);
            
            // Show cache info
            const cacheInfo = document.createElement('div');
            cacheInfo.className = 'text-center text-zinc-500 text-xs py-2';
            cacheInfo.innerHTML = `📦 Cached νέα από: ${cachedDate.toLocaleString('el-GR')} | <button onclick="getNews()" class="text-blue-400 hover:underline">Ανανέωση τώρα</button>`;
            container.insertAdjacentElement('beforebegin', cacheInfo);
            
            return true;
        }
        return false;
    } catch (error) {
        console.error('Error loading cache:', error);
        return false;
    }
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

async function getNews() {
    loading.classList.remove('hidden');
    container.innerHTML = '';
    
    // Reset visible count for all categories
    visibleCount = {};
    
    // Remove cache info if exists
    const cacheInfo = document.querySelector('.text-center.text-zinc-500');
    if (cacheInfo) cacheInfo.remove();

    try {
        const allCategories = {};
        
        // Fetch all RSS feeds for each category
        for (const [key, category] of Object.entries(RSS_FEEDS)) {
            const feedPromises = category.feeds.map(url => fetchRSSFeed(url));
            const results = await Promise.all(feedPromises);
            
            // Combine all articles from this category
            let allArticles = results.flat();
            
            // Remove duplicates (same article from different feeds)
            allArticles = removeDuplicates(allArticles);
            
            // Sort by date (newest first)
            allArticles.sort((a, b) => new Date(b.pubDate) - new Date(a.pubDate));
            
            allCategories[key] = {
                ...category,
                articles: allArticles
            };
        }

        // Save to cache
        saveCacheNews(allCategories);
        
        renderNews(allCategories);

    } catch (error) {
        console.error("Σφάλμα:", error);
        container.innerHTML = `
            <div class="text-center p-8 bg-[#1a1a1a] border border-red-500/30 rounded-lg">
                <p class="text-red-400 font-bold mb-2">⚠️ Κάτι πήγε στραβά</p>
                <p class="text-red-300 text-sm">${error.message}</p>
                <button onclick="getNews()" class="mt-4 bg-red-600 hover:bg-red-500 px-4 py-2 rounded-lg transition-colors">
                    Προσπαθήστε Ξανά
                </button>
            </div>`;
    } finally {
        loading.classList.add('hidden');
    }
}

function renderNews(categories) {
    const colorStyles = {
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
        yellow: {
            titleClass: 'text-yellow-400',
            borderHover: 'hover:border-yellow-500/50',
            titleHover: 'group-hover:text-yellow-400',
            shadow: 'hover:shadow-yellow-500/10',
            readMore: 'text-yellow-400'
        },
        blue: {
            titleClass: 'text-blue-400',
            borderHover: 'hover:border-blue-500/50',
            titleHover: 'group-hover:text-blue-400',
            shadow: 'hover:shadow-blue-500/10',
            readMore: 'text-blue-400'
        },
        cyan: {
            titleClass: 'text-cyan-400',
            borderHover: 'hover:border-cyan-500/50',
            titleHover: 'group-hover:text-cyan-400',
            shadow: 'hover:shadow-cyan-500/10',
            readMore: 'text-cyan-400'
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
        const styles = colorStyles[category.color];
        const totalArticles = category.articles.length;
        const articlesToShow = Math.min(visibleCount[key], totalArticles);
        const articles = category.articles.slice(0, articlesToShow);

        if (totalArticles === 0) continue;

        html += `
            <section class="mb-12" id="category-${key}">
                <h2 class="text-2xl font-bold ${styles.titleClass} border-b border-zinc-800 pb-3 mb-6 flex items-center gap-2">
                    ${category.title}
                    <span class="text-sm text-zinc-600 font-normal ml-auto">(${articlesToShow}/${totalArticles})</span>
                </h2>
                <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4" id="grid-${key}">
        `;

        articles.forEach(art => {
            const description = art.description ? stripHtml(art.description).substring(0, 120) + '...' : '';
            
            // Parse date and add 2 hours for Greece timezone
            const date = new Date(art.pubDate);
            date.setHours(date.getHours() + 2);
            
            const pubDate = date.toLocaleString('el-GR', {
                day: '2-digit',
                month: '2-digit',
                year: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
            });
            
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
                'purple': '🏛️',  // Politics Greece
                'green': '⚽',    // Sports
                'lime': '☘️',    // Panathinaikos
                'yellow': '💰',  // Economy
                'blue': '🌍',    // World Politics
                'cyan': '🌤️',   // Weather
                'pink': '💻'     // Tech
            };
            const placeholderIcon = placeholderIcons[category.color] || '📰';

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
                        <div class="p-5">
                            <h3 class="text-base font-bold text-zinc-100 ${styles.titleHover} transition-colors line-clamp-2 mb-3 leading-snug">
                                ${art.title}
                            </h3>
                            ${description ? `<p class="text-zinc-400 text-sm leading-relaxed mb-3 line-clamp-3">${description}</p>` : ''}
                            <div class="flex items-center justify-between pt-2 border-t border-zinc-800">
                                <span class="text-zinc-600 text-xs">📅 ${pubDate}</span>
                                <span class="${styles.readMore} text-xs opacity-0 group-hover:opacity-100 transition-opacity">Διαβάστε →</span>
                            </div>
                        </div>
                    </a>
                </div>`;
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

// Event listener
fetchBtn.addEventListener('click', getNews);

// Make getNews accessible globally for retry button
window.getNews = getNews;

// Load cached news on page load
window.addEventListener('DOMContentLoaded', () => {
    const hasCache = loadCachedNews();
    if (!hasCache) {
        // No cache, show welcome message
        console.log('No cached news found');
    }
});
