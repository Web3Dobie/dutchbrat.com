# AGENTS.md - AI Agent Documentation for DutchBrat Platform

## 🤖 Project Overview for AI Agents

**Project Name**: DutchBrat Web3 Financial Intelligence Platform  
**Architecture**: Next.js 14 Frontend + Multiple AI Backend Services  
**Purpose**: Bridge TradFi and DeFi with AI-powered market analysis  
**Deployment**: Self-hosted Docker infrastructure on local VM (Node.js 20.x)  

## 🌐 Current Infrastructure

**Public IP**: `194.6.252.207`  
**Hosting**: Self-managed VM with Docker containerization  
**Network**: Internal Docker networking with reverse proxy architecture  

### Port Configuration
- **Port 80**: HTTP traffic (redirects to HTTPS)
- **Port 443**: HTTPS traffic (main website entry point)
- **Ports 3001/3002**: ~~Removed from router~~ (now internal-only via Docker networking)

## 📋 System Architecture Map

```mermaid
graph TB
    Internet[Internet Traffic] --> CF[Cloudflare CDN]
    CF --> Router[Router :80/:443]
    Router --> NginxProxy[Nginx Proxy]
    NginxProxy --> Frontend[Next.js Frontend Container]
    
    Frontend --> Redis[Redis Cache :6379]
    Frontend --> Postgres[PostgreSQL :5432]
    Frontend --> HunterAgent[Hunter Agent :3001]
    Frontend --> HTDAgent[HTD Agent :3002]
    Frontend --> NotionAPI[Notion CMS API]
    Frontend --> BinanceAPI[Binance API]
    Frontend --> MEXCAPI[MEXC API]
    
    HunterAgent --> CryptoNews[Crypto News Curation]
    HTDAgent --> InstAnalysis[Institutional Analysis]
    
    NotionAPI --> ArticlesDB[Articles DB]
    NotionAPI --> BriefingsDB[Briefings DB] 
    NotionAPI --> TweetsDB[Tweets DB]
    
    Postgres --> HFSchema[hedgefund_agent schema]
    HFSchema --> BriefingsTable[briefings table]
    
    subgraph "Docker Network: production-stack_production-network"
        NginxProxy
        Frontend
        HunterAgent
        HTDAgent
        Redis
        Postgres
        MarketData[Market Data Service :8001]
        NginxArticles[Nginx Articles]
        NginxMedia[Nginx Media :8080]
    end
```

## 🗂️ File Structure Analysis

### Core Application Structure
```
frontend/
├── app/                           # Next.js 14 App Router (PRIMARY)
│   ├── api/                       # Backend API Routes
│   │   ├── articles/route.ts      # Notion articles integration
│   │   ├── briefings/route.ts     # Market briefings with PostgreSQL caching
│   │   ├── crypto-news/route.ts   # Hunter-Agent proxy (internal: hunter-agent:3001)
│   │   ├── hedgefund-news/route.ts # HTD-Agent proxy (internal: htd-agent:3002)
│   │   ├── latest-briefing/route.ts # Latest briefing metadata
│   │   ├── latest-tweet/route.ts   # Web3Dobie tweet fetcher
│   │   ├── latest-hedgefund-tweet/route.ts # HF commentary
│   │   └── mexc/route.ts          # MEXC exchange proxy
│   ├── articles/                  # Article browsing system
│   │   ├── page.tsx              # Server component wrapper
│   │   └── ArticlesClient.tsx     # Client-side article browser
│   ├── briefings/                 # Market briefing system  
│   │   ├── page.tsx              # Server component wrapper
│   │   ├── BriefingsClient.tsx    # Client-side briefing viewer with tabs
│   │   └── BriefingsArchive.tsx   # Archive tree navigation (NEW)
│   ├── components/                # Reusable UI components
│   │   ├── HeroIntro.tsx         # Landing page hero section
│   │   ├── HunterBlock.tsx       # AI assistant showcase
│   │   ├── CryptoPriceBlock.tsx  # Real-time price dashboard
│   │   ├── LatestArticleCard.tsx # Article preview component
│   │   ├── LatestBriefingCard.tsx # Briefing preview component
│   │   ├── CryptoNewsCard.tsx    # Rotating crypto news
│   │   ├── HedgeFundNewsCard.tsx # Institutional news rotation
│   │   ├── TweetCard.tsx         # Generic tweet display component
│   │   ├── NotionBlockRenderer.tsx # Rich content from Notion
│   │   ├── EconomicCalendarWidget.tsx # TradingView integration
│   │   └── ErrorBoundary.tsx     # Error handling wrapper
│   ├── layout.tsx                # App-wide layout with navbar
│   ├── page.tsx                  # Homepage composition
│   └── globals.css               # Tailwind CSS imports
├── lib/                          # Utility libraries
│   ├── tweetHelpers.ts           # Notion tweet fetching logic
│   ├── twitterApi.ts             # Twitter API with caching
│   ├── twitterRateLimiter.ts     # Rate limiting utility
│   ├── redis.ts                  # Redis service singleton (NEW)
│   └── gtag.ts                   # Google Analytics helper
├── public/                       # Static assets
│   ├── images/                   # Profile pictures, icons, banners
│   └── icons/                    # Cryptocurrency token icons
└── package.json                  # Dependencies and scripts
```

