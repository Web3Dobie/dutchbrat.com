# DutchBrat Agent Production Stack

## Overview

The DutchBrat production stack is a scalable, multi-agent ecosystem designed for automated financial research, content generation, and market data analysis. The system follows a microservices architecture with specialized agents that communicate through shared data infrastructure.

## Architecture Diagram

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Frontend      │    │  Hunter Agent   │    │ HTD Research    │
│   (Next.js)     │    │  (Content Gen)  │    │    Agent        │
│   Port: 80/443  │    │   Port: 3001    │    │   Port: 3002    │
└─────────┬───────┘    └─────────┬───────┘    └─────────┬───────┘
          │                      │                      │
          │              ┌───────┴───────┐              │
          │              │ Nginx Articles │              │
          │              │  (Static Serve)│              │
          │              └───────────────┘              │
          │                                             │
          └─────────────────┬───────────────────────────┘
                            │
            ┌───────────────┴────────────────┐
            │     Market Data Service        │
            │        (Port: 8001)            │
            └───────────────┬────────────────┘
                            │
            ┌───────────────┴────────────────┐
            │                                │
    ┌───────┴───────┐              ┌────────┴────────┐
    │  PostgreSQL   │              │     Redis       │
    │  (Port: 5432) │              │  (Port: 6379)   │
    │   Database    │              │     Cache       │
    └───────────────┘              └─────────────────┘
```

## Agent Components

### 1. Hunter Agent (Content Generation)
- **Purpose**: Automated content creation and social media management
- **Container**: `hunter-agent`
- **Port**: 3001
- **Technology**: Node.js/Python (inferred from structure)

**Key Features**:
- Content generation and publishing
- Post scheduling and management
- Data persistence through mounted volumes
- Logging and monitoring capabilities

**Volume Mounts**:
- `./hunter-agent-posts:/app/posts:rw` - Generated content storage
- `./Hunter-Agent/logs:/app/logs:rw` - Application logs
- `./Hunter-Agent/data:/app/data:rw` - Agent data storage

### 2. HTD Research Agent (Market Research)
- **Purpose**: High-level market research and analysis
- **Container**: `htd-agent`
- **Port**: 3002
- **Technology**: Node.js/Python with database integration

**Key Features**:
- Market research automation
- Integration with Market Data Service
- PostgreSQL database connectivity
- Research report generation

**Dependencies**:
- PostgreSQL database
- Market Data Service API
- External research APIs (via environment configuration)

### 3. Market Data Service (Data Pipeline)
- **Purpose**: Financial market data aggregation and processing
- **Container**: `market-data-service`
- **Port**: 8001
- **Technology**: Python/FastAPI (inferred from HOST/PORT config)

**Key Features**:
- Real-time market data ingestion
- Data normalization and storage
- API endpoints for other services
- Redis caching for performance
- PostgreSQL persistence

**Performance Characteristics**:
- Redis caching layer for sub-second responses
- Horizontal scaling capability through load balancing
- Database connection pooling

## Infrastructure Components

### Database Layer (PostgreSQL)
- **Database**: `agents_platform`
- **User**: `hunter_admin`
- **SSL Mode**: Disabled (internal network)
- **Persistent Storage**: Docker volume `postgres_data`

**Scaling Considerations**:
- Read replicas for high-traffic scenarios
- Connection pooling (PgBouncer recommended for production)
- Backup and recovery strategies needed

### Caching Layer (Redis)
- **Purpose**: Session storage, caching, message queuing
- **Persistent Storage**: Docker volume `redis_data`
- **Access**: Internal network only

**Usage Patterns**:
- Market data caching (Market Data Service)
- Session management (Frontend)
- Inter-agent communication queues

### Frontend Application (Next.js)
- **Purpose**: User interface and API gateway
- **Ports**: 80 (HTTP), 443 (HTTPS)
- **Environment**: Production optimized

**Configuration Sources**:
- API keys for external services
- Frontend-specific settings
- Agent communication endpoints

### Content Delivery (Nginx)
- **Purpose**: Static serving of agent-generated articles
- **Source**: Hunter Agent posts
- **Configuration**: Custom nginx.conf

## Configuration Management

### Environment Files Structure
```
config/
├── secrets/
│   ├── database.env          # Database credentials
│   └── api-keys.env         # External API keys
└── services/
    ├── frontend.env         # Frontend configuration
    ├── hunter-agent.env     # Hunter Agent settings
    ├── htd-research.env     # HTD Research configuration
    └── market-data.env      # Market Data Service settings
```

### Security Considerations
- Secrets isolated in separate environment files
- Database access restricted to internal network
- No external exposure of agent ports (except through frontend)

## Inter-Agent Communication

### Direct Service Calls
- **HTD Research Agent** → **Market Data Service**: `http://market-data-service:8001`
- **Frontend** → **All Agents**: Through internal network routing

