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
- **Dog Sitting** (Variable duration, POA) - Customized in-home visits with extended flexibility

**Enhanced Business Constraints:**
- **Operating Hours**: 
  - **Dog Walking Services**: Monday-Friday, 9:00-20:00
  - **Dog Sitting**: Monday-Friday, 00:00-23:59 (24-hour availability)
- **Maximum Dogs**: 2 dogs per walk/sitting
- **Service Areas**: Local service area with address collection
- **Time Buffers**: 15-minute buffer between appointments (excluding start/end of workday)
- **Multi-Day Support**: Dog sitting supports single-day and multi-day bookings (e.g., Dec 22-29)

## 🗄️ Enhanced Database Schema & Architecture

**Schema**: `hunters_hounds` (within existing `agents_platform` database)

### Core Tables

**owners Table:** *(Unchanged)*
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

**dogs Table:** *(Unchanged)*
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

**bookings Table:** *(Enhanced with Multi-Day Support)*
```sql
CREATE TABLE hunters_hounds.bookings (
    id SERIAL PRIMARY KEY,
    owner_id INTEGER REFERENCES hunters_hounds.owners(id) ON DELETE CASCADE,
    dog_id_1 INTEGER REFERENCES hunters_hounds.dogs(id) ON DELETE CASCADE,
    dog_id_2 INTEGER REFERENCES hunters_hounds.dogs(id) ON DELETE CASCADE NULL,
    service_type VARCHAR(50) NOT NULL CHECK (service_type IN ('meet-greet', 'solo-walk', 'quick-walk', 'dog-sitting')),
    
    -- Enhanced timing fields for multi-day support
    start_time TIMESTAMP NOT NULL,
    end_time TIMESTAMP NOT NULL,
    booking_type VARCHAR(20) DEFAULT 'single' CHECK (booking_type IN ('single', 'multi_day')),
    
    -- Legacy/Optional fields
    price_pounds DECIMAL(6,2),
    google_event_id VARCHAR(255) UNIQUE,
    status VARCHAR(20) DEFAULT 'confirmed' CHECK (status IN ('confirmed', 'cancelled', 'completed')),
    cancellation_token VARCHAR(255) UNIQUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    -- Multi-day booking constraints
    CONSTRAINT check_end_time_after_start CHECK (end_time >= start_time),
    CONSTRAINT check_multi_day_end_time CHECK (
        (booking_type = 'single' AND end_time IS NOT NULL) OR 
        (booking_type = 'multi_day' AND end_time IS NOT NULL)
    ),
    
    -- Prevent overlapping confirmed bookings
    CONSTRAINT bookings_start_time_confirmed_unique UNIQUE (start_time) WHERE status = 'confirmed'
);
```

### Enhanced Business Logic Integration

**Service-Specific Availability Calculation:**
- **Dog Walking Services**: Google Calendar API filtered to 9:00-20:00, Mon-Fri
- **Dog Sitting**: Google Calendar API with 24-hour availability (00:00-23:59), Mon-Fri
- 15-minute conditional buffer between appointments
- Multi-day blocking: Single Google Calendar event spans entire period

**Multi-Day Booking Support:**
- **Auto-Detection**: UI automatically detects single vs multi-day based on date selection
- **Single Day**: Traditional start_time + duration flow
- **Multi-Day**: Date range selection + specific start/end times (e.g., Dec 22 17:30 - Dec 29 23:30)
- **Database Storage**: `booking_type` field distinguishes between 'single' and 'multi_day'
- **Calendar Blocking**: One spanning event blocks the entire period with proper start/end times

**Multi-Dog Support:** *(Unchanged)*
- Primary dog: `dog_id_1` (required)
- Secondary dog: `dog_id_2` (optional)
- Both dogs must belong to same owner for single booking

## 🌐 Enhanced Service Architecture & Data Flow

