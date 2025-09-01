# DutchBrat - Web3 Financial Intelligence Platform

A comprehensive financial intelligence platform combining traditional finance (TradFi) and decentralized finance (DeFi) insights, powered by AI agents and real-time market data.

## 🎯 Overview

DutchBrat.com is a Web3 venture that bridges the gap between traditional hedge fund analysis and cryptocurrency markets. The platform provides:

- **Real-time crypto price tracking** with interactive charts
- **AI-powered market briefings** generated daily across multiple sessions
- **Intelligent news aggregation** from crypto and hedge fund sectors  
- **Social media integration** with Twitter/X content analysis
- **Article management system** with Notion CMS integration

## 🏗️ Architecture

### Frontend (Next.js 14)
- **Framework**: Next.js 14 with TypeScript
- **Styling**: Tailwind CSS with dark theme
- **Components**: Modular React components with client-side rendering
- **Charts**: Lightweight Charts for price visualization
- **Deployment**: Optimized for cloud deployment

### Backend Services
- **Notion CMS**: Content management for articles and briefings
- **X-AI-Agent**: Crypto news analysis and curation (Port 3001)
- **HedgeFundAgent**: Institutional market analysis (Port 3002)
- **External APIs**: Binance, MEXC for price data

## 🚀 Features

### 1. Market Data Dashboard
- Real-time cryptocurrency prices (BTC, ETH, SOL, XRP, DOGE, BNB, WAI)
- Interactive price charts with multiple timeframes
- 24h change indicators and volume data
- Click-to-expand detailed chart modals

### 2. AI-Powered Content
- **Hunter (Web3 Dobie)**: AI assistant for crypto market insights
- **Crypto News Rotation**: Top headlines with Hunter's commentary
- **Hedge Fund Analysis**: Institutional-grade market commentary
- **Dynamic content rotation** every 5-15 minutes

### 3. Content Management
- **Market Briefings**: Daily pre-market, morning, mid-day, after-market analysis
- **Articles**: Long-form content with category filtering and search
- **Tweet Integration**: Latest social media content from @Web3_Dobie
- **Notion Backend**: Seamless content management workflow

### 4. User Experience
- **Dark Theme**: Optimized for financial professionals
- **Mobile Responsive**: Full functionality across devices
- **Fast Loading**: Optimized with Next.js 14 performance features
- **Analytics**: Google Analytics integration for insights

## 🛠️ Technology Stack

### Core Technologies
```json
{
  "framework": "Next.js 14.1.3",
  "language": "TypeScript 5.3.3",
  "styling": "Tailwind CSS 3.4.1",
  "charts": "Lightweight Charts 5.0.8",
  "cms": "Notion API 4.0.1",
  "deployment": "Node.js 20.x"
}
```

### Key Dependencies
- **@notionhq/client**: Notion CMS integration
- **lightweight-charts**: Financial chart rendering
- **react-ts-tradingview-widgets**: Economic calendar widgets
- **node-fetch**: API communication

## 📦 Installation & Setup

### Prerequisites
- Node.js 20.x or higher
- npm or yarn package manager
- Notion workspace with API access
- Environment variables configured

### Installation
```bash
# Clone the repository
git clone <repository-url>
cd dutchbrat-frontend

# Install dependencies
npm install

# Set up environment variables
cp .env.example .env.local
# Edit .env.local with your API keys

# Run development server
npm run dev
```

### Environment Variables
```env
# Notion Integration
NOTION_API_KEY=your_notion_api_key
NOTION_DB_ID=your_articles_database_id
NOTION_TWEET_LOG_DB=your_tweets_database_id
NOTION_PDF_DATABASE_ID=your_briefings_database_id
HEDGEFUND_TWEET_DB_ID=your_hedgefund_database_id

# External Services (Optional)
TWITTER_BEARER_TOKEN=your_twitter_bearer_token
GA_TRACKING_ID=G-XRESBQDDQ7
```

## 🏃‍♂️ Development