### Shared Data Layer
- **PostgreSQL**: Shared database for persistent state
- **Redis**: Shared cache and message queuing
- **File System**: Mounted volumes for content sharing

## Deployment and Scaling

### Current Deployment
- Single-node Docker Compose setup
- Suitable for development and small-scale production
- All services on one host with internal networking

### Scaling Strategies

#### Horizontal Scaling Options
1. **Service Replication**:
   ```yaml
   htd-agent:
     deploy:
       replicas: 3
   ```

2. **Load Balancing**:
   - Nginx proxy for agent load distribution
   - Redis for session affinity management

3. **Database Scaling**:
   - Read replicas for market data queries
   - Connection pooling for concurrent access

#### Kubernetes Migration Path
```yaml
# Future Kubernetes deployment structure
apiVersion: apps/v1
kind: Deployment
metadata:
  name: hunter-agent
spec:
  replicas: 3
  selector:
    matchLabels:
      app: hunter-agent
```

## Monitoring and Observability

### Current Logging
- **Hunter Agent**: `./Hunter-Agent/logs:/app/logs:rw`
- **HTD Research Agent**: `./HTD-Research-Agent/logs:/app/logs`

### Recommended Additions
1. **Centralized Logging**: ELK Stack or similar
2. **Metrics Collection**: Prometheus + Grafana
3. **Health Checks**: Agent endpoint monitoring
4. **Alerting**: Critical failure notifications

## Development Workflow

### Local Development
```bash
# Start all services
docker-compose up -d

# View logs for specific agent
docker-compose logs -f hunter-agent

# Scale specific service
docker-compose up -d --scale htd-agent=2
```

### Environment Management
- Development: Override with `docker-compose.override.yml`
- Staging: Separate compose file with staging configurations
- Production: Current setup with production environment files

## API Endpoints

### Market Data Service (Port 8001)
- Health check and data endpoints
- Internal API for other agents
- Real-time market data streaming

### HTD Research Agent (Port 3002)
- Research report generation
- Market analysis endpoints
- Integration with external research APIs

### Hunter Agent (Port 3001)
- Content generation APIs
- Post scheduling and management
- Content delivery coordination

## Backup and Recovery

### Data Persistence
- **PostgreSQL**: Volume-based persistence
- **Redis**: Volume-based persistence (optional)
- **Generated Content**: File system mounts

### Backup Strategy Recommendations
1. **Database**: Automated PostgreSQL dumps
2. **Content**: Regular sync of generated articles
3. **Configuration**: Git-based configuration management

## Security Considerations

### Network Security
- Internal network isolation
- No direct external access to agents
- Frontend acts as API gateway

### Data Security
- Environment-based secret management
- Database access controls
- File system permission management

### Recommendations for Production
1. **SSL/TLS**: Implement HTTPS termination
2. **Authentication**: API key management for agent communication
3. **Rate Limiting**: Protect against abuse
4. **Audit Logging**: Track agent activities

## Performance Optimization

### Current Optimizations
- Redis caching in Market Data Service
- Docker layer caching for builds
- Volume mounts for persistent data

### Future Optimizations
1. **Connection Pooling**: Database connection management
2. **Caching Strategy**: Multi-layer caching implementation
3. **Resource Limits**: CPU and memory constraints
4. **Async Processing**: Queue-based task processing

## Troubleshooting Guide

### Common Issues
1. **Service Discovery**: Check internal network connectivity
2. **Database Connections**: Verify credentials and network access
3. **Volume Permissions**: Ensure proper file system permissions
4. **Memory Usage**: Monitor container resource consumption

### Debug Commands
```bash
# Check service health
docker-compose ps

# View service logs
docker-compose logs [service-name]

# Execute commands in container
docker-compose exec [service-name] /bin/bash

# Check network connectivity
docker-compose exec [service-name] ping [target-service]
```

## Future Roadmap

### Short Term (1-3 months)
- Health check endpoints for all agents
- Centralized logging implementation
- Performance monitoring setup

### Medium Term (3-6 months)
- Kubernetes migration planning
- Auto-scaling implementation
- Enhanced security measures

### Long Term (6+ months)
- Multi-region deployment
- AI model optimization
- Advanced analytics platform

---

## Configuration Quick Reference

### Service URLs (Internal Network)
- Market Data Service: `http://market-data-service:8001`
- HTD Research Agent: `http://htd-agent:3002`
- Hunter Agent: `http://hunter-agent:3001`
- PostgreSQL: `postgres:5432`
- Redis: `redis:6379`

### External Access
- Frontend: `http://localhost:80` or `https://localhost:443`
- Articles: Served via nginx-articles container

### Key Environment Variables
- `DATABASE_URL`: PostgreSQL connection string
- `REDIS_URL`: Redis connection string
- `MARKET_DATA_SERVICE_URL`: Internal service discovery
- `NODE_ENV=production`: Production mode settings