```mermaid
graph LR
    User[User on /dog-walking page] --> A{MobileBookingCalendar.tsx}
    A --> B(GET /api/dog-walking/availability?service_type=X)
    B --> C(Google Calendar API)
    C --> B
    B --> A
    A --> D{Service-Specific UI}
    D --> E{BookingForm.tsx}
    D --> F{SittingBookingFlow.tsx}
    F --> G[Date Range Picker - react-day-picker]
    F --> H[Auto-Detection: Single vs Multi-Day]
    E --> I(POST /api/dog-walking/book)
    I --> J[PostgreSQL: Enhanced bookings table]
    I --> K(Google Calendar API: Single/Multi-Day Events)
    I --> L(Resend Email Service)
    I --> M(Telegram Notification)
    J --> N[DB Tables: owners, dogs, enhanced bookings]
    K --> B

    subgraph External Services
        C
        L
        M
    end

    subgraph Database Layer
        J
        N
    end

    subgraph Enhanced UI Components
        G
        H
        F
    end
```

## 💻 Enhanced API Routes & Endpoints

**Base Path**: `/api/dog-walking/`

### Core API Endpoints

**GET /api/dog-walking/availability** *(Enhanced)*
- **Purpose**: Returns service-specific available time slots
- **Parameters**: 
  - `date` (required): YYYY-MM-DD format
  - `service_type` (optional): 'dog-sitting' | 'solo-walk' | 'quick-walk' | 'meet-greet'
  - `start_date` (optional): For multi-day queries
  - `end_date` (optional): For multi-day queries
- **Logic**: 
  1. Fetches Google Calendar busy events
  2. Applies service-specific hours:
     - **Dog Sitting**: 00:00-23:59 availability
     - **All Other Services**: 09:00-20:00 availability
  3. Applies 15-minute buffers between appointments
  4. Inverts busy periods to find free slots within service hours
  5. For multi-day queries: Checks availability across date range
- **Response**: Array of `{start: "HH:mm", end: "HH:mm"}` objects

**GET /api/dog-walking/user-lookup?phone={phone}** *(Unchanged)*
- **Purpose**: Check if customer account exists
- **Logic**: Searches `owners` table by phone number
- **Response**: `{exists: boolean, owner?: Object, dogs?: Array}`

**POST /api/dog-walking/user-register** *(Unchanged)*
- **Purpose**: Create new customer account
- **Body**: `{owner_name, phone, email, address, dog_name, dog_breed, dog_age}`
- **Logic**: Atomic transaction creating records in both `owners` and `dogs` tables
- **Response**: `{owner_id, dog_id}`

**POST /api/dog-walking/dog-add** *(Unchanged)*
- **Purpose**: Add additional dog to existing customer
- **Body**: `{owner_id, dog_name, dog_breed, dog_age}`
- **Logic**: Insert new record in `dogs` table linked to `owner_id`
- **Response**: `{dog_id}`

**POST /api/dog-walking/book** *(Enhanced for Multi-Day)*
- **Purpose**: Create confirmed booking (single or multi-day)
- **Body**: 
  ```json
  {
    "owner_id": 123,
    "dog_id_1": 456,
    "dog_id_2": 789, // optional
    "service_type": "dog-sitting",
    "booking_type": "multi_day", // 'single' | 'multi_day'
    "start_time": "2024-12-22T17:30:00Z",
    "end_time": "2024-12-29T23:30:00Z" // required for both single and multi-day
  }
  ```
- **Logic**: Atomic transaction:
  1. Insert booking record with `booking_type` and `end_time`
  2. Create single Google Calendar event spanning full period
  3. Send service-specific confirmation email (single vs multi-day templates)
  4. Send enhanced Telegram notification with booking type and duration
- **Response**: `{booking_id, google_event_id, cancellation_token}`

**POST /api/dog-walking/cancel** *(Enhanced with Dual Access Methods)*
- **Purpose**: Cancel existing booking via email token or dashboard booking ID
- **Body**: `{cancellation_token?: string, bookingId?: number, reason?: string}`
- **Authentication Methods**:
  - **Email Links**: Use `cancellation_token` for secure token-based cancellation
  - **Dashboard**: Use `bookingId` for authenticated customer dashboard cancellation