## 🳠Docker Infrastructure

### Container Configuration
```bash
# Production Stack Containers
CONTAINER                 IMAGE                                  PORTS
nginx-proxy              nginx:latest                           0.0.0.0:80->80/tcp
frontend                 production-stack_frontend              Internal: 3000
hunter-agent             production-stack_hunter-agent          Internal: 3001
htd-agent                production-stack_htd-agent             Internal: 3002
market-data-service      production-stack_market-data-service   0.0.0.0:8001->8001/tcp
redis                    redis:7-alpine                         Internal: 6379
postgres                 postgres:15                            0.0.0.0:5432->5432/tcp
nginx-articles           nginx:alpine                           Internal
nginx-media              nginx:latest                           0.0.0.0:8080->80/tcp
```

### Network Architecture
- **Network Name**: `production-stack_production-network`
- **Type**: Bridge network (Docker internal)
- **Container Communication**: Name-based service discovery
- **External Access**: Only through nginx-proxy (port 80)
- **Reverse Proxy**: Nginx routes traffic to frontend container

## 🔧 Technology Stack Deep Dive

### Frontend Framework
- **Next.js 14.1.3**: App Router, Server Components, API Routes
- **React 18.2.0**: Client components with hooks (useState, useEffect)
- **TypeScript 5.3.3**: Full type safety across components and APIs

### Data Layer (NEW)
- **PostgreSQL 15**: Briefings cache in `hedgefund_agent.briefings` table
- **Redis 7**: Session caching with ioredis client
- **pg 8.16.3**: PostgreSQL client with connection pooling

### Styling & UI
- **Tailwind CSS 3.4.1**: Utility-first styling, dark theme optimized
- **Lightweight Charts 5.0.8**: Financial charting with candlesticks and volume
- **react-ts-tradingview-widgets 1.2.8**: Economic calendar integration

### Content Management
- **@notionhq/client 4.0.1**: CMS integration for articles/briefings
- **node-fetch 3.3.2**: HTTP client for external API calls

## 🌐 Network Architecture & Security

### Public-Facing Infrastructure
```
Internet → Cloudflare → Router (194.6.252.207) → Nginx Proxy → Frontend Container → Internal Services
```

### Port Management Strategy
- **External Ports**: Only 80 (HTTP) exposed via nginx-proxy
- **Internal Services**: Accessible via Docker networking only
- **Security**: AI agents not directly accessible from internet
- **Media Access**: Port 8080 for direct media file access

### Reverse Proxy Implementation
```typescript
// Frontend acts as reverse proxy to internal services
// crypto-news/route.ts
const url = `http://hunter-agent:3001/crypto-news-data`  // Internal Docker networking

