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
    Router --> Frontend[Next.js Frontend Container]
    
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
    
    subgraph "Docker Network: production-stack_production-network"
        Frontend
        HunterAgent
        HTDAgent
        Redis[Redis Cache]
        Postgres[PostgreSQL]
        MarketData[Market Data Service :8001]
    end
```

## 🗂️ File Structure Analysis

### Core Application Structure
```
frontend/
├── app/                           # Next.js 14 App Router (PRIMARY)
│   ├── api/                       # Backend API Routes
│   │   ├── articles/route.ts      # Notion articles integration
│   │   ├── briefings/route.ts     # Market briefings with content parsing
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
│   │   └── BriefingsClient.tsx    # Client-side briefing viewer
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
│   └── gtag.ts                   # Google Analytics helper
├── public/                       # Static assets
│   ├── images/                   # Profile pictures, icons, banners
│   └── icons/                    # Cryptocurrency token icons
└── package.json                  # Dependencies and scripts
```

## 🐳 Docker Infrastructure

### Container Configuration
```bash
# Production Stack Containers
CONTAINER                 IMAGE                                  PORTS
frontend                  production-stack_frontend              0.0.0.0:80->3000/tcp, 0.0.0.0:443->3000/tcp
hunter-agent              production-stack_hunter-agent          Internal: 3001
htd-agent                 production-stack_htd-agent             Internal: 3002
market-data-service       production-stack_market-data-service   0.0.0.0:8001->8001/tcp
redis                     redis:7-alpine                         Internal: 6379
postgres                  postgres:15                            0.0.0.0:5432->5432/tcp
```

### Network Architecture
- **Network Name**: `production-stack_production-network`
- **Type**: Bridge network (Docker internal)
- **Container Communication**: Name-based service discovery
- **External Access**: Only through frontend container (ports 80/443)

## 🔧 Technology Stack Deep Dive

### Frontend Framework
- **Next.js 14.1.3**: App Router, Server Components, API Routes
- **React 18.2.0**: Client components with hooks (useState, useEffect)
- **TypeScript 5.3.3**: Full type safety across components and APIs

### Styling & UI
- **Tailwind CSS 3.4.1**: Utility-first styling, dark theme optimized
- **Lightweight Charts 5.0.8**: Financial charting with candlesticks and volume
- **react-ts-tradingview-widgets 1.2.8**: Economic calendar integration

### Data Management
- **@notionhq/client 4.0.1**: CMS integration for articles/briefings
- **node-fetch 3.3.2**: HTTP client for external API calls
- **Built-in caching**: Memory-based caching for API responses

## 🌐 Network Architecture & Security

### Public-Facing Infrastructure
```
Internet → Cloudflare → Router (194.6.252.207) → Frontend Container → Internal Services
```

### Port Management Strategy
- **External Ports**: Only 80 (HTTP) and 443 (HTTPS) exposed
- **Internal Services**: Accessible via Docker networking only
- **Security**: AI agents not directly accessible from internet

### Reverse Proxy Implementation
```typescript
// Frontend acts as reverse proxy to internal services
// crypto-news/route.ts
const url = `http://hunter-agent:3001/crypto-news-data`  // Internal Docker networking

// hedgefund-news/route.ts  
const url = `http://htd-agent:3002/hedgefund-news-data`  // Internal Docker networking
```

## 📊 Data Flow Architecture

### Content Management Flow
1. **Notion CMS** → Articles, Briefings, Tweet logs stored
2. **API Routes** → Transform Notion data to frontend format
3. **Client Components** → Render content with rich formatting
4. **Real-time Updates** → Polling-based refresh (5-15min intervals)

### Market Data Flow
1. **Price APIs** → Binance (primary), MEXC (secondary) 
2. **Chart Data** → OHLCV data fetched on-demand
3. **Real-time Display** → 30-second refresh intervals
4. **Interactive Charts** → Modal overlays with detailed analysis

### AI Content Flow (Internal Network)
1. **AI Agents** → Generate news analysis and commentary (internal containers)
2. **Reverse Proxy** → Frontend API routes proxy to internal services
3. **Rotation Logic** → Cycle through content every 5-15 minutes
4. **User Interface** → Cards with expand/collapse functionality

## 🧩 Component Architecture

### Composition Pattern
```typescript
// Homepage composition
<main>
  <CryptoPriceBlock />    // Market data dashboard
  <HeroIntro />           // Personal introduction + HF content
  <HunterBlock />         // AI assistant + rotating crypto content
</main>

// Card-based content display
<HunterBlock>
  <LatestArticleCard />   // Most recent article
  <LatestTweetCard />     // Latest social media  
  <CryptoNewsCard />      // Rotating AI news (via hunter-agent)
</HunterBlock>

<HeroIntro>
  <LatestBriefingCard />     // Market briefing preview
  <LatestHedgeFundTweetCard /> // HF commentary
  <HedgeFundNewsCard />      // Institutional news (via htd-agent)
</HeroIntro>
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
```

## 🔐 Environment Variables

### Required Configuration
```bash
# Notion CMS Integration
NOTION_API_KEY=secret_xxx                    # Notion workspace API key
NOTION_DB_ID=database_id_for_articles       # Articles database
NOTION_TWEET_LOG_DB=database_id_for_tweets  # Tweet log database  
NOTION_PDF_DATABASE_ID=database_id_briefings # Briefings database
HEDGEFUND_TWEET_DB_ID=database_id_hf_tweets  # HedgeFund tweet database