- **Security**: UUID-based cancellation tokens prevent unauthorized cancellation attempts
- **Logic**: Atomic transaction:
  1. Lookup booking by token OR booking ID
  2. Delete Google Calendar event
  3. Update `bookings.status` to 'cancelled'
  4. Send cancellation confirmation email
  5. Send Telegram alert to business owner
- **Response**: `{success: boolean, message: string}`
- **Frontend Integration**: 
  - Email links: `/dog-walking/cancel?token={cancellation_token}`
  - Dashboard: Direct API call with booking ID

### Customer Dashboard API Endpoints *(New)*

**GET /api/dog-walking/customer-lookup?phone={phone}** *(Enhanced)*
- **Purpose**: Customer authentication for dashboard access
- **Logic**: Searches `owners` table by phone number for dashboard login
- **Response**: `{exists: boolean, owner?: Object, dogs?: Array}`

**GET /api/dog-walking/customer-bookings?owner_id={id}**
- **Purpose**: Retrieve all bookings for dashboard display
- **Parameters**: `owner_id` (required)
- **Logic**: Returns all bookings with dog information, sorted by creation date
- **Response**: `{success: boolean, bookings: Array, total_count: number}`
- **Frontend Sorting**: 
  - **Upcoming Bookings**: Sorted by `start_time ASC` (soonest first)
  - **Booking History**: Sorted by `start_time DESC` (most recent first)

**GET /api/dog-walking/booking-details?booking_id={id}**
- **Purpose**: Retrieve detailed booking information for dashboard
- **Logic**: Returns complete booking details with owner and dog information
- **Response**: `{success: boolean, booking: Object}`

**POST /api/dog-walking/reschedule-booking**
- **Purpose**: Reschedule existing booking through dashboard
- **Body**: `{booking_id, new_start_time, new_end_time}`
- **Logic**: Atomic transaction updating booking, calendar, and notifications
- **Response**: `{success: boolean, message: string}`

## 🔧 External Service Dependencies

### Required Environment Variables *(Unchanged)*

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

### Enhanced Service Integration Details

**Google Calendar API:** *(Enhanced)*
- **Purpose**: Primary source of truth for availability and automatic event creation
- **Permissions**: Read calendar events, create/delete events
- **Event Format**: 
  - **Single Day**: Standard event with customer details
  - **Multi-Day**: Single spanning event (e.g., Dec 22 17:30 - Dec 29 23:30)
- **Service-Specific Blocking**: Events properly block based on actual times, not entire days
- **Conflict Prevention**: Unique `start_time` constraint in database + calendar checking

**Resend Email Service:** *(Enhanced)*
- **Purpose**: Professional booking confirmations with service-specific templates
- **Templates**: 
  - **Single Day Bookings**: Standard confirmation with date/time
  - **Multi-Day Bookings**: Enhanced template with date range and daily schedule
  - **Cancellation**: Service-agnostic cancellation confirmations
- **Features**: Cancellation links, spam folder guidance, service details
- **Rate Limits**: Standard Resend limits apply

**Telegram Bot Integration:** *(Enhanced)*
- **Purpose**: Real-time business notifications with booking type awareness
- **Events**: New registrations, single/multi-day bookings, cancellations, system errors
- **Format**: Enhanced messages showing:
  - Booking type (Single Day / Multi-Day)
  - Full duration for multi-day bookings
  - Customer details and service information
- **Fallback**: Email notifications if Telegram delivery fails

## 📱 Enhanced Frontend Components & User Experience

### Core Components

**MobileBookingCalendar.tsx** *(Enhanced)*
- **Purpose**: Main booking interface controller with service-aware routing
- **Features**:
  - Service-specific UI routing (traditional calendar vs sitting flow)
  - Calendar date picker for walk services
  - Direct integration with SittingBookingFlow for dog sitting
  - State management for view transitions (picker → form → success)
  - Mobile-responsive design with touch-friendly interfaces