// hedgefund-news/route.ts  
const url = `http://htd-agent:3002/hedgefund-news-data`  // Internal Docker networking
```

## 📊 Data Flow Architecture

### Briefings System (UPDATED - PostgreSQL + Redis)
```
1. Initial Request → Check Redis Cache
2. Cache Miss → Check PostgreSQL (hedgefund_agent.briefings)
3. DB Miss/NULL json_content → Fetch from Notion API
4. Parse Notion blocks → Store in PostgreSQL json_content
5. Cache in Redis (6 hour TTL)
6. Return to Frontend
```

### Archive Navigation (NEW)
```
1. Tree Metadata API → /api/briefings?tree-metadata=true
   - Returns: Year → Month → Day structure with counts
   - Cached in Redis: 1 hour TTL
   
2. Date Briefings API → /api/briefings?date=2025-10-06
   - Returns: All briefings for specific date
   - Cached in Redis: 30 minute TTL
   
3. Single Briefing API → /api/briefings?briefingId=85
   - Returns: Full briefing content
   - Cached in Redis: 6 hour TTL
```

### Content Management Flow
1. **Notion CMS** → Articles, Briefings metadata, Tweet logs stored
2. **PostgreSQL** → Briefings content cached in json_content column
3. **Redis** → Short-term caching for performance
4. **API Routes** → Transform data to frontend format
5. **Client Components** → Render with lazy loading
6. **Real-time Updates** → Polling-based refresh (5-15min intervals)

### Market Data Flow
1. **Price APIs** → Binance (primary), MEXC (secondary) 
2. **Chart Data** → OHLCV data fetched on-demand
3. **Real-time Display** → 30-second refresh intervals
4. **Interactive Charts** → Modal overlays with detailed analysis

## 🧩 Component Architecture

### Briefings Page Structure (UPDATED)
```typescript
// Briefings with tabbed navigation
<BriefingsClient>
  <Tabs>
    <Tab name="Recent">
      <Sidebar>
        <PeriodFilters />
        <YearMonthNavigation />
      </Sidebar>
      <ContentViewer>
        <BriefingRenderer blocks={content} />
      </ContentViewer>
    </Tab>
    
    <Tab name="Archive">
      <BriefingsArchive>
        <YearAccordion>
          <MonthAccordion>
            <DateAccordion>
              <BriefingLinks />
            </DateAccordion>
          </MonthAccordion>
        </YearAccordion>
      </BriefingsArchive>
    </Tab>
  </Tabs>
</BriefingsClient>
```

### Homepage Composition
```typescript
<main>
  <CryptoPriceBlock />    // Market data dashboard
  <HeroIntro />           // Personal introduction + HF content
  <HunterBlock />         // AI assistant + rotating crypto content
</main>
```

### State Management Patterns
```typescript
// Client-side state with hooks
const [data, setData] = useState<DataType[]>([])
const [loading, setLoading] = useState(true)
const [error, setError] = useState<string | null>(null)

// Auto-refresh with intervals
useEffect(() => {
  fetchData()
  const interval = setInterval(fetchData, 5 * 60 * 1000) // 5min
  return () => clearInterval(interval)
}, [])

