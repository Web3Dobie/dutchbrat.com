# AGENTS-hunters-hounds.md - AI Agent Documentation for Hunter's Hounds Dog Walking Service

## 🐶 Business Overview for AI Agents

**Service Name**: Hunter's Hounds Professional Dog Walking Service  
**Architecture**: Next.js API Routes + PostgreSQL + External Service Integrations  
**Purpose**: Complete booking and customer management platform for professional dog walking business  
**Integration**: Embedded within DutchBrat platform frontend container  

## 🎯 Service Portfolio

**Available Services:**
- **Meet & Greet** (30 min, FREE) - Introduction sessions for new clients
- **Solo Walk** (60 min, £17.50) - One-on-one attention and exercise  
- **Quick Walk** (30 min, £10) - Shorter park visits and play sessions
- **Dog Sitting** (Variable duration, POA) - Customized in-home visits

**Business Constraints:**
- **Operating Hours**: Monday-Friday, 9:00-20:00
- **Maximum Dogs**: 2 dogs per walk
- **Service Areas**: Local service area with address collection
- **Time Buffers**: 15-minute buffer between appointments (excluding start/end of workday)

## 🗄️ Database Schema & Architecture

**Schema**: `hunters_hounds` (within existing `agents_platform` database)

### Core Tables

**owners Table:**
```sql
CREATE TABLE hunters_hounds.owners (
    id SERIAL PRIMARY KEY,
    owner_name VARCHAR(255) NOT NULL,
    phone VARCHAR(20) UNIQUE NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    address TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

**dogs Table:**
```sql
CREATE TABLE hunters_hounds.dogs (
    id SERIAL PRIMARY KEY,
    owner_id INTEGER REFERENCES hunters_hounds.owners(id) ON DELETE CASCADE,
    dog_name VARCHAR(255) NOT NULL,
    dog_breed VARCHAR(255) NOT NULL,
    dog_age INTEGER NOT NULL,
    behavioral_notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

**bookings Table:**
```sql
CREATE TABLE hunters_hounds.bookings (
    id SERIAL PRIMARY KEY,
    owner_id INTEGER REFERENCES hunters_hounds.owners(id) ON DELETE CASCADE,
    dog_id_1 INTEGER REFERENCES hunters_hounds.dogs(id) ON DELETE CASCADE,
    dog_id_2 INTEGER REFERENCES hunters_hounds.dogs(id) ON DELETE CASCADE NULL,
    service_type VARCHAR(50) NOT NULL CHECK (service_type IN ('meet-greet', 'solo-walk', 'quick-walk', 'dog-sitting')),
    start_time TIMESTAMP UNIQUE NOT NULL,
    duration_minutes INTEGER NOT NULL,
    price_pounds DECIMAL(6,2),
    google_event_id VARCHAR(255) UNIQUE,
    status VARCHAR(20) DEFAULT 'confirmed' CHECK (status IN ('confirmed', 'cancelled', 'completed')),
    cancellation_token VARCHAR(255) UNIQUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

### Business Logic Integration

**Availability Calculation:**
- Primary source: Google Calendar API (busy events)
- 15-minute conditional buffer between appointments
- Working hours: Mon-Fri 9:00-20:00 only
- Inverted busy periods to calculate available time slots

**Multi-Dog Support:**
- Primary dog: `dog_id_1` (required)
- Secondary dog: `dog_id_2` (optional)
- Both dogs must belong to same owner for single booking

## 🌐 Service Architecture & Data Flow

```mermaid
graph LR
    User[User on /dog-walking page] --> A{BookingCalendar.tsx}
    A --> B(GET /api/dog-walking/availability)
    B --> C(Google Calendar API)
    C --> B
    B --> A
    A --> D{BookingForm.tsx}
    D --> E(POST /api/dog-walking/book)
    E --> F[PostgreSQL: hunters_hounds schema]
    E --> G(Google Calendar API: Create Event)
    E --> H(Resend Email Service)
    E --> I(Telegram Notification)
    F --> J[DB Tables: owners, dogs, bookings]
    G --> B

    subgraph External Services
        C
        H
        I
    end

    subgraph Database Layer
        F
        J
    end
```

## 💻 API Routes & Endpoints

**Base Path**: `/api/dog-walking/`

### Core API Endpoints

**GET /api/dog-walking/availability**
- **Purpose**: Returns available time slots for booking
- **Logic**: 
  1. Fetches Google Calendar busy events
  2. Applies 15-minute buffers between appointments
  3. Inverts busy periods to find free slots within 9:00-20:00, Mon-Fri
- **Response**: Array of `{start: ISO8601, end: ISO8601}` objects

**GET /api/dog-walking/user-lookup?phone={phone}**
- **Purpose**: Check if customer account exists
- **Logic**: Searches `owners` table by phone number
- **Response**: `{exists: boolean, owner?: Object, dogs?: Array}`

**POST /api/dog-walking/user-register**
- **Purpose**: Create new customer account
- **Body**: `{owner_name, phone, email, address, dog_name, dog_breed, dog_age}`
- **Logic**: Atomic transaction creating records in both `owners` and `dogs` tables
- **Response**: `{owner_id, dog_id}`

**POST /api/dog-walking/dog-add**
- **Purpose**: Add additional dog to existing customer
- **Body**: `{owner_id, dog_name, dog_breed, dog_age}`
- **Logic**: Insert new record in `dogs` table linked to `owner_id`
- **Response**: `{dog_id}`

**POST /api/dog-walking/book**
- **Purpose**: Create confirmed booking
- **Body**: `{owner_id, dog_id_1, dog_id_2?, service_type, start_time, duration_minutes}`
- **Logic**: Atomic transaction:
  1. Insert booking record into `bookings` table
  2. Create Google Calendar event
  3. Send confirmation email via Resend
  4. Send Telegram notification to business owner
- **Response**: `{booking_id, google_event_id, cancellation_token}`

**POST /api/dog-walking/cancel**
- **Purpose**: Cancel existing booking
- **Body**: `{cancellation_token}` or `{booking_id}`
- **Logic**: Atomic transaction:
  1. Delete Google Calendar event
  2. Update `bookings.status` to 'cancelled'
  3. Send cancellation confirmation email
  4. Send Telegram alert to business owner
- **Response**: `{success: boolean}`

## 🔧 External Service Dependencies

### Required Environment Variables

```bash
# Google Calendar Integration
GOOGLE_CALENDAR_ID=primary                    # Target calendar for availability/blocking
GOOGLE_CLIENT_EMAIL=service-account@...       # Service account email
GOOGLE_PRIVATE_KEY="-----BEGIN PRIVATE KEY..." # Service account private key

# Email Service
RESEND_API_KEY=re_xxxxxxxxxxxxx               # Resend API key for transactional emails

# Telegram Notifications  
TELEGRAM_BOT_TOKEN=123456789:ABCdef...         # Telegram bot token
TELEGRAM_CHAT_ID=-123456789                   # Target chat for business notifications

# Database (Shared with main platform)
POSTGRES_HOST=postgres                         # Docker service name
POSTGRES_PORT=5432                            # Default PostgreSQL port
POSTGRES_DB=agents_platform                   # Database name
POSTGRES_USER=hunter_admin                    # Database user
POSTGRES_PASSWORD=YourSecurePassword123!      # Database password
```

### Service Integration Details

**Google Calendar API:**
- **Purpose**: Primary source of truth for availability and automatic event creation
- **Permissions**: Read calendar events, create/delete events
- **Event Format**: Structured events with customer details and service type
- **Conflict Prevention**: Unique `start_time` constraint in database + calendar checking

**Resend Email Service:**
- **Purpose**: Professional booking confirmations, reminders, and cancellation emails
- **Templates**: Branded HTML emails with business logo and styling
- **Features**: Cancellation links, spam folder guidance, service details
- **Rate Limits**: Standard Resend limits apply

**Telegram Bot Integration:**
- **Purpose**: Real-time business notifications for all customer activities
- **Events**: New registrations, bookings, cancellations, system errors
- **Format**: Structured messages with customer details and booking information
- **Fallback**: Email notifications if Telegram delivery fails

## 📱 Frontend Components & User Experience

### Core Components

**BookingCalendar.tsx** (Client Component)
- **Purpose**: Main booking interface controller
- **Features**:
  - Calendar date picker with available slot highlighting
  - Time slot selection with real-time availability checking
  - State management for view transitions (picker → form → success)
  - Mobile-responsive design
- **Integration**: Calls `/api/dog-walking/availability` for real-time slot data

**BookingForm.tsx** (Client Component)
- **Purpose**: Multi-step customer registration and booking form
- **Flow**:
  1. Phone number lookup for existing customers
  2. New customer registration (name, email, address, first dog details)
  3. Dog selection/addition for existing customers
  4. Service selection and booking confirmation
- **Validation**: Client-side form validation with server-side verification
- **Integration**: Multiple API calls for lookup, registration, and final booking

### Customer Journey Flow

1. **Landing**: Service cards with pricing and descriptions
2. **Calendar**: Date selection with availability visualization
3. **Time Selection**: Available slots for selected date
4. **Customer Lookup**: Phone number check for existing accounts
5. **Registration/Login**: Account creation or dog selection for existing customers
6. **Service Selection**: Choose from available service types
7. **Confirmation**: Booking summary and final submission
8. **Success**: Confirmation with booking details and next steps

## 🚀 Business Automation & Workflows

### Automated Workflows

**Booking Confirmation:**
1. Database record creation with unique `cancellation_token`
2. Google Calendar event creation with customer details
3. Branded confirmation email with service details and cancellation link
4. Telegram notification to business owner with customer summary

**Cancellation Process:**
1. Email-based cancellation links with secure tokens
2. Automatic Google Calendar event deletion
3. Database status update to 'cancelled'
4. Confirmation email to customer
5. Telegram alert to business owner

**Daily Reminder System:**
- **Script**: `scripts/send-reminders.js`
- **Schedule**: Daily cron job execution
- **Logic**: Query next-day bookings, send 24-hour reminder emails
- **Features**: Professional reminder templates with service preparation details

### Business Intelligence

**Performance Metrics Tracking:**
- Booking conversion rates by service type
- Customer retention and repeat booking patterns
- Revenue tracking by service category
- Cancellation rates and common reasons

**Operational Insights:**
- Popular time slots for capacity planning
- Service demand patterns for pricing optimization
- Customer geographic distribution for service area expansion
- Average booking lead time for availability planning

## 🔒 Security & Data Protection

### Data Security Measures

**Customer Data Protection:**
- Encrypted phone numbers and email addresses
- Secure cancellation tokens with UUID generation
- Address data protection with access logging
- GDPR-compliant data retention policies

**API Security:**
- Rate limiting on all booking endpoints
- Input validation and sanitization
- SQL injection prevention with parameterized queries
- CORS protection for API routes

**External Service Security:**
- Google Calendar service account with minimal permissions
- Resend API key rotation and monitoring
- Telegram bot token security with webhook validation
- Environment variable encryption and access control

### Compliance & Auditing

**Business Compliance:**
- Customer consent tracking for communications
- Data retention schedules for inactive accounts
- Audit trails for all booking modifications
- Backup and recovery procedures for customer data

## 📊 Scalability & Performance Considerations

### Current Scale Metrics
- **Target Capacity**: 50+ bookings per week
- **Customer Base**: 100+ active customers with multiple dogs
- **Response Time**: <500ms for availability checks, <2s for booking creation
- **Database Growth**: ~1000 records per month across all tables

### Performance Optimizations
- **Database Indexing**: Optimized indexes on `start_time`, `phone`, `email`
- **Connection Pooling**: Shared PostgreSQL pool with main platform
- **Calendar Caching**: 15-minute cache for availability data during peak booking
- **Email Queuing**: Async email sending to prevent booking delays

### Growth Scaling Strategy
- **Geographic Expansion**: Multi-location support with service area boundaries
- **Staff Scaling**: Multi-walker support with individual calendar integration
- **Service Expansion**: Additional pet services (grooming, training, boarding)
- **Mobile App**: Native mobile booking app for improved customer experience

---

**For AI Agents**: This service operates as a complete business domain within the broader DutchBrat platform. Focus on the `hunters_hounds` schema for all database operations and the `/api/dog-walking/` route namespace for API modifications. The service follows atomic transaction patterns for data consistency and integrates with external services for complete automation. All customer-facing operations require email confirmations and business owner notifications via Telegram.