- **Integration**: 
  - Calls `/api/dog-walking/availability?service_type=${service}` for service-specific hours
  - Routes to appropriate booking flow based on selected service

**SittingBookingFlow.tsx** *(New Component)*
- **Purpose**: Specialized booking interface for dog sitting services
- **Features**:
  - **Date Range Selection**: Uses `react-day-picker` for intuitive date range picking
  - **Auto-Detection**: Automatically detects single vs multi-day based on date selection
  - **Time Selection**: Flexible start/end time selection for any time of day
  - **Duration Calculation**: Real-time duration display and validation
  - **24-Hour Support**: Accepts bookings at any time (00:00-23:59)
- **Flow**:
  1. Date selection (single date or date range)
  2. Auto-detection of booking type
  3. Start time selection (for single day: duration picker, for multi-day: end time picker)
  4. Booking confirmation
- **Dependencies**: `react-day-picker` for date range functionality

**BookingForm.tsx** *(Enhanced)*
- **Purpose**: Multi-step customer registration and booking form with booking type awareness
- **Flow**:
  1. Phone number lookup for existing customers
  2. New customer registration (name, email, address, first dog details)
  3. Dog selection/addition for existing customers
  4. Service selection and booking confirmation with proper booking type handling
- **Validation**: Enhanced client-side validation for multi-day bookings
- **Integration**: Handles both single and multi-day booking submissions

**ResponsiveDatePicker.tsx** *(Enhanced)*
- **Purpose**: Mobile-optimized date picker with conditional rendering
- **Features**: Hidden for dog sitting service (uses SittingBookingFlow instead)
- **Integration**: Service-aware rendering based on selected service type

### Customer Dashboard Components *(New)*

**CustomerDashboard.tsx** *(New Component)*
- **Purpose**: Main dashboard container managing authentication and view state
- **Features**:
  - Phone number authentication for customer access
  - View state management (auth → main dashboard → booking details)
  - Responsive design for mobile and desktop
  - Integration with all dashboard sub-components

**DashboardAuth.tsx** *(New Component)*
- **Purpose**: Customer authentication interface for dashboard access
- **Features**:
  - Phone number lookup with validation
  - Customer account verification
  - Seamless transition to dashboard main view
  - Error handling for unknown customers

**DashboardMain.tsx** *(New Component)*
- **Purpose**: Main dashboard view showing booking overview and management
- **Features**:
  - **Upcoming Bookings**: Displays confirmed future appointments
  - **Booking History**: Shows all past and cancelled bookings
  - **Smart Sorting**: Frontend sorting with upcoming (ASC) and history (DESC)
  - **Status-Based Filtering**: Automatic separation of upcoming vs historical bookings
  - **Quick Actions**: Cancel, reschedule, and view details buttons
  - **Mobile-Optimized**: Touch-friendly interface with intuitive navigation

**BookingManager.tsx** *(New Component)*
- **Purpose**: Detailed booking management for individual appointments
- **Features**:
  - **Full Booking Details**: Complete appointment information display
  - **Cancellation Interface**: Secure cancellation with reason tracking
  - **Reschedule Options**: Date/time modification capabilities
  - **Status Management**: Real-time booking status updates
  - **Confirmation Dialogs**: User-friendly confirmation workflows

### Enhanced Customer Journey Flow

**Booking Journey:**
1. **Landing**: Service cards with pricing and descriptions
2. **Service Selection**: Choose from walk services or dog sitting
3. **Booking Interface**:
   - **Walk Services**: Traditional calendar → time selection flow
   - **Dog Sitting**: Direct to SittingBookingFlow with date range picker
4. **Time Selection**: 
   - **Walk Services**: Available slots within 9:00-20:00
   - **Dog Sitting**: Flexible time selection with 24-hour availability