// URL parameter handling (NEW)
useEffect(() => {
  const urlParams = new URLSearchParams(window.location.search)
  const briefingId = urlParams.get('briefingId')
  if (briefingId) {
    loadBriefingContent(briefingId)
  }
}, [])
```
## HTD Articles Integration

### Overview
The frontend provides unified viewing of both Hunter crypto articles and HTD institutional research articles through a single interface.

### API Endpoints
**Location:** `app/api/htd-articles/route.ts`

**Endpoints:**
- `GET /api/htd-articles` - List all HTD articles with pagination
- `GET /api/htd-articles?id={article-id}` - Fetch single article content

**Features:**
- File system scanning of mounted article directory
- Markdown metadata parsing (title, date, category, summary)
- Content fetching via internal NGINX proxy
- HTTPS/mixed-content issue resolution

### Articles Page Integration
**Location:** `app/articles/ArticlesClient.tsx`

**Features:**
- Unified Hunter + HTD article listing
- Type-based filtering (All/Hunter/HTD)
- Category-based filtering
- Chronological sorting (newest first)
- Expandable article viewing with markdown rendering
- HTD Research banner integration
- Dual-author header (DutchBrat + Hunter)

**Article Types:**
- Hunter articles: Crypto analysis with orange badges
- HTD articles: Institutional analysis with blue badges and branding

### Homepage Integration
**Location:** `components/LatestHTDArticleCard.tsx`

**Features:**
- Latest HTD article preview card
- Positioned as 2nd card in hero section
- Auto-fetches most recent article
- Links to full articles page
- Consistent styling with existing cards

### NGINX Configuration
**Volume Mount:** `./HTD-Research-Agent/articles:/app/htd-articles:ro`
**Service Path:** `/api/htd-articles/files/` serves HTD articles
**CORS Headers:** Configured for cross-origin article fetching

### UI Enhancements
- HTD Research banner display on article open
- Dual-profile header showing both authors
- Type-specific badges and styling
- Responsive design for all screen sizes

## 🔐 Environment Variables

### Required Configuration
```bash
# Notion CMS Integration
NOTION_API_KEY=secret_xxx                    # Notion workspace API key
NOTION_DB_ID=database_id_for_articles       # Articles database
NOTION_TWEET_LOG_DB=database_id_for_tweets  # Tweet log database  
NOTION_PDF_DATABASE_ID=database_id_briefings # Briefings database
HEDGEFUND_TWEET_DB_ID=database_id_hf_tweets  # HedgeFund tweet database

# PostgreSQL Database (NEW)
POSTGRES_HOST=postgres                       # Docker service name
POSTGRES_PORT=5432                          # Default PostgreSQL port
POSTGRES_DB=agents_platform                 # Database name
POSTGRES_USER=hunter_admin                  # Database user
POSTGRES_PASSWORD=YourSecurePassword123!    # Database password
POSTGRES_URL=postgresql://hunter_admin:YourSecurePassword123!@postgres:5432/agents_platform

# Redis Cache (NEW)
REDIS_HOST=redis                            # Docker service name
REDIS_PORT=6379                             # Default Redis port

# Optional External Services
TWITTER_BEARER_TOKEN=bearer_token_xxx        # Twitter API v2 access
GA_TRACKING_ID=G-XRESBQDDQ7                 # Google Analytics
```

## 🗄️ Database Schema

### PostgreSQL Schema (NEW)
```sql
-- Schema: hedgefund_agent
CREATE SCHEMA hedgefund_agent;

-- Table: briefings
CREATE TABLE hedgefund_agent.briefings (
    id INTEGER PRIMARY KEY,
    briefing_type VARCHAR,
    title VARCHAR,
    notion_page_id VARCHAR,
    website_url VARCHAR,
    gpt_comment TEXT,
    tweet_id VARCHAR,
    tweet_url VARCHAR,
    published_at TIMESTAMP WITHOUT TIME ZONE,  -- Actual briefing date
    created_at TIMESTAMP WITHOUT TIME ZONE,    -- Database insert time
    json_content JSONB                         -- Cached Notion content
);

-- Indexes for performance
CREATE INDEX idx_briefings_published_at ON hedgefund_agent.briefings(published_at DESC);
CREATE INDEX idx_briefings_notion_page_id ON hedgefund_agent.briefings(notion_page_id);
```

### Notion Database Schemas

#### Articles Database
```typescript
interface NotionArticle {
  Headline: { title: RichText[] }           // Article title
  Summary: { rich_text: RichText[] }        // Brief description
  File: { url: string }                     // Markdown content URL
  Date: { date: { start: string } }         // Publication date
  Tweet: { url: string }                    // Associated tweet URL
  Tags: { multi_select: SelectOption[] }    // Content tags
  Status: { select: { name: string } }      // Published/Draft
  Category: { select: { name: string } }    // Content category
}
```

#### Briefings Database
```typescript
interface NotionBriefing {
  Name: { title: RichText[] }               // Briefing title
  Period: { select: { name: string } }      // pre_market/morning/mid_day/after_market
  Date: { date: { start: string } }         // Briefing date
  "PDF Link": { url: string }              // Content URL
  "Tweet URL": { url: string }             // Social media link
  "Market Sentiment": { rich_text: RichText[] } // AI sentiment analysis
}
```

### Redis Cache Structure (NEW)
```typescript
// Cache Keys
"briefing:content:{briefingId}"           // Individual briefing (6h TTL)
"briefing:notion:{notionPageId}"          // Notion ID mapping (24h TTL)
"briefings:list:latest"                   // Recent briefings list (30m TTL)
"briefings:tree-metadata"                 // Archive tree structure (1h TTL)
"briefings:by-date:{date}"                // Date-specific briefings (30m TTL)
"briefing:building:{briefingId}"          // Lock for concurrent fetch prevention
```

## 🛡️ Security & Network Configuration

### Router Configuration
```bash
# Active Port Forwards (External → Internal)
Port 80   → 192.168.0.109:80   (HTTP via nginx-proxy)
Port 8080 → 192.168.0.109:8080 (Media files)