# Optional External Services
TWITTER_BEARER_TOKEN=bearer_token_xxx        # Twitter API v2 access
GA_TRACKING_ID=G-XRESBQDDQ7                 # Google Analytics
```

## 🗄️ Database Schema (Notion)

### Articles Database Schema
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

### Briefings Database Schema
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

## 🛡️ Security & Network Configuration

### Router Configuration
```bash
# Active Port Forwards (External → Internal)
Port 80   → 192.168.0.109:80   (HTTP)
Port 443  → 192.168.0.109:443  (HTTPS)
Port 8080 → 192.168.0.109:8080 (Optional: Direct access)

# Removed Security Risks
# Port 3001 → REMOVED (was: hunter-agent direct access)
# Port 3002 → REMOVED (was: htd-agent direct access)
```

### Internal Server IP
- **Primary Interface**: `192.168.0.109` (router target)
- **Docker Bridge**: `172.17.0.1` (Docker internal)
- **Compose Network**: `172.18.0.1` (production-stack network)

### Security Benefits of Internal Networking
- **Reduced Attack Surface**: AI agents not directly exposed to internet
- **Network Segmentation**: Services isolated within Docker network
- **Single Entry Point**: All traffic routed through secured frontend
- **Service Discovery**: Name-based routing (no IP dependencies)

## 🎯 Key Development Patterns

### Error Handling Strategy
```typescript
// API Route Error Handling
try {
  const data = await fetchExternalAPI()
  return NextResponse.json(data)
} catch (error) {
  console.error('API Error:', error)
  return NextResponse.json(
    { error: 'Service unavailable' },
    { status: 500 }
  )
}

// Component Error Boundaries
<ErrorBoundary fallback={<FallbackUI />}>
  <DataComponent />
</ErrorBoundary>
```

### Performance Optimization
```typescript
// Dynamic imports for code splitting
const BriefingsClient = dynamic(() => import('./BriefingsClient'), {
  ssr: false,
  loading: () => <LoadingSpinner />
})

// Memoization for expensive calculations
const memoizedData = useMemo(() => 
  processLargeDataset(rawData), [rawData]
)
```

## 🚨 Critical Dependencies

### Must-Have Libraries
- `@notionhq/client`: CMS integration (cannot be replaced)
- `lightweight-charts`: Financial visualization (specific to finance)
- `tailwindcss`: Design system foundation
- `next`: Core framework dependency

### Replaceable Dependencies
- `node-fetch`: Can use native fetch in Node 18+
- `react-ts-tradingview-widgets`: TradingView alternative widgets available

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

### Performance Testing
1. **Lighthouse scores**: Aim for 90+ performance score
2. **Bundle analysis**: Monitor JavaScript bundle sizes
3. **API response times**: < 2s for all endpoints
4. **Image optimization**: WebP format, proper sizing

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
docker-compose logs -f htd-agent
docker-compose logs -f hunter-agent

# Restart specific service
docker-compose restart frontend
```

### Debugging Tools
- **Next.js Dev Tools**: Built-in error overlay and debugging
- **React Developer Tools**: Component tree inspection
- **Network Tab**: API call monitoring and timing
- **Console Logging**: Strategic logging for data flow tracking
- **Docker Logs**: Container-specific debugging

## 🚀 Deployment Considerations

### Build Requirements
- **Node.js**: Version 20.x (specified in package.json engines)
- **Memory**: Minimum 512MB recommended for build process
- **Environment**: All required env vars must be set
- **Port**: Configurable via $PORT environment variable

### Production Optimizations
- **Static Asset Caching**: Images, CSS, JavaScript cached at CDN level (Cloudflare)
- **API Response Caching**: Appropriate cache headers for API responses
- **Bundle Optimization**: Tree shaking and code splitting enabled
- **Image Optimization**: Next.js automatic image optimization
- **Container Networking**: Internal service communication for security
- **Cloudflare CDN**: Global content delivery and DDoS protection

### Infrastructure Monitoring
- **Cloudflare Analytics**: Traffic and performance monitoring
- **Container Health**: Docker container status monitoring
- **Service Availability**: AI agent uptime tracking
- **Resource Usage**: Memory, CPU, disk space monitoring

## 🔄 Migration Notes (Azure → Self-Hosted)

### Changes Made
1. **Infrastructure**: Moved from Azure App Service to self-hosted Docker
2. **Networking**: Implemented internal Docker networking for security
3. **Port Management**: Removed external access to ports 3001/3002
4. **Reverse Proxy**: Frontend now proxies requests to internal services
5. **CDN**: Added Cloudflare for performance and monitoring

### Benefits Achieved
- **Cost Reduction**: Eliminated Azure hosting costs
- **Better Control**: Full infrastructure management
- **Enhanced Security**: Internal service networking
- **Improved Monitoring**: Better visibility into system health
- **Scalability**: Foundation for future microservices architecture

---

**For AI Agents**: This documentation reflects the current self-hosted infrastructure with Docker containerization and internal networking. Focus on the secure reverse proxy pattern and internal service communication when making modifications or additions to the platform.