5. **Multi-Day Detection**: Automatic detection and appropriate UI adaptation
6. **Customer Lookup**: Phone number check for existing accounts
7. **Registration/Login**: Account creation or dog selection for existing customers
8. **Confirmation**: Enhanced booking summary with duration and booking type
9. **Success**: Confirmation with service-specific booking details and dashboard link

**Dashboard Journey:**
1. **Dashboard Access**: Customer visits `/dog-walking/dashboard` or clicks email link
2. **Authentication**: Phone number verification via DashboardAuth component
3. **Main Dashboard**: Overview of upcoming bookings and booking history
4. **Booking Management**: Detailed view, cancellation, and reschedule options
5. **Actions**: Cancel appointments, view details, or return to main booking page

## 🚀 Enhanced Business Automation & Workflows

### Enhanced Automated Workflows

**Single Day Booking Confirmation:**
1. Database record creation with `booking_type: 'single'` and `end_time`
2. Google Calendar event creation with customer details
3. Enhanced confirmation email with:
   - Date/time details and service information
   - **Dashboard Link**: Direct access to customer booking management
   - **Cancel Link**: Secure token-based cancellation option
4. Telegram notification with booking summary

**Multi-Day Booking Confirmation:**
1. Database record creation with `booking_type: 'multi_day'` and spanning `end_time`
2. Single Google Calendar event covering entire period (e.g., Dec 22 17:30 - Dec 29 23:30)
3. Enhanced confirmation email with:
   - Full date range display
   - Daily schedule information
   - Extended service preparation details
   - **Dashboard Link**: Direct access to customer booking management
   - **Cancel Link**: Secure token-based cancellation option
4. Enhanced Telegram notification with:
   - Multi-day duration calculation
   - Total booking value estimation
   - Extended service alerts

**Enhanced Cancellation Process:**
1. **Dual Access Methods**:
   - **Email Cancellation**: Secure UUID token-based links (`/dog-walking/cancel?token={token}`)
   - **Dashboard Cancellation**: Authenticated booking ID-based cancellation
2. **Security**: UUID tokens prevent unauthorized cancellation attempts
3. **Processing**: Atomic transaction handles both access methods
4. **Calendar Integration**: Automatic Google Calendar event deletion (single event for multi-day)
5. **Database Updates**: Status change to 'cancelled' with proper audit trails
6. **Notifications**: 
   - Confirmation email to customer with cancellation details
   - Enhanced Telegram alert with cancellation impact (single vs multi-day)
7. **Frontend Integration**: TypeScript-typed interfaces for secure processing

**Daily Reminder System:** *(Enhanced)*
- **Script**: `scripts/send-reminders.js`
- **Schedule**: Daily cron job execution
- **Logic**: 
  - Query next-day bookings (both single and multi-day)
  - Send 24-hour reminder emails with service-specific templates
  - Multi-day bookings: Send start-day reminders and end-day reminders
- **Features**: Enhanced reminder templates with service preparation details

### Enhanced Business Intelligence

**Performance Metrics Tracking:**
- Booking conversion rates by service type (including multi-day vs single day)
- Customer retention and repeat booking patterns
- Revenue tracking by service category (walk vs sitting, single vs multi-day)
- Cancellation rates with booking type analysis
- Multi-day booking demand patterns and seasonal trends

**Operational Insights:**
- Popular time slots for capacity planning (9-20 vs 24-hour utilization)
- Service demand patterns for pricing optimization
- Multi-day booking frequency for resource planning
- Customer geographic distribution for service area expansion
- Average booking lead time by service type

## 🔒 Enhanced Security & Data Protection

### Data Security Measures *(Enhanced)*

**Customer Data Protection:**
- Encrypted phone numbers and email addresses
- Secure cancellation tokens with UUID generation
- Address data protection with access logging
- GDPR-compliant data retention policies
- Enhanced audit trails for multi-day bookings