# Removed Security Risks
# Port 3001 → REMOVED (was: hunter-agent direct access)
# Port 3002 → REMOVED (was: htd-agent direct access)
# Port 443  → REMOVED (handled by Cloudflare)
```

### Internal Server IP
- **Primary Interface**: `192.168.0.109` (router target)
- **Docker Bridge**: `172.17.0.1` (Docker internal)
- **Compose Network**: `172.18.0.1` (production-stack network)

### Security Benefits
- **Reduced Attack Surface**: AI agents not directly exposed
- **Network Segmentation**: Services isolated within Docker
- **Single Entry Point**: All traffic through nginx-proxy
- **Service Discovery**: Name-based routing (no IP dependencies)
- **Database Security**: PostgreSQL only accessible via Docker network

## 🎯 Key Development Patterns

### Redis Service Pattern (NEW)
```typescript
// lib/redis.ts - Singleton pattern
import Redis from 'ioredis';

export class RedisService {
  private redis: Redis;
  private isConnected: boolean = false;

  constructor() {
    this.redis = new Redis({
      host: 'redis',
      port: 6379,
      retryStrategy: (times) => {
        const delay = Math.min(times * 50, 2000);
        return delay;
      },
    });
  }

  async getBriefing(briefingId: number): Promise<BriefingData | null> {
    // Check cache, return null if unavailable
  }

  async setBriefing(briefingId: number, data: BriefingData): Promise<boolean> {
    // Cache with TTL
  }
}

// Singleton export
export function getRedisService(): RedisService {
  if (!redisInstance) {
    redisInstance = new RedisService();
  }
  return redisInstance;
}
```

### PostgreSQL Connection Pattern (NEW)
```typescript
import { Pool } from 'pg';

const pool = new Pool({
  host: process.env.POSTGRES_HOST || 'postgres',
  port: parseInt(process.env.POSTGRES_PORT || '5432'),
  database: process.env.POSTGRES_DB || 'agents_platform',
  user: process.env.POSTGRES_USER || 'hunter_admin',
  password: process.env.POSTGRES_PASSWORD,
  ssl: false
});

// Query with connection pooling
const result = await pool.query(`
  SELECT id, title, json_content 
  FROM hedgefund_agent.briefings 
  WHERE id = $1
`, [briefingId]);
```

### Error Handling Strategy
```typescript
// API Route Error Handling with fallback
try {
  const cached = await redis.getBriefing(id);
  if (cached) return cached;
  
  const dbResult = await pool.query('SELECT ...');
  if (dbResult.rows[0]?.json_content) {
    return dbResult.rows[0].json_content;
  }
  
  // Fallback to Notion
  const notionData = await fetchFromNotion(id);
  await saveToDB(id, notionData);
  return notionData;
} catch (error) {
  console.error('Full pipeline failed:', error);
  return NextResponse.json({ error: 'Service unavailable' }, { status: 500 });
}
```

### Performance Optimization
```typescript
// Lazy loading pattern (Archive)
const [expandedDates, setExpandedDates] = useState<Set<string>>(new Set())
const [briefingsByDate, setBriefingsByDate] = useState<Record<string, any[]>>({})