### Project Structure
```
frontend/
├── app/                    # Next.js 14 App Router
│   ├── api/               # API routes
│   ├── articles/          # Articles page & client
│   ├── briefings/         # Briefings page & client  
│   ├── components/        # Reusable components
│   └── globals.css        # Global styles
├── lib/                   # Utility functions
├── public/               # Static assets
└── package.json          # Dependencies
```

### Development Commands
```bash
# Development server
npm run dev

# Production build
npm run build

# Start production server
npm start

# Type checking
npx tsc --noEmit

# Linting
npm run lint
```

## 🚦 API Endpoints

### Internal APIs
- `GET /api/articles` - Fetch published articles
- `GET /api/briefings` - Fetch market briefings with content
- `GET /api/latest-briefing` - Get latest briefing metadata
- `GET /api/latest-tweet` - Latest Web3 Dobie tweet
- `GET /api/latest-hedgefund-tweet` - Latest hedge fund commentary
- `GET /api/crypto-news` - Curated crypto headlines
- `GET /api/hedgefund-news` - Institutional market news
- `GET /api/mexc` - MEXC exchange data proxy

### External Integrations
- **Binance API**: Cryptocurrency price data
- **MEXC API**: Alternative crypto exchange data
- **Notion API**: Content management system
- **X-AI-Agent**: `http://74.241.128.114:3001/crypto-news-data`
- **HedgeFundAgent**: `http://74.241.128.114:3002/hedgefund-news-data`

## 🎨 UI Components

### Core Components
- **HeroIntro**: Main landing section with personal introduction
- **HunterBlock**: AI assistant showcase with rotating content
- **CryptoPriceBlock**: Real-time price dashboard with charts
- **ArticlesClient**: Article browsing with filtering and search
- **BriefingsClient**: Market briefing viewer with navigation
- **NotionBlockRenderer**: Rich content rendering from Notion

### Design System
- **Color Palette**: Gray-950 background, blue accents, green/red indicators
- **Typography**: Bold headings, readable body text, monospace for data
- **Layout**: Responsive grid system with mobile-first approach
- **Interactions**: Hover effects, smooth transitions, loading states

## 🔧 Configuration

### Next.js Configuration
```javascript
// next.config.js
module.exports = {
  reactStrictMode: true,
  webpack: (config) => {
    config.resolve.alias['@'] = path.resolve(__dirname, 'app');
    return config;
  },
};
```

### Tailwind Configuration
```javascript
// tailwind.config.ts
const config = {
  content: [
    './app/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}'
  ],
  theme: { extend: {} },
  plugins: []
}
```

## 🚀 Deployment

### Production Build
```bash
# Build for production
npm run build

# Start production server
npm start
```

### Environment Setup
- **Port**: Configurable via $PORT environment variable
- **Node Version**: 20.x (specified in package.json engines)
- **Memory**: Optimized for cloud deployment
- **Caching**: Static assets and API responses cached appropriately

## 📊 Analytics & Monitoring

### Google Analytics
- **Tracking ID**: G-XRESBQDDQ7
- **Events**: Page views, crypto news clicks, article engagement
- **Custom Metrics**: Tweet clicks, chart interactions, briefing views

### Performance Monitoring
- **Core Web Vitals**: Optimized loading and interaction metrics
- **Error Boundaries**: Graceful error handling throughout the app
- **Loading States**: User feedback during data fetching

## 🤝 Contributing

### Development Guidelines
1. **Type Safety**: All new code must be TypeScript compliant
2. **Component Structure**: Follow existing patterns for consistency
3. **API Design**: RESTful endpoints with proper error handling
4. **Testing**: Manual testing required for all new features
5. **Documentation**: Update relevant docs with changes

### Code Style
- **ESLint**: Follow Next.js recommended rules
- **Prettier**: Automated code formatting
- **Naming**: Descriptive component and function names
- **Comments**: Document complex logic and API integrations

## 📝 License

Private project - All rights reserved.

## 🆘 Support

For technical issues or feature requests, please contact the development team.

---

**Built with ❤️ for the Web3 community**