**API Security:**
- Rate limiting on all booking endpoints
- Enhanced input validation for multi-day booking parameters
- SQL injection prevention with parameterized queries
- CORS protection for API routes
- Service-specific parameter validation

**External Service Security:**
- Google Calendar service account with minimal permissions
- Resend API key rotation and monitoring
- Telegram bot token security with webhook validation
- Environment variable encryption and access control

### Compliance & Auditing *(Enhanced)*

**Business Compliance:**
- Customer consent tracking for communications
- Data retention schedules for inactive accounts
- Enhanced audit trails for all booking modifications (single vs multi-day)
- Backup and recovery procedures for customer data
- Multi-day booking compliance tracking

## 📊 Enhanced Scalability & Performance Considerations

### Current Scale Metrics *(Updated)*
- **Target Capacity**: 50+ bookings per week (including multi-day)
- **Customer Base**: 100+ active customers with multiple dogs
- **Response Time**: <500ms for availability checks, <2s for booking creation
- **Database Growth**: ~1200 records per month across all tables (increased due to multi-day bookings)
- **Multi-Day Support**: Up to 14-day continuous bookings supported

### Enhanced Performance Optimizations
- **Database Indexing**: Optimized indexes on `start_time`, `end_time`, `booking_type`, `phone`, `email`
- **Connection Pooling**: Shared PostgreSQL pool with main platform
- **Calendar Caching**: Service-specific caching (15-minute cache for walk services, 60-minute for sitting)
- **Email Queuing**: Async email sending with template-specific processing
- **Multi-Day Query Optimization**: Efficient date range queries for availability checking

### Enhanced Growth Scaling Strategy
- **Geographic Expansion**: Multi-location support with service area boundaries
- **Staff Scaling**: Multi-walker support with individual calendar integration
- **Service Expansion**: Additional pet services (grooming, training, boarding) with flexible scheduling
- **Mobile App**: Native mobile booking app with offline multi-day booking support
- **Advanced Scheduling**: Recurring multi-day bookings for regular customers

## 🛠️ Enhanced Development Dependencies

### Required NPM Packages
```bash
# Core Dependencies (existing)
npm install @vercel/postgres
npm install @google-cloud/calendar
npm install resend
npm install date-fns

# Enhanced Dependencies (new)
npm install react-day-picker  # For date range selection in SittingBookingFlow
```

### CSS Enhancements
- Enhanced `globals.css` with `react-day-picker` dark theme support
- Mobile-responsive styling for date range picker
- Touch-friendly interface optimizations
- Service-specific UI component styling

## 📋 Operational Procedures

### Manual Data Entry for Historical Records

**Purpose**: Add existing clients and past bookings without triggering automated workflows

**Recommended Approach**: Direct SQL insertion for historical data, regular booking flow for future bookings

**Client Registration SQL Template**:
```sql
-- Step 1: Add owner
INSERT INTO hunters_hounds.owners (owner_name, phone, email, address)
VALUES ('Client Name', '+44XXXXXXXXXX', 'email@example.com', 'Full Address');

-- Step 2: Get owner_id and add dogs
INSERT INTO hunters_hounds.dogs (owner_id, dog_name, dog_breed, dog_age, behavioral_notes)
VALUES 
  (LAST_INSERT_ID(), 'Dog Name 1', 'Breed', 5, 'Any notes'),
  (LAST_INSERT_ID(), 'Dog Name 2', 'Breed', 3, 'Any notes');
```

**Historical Booking SQL Template**:
```sql
-- For single-day past bookings
INSERT INTO hunters_hounds.bookings 
(owner_id, dog_id_1, dog_id_2, service_type, booking_type, start_time, end_time, status, price_pounds)
VALUES 
(owner_id, dog_id, NULL, 'solo-walk', 'single', 
 '2024-10-15 10:00:00', '2024-10-15 11:00:00', 'completed', 17.50);

-- For multi-day past bookings
INSERT INTO hunters_hounds.bookings 
(owner_id, dog_id_1, service_type, booking_type, start_time, end_time, status, price_pounds)
VALUES 
(owner_id, dog_id, 'dog-sitting', 'multi_day',
 '2024-10-20 17:30:00', '2024-10-25 23:30:00', 'completed', NULL);
```