const toggleDate = (date: string) => {
  if (!expandedDates.has(date)) {
    fetchBriefingsForDate(date) // Only fetch when expanded
  }
  // Toggle expansion state
}
```

## 🚨 Critical Dependencies

### Must-Have Libraries
- `@notionhq/client`: CMS integration (cannot be replaced)
- `ioredis`: Redis client with TypeScript support
- `pg`: PostgreSQL client for Node.js
- `lightweight-charts`: Financial visualization
- `tailwindcss`: Design system foundation
- `next`: Core framework dependency

### New Dependencies (v3.0)
- `ioredis@5.8.0`: Redis caching layer
- `pg@8.16.3`: PostgreSQL connection pooling
- `@types/pg@8.15.5`: TypeScript definitions for pg

## 📄 Data Refresh Patterns

### Refresh Intervals by Content Type
```typescript
const REFRESH_INTERVALS = {
  cryptoPrices: 30_000,      // 30 seconds
  articles: 300_000,         // 5 minutes  
  briefings: 300_000,        // 5 minutes
  tweets: 600_000,           // 10 minutes
  aiNews: 900_000,           // 15 minutes (hunter-agent)
  hedgeFundNews: 1_800_000   // 30 minutes (htd-agent)
}
```

### Cache TTL Strategy (NEW)
```typescript
const CACHE_TTL = {
  briefingContent: 6 * 60 * 60,      // 6 hours
  briefingsList: 30 * 60,            // 30 minutes
  treeMetadata: 60 * 60,             // 1 hour
  dateList: 30 * 60,                 // 30 minutes
  notionIdMapping: 24 * 60 * 60      // 24 hours
}
```

## 🎨 Design System Constants

### Color Palette
```css
:root {
  --primary-bg: #030712;      /* gray-950 */
  --secondary-bg: #111827;    /* gray-900 */
  --accent-blue: #3b82f6;     /* blue-500 */
  --success-green: #10b981;   /* green-500 */
  --danger-red: #ef4444;      /* red-500 */
  --text-primary: #ffffff;    /* white */
  --text-secondary: #d1d5db;  /* gray-300 */
}
```

### Component Size Guidelines
```typescript
const COMPONENT_SIZES = {
  profileImages: '200px',      // Hero sections
  chartHeight: '500px',        // Price charts
  cardMinHeight: '200px',      // Content cards
  modalMaxWidth: '4xl',        // Chart modals
}
```

## 🧪 Testing Approach

### Manual Testing Requirements
1. **Cross-browser compatibility**: Chrome, Firefox, Safari, Edge
2. **Mobile responsiveness**: Phone, tablet, desktop breakpoints
3. **API error handling**: Network failures, timeout scenarios
4. **Content loading states**: Empty states, loading spinners
5. **Real-time updates**: Data refresh cycles, user interactions
6. **Archive navigation**: Tree expansion, lazy loading, URL parameters (NEW)
7. **Cache behavior**: Redis hits/misses, PostgreSQL fallback (NEW)

### Performance Testing
1. **Lighthouse scores**: Aim for 90+ performance score
2. **Bundle analysis**: Monitor JavaScript bundle sizes
3. **API response times**: < 2s for all endpoints, < 500ms with cache
4. **Image optimization**: WebP format, proper sizing
5. **Database query performance**: < 100ms for cached queries (NEW)

## 🔧 Development Workflow

### Local Development Setup
```bash
# Install dependencies
npm install

# Environment setup
cp .env.example .env.local  # Configure API keys

# Development server
npm run dev                 # Runs on http://localhost:3000

# Type checking
npx tsc --noEmit           # Verify TypeScript compilation

# Production build test
npm run build && npm start # Test production build locally
```

### Docker Development
```bash
# Build and run full stack
docker-compose up --build -d

# View logs
docker-compose logs -f frontend
docker-compose logs -f redis
docker-compose logs -f postgres

# Restart specific service
docker-compose restart frontend

# Access PostgreSQL
docker exec -it postgres psql -U hunter_admin -d agents_platform

# Access Redis CLI
docker exec -it redis redis-cli

# Check Redis keys
docker exec redis redis-cli KEYS "briefing:*"
```

### Debugging Tools
- **Next.js Dev Tools**: Built-in error overlay and debugging
- **React Developer Tools**: Component tree inspection
- **Network Tab**: API call monitoring and timing
- **Console Logging**: Strategic logging for data flow tracking
- **Docker Logs**: Container-specific debugging
- **Redis CLI**: Cache inspection and debugging (NEW)
- **PostgreSQL CLI**: Database query testing (NEW)

## 🚀 Deployment Considerations

### Build Requirements
- **Node.js**: Version 20.x (specified in package.json engines)
- **Memory**: Minimum 1GB recommended for build process (increased for PostgreSQL)
- **Environment**: All required env vars must be set
- **Port**: Configurable via $PORT environment variable
- **Database**: PostgreSQL 15+ required
- **Cache**: Redis 7+ required

### Production Optimizations
- **Static Asset Caching**: Images, CSS, JavaScript cached at CDN level (Cloudflare)
- **API Response Caching**: Redis for short-term, PostgreSQL for persistent cache
- **Bundle Optimization**: Tree shaking and code splitting enabled
- **Image Optimization**: Next.js automatic image optimization
- **Container Networking**: Internal service communication for security
- **Cloudflare CDN**: Global content delivery and DDoS protection
- **Database Connection Pooling**: pg Pool for efficient connections (NEW)
- **Redis Connection Management**: Singleton pattern with retry logic (NEW)

### Infrastructure Monitoring
- **Cloudflare Analytics**: Traffic and performance monitoring
- **Container Health**: Docker container status monitoring
- **Service Availability**: AI agent uptime tracking
- **Resource Usage**: Memory, CPU, disk space monitoring
- **Database Performance**: Query timing and connection pool stats (NEW)
- **Cache Hit Rates**: Redis performance metrics (NEW)

## 📊 Scalability Considerations (NEW)

### Current Scale
- **Briefings**: 83 briefings over 35 days (Sept-Oct 2025)
- **Rate**: ~4 briefings per day
- **Projected Growth**: 1,460 briefings per year

### Scaling Strategy
1. **Archive Navigation**: Year → Month → Day tree handles unlimited briefings
2. **Lazy Loading**: Only fetch briefings when user expands date
3. **Database Indexing**: `published_at` index for fast queries
4. **Redis Caching**: Reduces database load by 80%+
5. **Connection Pooling**: Efficient database connection management

### Performance Targets
- **Tree Metadata**: < 500ms (cached) or < 2s (uncached)
- **Date Briefings**: < 300ms (cached) or < 1s (uncached)
- **Single Briefing**: < 200ms (cached) or < 2s (with Notion fetch)
- **Cache Hit Rate**: Target 90%+ for frequently accessed briefings

## 📄 Migration Notes

### Version History
**v1.0**: Azure App Service with direct Notion integration  
**v2.0**: Self-hosted Docker with internal networking  
**v3.0**: PostgreSQL caching + Redis + Archive navigation (Current)
**v4.0**: Unified viewing of both Hunter crypto articles and HTD institutional research articles through a single interface.

### Changes in v3.0
1. **PostgreSQL Integration**: Briefings cached in `hedgefund_agent.briefings` table
2. **Redis Caching**: Short-term cache layer for performance
3. **Archive Navigation**: Scalable tree structure for browsing 1000+ briefings
4. **Lazy Loading**: Briefings load on-demand instead of all at once
5. **URL Parameters**: Direct linking to specific briefings via `?briefingId=`
6. **Three-Tier Cache**: Redis → PostgreSQL → Notion fallback

### Benefits Achieved
- **Performance**: 80% faster briefing loads with caching
- **Scalability**: Handles 1000+ briefings efficiently
- **User Experience**: Archive navigation for historical browsing
- **Reliability**: Multiple fallback layers prevent data loss
- **Cost Efficiency**: Reduced Notion API calls by 90%

---

**For AI Agents**: This documentation reflects the current v3.0 architecture with PostgreSQL caching, Redis performance layer, and scalable archive navigation. The system uses a three-tier caching strategy (Redis → PostgreSQL → Notion) and supports efficient browsing of unlimited briefings through lazy-loaded tree navigation. Focus on the database schema in `hedgefund_agent` schema and the Redis service singleton pattern when making modifications.