**Data Validation Queries**:
```sql
-- Verify owner and dogs
SELECT o.owner_name, d.dog_name, d.dog_breed 
FROM hunters_hounds.owners o 
JOIN hunters_hounds.dogs d ON o.id = d.owner_id 
WHERE o.phone = '+44XXXXXXXXXX';

-- Verify bookings
SELECT b.*, o.owner_name, d.dog_name
FROM hunters_hounds.bookings b
JOIN hunters_hounds.owners o ON b.owner_id = o.id
JOIN hunters_hounds.dogs d ON b.dog_id_1 = d.id
WHERE b.status = 'completed'
ORDER BY b.start_time DESC;
```

## 📱 Customer Dashboard & Self-Service Features *(New)*

### Dashboard Access & Authentication
- **URL**: `/dog-walking/dashboard` (standalone page accessible from email links)
- **Authentication**: Phone number-based lookup (no passwords required)
- **Session Management**: Frontend-only session for dashboard navigation
- **Mobile Optimization**: Touch-friendly interface for mobile customers

### Core Dashboard Features
- **Upcoming Bookings**: Real-time view of confirmed future appointments
- **Booking History**: Complete chronological history of all bookings
- **Smart Sorting**: 
  - **Upcoming**: Soonest appointments first (`start_time ASC`)
  - **History**: Most recent appointments first (`start_time DESC`)
- **Self-Service Actions**:
  - Secure cancellation with optional reason
  - Detailed booking information display
  - Direct rebooking capabilities

### Enhanced Customer Experience
- **Email Integration**: Dashboard links included in all confirmation emails
- **Status Clarity**: Clear visual indicators for confirmed/cancelled/completed bookings
- **Responsive Design**: Optimized for both mobile and desktop viewing
- **Intuitive Navigation**: Single-page application with smooth transitions

## 🛠️ Frontend Architecture & Optimizations *(New)*

### TypeScript Integration
- **Strict Typing**: Complete TypeScript coverage for all dashboard components
- **Interface Definitions**: Proper typing for API responses and database models
- **Error Prevention**: Compile-time validation for booking operations

### Performance Optimizations
- **Client-Side Sorting**: Frontend sorting reduces API complexity and improves responsiveness
- **Component Modularity**: Reusable components for dashboard, booking management, and authentication
- **State Management**: Efficient React state handling for smooth user experience
- **Responsive Loading**: Progressive loading with fallback components

### Security Implementation
- **Token-Based Cancellation**: UUID tokens prevent unauthorized cancellation attempts
- **Dual Authentication**: Support for both email tokens and dashboard authentication
- **Input Validation**: Multi-layer validation (frontend + backend) for all user inputs
- **Secure API Design**: RESTful APIs with proper error handling and validation

---

**For AI Agents**: This service now operates with enhanced flexibility supporting both traditional time-slot walk bookings (9:00-20:00) and extended dog sitting services (24-hour availability with multi-day support). The `booking_type` field in the database distinguishes between 'single' and 'multi_day' bookings, enabling proper handling of everything from 30-minute walks to week-long sitting services. Focus on service-specific logic when making recommendations, and leverage the enhanced components (especially `SittingBookingFlow.tsx`) for any dog sitting functionality. The system maintains full automation for both booking types while supporting manual historical data entry via SQL for existing business relationships.

**Latest Updates**: The platform now includes a comprehensive customer dashboard (`/dog-walking/dashboard`) with self-service capabilities, enhanced cancellation security using UUID tokens, and optimized frontend sorting for improved user experience. All confirmation emails include dashboard access links, and the cancellation system supports both email-based token cancellation and dashboard-based booking ID cancellation for maximum flexibility.