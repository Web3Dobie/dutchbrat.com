# AGENTS-hunters-hounds-V18.md - AI Agent Documentation for Hunter's Hounds Professional Website

## 🐶 Business Overview for AI Agents

**Service Name**: Hunter's Hounds Professional Dog Walking Service
**Architecture**: Independent Next.js Website + PostgreSQL + External Service Integrations
**Purpose**: Complete professional dog walking business website with booking, customer management, and marketing platform
**Domain**: **hunters-hounds.london** & **hunters-hounds.com** (independent professional website)
**Status**: **V18 - Revolut Payment Automation** 🎉

## 🌐 Complete Domain Architecture & Independence

### **Professional Domain Setup**
- **Primary Domain**: `hunters-hounds.london` → Direct to business IP (194.6.252.207)
- **Secondary Domain**: `hunters-hounds.com` → Direct to business IP  
- **Infrastructure**: Independent professional website, no longer embedded in DutchBrat
- **SEO Optimization**: Complete domain authority building for dog walking keywords
- **Brand Separation**: 100% independent Hunter's Hounds business identity

### **Domain Detection System**
```typescript
// lib/domainDetection.ts - Server-side domain detection
export function isHuntersHoundsDomain(): boolean {
  const host = headers().get('host') || '';
  return host.includes('hunters-hounds.');
}

// lib/clientDomainDetection.ts - Client-side domain detection  
export function useClientDomainDetection() {
  return typeof window !== 'undefined' && 
         window.location.host.includes('hunters-hounds.') 
         ? 'hunters-hounds' : 'other';
}
```

## 🎯 Professional Website Structure

### **Customer-Facing Pages (Professional URLs)**
```
🏠 hunters-hounds.london/                 → Homepage (emotional story + services overview)
💰 hunters-hounds.london/services         → Complete pricing & service details
📅 hunters-hounds.london/book-now         → ENHANCED: Professional booking with address selection
👤 hunters-hounds.london/my-account       → ENHANCED: Personalized dashboard with secondary address management
⭐ hunters-hounds.london/reviews          → Public customer reviews page with average rating
⭐ hunters-hounds.london/review/[token]   → Token-based review submission form
📸 hunters-hounds.london/my-account (Media tab) → V13: Customer's photos and videos from walks
🔄 hunters-hounds.london/dog-walking/dashboard/book-recurring → V14: Recurring booking flow
🎫 hunters-hounds.london/my-account (Loyalty Card tab) → V16: Digital loyalty card with paw print stamps
📧 hunters-hounds.london/contact          → Contact information (optional)
```

### **Administrative & Functional Pages**
```
⚙️ hunters-hounds.london/dog-walking/admin              → Business admin dashboard
📋 hunters-hounds.london/dog-walking/admin/manage-clients → Complete client management system
⭐ hunters-hounds.london/dog-walking/admin/manage-reviews → Review management with admin responses
📊 hunters-hounds.london/dog-walking/admin/payments     → Payment tracking
📝 hunters-hounds.london/dog-walking/admin/register-client → Client registration
📅 hunters-hounds.london/dog-walking/admin/create-booking → Manual booking creation
📷 hunters-hounds.london/dog-walking/admin/client-media → V13: Client media management (assign photos/videos to clients)
❌ hunters-hounds.london/dog-walking/cancel             → Email cancellation endpoint
```

### **API Routes (Backend Functionality)**
```
🔗 /api/dog-walking/book                → ENHANCED: Booking with secondary address support
🔗 /api/dog-walking/availability        → Calendar availability
🔗 /api/dog-walking/user-lookup         → Customer lookup (phone + email + image_filename)
🔗 /api/dog-walking/customer-lookup     → Customer lookup (phone + email + image_filename)
🔗 /api/dog-walking/cancel              → Booking cancellation  
🔗 /api/dog-walking/dashboard           → Customer data

# Client Management API Routes
🔗 /api/dog-walking/admin/clients               → Paginated client list with search
🔗 /api/dog-walking/admin/clients/[clientId]    → Individual client CRUD operations
🔗 /api/dog-walking/admin/photo-check           → Generate photo filenames
🔗 /api/dog-walking/admin/photo-check/[filename] → Check photo file existence

# NEW V6: Secondary Addresses API Routes
🔗 /api/dog-walking/secondary-addresses         → GET/POST secondary addresses
🔗 /api/dog-walking/secondary-addresses/[id]    → PUT/DELETE specific address
🔗 /api/dog-walking/secondary-addresses/[id]/toggle → PATCH toggle active status

# NEW V6: Payment Reminder System Routes (Automated)
🔗 /api/dog-walking/process-payment-reminders   → Daily automated payment reminder processing (internal)
🔗 /api/dog-walking/admin/trigger-payment-reminders → Manual payment reminder trigger (testing)

# Customer Review System Routes
🔗 /api/dog-walking/reviews/submit              → GET: Fetch review by token, POST: Submit review
🔗 /api/dog-walking/reviews/public              → GET: Published reviews with average rating
🔗 /api/dog-walking/admin/reviews               → GET: Reviews (section=submitted) or eligible bookings (section=eligible)
                                                → PUT: Add response, DELETE: Remove response
🔗 /api/dog-walking/admin/request-review        → POST: Create review + send request email (V11)

# NEW V13: Client Media API Routes
🔗 /api/dog-walking/admin/client-media/scan       → POST: Scan /originals/ folder for new files
🔗 /api/dog-walking/admin/client-media            → GET: List assigned media (filter by owner_id)
🔗 /api/dog-walking/admin/client-media            → POST: Assign file to client
🔗 /api/dog-walking/admin/client-media/[id]       → DELETE: Remove media assignment
🔗 /api/dog-walking/admin/client-media/thumbnails  → POST: Generate thumbnails for images and videos
🔗 /api/dog-walking/admin/client-media/reoptimize → POST: Re-optimize videos (moov atom), DELETE: Clear markers
🔗 /api/dog-walking/client-media/[...path]        → GET: Serve media files (with video streaming support)
🔗 /api/dog-walking/customer-media                → GET: Fetch logged-in customer's media

# Admin Authentication Routes
🔗 /api/dog-walking/admin/auth          → POST: Admin login (sets session cookie)
🔗 /api/dog-walking/admin/auth/check    → GET: Check authentication status
🔗 /api/dog-walking/admin/auth/logout   → POST: Logout (clears session cookie)

# NEW V10: Customer Session Routes
🔗 /api/dog-walking/customer-session    → GET: Check session, POST: Set session, DELETE: Clear session

# NEW V14: Recurring Booking API Routes
🔗 /api/dog-walking/recurring/check-availability  → POST: Check availability for all dates in pattern
🔗 /api/dog-walking/recurring/book                → POST: Create booking series + individual bookings
🔗 /api/dog-walking/recurring/[seriesId]          → GET: Fetch series details and associated bookings
🔗 /api/dog-walking/recurring/[seriesId]/cancel   → POST: Cancel (single, series, or future bookings)

# NEW V15: Ad-Hoc Sitting Notes API Routes
🔗 /api/dog-walking/admin/booking-notes           → GET: Fetch notes for booking, POST: Create note, PUT: Update note, DELETE: Delete note
🔗 /api/dog-walking/booking-notes                 → GET: Customer-facing read-only notes (validates ownership)

# NEW V16: Loyalty Card API Routes
🔗 /api/dog-walking/loyalty                       → GET: Fetch loyalty status (cards, stamps, redemptions), POST: Redeem a full card against a confirmed booking

# NEW V17: Walk Limit During Sitting API Routes
🔗 /api/dog-walking/admin/walk-limit-override     → GET: Fetch overrides for date range, POST: Create/update override, DELETE: Remove override

# NEW V18: Revolut Payment Automation API Routes
🔗 /api/dog-walking/admin/payment-check           → POST: Poll Gmail for Revolut payment emails, auto-match to clients, mark bookings paid (Bearer token auth)
```

## 🔐 Admin Panel Authentication

### **Overview**
The admin panel at `hunters-hounds.london/dog-walking/admin/` is protected by cookie-based authentication. This is separate from the Hunter Media authentication system used on `hunterthedobermann.london`.

### **Authentication Flow**
```
1. User visits /dog-walking/admin/
2. AdminAuthWrapper checks for 'dog-walking-admin-auth' cookie
3. If not authenticated → Login form displayed
4. User enters credentials (same as Hunter Media)
5. POST /api/dog-walking/admin/auth validates credentials
6. On success → Cookie set, admin dashboard displayed
7. Logout button clears cookie and returns to login form
```

### **Cookie Configuration**
```typescript
// Cookie: dog-walking-admin-auth
{
    name: 'dog-walking-admin-auth',
    value: 'authenticated',
    httpOnly: true,           // Not accessible via JavaScript
    secure: true,             // HTTPS only in production
    sameSite: 'lax',          // CSRF protection
    maxAge: 60 * 60 * 24 * 7, // 7 days
    path: '/'
}
```

### **Protected Endpoints**
All admin API endpoints check for the `dog-walking-admin-auth` cookie:
```typescript
// lib/auth.ts - Shared authentication utility
export function isAuthenticated(req: NextRequest): boolean {
    const authCookie = req.cookies.get('dog-walking-admin-auth');
    return authCookie?.value === 'authenticated';
}

export function unauthorizedResponse(): NextResponse {
    return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
    );
}
```

**Protected Admin Endpoints:**
- `/api/dog-walking/admin/create-booking` - Create bookings
- `/api/dog-walking/admin/bookings/[id]/status` - Update booking status
- `/api/dog-walking/admin/bookings/[id]/price` - Update booking price
- `/api/dog-walking/admin/bookings/editable` - Get editable bookings
- `/api/dog-walking/admin/mark-completed` - Mark bookings completed
- `/api/dog-walking/admin/mark-paid` - Mark bookings paid
- `/api/dog-walking/admin/clients` - List all clients
- `/api/dog-walking/admin/clients/[clientId]` - Client CRUD operations
- `/api/dog-walking/admin/payment-status` - Payment statistics
- `/api/dog-walking/admin/photo-check` - Photo filename generation
- `/api/dog-walking/admin/photo-check/[filename]` - Check photo exists
- `/api/dog-walking/admin/update-summary` - Update walk summaries
- `/api/dog-walking/admin/booking-notes` - CRUD ad-hoc sitting notes (V15)
- `/api/dog-walking/admin/walk-limit-override` - Per-day walk limit overrides during sitting (V17)
- `/api/dog-walking/admin/christmas-email` - Send campaign emails

### **Credentials**
Uses the same credentials as Hunter Media (defined in environment):
```bash
# Environment variables (config/services/frontend.env)
HUNTER_ADMIN_USER=boyboy
HUNTER_ADMIN_PASSWORD=010918

# Hardcoded fallback credentials
{ username: 'hunter', password: 'memorial' }
```

### **Key Components**
```
/lib/auth.ts                           → Shared auth utility (isAuthenticated, unauthorizedResponse)
/components/AdminAuthWrapper.tsx       → Login form + auth state wrapper
/app/dog-walking/admin/layout.tsx      → Wraps all admin pages with AdminAuthWrapper
/api/dog-walking/admin/auth/route.ts   → Login endpoint
/api/dog-walking/admin/auth/check/     → Auth status check
/api/dog-walking/admin/auth/logout/    → Logout endpoint
```

### **Domain Separation**
The authentication is domain-specific:
- **hunters-hounds.london**: Uses `dog-walking-admin-auth` cookie
- **hunterthedobermann.london**: Uses `hunter-auth` cookie (separate system)

Logging into one domain does NOT grant access to the other.

## 🎨 Enhanced Navigation Architecture

### **Professional Navbar Structure**
```typescript
// app/components/Navbar.tsx - Professional navigation
const huntersHoundsNav = [
  { href: "/", label: "Home" },
  { href: "/services", label: "Services & Pricing" },  
  { href: "/book-now", label: "Book Now" },
  { href: "/my-account", label: "My Account" },
  { href: "/testimonials", label: "Testimonials" }, // Planned
  { href: "/gallery", label: "Gallery" }, // Planned  
  { href: "/dog-walking/admin", label: "⚙️" } // Admin access
];
```

### **Dynamic Layout System**
```typescript
// app/layout.tsx - Professional metadata
if (isHuntersHoundsDomain()) {
  return {
    title: "Hunter's Hounds - Professional Dog Walking London",
    description: "Professional dog walking service in Highbury Fields & Clissold Park. Solo walks, dog sitting, meet & greet sessions. Reliable, caring service named after my beloved Dobermann Hunter.",
    keywords: "dog walking London, Highbury Fields, Clissold Park, professional pet care"
  };
}
```

## 🎯 Service Portfolio (Unchanged)

**Available Services:**
- **Meet & Greet** (30 min, FREE) - Introduction sessions for new clients
- **Solo Walk** (60 min, £17.50 / £25) - One-on-one attention and exercise
- **Quick Walk** (30 min, £10) - Shorter park visits and play sessions
- **Dog Sitting** (Variable duration) - Customized in-home visits with extended flexibility
  - 2 Hours: £25
  - 4 Hours: £35
  - Full Day: £55

**Enhanced Business Constraints:**
- **Operating Hours**:
  - **Dog Walking Services**: Monday-Friday, 8:00-20:00
  - **Dog Sitting (single-day)**: Monday-Friday, 00:00-23:59 (24-hour availability)
  - **Dog Sitting (multi-day)**: Any day - weekends allowed for multi-day bookings (e.g., Fri-Mon, Sat-Sun)
- **Maximum Dogs**: 2 dogs per walk/sitting
- **Service Areas**: Highbury Fields & Clissold Park areas (EXPANDED with secondary addresses)
- **Time Buffers**: 15-minute buffer between appointments
- **Multi-Day Support**: Dog sitting supports single-day and multi-day bookings

**Availability Logic - Service Type Awareness (Bidirectional):**

The booking system uses intelligent conflict detection that allows walks and 6+ hour single-day sittings to coexist on the same day. This reflects real-world operations where the dog stays at home during extended sitting, allowing the walker to go out and walk other dogs.

**Walk Availability API** (`/api/dog-walking/availability`):

| Existing Booking | Can Book Walk? | Reason |
|------------------|----------------|--------|
| Multi-day dog sitting (e.g., 4 days) | **YES (max 4/day)** | Dog stays at home, walker can go out. V17: Limited to `MAX_WALKS_DURING_SITTING` (default 4) per day. Admin can override per-day. |
| Single-day sitting (6+ hours) | **YES** | Dog rests at home between walks |
| Single-day sitting (<6 hours) | **NO** | Actively watching the dog during those hours |
| Other walks | **NO** | Buffer time applied between walk appointments |
| Weekend | **NO** | Walks only available Monday-Friday |

**Sitting Availability API** (`/api/dog-walking/sitting-availability`):

| Scenario | Can Book Sitting? | Conditions |
|----------|-------------------|------------|
| Walks scheduled | **YES** | Must be 6+ hours minimum |
| Multi-day sitting | **NO** | No overlapping sittings allowed |
| Single-day sitting | **NO** | No overlapping sittings allowed |
| Weekend (single-day) | **NO** | Single-day sitting only Mon-Fri |
| Weekend (multi-day) | **YES** | Multi-day sitting spanning weekends allowed |

**API Response Enhancement:**
The sitting availability API returns a `hasWalks` flag when walks exist on the selected day:
```typescript
interface SittingAvailabilityResponse {
    available: boolean;
    type: 'single' | 'multi';
    availableRanges?: ApiRange[];
    hasWalks?: boolean;  // True when walks scheduled on this day
    message?: string;    // "Minimum 6 hours required (walks scheduled)"
}
```

**UI Enforcement (SittingBookingFlow.tsx):**
When `hasWalks` is true, the component:
1. Displays a yellow warning: "⚠️ Walks are already scheduled on this day. Minimum 6-hour sitting is required so your dog can rest at home in between his walks, while I walk other dogs."
2. Filters end time options to only show times that create a 6+ hour booking
3. Prevents booking of short sittings (<6 hours) when walks exist

**Implementation Details:**
- Walk availability API extracts duration from "Single-Day Dog Sitting" calendar events and excludes 6+ hour sittings from busy times
- Sitting availability API filters out walk events from busy times but returns the `hasWalks` flag
- Frontend enforces minimum duration via `getSittingEndTimes(ranges, startTime, minDurationMinutes)` function with `minDurationMinutes = 360` when walks exist

## 🗄️ Enhanced Database Schema & Architecture

**Schema**: `hunters_hounds` (within existing `agents_platform` database)

### Core Tables

**owners Table:**
```sql
CREATE TABLE hunters_hounds.owners (
    id SERIAL PRIMARY KEY,
    owner_name VARCHAR(255) NOT NULL,
    phone VARCHAR(20) UNIQUE NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    partner_name VARCHAR(255), -- V6: Partner contact support
    partner_email VARCHAR(255), -- V6: Partner email for notifications
    partner_phone VARCHAR(255), -- V6: Partner phone for backup contact
    address TEXT NOT NULL,
    vet_info TEXT,             -- V7: Vet name, address, phone (freehand text)
    pet_insurance TEXT,        -- V7: Insurance provider, policy details (freehand text)
    photo_sharing_consent BOOLEAN DEFAULT false, -- V8: Permission to share dog photos on website/social media
    payment_preference VARCHAR(20) DEFAULT 'per_service' -- V9: per_service, weekly, fortnightly, monthly
        CHECK (payment_preference IN ('per_service', 'weekly', 'fortnightly', 'monthly')),
    payment_account_name VARCHAR(255),   -- V18: Exact name on Revolut/bank transfer for auto-matching incoming payments
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

**dogs Table:**
```sql
CREATE TABLE hunters_hounds.dogs (
    id SERIAL PRIMARY KEY,
    owner_id INT REFERENCES hunters_hounds.owners(id),
    dog_name VARCHAR(255) NOT NULL,
    breed VARCHAR(255),
    age INT,
    notes TEXT,
    image_filename VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

**bookings Table:**
```sql
CREATE TABLE hunters_hounds.bookings (
    id SERIAL PRIMARY KEY,
    owner_id INT REFERENCES hunters_hounds.owners(id),
    dog_id_1 INT REFERENCES hunters_hounds.dogs(id),
    dog_id_2 INT REFERENCES hunters_hounds.dogs(id), -- Optional second dog
    secondary_address_id INT REFERENCES hunters_hounds.secondary_addresses(id), -- NEW V6
    service_type VARCHAR(255) NOT NULL,
    start_time TIMESTAMP NOT NULL,
    end_time TIMESTAMP, -- NEW V6: Supports multi-day dog sitting
    duration_minutes INT, -- NULL for multi-day bookings
    price_pounds DECIMAL(8,2), -- NEW V6: Store calculated price
    booking_type VARCHAR(50) DEFAULT 'single_session', -- NEW V6: 'single_session', 'multi_day_sitting'
    status VARCHAR(50) DEFAULT 'confirmed', -- confirmed, cancelled, completed, completed & paid, paid
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

**NEW V6: secondary_addresses Table:**
```sql
CREATE TABLE hunters_hounds.secondary_addresses (
    id SERIAL PRIMARY KEY,
    owner_id INT REFERENCES hunters_hounds.owners(id) ON DELETE CASCADE,
    address_label VARCHAR(100) NOT NULL, -- e.g., "Grandma's House", "Office"
    full_address TEXT NOT NULL,
    contact_name VARCHAR(255), -- Who will be present at this address
    contact_phone VARCHAR(20),
    contact_email VARCHAR(255),
    partner_name VARCHAR(255), -- Secondary partner contact at this location
    partner_email VARCHAR(255), -- Secondary partner email for notifications
    notes TEXT, -- Special instructions for this location
    is_active BOOLEAN DEFAULT true, -- Allow deactivation without deletion
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

**NEW V6: payment_reminders Table:**
```sql
CREATE TABLE hunters_hounds.payment_reminders (
    id SERIAL PRIMARY KEY,
    owner_id INT REFERENCES hunters_hounds.owners(id) NOT NULL,
    reminder_type VARCHAR(10) CHECK (reminder_type IN ('3_day', '7_day')) NOT NULL,
    sent_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    total_amount_gbp DECIMAL(10,2) NOT NULL,
    booking_ids INT[] NOT NULL,
    email_sent_to VARCHAR(255) NOT NULL
);
```

**NEW V15: booking_notes Table:**
```sql
CREATE TABLE hunters_hounds.booking_notes (
    id SERIAL PRIMARY KEY,
    booking_id INTEGER NOT NULL REFERENCES hunters_hounds.bookings(id) ON DELETE CASCADE,
    note_text TEXT NOT NULL,
    note_date DATE NOT NULL DEFAULT CURRENT_DATE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_booking_notes_booking_id ON hunters_hounds.booking_notes(booking_id);
```

### Database Functions

**NEW V6: Automated Email Recipient Calculation:**
```sql
-- Function to get all email recipients for a booking based on address selection
CREATE OR REPLACE FUNCTION hunters_hounds.get_booking_emails(booking_owner_id INT, booking_secondary_address_id INT DEFAULT NULL)
RETURNS TEXT[] AS $$
DECLARE
    email_list TEXT[] := ARRAY[]::TEXT[];
    owner_email TEXT;
    partner_email TEXT;
    secondary_contact_email TEXT;
    secondary_partner_email TEXT;
BEGIN
    -- Get owner and partner emails
    SELECT o.email, o.partner_email
    INTO owner_email, partner_email
    FROM hunters_hounds.owners o
    WHERE o.id = booking_owner_id;
    
    -- Add owner email (always included)
    IF owner_email IS NOT NULL THEN
        email_list := array_append(email_list, owner_email);
    END IF;
    
    -- Add partner email if exists
    IF partner_email IS NOT NULL AND partner_email != '' THEN
        email_list := array_append(email_list, partner_email);
    END IF;
    
    -- If booking uses secondary address, add those contacts
    IF booking_secondary_address_id IS NOT NULL THEN
        SELECT sa.contact_email, sa.partner_email
        INTO secondary_contact_email, secondary_partner_email
        FROM hunters_hounds.secondary_addresses sa
        WHERE sa.id = booking_secondary_address_id;
        
        -- Add secondary contact email
        IF secondary_contact_email IS NOT NULL AND secondary_contact_email != '' THEN
            email_list := array_append(email_list, secondary_contact_email);
        END IF;
        
        -- Add secondary partner email
        IF secondary_partner_email IS NOT NULL AND secondary_partner_email != '' THEN
            email_list := array_append(email_list, secondary_partner_email);
        END IF;
    END IF;
    
    -- Remove duplicates and return
    RETURN ARRAY(SELECT DISTINCT unnest(email_list));
END;
$$ LANGUAGE plpgsql;
```

### Indexes for Performance

```sql
-- Core performance indexes
CREATE INDEX idx_bookings_owner_id ON hunters_hounds.bookings(owner_id);
CREATE INDEX idx_bookings_start_time ON hunters_hounds.bookings(start_time);
CREATE INDEX idx_bookings_status ON hunters_hounds.bookings(status);
CREATE INDEX idx_dogs_owner_id ON hunters_hounds.dogs(owner_id);
CREATE INDEX idx_secondary_addresses_owner_id ON hunters_hounds.secondary_addresses(owner_id);
CREATE INDEX idx_secondary_addresses_active ON hunters_hounds.secondary_addresses(is_active);

-- NEW V6: Payment reminder indexes
CREATE INDEX idx_payment_reminders_owner_type ON hunters_hounds.payment_reminders(owner_id, reminder_type);
CREATE INDEX idx_bookings_completed_status ON hunters_hounds.bookings(status, end_time) WHERE status = 'completed';
```

## 💳 Automated Payment Reminder System (V6)

### **System Overview**
**Purpose**: Automated email reminders for customers with overdue payments  
**Trigger**: Daily at 2 PM via cron job for bookings with 'completed' status 3+ days past end_time  
**Architecture**: Node.js script + PostgreSQL tracking + Resend email integration  
**Strategy**: Two-tier reminder system (3-day friendly, 7-day urgent) with payment crossing disclaimers  

### **Database Schema Extension**
```sql
-- Payment reminder tracking table
CREATE TABLE hunters_hounds.payment_reminders (
    id SERIAL PRIMARY KEY,
    owner_id INT REFERENCES hunters_hounds.owners(id) NOT NULL,
    reminder_type VARCHAR(10) CHECK (reminder_type IN ('3_day', '7_day')) NOT NULL,
    sent_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    total_amount_gbp DECIMAL(10,2) NOT NULL,
    booking_ids INT[] NOT NULL,
    email_sent_to VARCHAR(255) NOT NULL
);

-- Performance index for reminder history lookup
CREATE INDEX idx_payment_reminders_owner_type ON hunters_hounds.payment_reminders(owner_id, reminder_type);
```

### **Automation Infrastructure**
**Cron Job Schedule:**
```bash
# Daily execution at 2 PM UK time
0 14 * * * cd /home/hunter-dev/production-stack && /usr/bin/node scripts/send-payment-reminders.js >> /var/log/reminders/payment-log 2>&1
```

**Script Location**: `/home/hunter-dev/production-stack/scripts/send-payment-reminders.js`  
**Logging**: `/var/log/reminders/payment-log` (follows existing reminder pattern)  
**Environment**: Uses existing production stack environment configuration  

### **Payment Status Workflow Integration**
**Database Status Mapping:**
- `confirmed` → Service scheduled
- `completed` → Service delivered, payment pending
- `completed & paid` / `paid` → Payment received

**Customer Dashboard Logic:**
```typescript
// Time-based status display for customers
const getCustomerStatusDisplay = (status: string, booking: Booking): string => {
    if (status === 'completed') {
        const daysOverdue = Math.floor((now.getTime() - endTime.getTime()) / (1000 * 60 * 60 * 24));
        if (daysOverdue >= 3) {
            return 'Completed - Payment Pending'; // Red display
        } else {
            return 'Completed'; // Green display  
        }
    }
    return status;
};
```

### **Intelligent Reminder Logic**
**Smart Aggregation:**
- Finds bookings with 'completed' status 3+ days past end_time
- Groups all outstanding payments per customer (not just overdue ones)
- Single email includes complete outstanding balance

**Duplicate Prevention:**
- Tracks reminder history in payment_reminders table
- 3-day reminder: sent once when oldest overdue booking reaches 3-7 days
- 7-day reminder: sent once when oldest overdue booking reaches 7+ days
- No duplicate reminders within same tier

**Multi-Service Consolidation:**
```javascript
// Example: Caroline with multiple overdue services
Customer: Caroline
├── Quick Walk Thursday (£10.00) - 3 days overdue
├── Solo Walk Friday (£17.50) - 2 days overdue  
└── Total Amount Due: £27.50 (single consolidated email)
```

### **Professional Email Templates**
**3-Day Reminder (Friendly):**
```
Subject: Hunter's Hounds Payment Reminder

Hi [Customer],

I hope [Dog] is doing well!

I understand life can get busy, and I just wanted to gently remind you 
about payment for the following services:

Outstanding Services:
• Solo Walk on Thursday, 19 December 2024 - £17.50
• Quick Walk on Friday, 20 December 2024 - £10.00

Total Amount Due: £27.50

Payment Details:
Ernesto Becker
Sort Code: 04-00-75
Account Number: 19945388

Please note: If you have already made payment and this email has crossed 
in the post, please disregard this reminder and accept my apologies for 
any inconvenience. Your payment may take a day or two to be reflected 
in our system.

Thank you for choosing Hunter's Hounds!
```

**7-Day Reminder (Urgent):**
- More direct language: "I notice you haven't been able to make payment just yet"
- Increased urgency while maintaining professionalism
- Same payment crossing disclaimer
- Request for direct contact if issues exist

### **Email System Integration**
**Technical Implementation:**
- **From**: `Hunter's Hounds <bookings@hunters-hounds.london>`
- **Recipients**: Customer + partner (if provided)
- **BCC**: Business owner (`bookings@hunters-hounds.london`)
- **Service**: Existing Resend integration
- **Templates**: HTML formatted with Hunter's Hounds branding

**Recipient Intelligence:**
```javascript
// Automated recipient calculation
const recipients = [customerEmail];
if (partner_email) recipients.push(partner_email);

await sendEmail({
    to: recipients,
    bcc: ["bookings@hunters-hounds.london"],
    subject: "Hunter's Hounds Payment Reminder", 
    html: emailContent
});
```

### **Customer Experience Integration**
**Dashboard Status Updates:**
- **Recent completed** (< 3 days): "Completed" in green
- **Overdue completed** (3+ days): "Completed - Payment Pending" in red
- All completed bookings remain in "Current Bookings" until marked paid
- Payment reminders link to customer dashboard for service verification

**Professional Communication:**
- Understanding tone acknowledging life's complexities
- Clear payment instructions with bank details
- Crossing disclaimer prevents customer confusion
- Links to customer dashboard for self-service
- Direct contact information for payment questions

### **Business Operations Integration**
**Daily Workflow Enhancement:**
- **2 PM automated execution**: No manual intervention required
- **Business owner visibility**: BCC on all reminder emails
- **Logging integration**: Follows existing reminder script pattern
- **Status tracking**: Clear audit trail of all reminder communications
- **Performance monitoring**: Success/failure counts in daily logs

**Payment Management:**
- Manual status changes from 'completed' to 'completed & paid' stop further reminders
- Admin dashboard provides payment tracking interface
- Customer payment status visible in real-time
- Automated system reduces manual follow-up workload

### **Technical Architecture**
**Database Queries:**
```sql
-- Find overdue bookings
SELECT b.*, o.owner_name, o.email, o.partner_email,
       CASE WHEN d2.dog_name IS NOT NULL 
            THEN ARRAY[d1.dog_name, d2.dog_name]
            ELSE ARRAY[d1.dog_name] END as dog_names
FROM hunters_hounds.bookings b
JOIN hunters_hounds.owners o ON b.owner_id = o.id
JOIN hunters_hounds.dogs d1 ON b.dog_id_1 = d1.id
LEFT JOIN hunters_hounds.dogs d2 ON b.dog_id_2 = d2.id
WHERE b.status = 'completed'
AND b.end_time < NOW() - INTERVAL '3 days';
```

**Error Handling:**
- Individual customer failures don't stop batch processing
- Email delivery failures logged but system continues
- Database connectivity issues logged for debugging
- Comprehensive error context for troubleshooting

**Performance Features:**
- Connection string database configuration for cron environment
- Environment variable loading from production secrets
- Postgresql hostname resolution for Docker environment
- Email rate limiting handled by Resend service

### **Security & Data Protection**
**Data Privacy:**
- Payment reminder data linked to existing customer records
- No new personal information stored beyond tracking
- Email addresses validated from existing customer database
- Partner email inclusion respects existing opt-in status

**Business Security:**
- BCC to business owner ensures visibility of all communications
- Audit trail in payment_reminders table for compliance
- No payment information stored beyond tracking amounts
- Customer contact information sourced from verified database

### **Analytics & Monitoring**
**Daily Metrics:**
```
🔄 [timestamp] Starting payment reminder process...
📋 Found X overdue bookings for Y customers
✅ Sent 3_day reminder to Customer A (£17.50)
✅ Sent 3_day reminder to Customer B (£27.50)
🎉 Payment reminder process completed. Sent N reminders.
```

**Business Intelligence:**
- Payment reminder effectiveness tracking through reminder_type analysis
- Customer payment pattern analysis through booking completion rates
- Outstanding payment reporting through aggregated booking queries
- Revenue recovery metrics through payment status transitions

### **Operational Procedures**
**Daily Operations:**
- **Automated execution**: No manual intervention required for standard operations
- **Email monitoring**: Business owner receives BCC copies for oversight
- **Status management**: Manual payment status updates in admin dashboard
- **Customer inquiries**: Payment questions handled via existing WhatsApp contact

**Exception Handling:**
- **Payment crossing**: Disclaimer in emails prevents customer confusion
- **System failures**: Logged errors for technical troubleshooting
- **Customer disputes**: Manual override through admin status updates
- **Email delivery issues**: Resend service handles delivery monitoring

### **Integration Points**
**Existing System Connections:**
- **Customer Database**: Uses existing owners/dogs/bookings tables
- **Email Service**: Integrates with existing Resend configuration  
- **Admin Dashboard**: Payment status changes affect reminder logic
- **Customer Dashboard**: Status display reflects payment pending state
- **Cron Infrastructure**: Follows existing automation pattern

**Future Enhancement Opportunities:**
- **Payment link integration**: Direct payment processing from reminder emails
- **SMS reminder option**: Alternative communication channel for urgent cases
- **Payment plan support**: Extended payment arrangements for larger amounts
- **Customer preferences**: Opt-out or timing preferences for reminder communications

## 🚀 V6 Enhanced Integration Features

### **Enhanced Booking Flow with Multi-Location Support (V6)**
```
Customer Journey with Secondary Addresses:
1. Login/Register → Customer provides basic details + main address
2. Service Selection → Choose service type, date, time
3. Dog Selection → Select 1-2 dogs for the service
4. NEW: Address Selection → Choose primary address or any active secondary address
5. Confirmation → Review all details including selected address
6. Booking Created → Multi-recipient email system automatically notifies all relevant contacts
```

**Address Selection Interface (V6):**
```typescript
// Enhanced booking flow includes address step
<AddressSelection 
  primaryAddress={customer.address}
  secondaryAddresses={customer.activeSecondaryAddresses}
  selectedAddressId={selectedAddressId}
  onAddressSelect={setSelectedAddressId}
  showContactInfo={true}
/>
```

### **Multi-Recipient Email System (V6)**
```typescript
// Intelligent email distribution based on selected address
const getBookingRecipients = (booking) => {
  if (booking.secondary_address_id) {
    // Secondary address booking → All 4 possible contacts
    return [
      customer.email,                    // Customer (always)
      customer.partner_email,            // Customer partner (if exists)
      secondaryAddress.contact_email,    // Secondary contact (if exists) 
      secondaryAddress.partner_email     // Secondary partner (if exists)
    ].filter(email => email && email.trim() !== '');
  } else {
    // Primary address booking → Customer + partner only
    return [
      customer.email,                    // Customer (always)
      customer.partner_email             // Customer partner (if exists)
    ].filter(email => email && email.trim() !== '');
  }
};
```

### **Complete Multi-Location Customer Experience (V6)**

**Enhanced Dashboard Features:**
```typescript
✅ **Address Management**: 
   - Add/edit/deactivate secondary addresses with full contact details
   - Visual address cards showing contact names and status indicators
   - Notes field for location-specific instructions (dog leash location, etc.)

✅ **Contact Network Management**: 
   - Primary customer contact + optional partner
   - Secondary address contact + optional partner per location
   - Automatic email deduplication prevents spam

✅ **Booking History with Location Context**:
   - Each booking shows exact address used for service
   - Contact information displays who was coordinated for pickup/dropoff
   - Notes field appears in email for special instructions

✅ **Contact Context**:
   - Shows who will be present at pickup/dropoff
   - Displays contact information for coordination
   - Notes field appears in email for special instructions

✅ **Calendar Integration**:
   - Google Calendar events include correct address
   - Location field shows both label and full address
   - All relevant contacts receive calendar invitations
```

### **Professional Email Templates**
- **From Address**: `Hunter's Hounds <bookings@hunters-hounds.london>`
- **Dashboard Access**: All emails include personalized dashboard links
- **Address Information**: Clear location details for every booking
- **Contact Coordination**: All relevant parties automatically notified
- **Mobile Optimization**: Professional mobile-friendly templates

## 🎯 Enhanced Marketing & Content Strategy (V6)

### **Expanded Service Areas**
- **Primary Coverage**: Highbury Fields & Clissold Park
- **Secondary Addresses**: Customer-defined locations within reasonable distance
- **Flexible Service**: Pickup from one address, dropoff at another
- **Multi-Location Customers**: Seamless service across customer's locations

### **SEO Enhancements**
- **Geo-Targeting**: Expanded location coverage through secondary addresses
- **Local Keywords**: "dog walking multiple locations London"  
- **Service Flexibility**: "pickup dropoff different addresses"
- **Customer Convenience**: "dog care at your convenience"

## 🔒 Security & Data Protection (Enhanced V6)

### **Secondary Address Security**
- **Data Isolation**: Addresses only accessible by owning customer
- **Contact Privacy**: Partner information protected and optional
- **Access Control**: API endpoints validate customer ownership
- **Audit Trail**: Created/updated timestamps for all address changes
- **Data Integrity**: Foreign key constraints prevent orphaned records

### **Email Security (V6)**
- **Contact Verification**: Email addresses validated before storage
- **Deduplication**: Automatic removal of duplicate recipients
- **Privacy Protection**: Only relevant contacts notified per booking
- **Opt-out Respect**: Partner contacts can be left blank for privacy

## 📊 Analytics & Business Intelligence (V6)

### **Enhanced Performance Metrics**
- **Address Utilization**: Track usage of secondary addresses vs primary
- **Multi-Location Customers**: Identify customers with multiple service locations  
- **Contact Engagement**: Monitor which contacts interact with emails/calendar
- **Service Flexibility**: Measure customer satisfaction with location options
- **Geographic Analysis**: Understand service area expansion through addresses

### **Business KPIs (V6)**
- **Location Diversity**: Number of secondary addresses per customer
- **Contact Network**: Size of notification network per customer
- **Service Convenience**: Customer feedback on address flexibility
- **Operational Efficiency**: Time saved through automated multi-recipient notifications

## 🚀 Scalability & Growth Strategy (V6)

### **Enhanced Technical Scalability**
- **Multi-Location Architecture**: Database designed for unlimited addresses per customer
- **Contact Network Growth**: Email system scales automatically with contact additions
- **Geographic Expansion**: Secondary addresses enable broader service coverage
- **Family/Business Support**: Partners and secondary contacts extend customer reach

### **Business Scalability (V6)**
- **Service Area Growth**: Organic expansion through customer secondary addresses
- **Multi-Generational Customers**: Grandparents, family homes, office locations
- **Business Customers**: Multiple office locations, employee pet services  
- **Relationship Networks**: Partner and secondary contact referrals

## 📱 Enhanced Customer Experience (V6)

### **Multi-Location Convenience**
- **Address Book**: Customers maintain their own address book
- **Contact Coordination**: Automatic notification of relevant parties
- **Special Instructions**: Notes field for location-specific requirements
- **Flexible Booking**: Different pickup and dropoff locations (future enhancement)

### **Family Integration**
- **Partner Inclusion**: Automatic notification of customer's partner
- **Secondary Contacts**: Include family members, housesitters, etc.
- **Contact Preferences**: Optional fields respect privacy preferences
- **Communication Coverage**: Ensure someone is always informed about service

## 📋 Enhanced Operational Procedures (V6)

### **Enhanced Daily Operations**
- **Address Coordination**: Clear location information for every booking
- **Contact Management**: Multiple notification channels for customer convenience
- **Special Instructions**: Location-specific notes visible in bookings
- **Communication Efficiency**: Reduced coordination calls through automatic notifications

### **Enhanced Customer Onboarding (V6)**
1. **Website Discovery**: Professional website drives organic traffic
2. **Service Information**: Clear pricing and multi-location service descriptions
3. **Easy Booking**: Streamlined registration with address management
4. **Address Setup**: Optional secondary address creation during onboarding  
5. **Enhanced Dashboard**: Complete address management portal
6. **Contact Network**: Optional partner and secondary contact setup

---

## 🎉 V11 Achievements Summary

**Bidirectional Walk/Sitting Coexistence (V11.1):**

Implemented smart booking logic that allows walks and 6+ hour single-day sittings to coexist on the same day, in both directions.

**Problems Solved:**
- ❌ Previously: Single-day sitting blocked ALL other services
- ❌ Walks couldn't be booked when sitting existed (even long sittings where dog rests at home)
- ❌ Sittings couldn't be booked when walks existed (even when sitting would be 6+ hours)

**New Bidirectional Logic:**
- ✅ Walks can be booked when 6+ hour single-day sitting exists (dog rests at home)
- ✅ 6+ hour sitting can be booked when walks exist on the same day
- ✅ Single-day sitting <6 hours still blocks walks (actively watching dog)
- ✅ Multi-day sitting + walks: Allowed (no change - dog stays at home)
- ✅ Sitting + Sitting: Never allowed (no 2 dogs at once)

**UX Approach:**
When walks exist on a day, the sitting booking flow:
1. Returns `hasWalks: true` in API response
2. Displays yellow warning message explaining the 6-hour minimum
3. Only shows end time options that create 6+ hour bookings
4. Prevents invalid short sitting bookings via UI filtering

**Files Modified:**
```
/app/api/dog-walking/availability/route.ts      → Allow walks during 6+ hour sitting
/app/api/dog-walking/sitting-availability/route.ts → Return hasWalks flag, filter walk events
/app/components/SittingBookingFlow.tsx          → 6-hour minimum enforcement + warning message
```

**For AI Agents**: V11.1 implements bidirectional coexistence between walks and 6+ hour single-day sittings. The walk availability API extracts sitting duration and excludes 6+ hour sittings from busy times. The sitting availability API returns a `hasWalks` boolean flag when walks exist. The SittingBookingFlow component uses this flag to enforce a 360-minute minimum duration and display a warning message. The `getSittingEndTimes()` function accepts a `minDurationMinutes` parameter (60 normally, 360 when walks exist).

---

**Manual Review Request System:**

The review request system has been overhauled to give admin explicit control over when review requests are sent, solving problems with recurring payment customers being bombarded with emails.

**Problems Solved:**
- ❌ Repeat customers received review request emails for every payment (even if already reviewed)
- ❌ Recurring payment customers (weekly/bi-weekly/monthly) received 5-10 emails
- ❌ Payment confirmation emails only existed to trigger review requests

**New Review Request Flow:**

✅ **Decoupled from Payment**: Mark-paid route now only updates booking status (no email, no review creation)
✅ **Admin-Controlled Requests**: New "Request Review" tab in Manage Reviews page shows eligible bookings
✅ **Manual Triggering**: Admin clicks "Request Review" button to send email for specific booking
✅ **Smart Eligibility**: Only shows bookings that are 'completed & paid' AND have no review request yet
✅ **Walk Summary in Email**: Review request email includes the walk summary/note from Ernesto
✅ **Telegram Notification**: Admin receives notification when review request is sent

**New API Route:**
```
🔗 /api/dog-walking/admin/request-review    → POST: Create review record + send review request email
   Body: { booking_id: number }
   Returns: { success, review_token, email_sent, message }
```

**Extended Reviews Admin API:**
```
🔗 /api/dog-walking/admin/reviews?section=eligible  → GET: Bookings eligible for review request
🔗 /api/dog-walking/admin/reviews?section=submitted → GET: Submitted reviews (existing behavior)
```

**Updated Manage Reviews Page:**
- New tab navigation: [Submitted Reviews] [Request Review]
- "Request Review" tab shows completed & paid bookings without review requests
- Displays: Customer name, dogs, service type, date, walk summary
- Purple "Request Review" button per booking
- Booking disappears from list after request is sent

**New Review Request Email Template:**
- Purple gradient header (distinct from green payment emails)
- Title: "We'd Love Your Feedback!"
- Includes walk summary/note from Ernesto in blue callout
- Dog images displayed
- Prominent yellow "Leave a Review" CTA button
- Subject: `${dogNames} had a great time! Share your experience`

**Simplified Mark-Paid Route:**
- Removed: Email sending code
- Removed: Review record creation
- Removed: `generatePaymentReceivedEmail` and `sendBookingEmail` imports
- Kept: Status update to 'completed & paid'
- Kept: Telegram notification (without email count)

**Files Created:**
```
/app/api/dog-walking/admin/request-review/route.ts  → Manual review request API
```

**Files Modified:**
```
/lib/emailTemplates.ts                              → Added generateReviewRequestEmail()
/app/api/dog-walking/admin/mark-paid/route.ts       → Removed email/review creation
/app/api/dog-walking/admin/reviews/route.ts         → Added section=eligible query
/app/dog-walking/admin/manage-reviews/page.tsx      → Added tabs + request review section
```

**Admin Workflow (New):**
```
1. Mark bookings as paid → Only updates status (no email)
2. Go to Manage Reviews → "Request Review" tab
3. See eligible bookings with walk summaries
4. Click "Request Review" for desired booking
5. Customer receives email with review link
6. After submission → Review appears in "Submitted Reviews" tab
```

**For AI Agents**: V11 introduces two major changes: (1) **Manual Review Requests** - The review request system changed from automatic (triggered by mark-paid) to manual (admin-controlled). The mark-paid route now only updates booking status without creating review records or sending emails. Admin can request reviews through the new "Request Review" tab in the Manage Reviews page, which shows eligible bookings (completed & paid, no review yet). Clicking "Request Review" creates the review record and sends an email via the new `/api/dog-walking/admin/request-review` endpoint. This prevents recurring payment customers from being spammed with review requests. (2) **Bidirectional Walk/Sitting Coexistence (V11.1)** - Walks and 6+ hour single-day sittings can now coexist on the same day. The walk availability API extracts sitting duration from calendar events and excludes 6+ hour sittings from busy times. The sitting availability API returns a `hasWalks` boolean flag when walks exist on the day. The SittingBookingFlow component uses this flag to enforce a 360-minute (6 hour) minimum duration and displays a yellow warning message. Short sittings (<6 hours) still block walks as the dog is actively being watched.

---

**Enhanced Customer Dashboard Booking Display (V11.2):**

Improved how variable/multi-day bookings are displayed in the customer dashboard for better clarity.

**Problems Solved:**
- ❌ Multi-day bookings only showed start date, not end date
- ❌ Duration always displayed as "X minutes" even for multi-day bookings
- ❌ Variable-duration bookings showed "null minutes" when duration_minutes was null

**New Display Logic:**

✅ **Multi-Day Bookings**: Now show both start and end dates with times
```
Start: Monday, January 20, 2025 at 10:00 AM
End: Wednesday, January 22, 2025 at 2:00 PM
```

✅ **Smart Duration Display**:
- Multi-day bookings → "2 days", "3 days"
- Bookings >= 1 hour → "2 hours", "10 hours"
- Short bookings < 1 hour → "30 minutes"
- Calculates from start/end times when duration_minutes is null

✅ **Same-Day Bookings**: Keep existing format (Date + Time range)

**Files Modified:**
```
/app/components/BookingManager.tsx              → Multi-day date display + smart duration formatting
/app/components/DashboardMain.tsx               → Multi-day date display in booking list
/lib/emailTemplates.ts                          → Added formatDurationForEmail() utility function
/app/api/dog-walking/book/route.ts              → Smart duration in booking confirmation emails
/app/api/dog-walking/admin/create-booking/route.ts → Smart duration in admin booking emails
/scripts/send-reminders.js                      → Smart duration in appointment reminder emails
```

**Technical Implementation:**
```typescript
// lib/emailTemplates.ts - Shared utility for emails
export function formatDurationForEmail(minutes: number | null, startTime?: Date, endTime?: Date): string {
    // Multi-day: show days
    if (startTime && endTime && !isSameDay(startTime, endTime)) {
        const days = Math.round((endTime.getTime() - startTime.getTime()) / (1000 * 60 * 60 * 24));
        return days === 1 ? "1 day" : `${days} days`;
    }
    // Calculate from times if minutes is null
    let durationMins = minutes ?? Math.round((endTime!.getTime() - startTime.getTime()) / (1000 * 60));
    // >= 60 min: show hours, < 60 min: show minutes
    return durationMins >= 60 ? `${durationMins / 60} hours` : `${durationMins} minutes`;
}

// BookingManager.tsx - Similar function for dashboard display
const formatDuration = (minutes: number | null, startTime: Date, endTime: Date | null): string => {
    // Same logic as above
};
```

**Email Duration Examples:**
- 2-hour Solo Walk → "Duration: 2 hours"
- 30-minute Quick Walk → "Duration: 30 minutes"
- 3-day Dog Sitting → "Duration: 3 days"

**For AI Agents**: V11.2 enhances booking display across dashboard AND emails. Multi-day bookings now show both start and end dates (using `isSameDay()` from date-fns to detect). Duration display is now intelligent everywhere: shows days for multi-day bookings, hours for >= 60 minutes, and minutes for < 60 minutes. When `duration_minutes` is null (variable-duration sittings), the duration is calculated from start/end times. BookingManager.tsx handles the detailed booking view, DashboardMain.tsx handles the booking list cards. For emails, the shared `formatDurationForEmail()` utility in lib/emailTemplates.ts is used by both customer booking confirmations and admin booking confirmations. The standalone reminder script (`/scripts/send-reminders.js`) also uses smart duration formatting via its own `formatDuration()` function.

---

**Rescheduling Availability Self-Conflict Fix (V11.3):**

Fixed an issue where customers couldn't reschedule bookings to times that overlapped with their original booking.

**Problem:**
When a customer tried to reschedule (e.g., move a 10am Solo Walk to 9:30am), the availability API showed the new time as unavailable because their original booking was still on the Google Calendar.

**Solution:**
Pass the booking ID to the availability API so it can exclude that booking's calendar event from the busy times calculation.

**Files Modified:**
```
/app/api/dog-walking/availability/route.ts    → Added exclude_booking_id parameter to exclude original calendar event
/app/components/BookingManager.tsx            → Pass booking ID when fetching availability
/app/api/dog-walking/reschedule-booking/route.ts → Robust conflict check with explicit booking exclusion
```

**Technical Implementation:**
```typescript
// availability/route.ts - New parameter and database lookup
const excludeBookingId = searchParams.get("exclude_booking_id");

let excludedEventId: string | null = null;
if (excludeBookingId) {
    const result = await client.query(
        'SELECT google_event_id FROM hunters_hounds.bookings WHERE id = $1',
        [parseInt(excludeBookingId)]
    );
    if (result.rows.length > 0) {
        excludedEventId = result.rows[0].google_event_id;
    }
}

// Filter out the excluded event
const busyEvents = (res.data.items || []).filter(event =>
    !excludedEventId || event.id !== excludedEventId
);

// BookingManager.tsx - Pass booking ID in URL
const url = `/api/dog-walking/availability?date=${formattedDate}&service_type=${serviceType}&exclude_booking_id=${booking.id}`;
```

**Reschedule Conflict Check - Walk/Sitting Coexistence:**

The reschedule-booking API's conflict check now also respects V11.1's walk/sitting coexistence rules:
- Dog sittings 6+ hours do NOT block walks from being rescheduled to overlapping times
- Short sittings (<6 hours) still block walks

```typescript
// reschedule-booking/route.ts - Smart conflict filtering
const actualConflicts = conflictResult.rows.filter(row => {
    // Exclude the booking being rescheduled
    if (Number(row.id) === bookingIdNum) return false;

    // Check if this is a long sitting that allows walk coexistence
    const isSitting = (row.service_type || '').toLowerCase().includes('sitting');
    if (isSitting) {
        const durationHours = (new Date(row.end_time) - new Date(row.start_time)) / (1000 * 60 * 60);
        if (durationHours >= 6) return false; // Long sittings don't block walks
    }

    return true; // Real conflict
});
```

**For AI Agents**: V11.3 fixes rescheduling in two ways: (1) The availability API accepts `exclude_booking_id` to filter out the original booking's calendar event. (2) The reschedule-booking API's conflict check now respects V11.1 coexistence rules - walks can be rescheduled to times overlapping with 6+ hour dog sittings. Both the availability display AND the actual reschedule submission now allow walk/sitting coexistence.

---

**Spouse/Partner Login Support (V11.4):**

Allows spouses/partners to log in using their own email or phone number, giving them access to the same account and dogs.

**Problem:**
Only the primary owner could log in using their email or phone. The spouse/partner (stored in `partner_email` and `partner_phone` fields in the owners table) could not authenticate, even though their contact details were in the system.

**Solution:**
Updated the customer-lookup API to also search `partner_email` and `partner_phone` in the owners table.

**Files Modified:**
```
/app/api/dog-walking/customer-lookup/route.ts  → Extended WHERE clauses to include partner fields
```

**Technical Implementation:**
```sql
-- Email search now includes partner_email
WHERE LOWER(o.email) = LOWER($1) OR LOWER(o.partner_email) = LOWER($1)

-- Phone search now includes partner_phone
WHERE normalized(o.phone) = $1 OR normalized(o.partner_phone) = $1
```

**Logging:**
The API logs whether login was via primary or partner credentials:
```
[Customer Lookup] Found customer: Charlotte Cinalli with 2 dogs (via partner_email)
```

**Scope:**
- Only searches `partner_email` and `partner_phone` in the `owners` table
- Does NOT include secondary address contacts (intentional - those are location-specific contacts, not account holders)
- Returns the full owner account with all dogs

**For AI Agents**: V11.4 enables spouse/partner login by extending the customer-lookup API's WHERE clauses to match against `partner_email` and `partner_phone` in addition to the primary `email` and `phone` fields. When a partner logs in, they see the same account and dogs as the primary owner. Secondary address contacts are intentionally excluded to maintain privacy boundaries.

---

**Modify Dogs on Existing Booking (V11.5):**

Allows customers to add or remove a second dog from an existing booking via the customer dashboard.

**Features:**
- Purple "Modify Dogs" button in booking details (alongside Reschedule and Cancel)
- Only shows if owner has more than 1 dog registered
- Allows selecting 1-2 dogs with checkbox UI
- Price preview for Solo Walk showing the price change
- Validation: must keep at least 1 dog, max 2 dogs

**Pricing Impact (Solo Walk only):**
| Duration | 1 Dog | 2 Dogs | Change |
|----------|-------|--------|--------|
| 60 min | £17.50 | £25.00 | ±£7.50 |
| 120 min | £25.00 | £32.50 | ±£7.50 |

Other services (Quick Walk, Meet & Greet, Dog Sitting) keep their existing price.

**Files Created/Modified:**
```
/app/api/dog-walking/modify-booking-dogs/route.ts  → NEW: API endpoint for dog modifications
/app/api/dog-walking/booking-details/route.ts      → Added owner_dogs to response
/app/components/BookingManager.tsx                 → Added Modify Dogs button and view
```

**New API Endpoint:**
```
🔗 /api/dog-walking/modify-booking-dogs
   → POST: Modify dogs on a booking
   Body: { booking_id, dog_id_1, dog_id_2? }
   Returns: { success, booking_id, dog_id_1, dog_id_2, new_price }
```

**API Validation:**
- Booking must exist and be in 'confirmed' status
- Booking must be more than 2 hours in the future
- `dog_id_1` required (error: "Booking must have at least one dog")
- Dogs must belong to the booking's owner
- Maximum 2 dogs per booking

**Updates on Modification:**
1. Database: `dog_id_1`, `dog_id_2`, `price_pounds` updated
2. Google Calendar: Event description updated with new dog names
3. Email: Confirmation sent to customer with updated details
4. Telegram: Business notification with change details

**UI Flow:**
1. Customer opens booking from dashboard
2. Clicks purple "Modify Dogs" button
3. Sees all their dogs as checkboxes (pre-selected: current dogs)
4. Selects/deselects dogs (1-2 allowed)
5. For Solo Walk: sees price preview with change amount
6. Clicks "Confirm Changes"
7. Receives confirmation email

**For AI Agents**: V11.5 adds the ability to modify dogs on an existing booking. The new `/api/dog-walking/modify-booking-dogs` endpoint accepts `booking_id`, `dog_id_1` (required), and `dog_id_2` (optional). It validates ownership, recalculates price for Solo Walk using `getSoloWalkPrice()`, updates the database, patches the Google Calendar event, and sends email/Telegram notifications. The BookingManager component shows a purple "Modify Dogs" button when the owner has multiple dogs, with a checkbox UI for selection and live price preview for Solo Walk bookings.

---

**Customer Dashboard Booking Sorting (V11.6):**

Improved booking sort order in the customer dashboard for better usability.

**Problem:**
Bookings were sorted with confirmed and completed mixed together by start_time ASC. Customers saw old completed bookings before their upcoming confirmed bookings.

**Solution:**
Updated the ORDER BY clause in the customer-bookings API to prioritize confirmed over completed.

**New Sort Order:**
1. **Confirmed bookings** - sorted by start_time ASC (closest appointment first)
2. **Completed bookings** - sorted by start_time DESC (most recent first)
3. **Other statuses** (cancelled, etc.) - sorted by start_time DESC

**File Modified:**
```
/app/api/dog-walking/customer-bookings/route.ts → Updated ORDER BY clause
```

**Technical Implementation:**
```sql
ORDER BY
    CASE
        WHEN b.status = 'confirmed' THEN 0
        WHEN b.status = 'completed' THEN 1
        ELSE 2
    END,
    CASE WHEN b.status = 'confirmed' THEN b.start_time END ASC,
    CASE WHEN b.status = 'completed' THEN b.start_time END DESC,
    CASE WHEN b.status NOT IN ('confirmed', 'completed') THEN b.start_time END DESC
```

**For AI Agents**: V11.6 changes the customer dashboard booking sort order. Confirmed bookings now appear first (sorted by closest date), followed by completed bookings (sorted by most recent). This ensures customers see their upcoming appointments before past completed ones.

---

**Modify Dogs Price Recalculation Fix (V11.7):**

Fixed a bug where the price wasn't recalculated when modifying dogs on a Solo Walk booking.

**Problem:**
When a customer changed from 2 dogs to 1 dog on a Solo Walk, the price stayed at £25.00 instead of updating to £17.50. The dog names updated correctly but the price didn't change.

**Root Cause:**
The `service_type` field is stored inconsistently in the database:
- Some bookings: `'solo'`
- Other bookings: `'Solo Walk (1 hour)'` or `'Solo Walk (2 hours)'`

The code only checked for exact match `=== 'solo'`, missing the longer format.

**Fix:**
Updated the service type check to handle both formats:
```typescript
const isSoloWalk = booking.service_type === 'solo' ||
                  booking.service_type.toLowerCase().includes('solo');
```

Also added:
- Fallback pricing if `getSoloWalkPrice()` returns 0
- Default duration to 60 if `duration_minutes` is null
- Logging for debugging price calculations

**File Modified:**
```
/app/api/dog-walking/modify-booking-dogs/route.ts → Fixed service type matching
```

**For AI Agents**: V11.7 fixes the Modify Dogs price recalculation. The `service_type` field can be stored as either `'solo'` or `'Solo Walk (1 hour)'` depending on how the booking was created. The fix uses case-insensitive matching (`includes('solo')`) to detect Solo Walk bookings regardless of format. Also includes fallback pricing and logging for robustness.

---

**Service Type Normalization (V11.8):**

Standardized `service_type` storage format across all booking creation methods to prevent inconsistencies.

**Problem:**
The `service_type` field was stored inconsistently:
- Customer bookings: `"Solo Walk (1 hour)"`, `"Meet & Greet - for new clients"`
- Admin bookings: `"solo"`, `"meetgreet"`

This caused issues with service type detection in features like price recalculation (V11.7).

**Solution:**
1. Created shared utility for service type handling
2. All bookings now store normalized short IDs (`solo`, `quick`, `meetgreet`, `sitting`)
3. Display functions convert to human-readable names (`Solo Walk`, `Quick Walk`, etc.)
4. Duration preserved separately in `duration_minutes` column

**Normalized Values:**
| Stored | Displayed |
|--------|-----------|
| `solo` | `Solo Walk` |
| `quick` | `Quick Walk` |
| `meetgreet` | `Meet & Greet` |
| `sitting` | `Dog Sitting` |

**Files Created/Modified:**
```
# Core Utility
/lib/serviceTypes.ts                              → NEW: Shared utility (normalizeServiceType, getServiceDisplayName)
/lib/emailTemplates.ts                            → Import and use getServiceDisplayName for all email templates

# Booking Creation (normalize before INSERT)
/app/api/dog-walking/book/route.ts                → Normalize service_type
/app/api/dog-walking/admin/create-booking/route.ts → Normalize service_type

# API Routes (display in emails/telegram)
/app/api/dog-walking/cancel/route.ts              → Use getServiceDisplayName in emails & telegram
/app/api/dog-walking/reschedule-booking/route.ts  → Replaced local function with shared import
/app/api/dog-walking/modify-booking-dogs/route.ts → Replaced local function with shared import
/app/api/dog-walking/admin/send-reminder/route.ts → Let email template handle display
/app/api/dog-walking/admin/send-invoice/route.ts  → Let email template handle display
/app/api/dog-walking/admin/request-review/route.ts → Use getServiceDisplayName in telegram
/app/api/dog-walking/admin/bookings/[id]/status/route.ts → Use getServiceDisplayName in telegram

# Frontend Components (display in UI)
/app/components/DashboardMain.tsx                 → Use shared getServiceDisplayName
/app/components/BookingManager.tsx                → Use shared getServiceDisplayName
/app/components/ReviewCard.tsx                    → Use shared getServiceDisplayName
/app/dog-walking/admin/manage-bookings/page.tsx   → Use shared getServiceDisplayName
/app/dog-walking/admin/revenue/page.tsx           → Use shared getServiceDisplayName
/app/dog-walking/admin/payments/page.tsx          → Use shared getServiceDisplayName
/app/dog-walking/admin/manage-reviews/page.tsx    → Use shared getServiceDisplayName
/app/review/[token]/page.tsx                      → Use shared getServiceDisplayName

# Database Migration
/sql/normalize_service_types.sql                  → Migration script for existing records
```

**SQL Migration:**
Run the migration script to normalize existing database records:
```sql
UPDATE hunters_hounds.bookings
SET service_type = CASE
    WHEN LOWER(service_type) LIKE '%solo%' THEN 'solo'
    WHEN LOWER(service_type) LIKE '%quick%' THEN 'quick'
    WHEN LOWER(service_type) LIKE '%meet%' OR LOWER(service_type) LIKE '%greet%' THEN 'meetgreet'
    WHEN LOWER(service_type) LIKE '%sitting%' THEN 'sitting'
    ELSE service_type
END
WHERE service_type NOT IN ('solo', 'quick', 'meetgreet', 'sitting');
```

**For AI Agents**: V11.8 normalizes service_type storage and display across the entire application. All bookings now store short IDs (`solo`, `quick`, `meetgreet`, `sitting`) regardless of creation method. Use `normalizeServiceType()` before storing and `getServiceDisplayName()` for display. Both functions are in `/lib/serviceTypes.ts`. The shared utility is used in: (1) email templates for all customer emails, (2) API routes for Telegram notifications, (3) all admin pages (manage-bookings, revenue, payments, manage-reviews), (4) customer-facing pages (dashboard, review submission), and (5) shared components (BookingManager, ReviewCard). Duration information is preserved in `duration_minutes` column. Run the SQL migration in `/sql/normalize_service_types.sql` to fix existing records. When adding new features that display service_type, always import and use `getServiceDisplayName()` from `/lib/serviceTypes`.

**Payments Page Filters (V11.9):**

The admin payments page (`/dog-walking/admin/payments`) now includes client and date range filters for both "Awaiting Payment" and "All Bookings" views.

**Filter Features:**
- **Client Filter**: Dropdown populated with unique client names from the current view
- **Date From**: Filter bookings on or after a specific date
- **Date To**: Filter bookings on or before a specific date
- **Clear Filters**: Button to reset all filters
- **Results Count**: Shows "Showing X of Y bookings" when filters are active

**Implementation Details:**
```typescript
// Filter state variables
const [filterClient, setFilterClient] = useState<string>('');
const [filterDateFrom, setFilterDateFrom] = useState<string>('');
const [filterDateTo, setFilterDateTo] = useState<string>('');

// Unique clients computed from bookings
const uniqueClients = useMemo(() => {
    const clients = Array.from(new Set(bookings.map(b => b.owner_name)));
    return clients.sort((a, b) => a.localeCompare(b));
}, [bookings]);

// Filtered bookings computed with all filter criteria
const filteredBookings = useMemo(() => {
    return bookings.filter(booking => {
        if (filterClient && booking.owner_name !== filterClient) return false;
        if (filterDateFrom) {
            const bookingDate = new Date(booking.start_time);
            const fromDate = new Date(filterDateFrom);
            fromDate.setHours(0, 0, 0, 0);
            if (bookingDate < fromDate) return false;
        }
        if (filterDateTo) {
            const bookingDate = new Date(booking.start_time);
            const toDate = new Date(filterDateTo);
            toDate.setHours(23, 59, 59, 999);
            if (bookingDate > toDate) return false;
        }
        return true;
    });
}, [bookings, filterClient, filterDateFrom, filterDateTo]);
```

**File Modified:**
- `/app/dog-walking/admin/payments/page.tsx` - Added filter state, useMemo logic, filter UI, and updated table to use `filteredBookings`

**For AI Agents**: V11.9 adds client-side filtering to the payments page. The filters are applied via `useMemo` hooks - `uniqueClients` extracts sorted unique client names from bookings, and `filteredBookings` applies all filter criteria. The table, select-all checkbox, and action button visibility all use `filteredBookings` instead of `bookings`. Filters work across all view modes (awaiting_payment, paid, all). The filter UI appears below the tabs and above the table.

**Dynamic Dog Images - No Container Rebuild (V11.10):**

Dog images are now served via an API route from a Docker volume mount, eliminating the need to rebuild the container when adding or updating dog photos.

**Problem Solved:**
Previously, dog images were stored in `/public/images/dogs/` which gets baked into the Docker image at build time. Any new or changed dog photos required a container rebuild.

**Solution Architecture:**
```
Host:       /home/hunter-dev/dog-images/         (persistent storage)
              ↓ (volume mount)
Container:  /app/dog-images/                     (accessible inside container)
              ↓ (API route reads from here)
API:        /api/dog-images/[filename]           (serves images)
              ↓ (frontend requests)
Frontend:   <img src="/api/dog-images/photo.jpg">
```

**Files Created:**
- `/app/api/dog-images/[filename]/route.ts` - API route that serves dog images from mounted volume with:
  - Security: Directory traversal prevention
  - Extension validation (.jpg, .jpeg, .png, .gif, .webp)
  - 24-hour browser caching
  - Proper content-type headers

**Files Modified:**
- `/app/components/AccountDetails.tsx` - Changed image src from `/images/dogs/` to `/api/dog-images/`
- `/app/components/ReviewCard.tsx` - Changed image src from `/images/dogs/` to `/api/dog-images/`
- `/app/components/CustomerDashboard.tsx` - Changed image src from `/images/dogs/` to `/api/dog-images/`
- `/home/hunter-dev/production-stack/docker-compose.yml` - Added volume mount: `/home/hunter-dev/dog-images:/app/dog-images:ro`

**Host Directory:**
- `/home/hunter-dev/dog-images/` - Contains all dog profile photos

**Workflow to Add/Update Dog Images:**
1. Upload image via FileZilla to `/home/hunter-dev/dog-images/`
2. Image is immediately available - no container rebuild needed
3. Naming convention: `{dogname}_{ownerlastname}_{dogid}.jpg`

**For AI Agents**: V11.10 moves dog image serving from Next.js static files to a dedicated API route. This bypasses Next.js standalone mode's static file handling which doesn't work well with volume mounts. The API route reads from `/app/dog-images/` which is mounted from the host at `/home/hunter-dev/dog-images/`. Frontend components now reference `/api/dog-images/${filename}` instead of `/images/dogs/${filename}`. The read-only mount (`:ro`) prevents the container from modifying images. When adding new features that display dog images, use the `/api/dog-images/` path.

---

## 🎉 V12 - Hunter's Pack Monthly Newsletter

A complete integrated newsletter system for sending monthly updates to all clients, featuring pack updates, dog highlights, seasonal tips, and new feature announcements.

### Newsletter Content Sections
1. **Welcome Message** - Block-based content (text and images in any order)
   - Add text blocks for paragraphs
   - Add image blocks with filename + optional caption
   - Reorder blocks with up/down arrows
   - Images served from `/home/hunter-dev/newsletter-images/` via `/api/newsletter-images/`
2. **New Pack Members** - Auto-detected dogs that had their FIRST service this month (150px circular photos)
3. **Pack Farewells** - Manual entry for dogs that left the pack
4. **Walk Highlights** - Photos and stories from recent walks (images from newsletter-images volume)
5. **Seasonal Tips** - Dog care advice
6. **New Features** - App/service updates

### Newsletter Images Volume
Newsletter images (walk photos, seasonal photos, etc.) are stored on the host and served via API:
- **Host directory**: `/home/hunter-dev/newsletter-images/`
- **Volume mount**: `/home/hunter-dev/newsletter-images:/app/newsletter-images:ro`
- **API route**: `/api/newsletter-images/[filename]`
- Same pattern as dog profile images (`/api/dog-images/`)

### Database Schema

**New columns in `owners` table:**
```sql
newsletter_subscribed BOOLEAN DEFAULT true
newsletter_unsubscribe_token UUID DEFAULT gen_random_uuid()
-- Partner independent subscription (added V14.2)
partner_newsletter_subscribed BOOLEAN DEFAULT true
partner_newsletter_unsubscribe_token UUID DEFAULT gen_random_uuid()
```

**New tables:**
```sql
-- Store newsletter drafts and sent newsletters
hunters_hounds.newsletters (
    id, title, content_json, created_at, updated_at, sent_at, recipient_count
)

-- Track individual email sends
hunters_hounds.newsletter_history (
    id, newsletter_id, owner_id, sent_at, email_status
)
```

### New Pack Members Detection
Dogs are detected as "new to the pack" based on their FIRST booking date, not when the account was created:
```sql
SELECT d.*, MIN(b.start_time) as first_service_date
FROM dogs d
JOIN bookings b ON (b.dog_id_1 = d.id OR b.dog_id_2 = d.id)
GROUP BY d.id
HAVING MIN(b.start_time) >= DATE_TRUNC('month', CURRENT_DATE)
```

### Files Created

| File | Purpose |
|------|---------|
| `/app/dog-walking/admin/newsletter/page.tsx` | Admin composer UI with preview |
| `/app/api/dog-walking/admin/newsletter/route.ts` | GET (list) & POST (save draft) |
| `/app/api/dog-walking/admin/newsletter/send/route.ts` | POST (send to subscribers) |
| `/app/api/dog-walking/admin/newsletter/new-dogs/route.ts` | GET (first-service dogs) |
| `/app/api/dog-walking/newsletter/unsubscribe/route.ts` | Public unsubscribe endpoint |
| `/app/newsletter/unsubscribe/page.tsx` | Unsubscribe confirmation page |
| `/app/api/newsletter-images/[filename]/route.ts` | Serve newsletter images from volume |
| `/lib/emailTemplates.ts` | Added `generateNewsletterEmail()` |
| `/sql/newsletter_schema.sql` | Database migration script |

### Admin Composer Features
- **Block-based welcome section**: Add text and image blocks in any order with reordering controls
- **Section-based editor**: Welcome message, pack members, farewells, highlights, tips, features
- **Auto-detection**: Checkboxes for dogs with first service this month
- **Image support**:
  - Welcome section: Inline images with filenames + optional captions
  - Walk highlights: Up to 4 image filenames
  - Pack members: 150px circular photos (auto-served from dog-images)
- **Image preview**: Image blocks show thumbnails when filename entered
- **Live preview**: Modal showing formatted email exactly as recipients see it
- **Test email**: Send to single email before mass send
- **Draft saving**: Save and resume editing
- **Send tracking**: Records success/failure per recipient
- **Previous newsletters**: Load and view past newsletters (auto-converts legacy welcomeMessage to blocks)

### Subscription Model
- **Opt-out by default**: All existing customers auto-subscribed (`newsletter_subscribed = true`)
- **Unsubscribe link**: Every newsletter includes personalized unsubscribe link
- **Token-based**: Each owner has unique `newsletter_unsubscribe_token` UUID
- **Public endpoint**: `/newsletter/unsubscribe?token={uuid}` - no auth required
- **Independent partner subscriptions (V14.2)**: Partner emails have their own `partner_newsletter_subscribed` flag and `partner_newsletter_unsubscribe_token`. Primary and partner can unsubscribe independently without affecting each other. Unsubscribe route checks primary token first, then partner token.

### Email Template Structure
```
┌─────────────────────────────────────┐
│  🐕 Hunter's Hounds                 │
│     {Month} Newsletter              │
├─────────────────────────────────────┤
│  Welcome Message                    │
├─────────────────────────────────────┤
│  🐕 Welcome to the Pack!            │
│  [Dog photos in circles]            │
├─────────────────────────────────────┤
│  👋 Pack Farewells                  │
├─────────────────────────────────────┤
│  📸 Walk Highlights                 │
│  [Photos]                           │
├─────────────────────────────────────┤
│  🌿 Seasonal Tips                   │
├─────────────────────────────────────┤
│  ✨ What's New                      │
├─────────────────────────────────────┤
│  Signature                          │
├─────────────────────────────────────┤
│  [Unsubscribe link]                 │
└─────────────────────────────────────┘
```

### Workflow
1. Navigate to `/dog-walking/admin/newsletter`
2. Fill in sections (new pack members auto-populated)
3. Click **Preview** to see formatted email
4. Edit content as needed, preview again
5. **Save Draft** to store progress
6. **Send Test** to verify with your email
7. **Send to All** when satisfied

### Technical Notes
- Uses existing Resend email service
- 600ms delay between sends to avoid Resend rate limiting (2 req/sec)
- Newsletter history tracks sent/failed status per recipient
- Unsubscribe page uses Suspense boundary for `useSearchParams()` (Next.js requirement)
- Dog images served via `/api/dog-images/` (V11.10 dynamic serving)
- Newsletter images served via `/api/newsletter-images/` from mounted volume
- Pack member photos increased to 150px circular (from 100px)
- Welcome section uses block-based structure (`welcomeBlocks[]`) with backward compatibility for legacy `welcomeMessage` string

**For AI Agents**: V12 adds a complete newsletter system. The admin composer at `/dog-walking/admin/newsletter` allows creating newsletters with auto-detected new pack members (based on first booking date, not account creation). Content is stored as JSONB in the `newsletters` table. The `generateNewsletterEmail()` function in `/lib/emailTemplates.ts` generates the HTML with `{{UNSUBSCRIBE_URL}}` placeholder replaced per-recipient. Subscription status is tracked via `owners.newsletter_subscribed` boolean with token-based unsubscribe. Partner emails have independent subscription via `partner_newsletter_subscribed` and `partner_newsletter_unsubscribe_token` — each person can unsubscribe without affecting the other. When sending, the system builds a combined recipient list (primary + partner emails), each with their own unsubscribe token, sends via Resend with retry logic, and records results in `newsletter_history`. The unsubscribe route tries the primary token first, then the partner token, updating only the matching subscription. The unsubscribe page at `/newsletter/unsubscribe` uses a Suspense boundary around the component that calls `useSearchParams()`. The welcome section supports block-based content (`welcomeBlocks[]`) with text and image blocks that can be reordered. Newsletter images are stored at `/home/hunter-dev/newsletter-images/` and served via `/api/newsletter-images/[filename]`. Pack member photos display at 150px circular. Legacy newsletters with single `welcomeMessage` string are auto-converted to blocks when loaded.

---

## 🎉 V13 - My Media (Client Photos & Videos)

A complete media sharing system where customers can view photos and videos from their dog walks, organized by month in their dashboard.

### Feature Overview

**Workflow**: Photos/videos uploaded via FTP → Admin assigns to clients → Clients view in dashboard "My Media" tab

### Storage Architecture
```
Host:       /home/hunter-dev/client-media/
              ├── originals/           # Uploaded files (via FTP) - READ ONLY
              │   └── *.jpg, *.mp4, etc.
              ├── optimized/           # Optimized videos (moov atom moved)
              │   └── *.mp4            # Auto-served instead of originals
              ├── thumbnails/          # Generated thumbnails
              │   └── thumb_*.jpg
              └── .optimized/          # Marker files to track processed videos
                  └── *.optimized
              ↓ (volume mount)
Container:  /app/client-media/
              ↓ (API route serves files)
API:        /api/dog-walking/client-media/[...path]
              → For videos: checks /optimized/ first, falls back to /originals/
```

**Docker Volume Mount** (docker-compose.yml):
```yaml
volumes:
  - /home/hunter-dev/client-media:/app/client-media
```

### Database Schema

**New table `hunters_hounds.client_media`:**
```sql
CREATE TABLE hunters_hounds.client_media (
    id SERIAL PRIMARY KEY,
    owner_id INTEGER NOT NULL REFERENCES hunters_hounds.owners(id),
    filename VARCHAR(255) NOT NULL UNIQUE,
    file_path VARCHAR(500) NOT NULL,
    media_type VARCHAR(20) NOT NULL, -- 'image' or 'video'
    file_size BIGINT,
    taken_at TIMESTAMP WITH TIME ZONE, -- From EXIF or manual entry
    uploaded_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    description TEXT,
    thumbnail_path VARCHAR(500)
);

CREATE INDEX idx_client_media_owner ON hunters_hounds.client_media(owner_id);
CREATE INDEX idx_client_media_taken_at ON hunters_hounds.client_media(taken_at);
```

### Admin Panel - Media Management

**Page**: `/dog-walking/admin/client-media`

**Features:**
- **Scan for New Files**: Detects files in `/originals/` not yet in database
- **EXIF Date Extraction**: Automatically reads date from image metadata
- **Filename Date Parsing**: Fallback for filenames like `IMG_20250128_123456.jpg`
- **Assign to Clients**: Dropdown to assign each file to a customer
- **Generate Thumbnails**: Creates 300x300 thumbnails for both images AND videos
- **Re-optimize Videos**: Moves moov atom to beginning for instant video playback
- **View Assigned Media**: Filter by client, see all assignments
- **Remove Assignment**: Unassigns file (keeps file on disk)

**Tabs:**
1. **Pending Files** - Unassigned files from scan
2. **Assigned Media** - All assigned media with client filter

### Thumbnail Generation

**Image Thumbnails:**
- Uses Sharp to resize to 300x300 (cover fit, center position)
- Outputs as JPEG with 80% quality
- **Two-step rotation fix**: Phone photos often have EXIF orientation 6 (portrait). Sharp doesn't auto-rotate when resizing, so thumbnails must be:
  1. Generated first (without rotation)
  2. Then rotated 90° clockwise as a separate Sharp operation
- This two-step approach is required because single-step `.rotate()` before `.resize()` doesn't work correctly

**Cache Busting:**
- Thumbnail URLs include `?v=2` query parameter to bust browser cache when thumbnails are regenerated
- Increment version number in `MyMedia.tsx` and `admin/client-media/page.tsx` if thumbnails need refreshing

**Video Thumbnails:**
- Uses FFmpeg to extract frame at 1 second (or 10% into video)
- Resizes extracted frame with Sharp to 300x300
- Temp frame cleaned up after processing
- Falls back gracefully if FFmpeg unavailable

**Supported Formats:**
- Images: `.jpg`, `.jpeg`, `.png`, `.gif`, `.webp`, `.heic`
- Videos: `.mp4`, `.m4v`, `.mov`, `.avi`

### Video Streaming

The file serving API supports HTTP Range requests for proper video playback:

```typescript
// Returns 206 Partial Content for video range requests
if (VIDEO_EXTENSIONS.has(ext)) {
    const range = request.headers.get("range");
    if (range) {
        // Parse range, read specific bytes, return 206 with Content-Range header
        return new NextResponse(buffer, {
            status: 206,
            headers: {
                "Content-Range": `bytes ${start}-${end}/${fileSize}`,
                "Accept-Ranges": "bytes",
            },
        });
    }
}
```

This enables:
- Video seeking/scrubbing
- Progressive video loading
- Proper playback in all browsers

### Video Optimization (Moov Atom)

**Problem**: Videos recorded on phones typically have the "moov atom" (metadata) at the END of the file. Browsers need this metadata to start playback, so they must download the entire video before playing - causing long load times.

**Solution**: The scan process automatically moves the moov atom to the BEGINNING of each video using FFmpeg's `faststart` flag. This enables instant video playback.

**How it works:**
```typescript
// Uses FFmpeg to remux video with faststart (no re-encoding)
const command = `ffmpeg -i "${filePath}" -c copy -movflags +faststart "${tempPath}" -y`;
await execAsync(command);
await fs.copyFile(tempPath, optimizedPath);  // Save to /optimized/ directory (originals are read-only)
```

**Key Implementation Details:**
- **Separate optimized directory**: Optimized videos stored in `/optimized/` (originals remain untouched since FTP uploads may be read-only)
- **Automatic fallback**: Serving route checks `/optimized/` first, falls back to `/originals/` if not found
- **Temp files in /tmp**: FFmpeg writes temp files to `/tmp` during processing
- **Marker files**: `.optimized` directory tracks which videos have been processed to avoid re-processing
- **No re-encoding**: Uses `-c copy` for fast remuxing without quality loss
- **Automatic on scan**: Videos are optimized during the scan process for new files

**Re-optimize Existing Videos:**

For videos that were assigned before optimization was working (or if optimization failed), use the re-optimize feature:

**Admin UI**: Click "🎬 Re-optimize Videos" button in Client Media Management

**API Endpoints:**
```
POST /api/dog-walking/admin/client-media/reoptimize
  → Processes all unoptimized videos in database
  → Returns: { optimized, alreadyOptimized, failed, errors }

DELETE /api/dog-walking/admin/client-media/reoptimize
  → Clears all .optimized marker files
  → Use this to force re-processing of all videos
```

**Troubleshooting:**
- If videos still won't play, check browser console for errors
- Verify the video file isn't corrupted
- Check container logs for FFmpeg errors
- Try clearing optimization markers and re-running

### Customer Dashboard - My Media Tab

**Component**: `/app/components/MyMedia.tsx`

**Features:**
- **Month Grouping**: Media organized by month (e.g., "January 2026")
- **Thumbnail Grid**: Responsive grid of 150px thumbnails
- **Video Indicator**: "▶ Video" badge on video thumbnails
- **Click to View**: Modal overlay for full-size viewing
- **Video Playback**: HTML5 video player with controls and autoplay
- **Date Display**: Shows date taken on each thumbnail

**Integration with CustomerDashboard:**
- New "Media" tab (📷) in tab navigation
- `view === "media"` renders `<MyMedia />` component
- Back button returns to main dashboard

### Files Created

| File | Purpose |
|------|---------|
| `/sql/create_client_media.sql` | Database migration |
| `/app/dog-walking/admin/client-media/page.tsx` | Admin media management UI |
| `/app/api/dog-walking/admin/client-media/scan/route.ts` | Scan folder for new files |
| `/app/api/dog-walking/admin/client-media/route.ts` | GET (list) & POST (assign) media |
| `/app/api/dog-walking/admin/client-media/[id]/route.ts` | DELETE media assignment |
| `/app/api/dog-walking/admin/client-media/thumbnails/route.ts` | Generate thumbnails (images + videos) |
| `/app/api/dog-walking/admin/client-media/reoptimize/route.ts` | Re-optimize videos for streaming (moov atom) |
| `/app/api/dog-walking/client-media/[...path]/route.ts` | Serve media files with video streaming |
| `/app/api/dog-walking/customer-media/route.ts` | Fetch customer's media grouped by month |
| `/app/components/MyMedia.tsx` | Customer gallery component |

### Files Modified

| File | Change |
|------|--------|
| `/app/components/CustomerDashboard.tsx` | Added "media" view type, MyMedia integration |
| `/app/components/DashboardMain.tsx` | Added 📷 Media tab to navigation |

### Admin Workflow

```
1. Upload photos/videos via FTP to /home/hunter-dev/client-media/originals/
2. Go to Admin → Client Media Management
3. Click "Scan for New Files" → scans folder, auto-optimizes videos for streaming
4. Select client from dropdown, optionally set date
5. Click "Assign to Client" for each file
6. Click "Generate Thumbnails" → creates thumbnails for all assigned media
7. (If needed) Click "Re-optimize Videos" → fixes videos that failed initial optimization
8. Customer logs in → sees "My Media" tab → views their photos/videos by month
```

### Customer Experience

```
1. Customer logs into My Account dashboard
2. Clicks "Media" tab (📷 icon)
3. Sees photos/videos organized by month
4. Clicks thumbnail to view full-size
5. Videos play with controls in modal
6. Date displayed on each item
```

### Video Streaming Solution

**Root Cause**: HTTP/2 protocol errors with Next.js API routes serving large binary content through Cloudflare (520 errors)

**Solution**:
1. **Direct nginx serving**: Videos served via `nginx-media` container, bypassing Next.js
2. **Video optimization**: Apply `ffmpeg -movflags +faststart` to move moov atom to file beginning
3. **Range request support**: API route handles HTTP Range headers for proper seeking/streaming

**nginx-media volume mount** (docker-compose.yml):
```yaml
nginx-media:
  volumes:
    - /home/hunter-dev/client-media:/var/www/client-media:ro
```

**nginx-media.conf location block**:
```nginx
location /client-media/ {
    alias /var/www/client-media/;
    # ... mobile-optimized settings
}
```

**nginx-proxy.conf routes to nginx-media**:
```nginx
location /client-media/ {
    proxy_pass http://nginx-media:80;
}
```

**Automatic video optimization**:
Videos are automatically optimized during the scan process. When a new video is detected:
1. `ffmpeg -movflags +faststart` is applied (remux only, no re-encoding)
2. A marker file is created in `.optimized/` to prevent re-processing
3. The response includes `videosOptimized` count

This moves the moov atom to the beginning of the file, allowing playback to start immediately without loading the entire file.

**Manual optimization** (if needed):
```bash
ffmpeg -i input.mp4 -c copy -movflags +faststart output.mp4
```

### Technical Notes

- **Security**: Directory traversal prevention in file serving API
- **EXIF Reading**: Uses `exifreader` package for date extraction
- **FFmpeg Dependency**: Already installed in Docker image (`apk add ffmpeg`)
- **Sharp Dependency**: Already in package.json for image processing
- **Caching**: 24-hour browser cache for served media files
- **Volume Mount**: Read-write for thumbnail generation
- **Video URLs**: Use `/client-media/` path (served by nginx-media, not Next.js API)

**For AI Agents**: V13 adds a client media system where customers can view photos and videos from their dog walks. Admin uploads files via FTP to `/home/hunter-dev/client-media/originals/`, then uses the admin panel at `/dog-walking/admin/client-media` to scan for new files and assign them to clients. The scan endpoint extracts dates from EXIF metadata or filenames. Thumbnail generation handles both images (via Sharp) and videos (via FFmpeg frame extraction + Sharp resize). **CRITICAL: Videos must be served via nginx-media (not Next.js API) to avoid Cloudflare 520 errors. URLs use `/client-media/` path which nginx-proxy routes to nginx-media container. New videos must be optimized with `ffmpeg -movflags +faststart` to enable streaming.** Customers see a "My Media" tab in their dashboard showing photos/videos grouped by month with a modal viewer. The `MyMedia.tsx` component fetches from `/api/dog-walking/customer-media` which returns media grouped by month. Video thumbnails show the extracted frame with a "▶ Video" indicator badge.

---

## 🎉 V10 Achievements Summary

**15-Minute Walk Time Slots:**

✅ **Finer Booking Granularity**: Walk services now display 15-minute time slot intervals instead of 30-minute intervals
✅ **More Flexibility**: Customers can choose times like 09:15, 09:45, 10:15, etc.
✅ **Walk Services Only**: Dog sitting services remain at 30-minute intervals (intentional design choice)
✅ **Single File Change**: Modified `TimeSlotGrid.tsx` line 38 to use 15-minute increments

**Affected Services:**
- Meet & Greet (30 min duration) - now bookable at 15-min intervals
- Solo Walk (60/120 min duration) - now bookable at 15-min intervals
- Quick Walk (30 min duration) - now bookable at 15-min intervals

**Technical Implementation:**
```typescript
// TimeSlotGrid.tsx - generateWalkSlots() function
currentSlot = addMinutes(currentSlot, 15); // Changed from 30
```

**Cookie-Based Customer Session Persistence:**

✅ **Persistent Login**: Customers stay logged in for 7 days via httpOnly cookie
✅ **Multi-Booking Support**: Book multiple services without re-entering phone/email each time
✅ **Seamless Experience**: Page refresh no longer requires re-authentication
✅ **Cross-Page Consistency**: Session persists across /book-now and /my-account pages
✅ **Secure Implementation**: httpOnly cookie prevents XSS attacks, secure flag in production

**New API Endpoint:**
```
🔗 /api/dog-walking/customer-session
   → POST: Set session cookie after successful login
   → GET: Retrieve customer data from session cookie
   → DELETE: Clear session cookie (logout)
```

**Cookie Configuration:**
```typescript
{
    name: 'dog-walking-customer-session',
    value: base64(JSON.stringify({ owner_id, owner_name, email, phone })),
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 60 * 60 * 24 * 7, // 7 days
    path: '/'
}
```

**Modified Components:**
- `BookingForm.tsx` - Checks for existing session on mount, sets cookie after login/registration
- `book-now/page.tsx` - Checks session cookie when no URL params provided
- `DashboardAuth.tsx` - Sets session cookie after successful dashboard login
- `CustomerDashboard.tsx` - Checks session on mount, clears cookie on logout

**Session Flow:**
```
1. Customer visits /book-now or /my-account
2. System checks for 'dog-walking-customer-session' cookie
3. If valid cookie → Fetch fresh customer data from DB → Auto-login
4. If no cookie → Show login form
5. After successful login → Set 7-day session cookie
6. Subsequent visits → Automatically authenticated
7. Logout → Cookie cleared → Returns to login form
```

**Customer Experience Improvement:**
- **Before V10**: Enter phone/email for every booking, lost on page refresh
- **After V10**: Login once, book unlimited services for 7 days without re-authenticating

**Files Created:**
```
/app/api/dog-walking/customer-session/route.ts  → Session management API
```

**Files Modified:**
```
/app/components/BookingForm.tsx       → Session check + cookie setting
/app/components/DashboardAuth.tsx     → Cookie setting after login
/app/components/CustomerDashboard.tsx → Session check + logout clearing
/app/book-now/page.tsx                → Session check on page load
/app/components/TimeSlotGrid.tsx      → 15-minute intervals
```

**For AI Agents**: V10 introduces two key improvements: (1) Walk booking time slots now use 15-minute intervals instead of 30-minute intervals, giving customers more flexibility in choosing appointment times. This only affects walk services (Meet & Greet, Solo Walk, Quick Walk) - dog sitting remains at 30-minute intervals. (2) Customer sessions now persist for 7 days via a secure httpOnly cookie. When customers log in via phone/email, a session cookie is set that automatically authenticates them on subsequent visits. This eliminates the need to re-enter credentials for each booking and survives page refreshes. The session API at `/api/dog-walking/customer-session` handles POST (set), GET (retrieve), and DELETE (clear) operations. Components check for existing sessions on mount and set cookies after successful authentication.

**Admin Create Booking Bug Fixes (V10.1):**

✅ **Meet & Greet Duration Fix**: Admin create-booking form now correctly initializes `duration_minutes: 30` for the default Meet & Greet service
✅ **FREE Service Pricing Fix**: Fixed `getServicePrice()` to return `0` instead of `null` for FREE services (was using `||` instead of `??`)
✅ **Email Transaction Fix**: Moved email sending to AFTER database commit so email service can see the booking record

**Root Causes Fixed:**
- **Duration Bug**: Initial form state set `service_type: "Meet & Greet"` but didn't set `duration_minutes`, causing API validation to fail with "Must provide either duration_minutes or end_time"
- **Pricing Bug**: JavaScript falsy check `price || null` returned `null` when `price === 0` (FREE services)
- **Email Bug**: `sendBookingEmail()` uses separate DB connection that couldn't see uncommitted transaction data

**Files Modified:**
```
/app/dog-walking/admin/create-booking/page.tsx  → Added duration_minutes: 30 to initial state (line 63)
/lib/pricing.ts                                  → Changed || to ?? in getServicePrice() (line 66)
/app/api/dog-walking/admin/create-booking/route.ts → Moved email send after COMMIT (line 293-301)
```

**Technical Details:**
```typescript
// page.tsx - Initial state fix
const [bookingData, setBookingData] = useState<Partial<BookingData>>({
    service_type: "Meet & Greet - for new clients",
    duration_minutes: 30,  // ADDED - matches default service
    create_calendar_event: true,
    send_email: false,
});

// pricing.ts - Nullish coalescing fix
export const getServicePrice = (serviceId: string): number | null => {
  const service = SERVICE_PRICING[serviceId];
  if (!service) return null;
  return service.price ?? null;  // FIXED - was: service.price || null
};

// route.ts - Email after commit
await client.query('COMMIT');
// Email now sent HERE (after commit) instead of before
if (shouldSendEmail && !isHistorical) {
    await sendBookingEmail(bookingId, emailSubject, emailContent);
}
```

---

## 🎉 V9 Achievements Summary

**Payment Preferences System:**

✅ **Database Field**: Added `payment_preference` VARCHAR(20) column to owners table with CHECK constraint
✅ **Payment Options**: Per Service (default), Weekly, Fortnightly, Monthly
✅ **Admin Client Editor**: New "Payment Preferences" section with radio button selection
✅ **API Integration**: Full CRUD support in `/api/dog-walking/admin/clients/[clientId]` endpoint
✅ **Default Behaviour**: New clients default to 'per_service' (current system behaviour)

**Payment Preference Values:**
- `per_service` - Pay after each service (default, current behavior)
- `weekly` - Pay on Monday after week ends
- `fortnightly` - Pay on Monday after 2-week period ends
- `monthly` - Pay on 1st of new month

**Outstanding Balance Dashboard Card:**

✅ **Customer Dashboard**: New "Outstanding Balance" card showing total unpaid amount
✅ **Calculation**: Sum of `price_pounds` for all bookings with status = 'completed'
✅ **Visual Design**: Red background (#7f1d1d) with prominent total amount display
✅ **Conditional Display**: Only shows when outstanding balance > £0
✅ **Location**: Appears between customer info card and tab navigation

**Technical Implementation:**
- ClientEditor.tsx: Added payment_preference to form state and save request
- API route.ts: Added payment_preference to interfaces, GET query, PUT handler
- DashboardMain.tsx: Added outstanding balance calculation and card component

**Manual Invoice & Reminder System:**

✅ **Send Invoice Route**: `/api/dog-walking/admin/send-invoice` - Sends professional invoice email with all completed (unpaid) bookings
✅ **Send Reminder Route**: `/api/dog-walking/admin/send-reminder` - Sends payment reminder email with outstanding balance
✅ **Admin UI Integration**: "Customers with Outstanding Balance" section on Payment Status page
✅ **Per-Customer Buttons**: Send Invoice and Send Reminder buttons for each customer with unpaid bookings
✅ **Email Templates**: Professional HTML emails with service breakdown table, totals, and bank details
✅ **Multi-Recipient Support**: Emails sent to customer + partner (if configured) + BCC to business

**Invoice Email Features:**
- Blue header with Hunter's Hounds branding
- Period label based on payment_preference (Weekly/Fortnightly/Monthly)
- Service table with date, service type, and price for each booking
- Total amount in green
- Bank payment details in green callout box

**Reminder Email Features:**
- Amber/orange header for urgency
- Friendly but direct reminder tone
- Service table with red total footer
- Bank payment details in amber callout box
- "Payment crossing" disclaimer to avoid confusion

**Admin Workflow:**
1. Go to Payment Management page (Awaiting Payment tab)
2. View "Customers with Outstanding Balance" section at top
3. Click "Send Invoice" for first-time payment requests
4. Click "Send Reminder" for follow-up reminders
5. Success/error messages confirm email sent

---

## 🎉 V8 Achievements Summary

**Photo Sharing Consent System:**

✅ **Database Field**: Added `photo_sharing_consent` BOOLEAN column to owners table (defaults to false)
✅ **Customer Registration**: Optional checkbox during booking registration - "I give permission for Hunter's Hounds to share photos of my dog on their website and social media"
✅ **Admin Registration**: Photo consent checkbox in admin client registration page
✅ **Customer Profile (Read-Only)**: Displays consent status with clear visual indicator - customers cannot edit
✅ **Admin Client Editor**: Editable toggle for admin to change consent status at any time
✅ **Privacy Control**: Only admin can modify consent status - customers must contact business to change
✅ **API Integration**: Full support in user-register API and admin clients CRUD endpoints
✅ **Telegram Notification**: New client registrations show photo sharing consent status

**Business Use Cases:**
- **Website Gallery**: Only display photos of dogs with consent granted
- **Social Media Marketing**: Share walk photos only for consenting clients
- **Privacy Compliance**: Clear audit trail of consent status per client
- **Flexible Management**: Admin can update consent based on customer requests

**International Timezone Fix:**

✅ **Problem Solved**: Bookings from international users (e.g., India) were saving incorrect times
✅ **Root Cause**: Browser created Date objects in user's local timezone instead of London timezone
✅ **Fix Applied**: `TimeSlotGrid.tsx` and `SittingBookingFlow.tsx` now use `TZDate` from `@date-fns/tz`
✅ **Behaviour**: All time selections are interpreted as UK time regardless of user's location
✅ **Scope**: Applies to both walk bookings and sitting bookings

**Technical Details:**
- Time slots displayed as "HH:mm" are London times from the availability API
- `createFullDate()` function now creates dates using `TZDate(year, month, day, hours, minutes, 0, "Europe/London")`
- Ensures correct UTC conversion when `toISOString()` is called for API submission

---

## 🎉 V7 Achievements Summary

**Vet & Pet Insurance Information:**

✅ **Database Fields**: Added `vet_info` and `pet_insurance` TEXT columns to owners table
✅ **Customer Dashboard**: New "Vet & Insurance Information" section in My Account with helpful description
✅ **Admin Dashboard**: New section in ClientEditor for viewing/editing vet and insurance details
✅ **Optional Fields**: Not required during registration - customers can add later when needed
✅ **Freehand Text**: Flexible text fields allow any format (vet name, address, phone, policy numbers, etc.)
✅ **API Integration**: Full CRUD support through existing client management endpoints
✅ **Multi-Day Sitting Ready**: Essential information available for extended care bookings

**Enhanced Walk Availability During Multi-Day Sitting:**

✅ **Smart Conflict Detection**: Walk availability API now distinguishes between booking types
✅ **Multi-Day Sitting Allowed**: Walks can be booked on days with multi-day sitting (dog stays at home)
✅ **Single-Day Sitting Blocked**: Timed sitting bookings (e.g., 4 hours) still block walk availability
✅ **Calendar Event Parsing**: Uses "Multi-Day Dog Sitting" in event description to identify booking type
✅ **Business Logic**: Reflects real-world operations - can walk other dogs while dog-sitting at home

---

## 🎉 V6 Achievements Summary

**Customer Review System:**

✅ **Token-Based Review Submission**: Secure UUID tokens allow customers to leave reviews via email link (no login required)
✅ **Public Reviews Page**: `/reviews` displays all customer reviews with average rating, dog images, and admin responses
✅ **Admin Review Management**: Filter by response status, add/edit/remove professional responses
✅ **Automated Review Requests**: Payment confirmation emails include review link when booking marked as paid
✅ **StarRating Component**: Interactive/readonly star rating with hover effects and accessibility
✅ **ReviewCard Component**: Professional review display with service context and admin response styling
✅ **Privacy Protection**: First name only displayed publicly, full details in admin panel only
✅ **Database Integration**: `hunters_hounds.reviews` table with token security and response tracking

**Complete Secondary Addresses & Multi-Location Service System:**

✅ **Database Architecture**: New secondary_addresses table with contact management and foreign key relationships  
✅ **Complete CRUD Interface**: Full address management with validation, safety features, and audit trails  
✅ **Enhanced Booking Flow**: Address selection step between dog selection and confirmation  
✅ **Multi-Recipient Email System**: Intelligent email distribution to all relevant contacts automatically  
✅ **Safety Features**: Delete protection, deactivation protection, and transaction-based operations  
✅ **Contact Management**: Primary + partner contacts for both customer and secondary addresses  
✅ **Calendar Integration**: Google Calendar events show correct address information  
✅ **Telegram Notifications**: Business alerts include address details  
✅ **Database Functions**: Automated email recipient calculation with deduplication  
✅ **API Architecture**: 5 RESTful endpoints with comprehensive validation and error handling  

**NEW V6: Automated Payment Reminder System:**

✅ **Automated Processing**: Daily 2 PM cron job finds overdue payments and sends reminders automatically  
✅ **Smart Aggregation**: Consolidates all outstanding payments per customer into single reminder email  
✅ **Two-Tier Reminders**: Friendly 3-day and urgent 7-day reminders with professional tone  
✅ **Duplicate Prevention**: Tracks reminder history to prevent spam and duplicate notifications  
✅ **Customer Dashboard Integration**: Shows "Completed - Payment Pending" status for overdue bookings  
✅ **Professional Communication**: Includes payment crossing disclaimer and clear bank details  
✅ **Business Visibility**: BCC to business owner on all reminder emails for oversight  
✅ **Email Integration**: Uses existing Resend service with Hunter's Hounds branding  

**Operational Impact:**
✅ **Multi-Location Service**: Customers can have dogs picked up/dropped off at different addresses  
✅ **Contact Coordination**: Automatic notification of all relevant parties (customer, partner, secondary contacts)  
✅ **Family Integration**: Partners and family members automatically included in communication loop  
✅ **Business Flexibility**: Expanded service area through customer-defined secondary addresses  
✅ **Communication Efficiency**: Reduced coordination calls through automated multi-recipient system  
✅ **Revenue Protection**: Automated payment follow-up reduces manual workload and improves cash flow  

**Technical Excellence:**
✅ **Scalable Database Design**: Foreign key relationships with proper constraints and indexes  
✅ **Intelligent Email System**: Automated recipient calculation based on booking address  
✅ **Safety-First Architecture**: Protection against data loss and orphaned records  
✅ **Transaction-Based Operations**: Atomic operations with rollback support for data integrity  
✅ **Contact Privacy**: Optional partner fields respect privacy preferences  
✅ **Payment Automation**: Cron-based system requires no manual intervention for standard operations  

**Customer Experience Enhancement:**
✅ **Address Book Management**: Customers maintain their own secondary address book  
✅ **Contact Network**: Include partners, family members, housesitters in automatic notifications  
✅ **Location Flexibility**: Book services at primary address or any active secondary address  
✅ **Special Instructions**: Notes field for location-specific requirements  
✅ **Visual Interface**: Clean address cards with status indicators and contact information  
✅ **Payment Transparency**: Clear status display and professional reminder communications  

**For AI Agents**: Hunter's Hounds now features a complete secondary addresses system enabling multi-location service plus automated payment reminder system. Customers can manage unlimited secondary addresses with primary and partner contacts. The booking flow includes an address selection step between dog selection and final confirmation. Email system automatically distributes notifications to all relevant contacts based on selected address: primary address bookings notify customer + partner, secondary address bookings notify customer + partner + secondary contact + secondary partner. Payment reminder system runs daily at 2 PM to find overdue completed bookings (3+ days past end_time) and sends professional reminder emails with smart aggregation of all outstanding amounts per customer. Database includes hunters_hounds.secondary_addresses table with contact management, hunters_hounds.payment_reminders table for reminder tracking, hunters_hounds.get_booking_emails() function for automated recipient calculation, and enhanced bookings table with secondary_address_id foreign key. API provides 5 endpoints for address management plus automated payment processing. The system supports multi-generational families, business locations, complex contact networks, and automated revenue protection while maintaining data integrity and privacy protection.

**Latest V6 Updates**: Complete secondary addresses and multi-location service system implemented with automated payment reminder system. Features include address management dashboard, enhanced booking flow with address selection, multi-recipient email system, contact network support, database functions for automated email distribution, comprehensive API endpoints, safety features with delete protection, intelligent address-based notification system, daily automated payment reminders with smart aggregation, professional reminder email templates, customer dashboard payment status integration, and complete audit trail for payment communications. The system enables customers to manage multiple service locations with automatic coordination of all relevant contacts while ensuring timely payment follow-up through professional automated reminders.

---

## ⭐ Customer Review System

### **System Overview**
**Purpose**: Allow customers to leave reviews after services, with admin response capability
**Trigger**: Manual review request from admin via Manage Reviews page (V11 change - previously automatic)
**Architecture**: Token-based secure review submission + public reviews page + admin management
**Privacy**: Customers only need to click email link (no account required), first name only shown publicly

### **Database Schema**

**reviews Table:**
```sql
CREATE TABLE hunters_hounds.reviews (
    id SERIAL PRIMARY KEY,
    booking_id INT REFERENCES hunters_hounds.bookings(id) NOT NULL UNIQUE,
    owner_id INT REFERENCES hunters_hounds.owners(id) NOT NULL,
    review_token UUID DEFAULT gen_random_uuid() NOT NULL UNIQUE,
    rating INT CHECK (rating >= 1 AND rating <= 5),
    review_text TEXT,
    admin_response TEXT,           -- Business owner's response
    admin_response_date TIMESTAMP, -- When response was added
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    submitted_at TIMESTAMP         -- NULL until customer submits
);

-- Performance indexes
CREATE INDEX idx_reviews_token ON hunters_hounds.reviews(review_token);
CREATE INDEX idx_reviews_submitted ON hunters_hounds.reviews(submitted_at) WHERE submitted_at IS NOT NULL;
CREATE INDEX idx_reviews_booking_id ON hunters_hounds.reviews(booking_id);
```

### **Customer-Facing Pages**

```
⭐ hunters-hounds.london/review/[token]  → Token-based review submission form
📋 hunters-hounds.london/reviews         → Public reviews page with average rating
```

**Review Submission Page (`/review/[token]`):**
- Secure access via unique UUID token (no login required)
- Displays dog images, service type, and service date
- Interactive 5-star rating with visual feedback
- Review text field (10-2000 characters)
- Prevents duplicate submissions
- Thank you confirmation with review summary

**Public Reviews Page (`/reviews`):**
- Header with average rating and total review count
- ReviewCard components showing:
  - Dog image and service info
  - Star rating display
  - Service note from Ernesto (if provided)
  - Customer review text (first name only for privacy)
  - Admin response (if exists)
- Call-to-action to book services
- Mobile-responsive grid layout

### **Administrative Pages**

```
⚙️ hunters-hounds.london/dog-walking/admin/manage-reviews → Review management dashboard
```

**Manage Reviews Page:**
- Filter bar: All Reviews | Pending Response | Responded
- Review cards showing:
  - Customer full name, dog names, service info
  - Star rating and service note
  - Customer review text
  - Admin response form or existing response
- Response actions: Add Response, Edit, Remove
- Response character limit: 1000 characters

### **API Routes**

```
# Customer Review Endpoints
🔗 /api/dog-walking/reviews/submit      → GET: Fetch review data by token
                                        → POST: Submit review (rating + text)
🔗 /api/dog-walking/reviews/public      → GET: Fetch published reviews with average

# Admin Review Endpoints (Protected)
🔗 /api/dog-walking/admin/reviews       → GET: List reviews (section=submitted) or eligible bookings (section=eligible)
                                        → PUT: Add/update admin response
                                        → DELETE: Remove admin response
🔗 /api/dog-walking/admin/request-review → POST: Create review record + send review request email (V11)
```

### **Review Workflow**

```
Complete Review Flow (V11 - Manual Request):
1. Admin marks booking as "completed & paid" via admin dashboard (no email sent)
2. Admin goes to Manage Reviews → "Request Review" tab
3. Admin sees eligible bookings (completed & paid, no review request yet)
4. Admin clicks "Request Review" for desired booking
5. System creates review record with unique UUID token in database
6. Review request email sent to customer with embedded review link
7. Customer clicks link → Review form loads with dog image + service details
8. Customer selects 1-5 star rating and writes review text
9. Customer submits → Review marked as submitted with timestamp
10. Review appears immediately on public /reviews page
11. Admin sees review in "Submitted Reviews" tab (appears in "Pending Response")
12. Admin adds optional response → Response displays on public review
```

### **Email Integration**

**Manual Review Request (V11 - Triggered by Admin):**
```typescript
// In /api/dog-walking/admin/request-review/route.ts
// Creates review record and sends review request email

const reviewUrl = `https://hunters-hounds.london/review/${reviewToken}`;
const { subject, html } = generateReviewRequestEmail({
    ownerName: booking.owner_name.split(' ')[0],
    dogNames,
    dogImageUrls,
    serviceType: booking.service_type,
    serviceDate,
    walkSummary: booking.walk_summary,  // V11: Includes walk note
    reviewUrl
});
```

**Review Request Email Content (V11):**
- Purple gradient header (distinct from payment/other emails)
- "We'd Love Your Feedback!" title
- Shows dog image(s) and service details
- Includes walk summary/note from Ernesto (if present)
- Prominent yellow "Leave a Review" CTA button
- Subject: `${dogNames} had a great time! Share your experience`

### **Components**

**StarRating Component (`/components/StarRating.tsx`):**
```typescript
interface StarRatingProps {
    rating: number;
    onRatingChange?: (rating: number) => void;
    readonly?: boolean;          // Interactive vs display mode
    size?: "sm" | "md" | "lg";   // 20px, 32px, 48px
}
```
- Interactive mode with hover effects
- Visual feedback on rating selection
- Accessible with ARIA labels
- Yellow filled stars for selected, gray outline for unselected

**ReviewCard Component (`/components/ReviewCard.tsx`):**
```typescript
interface ReviewCardProps {
    rating: number;
    reviewText: string;
    serviceType: string;
    serviceDate: string;
    serviceNote: string | null;      // Ernesto's walk note
    customerFirstName: string;        // Privacy: first name only
    dogNames: string[];
    dogImages: string[];
    adminResponse?: string | null;
    adminResponseDate?: string | null;
}
```
- Dog image with fallback
- Star rating display
- Service note in blue callout box
- Customer review with first name attribution
- Admin response in green callout box

### **Security & Privacy**

**Token-Based Access:**
- UUID tokens (gen_random_uuid()) are cryptographically secure
- Each booking has exactly one review token
- Token cannot be guessed or enumerated
- No customer account required to submit

**Privacy Protection:**
- Public reviews show first name only (extracted from owner_name)
- Full customer details only visible in admin panel
- Email addresses never displayed publicly
- Review text limited to prevent spam (10-2000 chars)

**Admin Protection:**
- All admin endpoints require `dog-walking-admin-auth` cookie
- Response length limited to 1000 characters
- Edit/delete functionality for response management

### **Data Validation**

**Review Submission:**
- Rating: required, must be 1-5
- Review text: required, 10-2000 characters
- Token: must exist and not already submitted
- Duplicate submission: prevented by `submitted_at IS NOT NULL` check

**Admin Response:**
- Response text: required, 1-1000 characters
- Review must be submitted (not pending customer submission)
- Timestamps automatically recorded

### **Business Intelligence**

**Available Metrics:**
- Total review count
- Average rating (calculated dynamically)
- Reviews pending admin response
- Response rate tracking
- Service type breakdown from reviews

**Admin Dashboard Integration:**
- Quick access from main admin panel
- Filter by response status
- Service context visible for each review

### **Review System Files**

```
# Customer Pages
/app/review/[token]/page.tsx            → Review submission form
/app/reviews/page.tsx                   → Public reviews listing

# Admin Pages
/app/dog-walking/admin/manage-reviews/page.tsx → Admin review management (V11: with tabs)

# API Routes
/app/api/dog-walking/reviews/submit/route.ts     → Submit review endpoint
/app/api/dog-walking/reviews/public/route.ts     → Public reviews endpoint
/app/api/dog-walking/admin/reviews/route.ts      → Admin review management (V11: section param)
/app/api/dog-walking/admin/request-review/route.ts → V11: Manual review request endpoint

# Components
/app/components/StarRating.tsx          → Interactive/readonly star rating
/app/components/ReviewCard.tsx          → Review display card

# Email Templates
/lib/emailTemplates.ts                  → V11: generateReviewRequestEmail() added

# Database Scripts
/sql/create_reviews_table.sql           → Initial table creation
/sql/add_admin_response_to_reviews.sql  → Admin response columns migration
```

### **Review System Summary**

**For AI Agents**: Hunter's Hounds includes a complete customer review system with manual admin-controlled review requests (V11). When bookings are marked as "completed & paid", only the status is updated - no email is sent. Admin can then go to the Manage Reviews page "Request Review" tab to see eligible bookings (completed & paid with no review request yet). Clicking "Request Review" creates a review record with a unique UUID token and sends a review request email via the `/api/dog-walking/admin/request-review` endpoint. The email uses a purple color scheme (distinct from other emails) and includes the walk summary if present. Customers can click the link to access a secure review form (no login required) where they see their dog's image, service details, and can submit a 1-5 star rating with written feedback. Submitted reviews immediately appear on the public `/reviews` page showing the average rating, individual reviews with dog images, and admin responses. The admin panel at `/dog-walking/admin/manage-reviews` has two tabs: "Submitted Reviews" for managing responses and "Request Review" for sending new review requests. Database table `hunters_hounds.reviews` stores review data with token-based security, and all admin endpoints are protected by authentication. This manual approach prevents recurring payment customers from being spammed with review request emails.

---

## 🔄 V14: Recurring Bookings System

### **Feature Overview**

**Purpose**: Enable customers and admins to create recurring dog walking bookings with intelligent conflict handling, alternative time suggestions, and series management.

**Key Capabilities:**
- **Recurrence Patterns**: Weekly, bi-weekly, and custom days (Mon/Wed/Fri etc)
- **Duration**: Schedule up to 12 weeks ahead
- **Conflict Handling**: Partial booking - book available dates, skip conflicts, show alternatives
- **Access**: Both customers AND admin can create recurring bookings

### **Customer-Facing Page**

```
📅 hunters-hounds.london/dog-walking/dashboard/book-recurring → Recurring booking flow
```

**4-Step Booking Flow:**
1. **Service & Dog Selection** - Choose dogs, service type, walk duration
2. **Recurrence Configuration** - Pattern (weekly/biweekly/custom), preferred time, weeks ahead
3. **Availability Review** - Visual grid showing available/conflict/blocked dates with alternatives
4. **Confirmation** - Success message with series reference and email confirmation

### **API Routes**

```
# Recurring Booking API Routes
🔗 /api/dog-walking/recurring/check-availability  → POST: Check availability for all dates in pattern
🔗 /api/dog-walking/recurring/book                → POST: Create series and individual bookings
🔗 /api/dog-walking/recurring/[seriesId]          → GET: Fetch series details and bookings
🔗 /api/dog-walking/recurring/[seriesId]/cancel   → POST: Cancel with options (single/series/future)
```

### **Database Schema**

**NEW: booking_series Table:**
```sql
CREATE TABLE hunters_hounds.booking_series (
    id SERIAL PRIMARY KEY,
    owner_id INTEGER NOT NULL REFERENCES hunters_hounds.owners(id),
    dog_id_1 INTEGER NOT NULL REFERENCES hunters_hounds.dogs(id),
    dog_id_2 INTEGER REFERENCES hunters_hounds.dogs(id),
    service_type VARCHAR(100) NOT NULL,
    duration_minutes INTEGER,
    secondary_address_id INTEGER REFERENCES hunters_hounds.secondary_addresses(id),

    -- Recurrence pattern configuration
    recurrence_pattern VARCHAR(20) NOT NULL, -- 'weekly', 'biweekly', 'custom'
    days_of_week INTEGER[], -- For custom: [1,3,5] = Mon,Wed,Fri (ISO weekday)
    preferred_time TIME NOT NULL,

    -- Series date range and stats
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    total_requested INTEGER NOT NULL DEFAULT 0,
    total_booked INTEGER NOT NULL DEFAULT 0,
    total_skipped INTEGER NOT NULL DEFAULT 0,

    -- Series status management
    status VARCHAR(20) DEFAULT 'active', -- 'active', 'paused', 'cancelled', 'completed'
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    notes TEXT
);
```

**MODIFIED: bookings Table (new columns):**
```sql
ALTER TABLE hunters_hounds.bookings
ADD COLUMN series_id INTEGER REFERENCES hunters_hounds.booking_series(id),
ADD COLUMN series_index INTEGER;

CREATE INDEX idx_bookings_series_id ON hunters_hounds.bookings(series_id);
```

### **Check Availability API**

**Endpoint**: `POST /api/dog-walking/recurring/check-availability`

**Request:**
```typescript
interface CheckAvailabilityRequest {
    owner_id: number;
    service_type: string;
    duration_minutes: number;
    recurrence_pattern: 'weekly' | 'biweekly' | 'custom';
    days_of_week?: number[]; // ISO weekday: 1=Mon, 7=Sun
    preferred_time: string; // HH:mm format
    start_date: string; // YYYY-MM-DD
    weeks_ahead: number; // Max 12
}
```

**Response:**
```typescript
interface CheckAvailabilityResponse {
    success: boolean;
    summary: {
        total_requested: number;
        available: number;
        conflicts: number;
        blocked: number;
    };
    available_dates: Array<{
        date: string;
        displayDate: string;
        time: string;
        status: 'available';
    }>;
    conflicting_dates: Array<{
        date: string;
        displayDate: string;
        requestedTime: string;
        status: 'conflict';
        reason: string;
        alternatives: Array<{ time: string; displayTime: string }>;
    }>;
    blocked_dates: Array<{
        date: string;
        displayDate: string;
        status: 'blocked';
        reason: string;
    }>;
}
```

### **Book Recurring API**

**Endpoint**: `POST /api/dog-walking/recurring/book`

**Request:**
```typescript
interface RecurringBookRequest {
    owner_id: number;
    dog_id_1: number;
    dog_id_2?: number;
    service_type: string;
    duration_minutes: number;
    secondary_address_id?: number;
    recurrence_pattern: 'weekly' | 'biweekly' | 'custom';
    days_of_week?: number[];
    preferred_time: string;
    start_date: string;
    end_date: string;
    confirmed_dates: Array<{ date: string; time: string }>;
    skipped_dates: Array<{ date: string; displayDate: string; reason: string }>;
    notes?: string;
}
```

**Actions Performed:**
1. Create `booking_series` record
2. Create individual booking records with `series_id` and `series_index`
3. Create Google Calendar events for each booking
4. Send single confirmation email with all dates
5. Send Telegram notification

### **Cancellation Options**

**Endpoint**: `POST /api/dog-walking/recurring/[seriesId]/cancel`

**Cancel Types:**
- `single` - Cancel one specific booking (requires `booking_id`)
- `series` - Cancel all remaining bookings in the series
- `future` - Cancel this booking and all future ones (requires `booking_id`)

```typescript
interface CancelRequest {
    cancel_type: 'single' | 'series' | 'future';
    booking_id?: number; // Required for 'single' and 'future'
}
```

### **UI Components**

**RecurringBookingForm.tsx:**
- Dog selection (1-2 dogs)
- Service type selection (Solo Walk, Quick Walk)
- Duration selection:
  - Solo Walk: 1 hour or 2 hours
  - Quick Walk: Fixed at 30 minutes (no selection shown)
- Pattern selection (Weekly, Every 2 Weeks, Custom Days)
- Custom days checkboxes (Mon-Fri)
- Time selection dropdown
- Weeks ahead selection (4-12 weeks)
- Start date picker
- Booking summary display

**RecurringAvailabilityGrid.tsx:**
- Summary cards (Available, Conflicts, Blocked, To Book)
- Available dates list with green indicator
- Conflicting dates with alternative time buttons
- Blocked dates with reason
- Skip button for conflicts
- Confirm & Book button

### **Dashboard Integration**

**Customer Dashboard (DashboardMain.tsx):**
- "Book Recurring" button added to Quick Actions
- Recurring badge displayed on bookings that are part of a series
- Series ID visible on booking cards

**Admin Manage Bookings:**
- New filter: "All | Single | Recurring"
- Series badge with series ID on recurring bookings
- Series index shown (e.g., "3 of series")

### **Email Template**

**generateRecurringBookingEmail()** in `lib/emailTemplates.ts`:
- Purple color scheme (distinct from other booking emails)
- Pattern summary ("Every week at 10:00")
- Table of all booked dates with individual cancel links
- Skipped dates section with reasons
- Total booking count and price
- Series reference number
- Dashboard link

### **File Structure**

```
# New Files
/sql/create_booking_series.sql                              → Database migration
/app/api/dog-walking/recurring/check-availability/route.ts  → Availability check
/app/api/dog-walking/recurring/book/route.ts                → Create series
/app/api/dog-walking/recurring/[seriesId]/route.ts          → Get series details
/app/api/dog-walking/recurring/[seriesId]/cancel/route.ts   → Cancel options
/app/dog-walking/dashboard/book-recurring/page.tsx          → Customer booking page
/app/components/RecurringBookingForm.tsx                    → Configuration form
/app/components/RecurringAvailabilityGrid.tsx               → Availability review

# Modified Files
/lib/emailTemplates.ts                                      → Added recurring email template
/app/api/dog-walking/customer-bookings/route.ts             → Added series fields
/app/api/dog-walking/cancel/route.ts                        → Series awareness
/app/api/dog-walking/admin/bookings/editable/route.ts       → Added series fields
/app/components/DashboardMain.tsx                           → Recurring badge + button
/app/dog-walking/admin/manage-bookings/page.tsx             → Type filter + series display
```

### **Recurring Bookings Summary**

**For AI Agents**: Hunter's Hounds V14 includes a complete recurring booking system. Customers access it via the "Book Recurring" button on their dashboard at `/dog-walking/dashboard/book-recurring`. The flow allows selecting dogs, service type, duration (30-90 min), and recurrence pattern (weekly, bi-weekly, or custom days like Mon/Wed/Fri). After configuration, the system checks availability for all target dates up to 12 weeks ahead via `/api/dog-walking/recurring/check-availability`. Dates are categorized as available (green), conflicting with alternatives (yellow), or blocked (red for weekends/fully booked). Users can accept alternative times or skip conflicting dates. On confirmation, the system creates a `booking_series` record and individual bookings linked via `series_id`. Each booking gets its own Google Calendar event with series reference in the description. A single purple-themed confirmation email lists all booked dates with individual cancel links. The admin panel at `/dog-walking/admin/manage-bookings` can filter by booking type (Single/Recurring) and shows series badges. Cancellation supports three modes: single (one booking), series (all remaining), or future (this + remaining). Database migration is in `/sql/create_booking_series.sql`.
---

## 🔧 V14.1: Calendar Event Standardization & Bug Fixes

### **Bug Fixes**

**Recurring Booking Availability Check (Fixed 2026-02-08):**

Two critical bugs were discovered and fixed in the recurring booking availability checker:

1. **All-Day Calendar Blocks Not Respected**
   - **Problem**: When blocking out date ranges on Google Calendar using all-day events (e.g., vacation, personal time), the recurring booking system ignored these blocks and allowed bookings during blocked periods.
   - **Root Cause**: The availability check only looked at events with `dateTime` properties. All-day calendar blocks use `date` properties instead, so they were completely ignored.
   - **Fix**: Added detection for all-day events that distinguishes between business events (Dog Sitting) and blocking events (vacation, personal time). Non-business all-day events now properly block availability.

2. **Multi-Day Sitting Bookings Blocking Walks**
   - **Problem**: Multi-day dog sitting bookings (e.g., March 27 - April 20) were blocking other services via the recurring API route, even though walks should be allowed during sitting bookings.
   - **Root Cause**: Calendar event descriptions didn't match the text patterns being checked. The code looked for "Multi-Day Dog Sitting" in the description, but it actually appeared in the summary (title). The description contained "Multi-day booking" instead.
   - **Fix**: Updated filters to check both `summary` and `description` fields for the correct text patterns.

**Files Fixed:**
- `/app/api/dog-walking/recurring/check-availability/route.ts` (lines 292-357)

### **Calendar Event Standardization**

To prevent similar issues in the future, all booking channels were standardized to use consistent calendar event formats.

**Problem Identified:**
Each booking route (customer, admin, recurring, reschedule) was manually building calendar event summaries and descriptions with different formats, making filtering/searching unreliable.

**Solution Implemented:**
Created a shared utility function that generates standardized calendar events across all booking channels.

### **New Shared Utility**

**File:** `/lib/calendarEvents.ts`

**Functions:**
```typescript
generateCalendarEventSummary(data: CalendarEventData): string
generateCalendarEventDescription(data: CalendarEventData): string
generateCalendarEvent(data: CalendarEventData, startDateTime: Date, endDateTime: Date): object
```

**Standardized Format:**

**Summary (Title):**
```
[SERVICE] - [DOGS] [(DURATION)] [SERIES_BADGE]
```
Examples:
- `Solo Walk (60min) - Max & Luna`
- `Multi-Day Dog Sitting - Buddy (14 days)`
- `Quick Walk - Charlie [Series #42-3/12]`

**Description:**
```
[BOOKING_TYPE_HEADER]
[HISTORICAL/RESCHEDULED BADGES]

Owner: [NAME]
Dog(s): [NAMES]
Service: [SERVICE]
Duration: [TIME/DAYS]
Price: £[AMOUNT]

Location: [LABEL]
Address: [FULL_ADDRESS]
Phone: [PHONE]
Email: [EMAIL]

Start: [DATE TIME]
End: [DATE TIME]

Notes: [NOTES]
Status: [STATUS]

Booking Type: [Single Day/Multi-Day/Recurring]
```

**Key Features:**
- Consistent format across all booking channels
- Includes series information for recurring bookings
- Supports historical booking flag
- Includes rescheduled-from information
- Clear "Booking Type" label for filtering

### **Updated Routes**

All booking routes now use the shared utility:

1. **Customer Booking** - `/app/api/dog-walking/book/route.ts`
   - Replaced manual event creation with `generateCalendarEvent()`
   - Handles Solo Walk, Quick Walk, Meet & Greet, Dog Sitting

2. **Admin Create Booking** - `/app/api/dog-walking/admin/create-booking/route.ts`
   - Standardized format with historical booking flag
   - Includes notes field when provided

3. **Recurring Booking** - `/app/api/dog-walking/recurring/book/route.ts`
   - Series ID, index, and total included in summary and description
   - Consistent with other channels

4. **Reschedule Booking** - `/app/api/dog-walking/reschedule-booking/route.ts`
   - Includes "RESCHEDULED FROM" information in description
   - Uses `calendar.events.update()` with standardized format

### **Availability Filter Updates**

The recurring availability checker now recognizes **both** standardized and legacy formats:

**All-Day Events Check:**
- ✅ New: `"Booking Type: Multi-Day"` in description
- ✅ Legacy: `"Multi-day booking"` in description
- ✅ Both: `"Dog Sitting"` in summary

**Timed Events Check:**
- ✅ New: `"Booking Type: Multi-Day"` in description
- ✅ Legacy: `"Multi-day booking"` in description
- ✅ Duration parsing: `"Duration: 360 minutes"` or `"Duration: 6 hours"`

**Backward Compatibility:**
Existing calendar events continue to work with legacy format checks, while new bookings use the standardized format.

### **Benefits**

1. **Consistency**: All calendar events follow the same format
2. **Maintainability**: Change format in one place, applies everywhere
3. **Reliability**: Filtering/searching works across all booking types
4. **Future-Proof**: New features can rely on consistent patterns
5. **Debugging**: Easier to identify booking source from calendar

### **Files Created**

```
/lib/calendarEvents.ts → Shared calendar event generation utility
```

### **Files Modified**

```
/app/api/dog-walking/book/route.ts                          → Uses shared utility
/app/api/dog-walking/admin/create-booking/route.ts          → Uses shared utility
/app/api/dog-walking/recurring/book/route.ts                → Uses shared utility
/app/api/dog-walking/reschedule-booking/route.ts            → Uses shared utility
/app/api/dog-walking/recurring/check-availability/route.ts  → Updated filters for new format
```

### **V14.1 Summary**

**For AI Agents**: Hunter's Hounds V14.1 fixes critical bugs in the recurring booking availability checker and standardizes calendar event formatting across all booking channels. The availability checker now properly detects and respects all-day calendar blocks (vacation, personal time) while allowing walks during multi-day sitting bookings. All booking routes (customer, admin, recurring, reschedule) now use a shared utility (`/lib/calendarEvents.ts`) that generates consistent Google Calendar events with standardized summaries and descriptions. The format includes clear "Booking Type" labels (Single Day, Multi-Day, Recurring) and consistent structure for owner, dogs, service, duration, price, location, and status. The availability filters support both the new standardized format and legacy formats for backward compatibility. This prevents future issues with calendar event filtering and makes the system more maintainable and reliable for new features.


---

## 🔧 V14.2: Admin Reschedule & Grouped Bookings Display

### **Admin Reschedule Feature**

**Purpose**: Enable admins to reschedule bookings directly from the manage-bookings page without time restrictions.

**Key Features:**
- Reschedule button in Actions column of bookings table
- Modal interface for selecting new date/time
- No working hours restrictions (admin can reschedule to any time)
- Automatic calculation of end time based on booking duration
- Integration with existing reschedule API
- Calendar update, email notification, and Telegram alert

**UI Components:**
- Actions column added to bookings table
- Modal with date/time pickers
- Pre-populated with current booking time
- Shows booking details for reference
- Loading states and error handling

**Files Modified:**
- `/app/dog-walking/admin/manage-bookings/page.tsx` → Added reschedule modal and functionality

**API Integration:**
- Uses existing `/api/dog-walking/reschedule-booking` endpoint
- Sends `booking_id`, `new_start_time`, and `new_end_time`
- Automatically calculates end time from booking duration

### **Grouped Bookings Display**

**Purpose**: Organize customer dashboard bookings by month and week for better readability, especially for recurring bookings spanning multiple months.

**Key Features:**
- Bookings grouped by month (e.g., "February 2026")
- Within each month, grouped by week (e.g., "Week of Feb 10 - Feb 16")
- Visual hierarchy with indentation
- Chronological sorting within weeks
- Month headers with blue styling and separators
- Week headers showing date ranges

**Display Structure:**
```
📆 February 2026
├─ Week of Feb 10 - Feb 16
│  ├─ Booking 1 (Feb 10, 10:00)
│  ├─ Booking 2 (Feb 12, 14:00)
│  └─ Booking 3 (Feb 14, 09:00)
├─ Week of Feb 17 - Feb 23
│  └─ Booking 4 (Feb 19, 10:00)

📆 March 2026
├─ Week of Mar 3 - Mar 9
   └─ Booking 5 (Mar 5, 10:00)
```

**Benefits:**
- Easy to scan upcoming bookings
- Perfect for recurring bookings (2-3 months)
- Quick to find bookings in specific week
- Multiple bookings per week clearly grouped
- Maintains all existing functionality (cancel, view details)

**Implementation Details:**
- Groups bookings using `yyyy-MM` for months
- Groups weeks starting on Sunday
- Sorts chronologically at all levels
- Preserves all booking card features
- Applied only to "Current Bookings" section

**Files Modified:**
- `/app/components/DashboardMain.tsx` → Added month/week grouping logic and rendering

### **V14.2 Summary**

**For AI Agents**: Hunter's Hounds V14.2 adds two UX improvements. First, admins can now reschedule bookings directly from the manage-bookings page via a new Actions column with a Reschedule button. The modal allows selecting any date/time (no working hours restrictions) and automatically calculates the end time based on booking duration. Second, the customer dashboard now groups bookings by month and week, making it much easier to browse recurring bookings that span 2-3 months. Each month shows as a section (e.g., "February 2026") with weeks nested inside (e.g., "Week of Feb 10 - Feb 16"). This provides better visual organization without requiring a full calendar interface. All existing functionality (cancellation, viewing details) is preserved in both features.

---

## V14.2.1: Reschedule Google Calendar Fix

### **Bug Fix: Google Calendar Not Updating on Reschedule**

**Problem**: When rescheduling a booking from the admin console, the database updated correctly and email/Telegram notifications were sent, but the Google Calendar event was not updated. The calendar update error was silently caught and swallowed.

**Root Cause**: The reschedule route used `calendar.events.update()` (HTTP PUT - full resource replacement), which was the only route in the codebase using this method. All other routes that modify calendar events use `calendar.events.patch()` (HTTP PATCH - partial update). The PUT method requires the complete event resource and clears any fields not included in the request body (attendees, reminders, organizer metadata, etc.), which can cause the Google Calendar API to reject the request.

**Fix Applied**:

1. **Changed `events.update()` to `events.patch()`** in `/app/api/dog-walking/reschedule-booking/route.ts`
   - Consistent with `modify-booking-dogs/route.ts` which uses `events.patch()` successfully
   - PATCH only modifies specified fields, leaving other event metadata intact

2. **Added `calendar_updated` flag to API response**
   - The reschedule API now returns `calendar_updated: true/false`
   - Admin UI checks this flag and displays a warning if calendar update failed

3. **Added booking ID to Telegram notification**
   - Reschedule TG messages now include `(ID: {booking_id})` for reference

4. **Added warning for missing google_event_id**
   - Logs a warning if a booking has no `google_event_id` (calendar can't be updated)

**Files Modified:**
- `/app/api/dog-walking/reschedule-booking/route.ts` - `events.update()` -> `events.patch()`, calendar_updated flag, TG booking ID
- `/app/dog-walking/admin/manage-bookings/page.tsx` - Calendar update warning display

**For AI Agents**: The reschedule-booking route now uses `calendar.events.patch()` instead of `calendar.events.update()`. All calendar modification routes in the codebase should use `events.patch()` for partial updates (not `events.update()` which does full resource replacement). The API response now includes `calendar_updated` boolean so the frontend can alert the admin if the calendar sync failed. Always use `events.patch()` for updating existing Google Calendar events.

---

## V14.2.2: Dashboard Grouping Fix, API Caching Fix & Partner Newsletter Subscriptions

### **Bug Fix: Customer Dashboard Caching Stale Booking Data**

**Problem**: After rescheduling a booking via the API, the customer dashboard (`/my-account`) continued to show old booking times. The database had the correct updated times but the frontend served stale data.

**Root Cause**: The `customer-bookings` and `booking-details` API routes (GET handlers) were missing `export const dynamic = 'force-dynamic'`. In Next.js 14 production builds, GET route handlers without this directive can be cached, serving stale responses.

**Fix**: Added `export const dynamic = 'force-dynamic'` to both routes, matching the pattern already used by `customer-session`, `customer-media`, and auth routes.

**Files Modified:**
- `/app/api/dog-walking/customer-bookings/route.ts` — Added `export const dynamic = 'force-dynamic'`
- `/app/api/dog-walking/booking-details/route.ts` — Added `export const dynamic = 'force-dynamic'`

### **Dashboard Booking Sections Reorganization**

**Problem**: The "Your Current Bookings" section grouped ALL current bookings (confirmed + completed) by month/week. Completed-but-unpaid bookings from earlier in the day appeared inside the grouped view above future confirmed bookings, which was confusing.

**Fix**: Split bookings into three distinct sections:

1. **"Your Current Bookings"** (grouped by month/week) — `confirmed` only
2. **"Awaiting Payment"** (flat list) — `completed` only
3. **"Booking History"** (flat list) — `completed & paid` + `cancelled` + `no_show`

**Files Modified:**
- `/app/components/DashboardMain.tsx` — Separated booking sections by status

### **Independent Partner Newsletter Subscriptions**

**Problem**: Newsletter only went to primary owner emails. Partners on file received nothing.

**Solution**: Added independent newsletter subscriptions for partner emails, so each person can subscribe/unsubscribe individually.

**Database Changes:**
```sql
ALTER TABLE hunters_hounds.owners
ADD COLUMN partner_newsletter_subscribed BOOLEAN DEFAULT true,
ADD COLUMN partner_newsletter_unsubscribe_token UUID DEFAULT gen_random_uuid();
```

**How It Works:**
- Newsletter send route builds a combined recipient list (primary + partner emails)
- Each recipient gets their own unique unsubscribe token in the email
- Primary uses `newsletter_unsubscribe_token`, partner uses `partner_newsletter_unsubscribe_token`
- Unsubscribe route checks primary token first, then partner token — only the matching subscription is toggled
- Primary and partner can unsubscribe independently without affecting each other
- `newsletter_history` records only track primary owner (to avoid duplicate `owner_id` entries)

**Files Modified:**
- `/app/api/dog-walking/admin/newsletter/send/route.ts` — Fetches partner emails, builds combined recipient list with individual tokens, checks `partner_newsletter_subscribed`
- `/app/api/dog-walking/newsletter/unsubscribe/route.ts` — GET (unsubscribe) and POST (resubscribe) both try primary token, then partner token

**For AI Agents**: V14.2.2 fixes three issues. (1) Customer-facing API routes (`customer-bookings`, `booking-details`) now have `export const dynamic = 'force-dynamic'` to prevent Next.js from caching GET responses — always add this to any new API route that returns dynamic database data. (2) The customer dashboard now separates bookings into confirmed (grouped by month/week), awaiting payment (flat), and history (flat) sections. Only confirmed bookings are grouped. (3) Newsletter sending now includes partner emails with independent subscription management. Each person (primary + partner) has their own `newsletter_subscribed` flag and `unsubscribe_token`. The unsubscribe route tries primary token first, then partner token, updating only the matched subscription. When adding new owner fields for partners, follow this pattern of independent flags rather than household-level settings.

## 📝 V15: Ad-Hoc Sitting Notes for Multi-Day Bookings

### **Feature Overview**

**Problem**: For multi-day dog sittings (e.g. week-long holiday care), clients could not see any updates until the entire sitting was marked complete. The `walk_summary` field only gets populated on completion.

**Solution**: A new `booking_notes` system allows the admin to write daily ad-hoc notes during an ongoing multi-day sitting. These notes are visible to clients in real-time on their dashboard. When the sitting is marked complete, the notes are automatically amalgamated into the existing `walk_summary` field in a "Day 1 / Day 2..." format.

**Scope**: Multi-day sittings only (`booking_type = 'multi_day'`). No email notifications — clients check their dashboard.

### **Database Schema**

```sql
CREATE TABLE hunters_hounds.booking_notes (
    id SERIAL PRIMARY KEY,
    booking_id INTEGER NOT NULL REFERENCES hunters_hounds.bookings(id) ON DELETE CASCADE,
    note_text TEXT NOT NULL,
    note_date DATE NOT NULL DEFAULT CURRENT_DATE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_booking_notes_booking_id ON hunters_hounds.booking_notes(booking_id);
```

- `note_date` is a `DATE` (not timestamp) — the admin picks which calendar day the note is about. Defaults to today.
- `ON DELETE CASCADE` — if a booking is deleted, its notes are cleaned up automatically.
- Individual notes are kept in the database after completion (not deleted) for audit purposes.

### **API Routes**

**Admin CRUD** — `/api/dog-walking/admin/booking-notes/route.ts` (all methods require admin auth):
- **GET** `?booking_id=X` — Fetch all notes for a booking, ordered by `note_date ASC`
- **POST** `{ booking_id, note_text, note_date? }` — Create note. Validates booking is `confirmed` and `multi_day`. Sends Telegram notification.
- **PUT** `{ note_id, note_text }` — Edit an existing note
- **DELETE** `{ note_id }` — Delete a note

**Customer Read-Only** — `/api/dog-walking/booking-notes/route.ts`:
- **GET** `?booking_id=X&owner_id=Y` — Returns notes for a confirmed booking. Validates ownership via JOIN on `bookings.owner_id`.

### **Amalgamation on Completion**

When `mark-completed` is called (`/api/dog-walking/admin/mark-completed/route.ts`):
1. If no explicit `walk_summary` is provided in the request body, the API queries `booking_notes` for the booking
2. If notes exist, it auto-generates the summary in this format:
   ```
   Day 1 (Mon 3 Feb): Note text here

   Day 2 (Tue 4 Feb): Note text here
   ```
3. If the admin provides a `walk_summary` in the modal (e.g. edits the pre-populated text), that takes precedence
4. The individual `booking_notes` rows are kept in the database (not deleted)

### **Admin UI — Manage Bookings Page**

**Actions Dropdown**: A new "Add Sitting Note" option appears in the actions dropdown **only for confirmed multi-day bookings** (`booking_type === 'multi_day'` and `status === 'confirmed'`).

**Add Sitting Note Modal** (`activeModal === 'add-note'`):
- Shows booking summary header (owner, dogs, dates)
- Scrollable list of existing notes with date headers, each with Edit/Delete buttons
- Date picker (defaults to today) + textarea + "Add Note" button
- Modal stays open after adding — allows adding multiple notes in sequence
- Inline editing: clicking "Edit" on a note shows a textarea in place

**Mark-Completed Modal Enhancement**:
- When opening the mark-completed modal, it fetches any existing ad-hoc notes
- If notes exist, the `walkSummary` textarea is pre-populated with the amalgamated "Day 1 / Day 2..." format
- Admin can edit the text before confirming
- A helper text appears: "Pre-populated from sitting notes. Edit as needed before confirming."

### **Customer Dashboard — Sitting Updates**

**File**: `/app/components/DashboardMain.tsx`

- `Booking` interface extended with `booking_type` and `note_count` fields
- On load, for confirmed multi-day bookings with `note_count > 0`, fetches notes from `/api/dog-walking/booking-notes`
- **Blue "SITTING UPDATES" card** (distinct from green "WALK SUMMARY"):
  - Background: `#1e3a5f`, border: `#3b82f6`
  - Each note shows its date header (e.g. "Mon 3 Feb") + note text
  - Appears above the action buttons for ongoing multi-day sittings
- After completion, the blue card disappears and the standard green "WALK SUMMARY" shows the amalgamated text
- Added `whiteSpace: "pre-line"` to `walk_summary` display so multi-line amalgamated format renders properly

### **Modified APIs**

- `/api/dog-walking/customer-bookings/route.ts` — Added `booking_type` and `note_count` (correlated subquery) to the SELECT and response mapping
- `/api/dog-walking/admin/bookings/editable/route.ts` — Added `booking_type` to the SELECT so the admin UI can conditionally show the "Add Sitting Note" action

### **Files Created**
```
app/api/dog-walking/admin/booking-notes/route.ts    → Admin CRUD for ad-hoc notes
app/api/dog-walking/booking-notes/route.ts          → Customer read-only notes endpoint
```

### **Files Modified**
```
app/api/dog-walking/customer-bookings/route.ts       → Added booking_type + note_count
app/api/dog-walking/admin/bookings/editable/route.ts → Added booking_type
app/api/dog-walking/admin/mark-completed/route.ts    → Auto-amalgamation logic
app/dog-walking/admin/manage-bookings/page.tsx       → Add Sitting Note modal + mark-completed enhancement
app/components/DashboardMain.tsx                     → Sitting Updates display for customers
```

### **V15 Summary**

**For AI Agents**: V15 adds ad-hoc sitting notes for multi-day bookings. Key patterns: (1) The `booking_notes` table stores individual dated notes linked to a booking via `booking_id`. Notes are only created for `multi_day` confirmed bookings. (2) The `customer-bookings` API now returns `note_count` and `booking_type` for each booking — use these fields when deciding what to display. (3) On mark-completed, notes are auto-amalgamated into `walk_summary` unless the admin provides explicit text. The amalgamation format is "Day N (date): text" separated by double newlines. (4) The customer-facing notes API at `/api/dog-walking/booking-notes` validates ownership via a JOIN — it does NOT require admin auth but does require `owner_id` matching. (5) In the customer dashboard, sitting notes use a blue color scheme (`#1e3a5f` / `#3b82f6`) to distinguish from the green walk summary (`#065f46` / `#059669`). Follow this pattern for any future in-progress vs completed status distinction.

## 🎫 V16: Digital Loyalty Card

### **Feature Overview**

**Purpose**: A digital loyalty card system where customers earn paw print stamps for every completed Solo Walk or Quick Walk. After 15 walks, the card is full and can be redeemed for a free walk. Multiple cards can stack — customers are not forced to redeem immediately.

**Eligible Services**: Solo Walk (`solo`) and Quick Walk (`quick`) only. Meet & Greet (free) and Dog Sitting are excluded.

**Counting**: 1 stamp per completed booking, regardless of how many dogs are on the walk.

**Redemption**: Customers choose which upcoming confirmed Solo/Quick Walk booking to apply the free walk to. The booking price is set to £0.

### **Reward Value & Tier Snapping**

The reward value is determined by the average price of the 15 walks on the card, snapped to the **closest service price tier**:

| Tier | Service |
|------|---------|
| £10.00 | Quick Walk (30 min) |
| £17.50 | Solo Walk 1hr / 1 dog |
| £25.00 | Solo Walk 2hr / 1 dog |
| £32.50 | Solo Walk 2hr / 2 dogs |

The `getRewardTier()` function in `lib/pricing.ts` snaps any average to the nearest tier. Customers can only redeem against bookings priced at or below their reward tier.

**Examples**:
- Card avg £12.50 → snaps to £10.00 → can redeem Quick Walks only
- Card avg £14.00 → snaps to £17.50 → can redeem Quick Walks or 1hr Solo Walks
- Card avg £23.00 → snaps to £25.00 → can redeem up to 2hr Solo Walk (1 dog)

### **Database Schema**

```sql
CREATE TABLE hunters_hounds.loyalty_redemptions (
    id SERIAL PRIMARY KEY,
    owner_id INTEGER NOT NULL REFERENCES hunters_hounds.owners(id),
    card_index INTEGER NOT NULL,
    max_value DECIMAL(8,2) NOT NULL,
    booking_id INTEGER NOT NULL REFERENCES hunters_hounds.bookings(id),
    original_price DECIMAL(8,2) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_loyalty_redemptions_owner ON hunters_hounds.loyalty_redemptions(owner_id);
```

- `card_index`: Which card was redeemed (1st card, 2nd card, etc.)
- `max_value`: The reward tier value at time of redemption
- `original_price`: The booking's original price before being set to £0
- No separate "stamps" table — stamps are computed dynamically from qualifying walks using SQL window functions

### **How Cards Are Computed (No Stamps Table)**

Cards are computed on-the-fly using SQL `ROW_NUMBER()` window functions:

```sql
WITH qualifying_walks AS (
    SELECT b.id, b.price_pounds,
        ROW_NUMBER() OVER (ORDER BY b.start_time, b.id) as walk_num
    FROM hunters_hounds.bookings b
    LEFT JOIN hunters_hounds.loyalty_redemptions lr ON lr.booking_id = b.id
    WHERE b.owner_id = $1
      AND b.service_type IN ('solo', 'quick')
      AND b.status IN ('completed', 'completed & paid')
      AND lr.id IS NULL
),
cards AS (
    SELECT
        CEIL(walk_num::numeric / 15)::int as card_index,
        COUNT(*)::int as stamps,
        ROUND(AVG(price_pounds)::numeric, 2) as avg_price
    FROM qualifying_walks
    GROUP BY CEIL(walk_num::numeric / 15)::int
)
SELECT * FROM cards ORDER BY card_index
```

- Qualifying walks exclude bookings that were themselves redeemed (free walks via `LEFT JOIN loyalty_redemptions`)
- Walks are ordered chronologically (`start_time, id`) and grouped into cards of 15
- Each card gets its own `avg_price` for tier calculation

### **API Routes**

**File**: `app/api/dog-walking/loyalty/route.ts` (no admin auth required — uses `owner_id` param)

**GET** `?owner_id=X` — Returns loyalty status:
```json
{
  "loyalty": {
    "total_qualifying_walks": 20,
    "current_card": { "stamps": 5, "card_index": 2, "avg_price": 17.50 },
    "full_cards": [
      { "card_index": 1, "avg_price": 23.00, "redeemed": false }
    ],
    "total_redeemed": 0,
    "available_to_redeem": 1,
    "redemption_history": []
  }
}
```

**POST** `{ owner_id, booking_id }` — Redeems the oldest unredeemed full card:
1. Recalculates qualifying walks and cards (same CTE as GET)
2. Finds the oldest unredeemed full card
3. Validates the target booking: must be owned by customer, status `confirmed`, service type `solo` or `quick`
4. Checks booking price <= `getRewardTier(avgPrice)` of the card
5. Sets booking `price_pounds = 0` and creates a `loyalty_redemptions` record
6. All within a database transaction (`BEGIN`/`COMMIT`/`ROLLBACK`)

### **Customer Dashboard — Loyalty Card Tab**

**File**: `app/components/DashboardMain.tsx`

- New "Loyalty Card" tab added alongside "My Bookings" and "Account" tabs
- Tab renders `<LoyaltyCard ownerId={customer.owner_id} bookings={bookings} />`

**File**: `app/components/LoyaltyCard.tsx`

**Visual Design**:
- Paw print grid: 5 columns x 3 rows = 15 stamps per card
- Filled stamps: green circles (`#10b981`) with white paw SVG, animated entrance
- Empty stamps: dark circles with dashed grey border
- Full redeemable cards: amber border (`#f59e0b`) with pulsing glow animation
- Redeemed cards: opacity 0.4, grey border (`#374151`), grey paw prints (`#4b5563`), "Redeemed" badge

**Multi-Card Display**:
- All full cards rendered stacked vertically (unredeemed first, then redeemed)
- Current in-progress card shown below
- Each card labeled "Card #N" with reward value shown for full cards
- Empty state shows an empty card with "Complete your first walk to start earning stamps!"

**Booking Picker**:
- Clicking "Redeem Free Walk" on a redeemable card shows inline booking picker
- Lists all upcoming confirmed Solo/Quick Walk bookings
- Eligible bookings (price <= reward tier): green "Apply" button, shows "£X.XX → FREE"
- Ineligible bookings (price > reward tier): shown at reduced opacity with explanation
- Cancel button to close picker

**Redemption History**:
- Collapsible section at bottom showing past redemptions
- Each entry shows card number, amount saved, and date

### **Admin Panel — Loyalty Column**

**File**: `app/api/dog-walking/admin/clients/route.ts`

- Batch-fetches loyalty data for all clients on current page using `ANY($1)` array query
- Returns `loyalty: { qualifying_walks, stamps_on_card, available_to_redeem }` per client

**File**: `app/dog-walking/admin/manage-clients/page.tsx`

- "Loyalty" column in client table showing `X/15` progress
- Color coding: green for normal progress, amber when >= 12 stamps or redeemable
- "REDEEMABLE" badge (amber) shown when `available_to_redeem > 0`
- Tooltip shows total qualifying walks on hover

### **Shared Pricing Utility**

**File**: `lib/pricing.ts`

```typescript
const REWARD_TIERS = [10, 17.50, 25, 32.50];

export const getRewardTier = (avgPrice: number): number => {
  let closest = REWARD_TIERS[0];
  let minDist = Math.abs(avgPrice - closest);
  for (const tier of REWARD_TIERS) {
    const dist = Math.abs(avgPrice - tier);
    if (dist < minDist) {
      minDist = dist;
      closest = tier;
    }
  }
  return closest;
};
```

Used by both the loyalty API (server-side eligibility check) and the LoyaltyCard component (client-side display and booking filtering).

### **Files Created**
```
app/api/dog-walking/loyalty/route.ts       → Loyalty API (GET status, POST redeem)
app/components/LoyaltyCard.tsx             → Customer-facing loyalty card component
```

### **Files Modified**
```
lib/pricing.ts                                      → Added getRewardTier() and REWARD_TIERS
app/components/DashboardMain.tsx                     → Added Loyalty Card tab
app/api/dog-walking/admin/clients/route.ts           → Added batch loyalty data to client list
app/dog-walking/admin/manage-clients/page.tsx        → Added Loyalty column with progress display
```

### **V16 Summary**

**For AI Agents**: V16 adds a digital loyalty card system. Key patterns: (1) There is no stamps table — loyalty cards are computed dynamically from qualifying walks using SQL `ROW_NUMBER()` grouped into cards of 15. The only persisted data is the `loyalty_redemptions` table which records when a card is redeemed. (2) Reward values are snapped to the nearest service price tier (£10, £17.50, £25, £32.50) using `getRewardTier()` in `lib/pricing.ts` — this is shared between server and client. (3) Multiple cards can stack; customers are not forced to redeem. The oldest unredeemed card is always redeemed first. (4) Redemption targets must be confirmed Solo/Quick Walk bookings priced at or below the reward tier. The booking price is set to £0 and a redemption record is created in a single transaction. (5) Free walks (redeemed bookings) are excluded from qualifying walk counts via a LEFT JOIN on `loyalty_redemptions`. (6) The admin clients list includes batch loyalty data using `ANY($1)` array queries for efficient per-page loading.

## 🚶 V17: Walk Limit During Multi-Day Sitting

### **Feature Overview**

**Problem**: During multi-day (overnight) dog sitting bookings, the walker has limited capacity to go out and walk other dogs. Previously the system allowed unlimited walks on sitting days, which could lead to overbooking.

**Solution**: A configurable walk limit (default 4 per day) that activates whenever a confirmed multi-day sitting booking spans a given date. The limit applies to both Solo Walk (`solo`) and Quick Walk (`quick`) bookings. Admin can bypass the limit via manual booking creation, and can toggle per-day overrides through the admin UI.

### **Configuration**

**Environment Variable**: `MAX_WALKS_DURING_SITTING=4` in `config/services/hunters-hounds.env`

The default limit of 4 walks per day can be changed without code changes by updating this env var and restarting the container.

### **Database Schema**

```sql
CREATE TABLE hunters_hounds.walk_limit_overrides (
    id SERIAL PRIMARY KEY,
    override_date DATE NOT NULL UNIQUE,
    max_walks INTEGER,  -- NULL = unlimited (no limit on that day)
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_walk_limit_overrides_date ON hunters_hounds.walk_limit_overrides (override_date);
```

- `override_date`: The specific date being overridden (UNIQUE — one override per date)
- `max_walks`: `NULL` means unlimited (completely remove the limit). An integer value sets a custom limit for that day.
- No foreign key to bookings — overrides are per-date, not per-sitting

### **Shared Helper — `lib/walkLimit.ts`**

Central function `getWalkLimitForDate(pool, dateStr, excludeBookingId?)` used by all API routes:

1. Queries `hunters_hounds.bookings` for any confirmed multi-day sitting spanning the date (`booking_type = 'multi_day'`, `status = 'confirmed'`, `start_time::date <= date AND end_time::date >= date`)
2. If no sitting found → `{ limitReached: false }` (no limit applies)
3. Checks `walk_limit_overrides` for the date:
   - Override with `max_walks = NULL` → unlimited, no limit
   - Override with `max_walks = N` → use N as the limit
   - No override → use `MAX_WALKS_DURING_SITTING` env var (default 4)
4. Counts confirmed `solo`/`quick` bookings on that date
5. Returns `{ hasActiveSitting, walkLimit, currentWalkCount, limitReached }`

The optional `excludeBookingId` parameter supports rescheduling — the booking being rescheduled is excluded from the count.

### **Enforcement Points**

The walk limit is enforced at 5 points in the system:

| Route | Behaviour |
|-------|-----------|
| `/api/dog-walking/availability` | Returns empty `availableRanges` when limit reached (skips Calendar API call for performance) |
| `/api/dog-walking/book` | Server-side validation — returns `409` if limit reached (safety net against race conditions) |
| `/api/dog-walking/reschedule-booking` | Blocks rescheduling to a full date — returns `409`. Excludes the booking being rescheduled from the count. |
| `/api/dog-walking/recurring/check-availability` | Marks dates as `blocked` with reason "Walk limit reached (active sitting)" |
| `/api/dog-walking/recurring/book` | Skips dates where limit is reached (does not fail entire batch). Reports skipped dates in response. |

### **Admin Override — Automatic Bypass**

`/api/dog-walking/admin/create-booking` has no conflict checking and does NOT call `getWalkLimitForDate`. Admin can always create bookings manually regardless of the walk limit.

### **Admin Override — Per-Day Toggle**

**API Route**: `app/api/dog-walking/admin/walk-limit-override/route.ts`

| Method | Description |
|--------|-------------|
| **GET** `?start_date=X&end_date=Y` | Fetch overrides for date range + default limit |
| **POST** `{ override_date, max_walks }` | Create/update override (upsert). `max_walks: null` = unlimited. |
| **DELETE** `{ override_date }` | Remove override (reverts to default limit) |

**Admin UI**: `app/dog-walking/admin/manage-bookings/page.tsx`

- New "Walk Limit Overrides" option in the actions dropdown (only for `booking_type === 'multi_day'` and `status === 'confirmed'` bookings)
- Opens a modal showing every day within the sitting period as a row:
  - Date label (e.g., "Mon 17 Feb")
  - Current status: "Max 4" or "Unlimited"
  - Toggle button: green "Remove Limit" or red "Restore Limit"
- Each toggle makes an immediate API call (same UX pattern as sitting note edit/delete)
- Green highlighted background for overridden days

### **Files Created**
```
lib/walkLimit.ts                                              → Shared helper: getWalkLimitForDate()
app/api/dog-walking/admin/walk-limit-override/route.ts        → Admin CRUD API for per-day overrides
```

### **Files Modified**
```
config/services/hunters-hounds.env                            → Added MAX_WALKS_DURING_SITTING=4
app/api/dog-walking/availability/route.ts                     → Early return when walk limit reached
app/api/dog-walking/book/route.ts                             → Server-side 409 rejection
app/api/dog-walking/reschedule-booking/route.ts               → Walk limit check for target date
app/api/dog-walking/recurring/check-availability/route.ts     → Per-date blocked status
app/api/dog-walking/recurring/book/route.ts                   → Skip limited dates in batch
app/dog-walking/admin/manage-bookings/page.tsx                → Walk Limit Overrides modal + action
```

### **V17 Summary**

**For AI Agents**: V17 adds a walk limit during multi-day sitting bookings. Key patterns: (1) The shared helper `getWalkLimitForDate()` in `lib/walkLimit.ts` is the single source of truth — it checks for active multi-day sittings, per-day overrides, and counts confirmed walks. All 5 enforcement routes call this same function. (2) The limit only applies when a confirmed multi-day sitting (`booking_type = 'multi_day'`, `status = 'confirmed'`) spans the date — if no sitting exists, there is no limit. (3) The default limit is configurable via `MAX_WALKS_DURING_SITTING` env var (default 4). (4) Per-day overrides are stored in `walk_limit_overrides` with `max_walks = NULL` meaning unlimited. (5) Admin create-booking (`/admin/create-booking`) completely bypasses the limit — it has no conflict checking at all. (6) The admin UI provides a per-day toggle modal accessible from the actions dropdown on multi-day bookings in the manage-bookings page. (7) If the sitting is cancelled (`status` changes from `confirmed`), the limit automatically stops applying since the query filters by `status = 'confirmed'`.

---

## 💰 V18: Revolut Payment Automation

### **Feature Overview**

**Problem**: Revolut Personal has no official webhook API. Every incoming payment had to be manually identified and bookings manually marked as paid in the admin console.

**Solution**: Email parsing via IMAP. When a client pays via Revolut or bank transfer, Revolut sends an email notification to a dedicated Gmail inbox. A cron job polls that inbox every 5 minutes, parses each email for sender name and amount, matches the sender to a client in the database using their `payment_preference` to determine the expected booking window, and:
- **Exact match** → automatically marks the relevant bookings as `completed & paid` and sends a Telegram success notification
- **Amount mismatch** → sends a Telegram warning with the full breakdown for manual review — bookings are NOT touched
- **Unknown sender** → sends a Telegram alert for manual action
- **Unrecognised email format** → sends a Telegram debug alert with the raw subject line

### **End-to-End Flow**

```
Client sends payment via Revolut / bank transfer
      ↓
Revolut sends email notification to dedicated Gmail inbox
      ↓
Cron job (every 5 min) calls POST /api/dog-walking/admin/payment-check
      ↓
IMAP: fetch all unread emails from Revolut sender
      ↓
Parse each email: extract amount + sender name
      ↓
Match sender name → owner in DB (two-tier lookup)
      ↓
Apply payment_preference window to find outstanding bookings
      ↓
Compare amounts → exact match or mismatch
      ↓
Mark bookings paid OR send mismatch warning to Telegram
      ↓
Mark email as read (idempotency — never processed twice)
```

### **Database Change**

```sql
ALTER TABLE hunters_hounds.owners
ADD COLUMN IF NOT EXISTS payment_account_name VARCHAR(255);
```

- Stores the **exact name that appears on the client's Revolut/bank transfer** (e.g. `"J. Smith"`), which may differ from `owner_name`
- Set automatically after the first payment is successfully matched via fallback name lookup
- Once set, used as the **primary matching key** for all future payments — no fuzzy logic needed
- Can be manually set or corrected in the admin console via the ClientEditor

### **Two-Tier Payment Matching**

| Tier | Method | Notes |
|------|--------|-------|
| **Primary** | `payment_account_name ILIKE senderName` | Exact stored account name — used once set |
| **Fallback** | `owner_name ILIKE senderName` then first-name prefix | Used when `payment_account_name` not yet set |

When matched via fallback AND the amounts match exactly (within £0.01), the `senderName` is automatically saved to `payment_account_name` for that owner, and the Telegram message includes a note confirming this.

### **Payment Preference — Booking Window**

| `payment_preference` | Bookings included in expected total |
|---------------------|-------------------------------------|
| `per_service` | Most recent single `completed` booking with `price_pounds > 0` |
| `weekly` | All `completed` bookings in the past 7 days with `price_pounds > 0` |
| `fortnightly` | All `completed` bookings in the past 14 days with `price_pounds > 0` |
| `monthly` | All `completed` bookings in the current calendar month with `price_pounds > 0` |

### **Amount Matching Rules**

- **Exact match** (within £0.01 tolerance): auto-mark bookings as `completed & paid`, send success Telegram
- **Any mismatch** (over or under): do NOT touch booking statuses, send warning Telegram with full breakdown — admin decides manually in admin console
- **No outstanding bookings found for matched owner**: send warning Telegram, do nothing

### **Telegram Notification Examples**

**Exact match (known account name):**
```
💰 PAYMENT RECEIVED ✅

From: J. Smith
Amount: £75.00

Matched to: John Smith (#12) — monthly payer
Bookings marked as paid:
  #45 Solo Walk 03 Feb £17.50
  #46 Solo Walk 05 Feb £17.50
  #47 Solo Walk 07 Feb £17.50
  #48 Solo Walk 10 Feb £22.50

Expected: £75.00 — Received: £75.00 ✅
```

**Exact match, first time (auto-saves account name):**
```
💰 PAYMENT RECEIVED ✅
...
📌 Account name 'J. Smith' saved to John Smith's profile.
Future payments will match automatically.
```

**Amount mismatch (nothing auto-marked):**
```
⚠️ PAYMENT MISMATCH — action required

From: John Smith
Amount received: £60.00

Matched to: John Smith (#12) — monthly payer
Outstanding bookings this period:
  #45 Solo Walk 03 Feb £17.50
  ...

Expected: £75.00 — Received: £60.00
Bookings NOT marked paid. Please review in admin console.
```

**No client found:**
```
⚠️ UNMATCHED PAYMENT

From: J. Davies
Amount: £35.00

No client found. Please mark manually in admin console.
```

### **Security — API Authentication**

The `/api/dog-walking/admin/payment-check` endpoint uses Bearer token authentication (not the admin cookie), since it is called by a cron job rather than a browser:

```typescript
const authHeader = request.headers.get('Authorization');
const secret = process.env.PAYMENT_CHECK_SECRET;
if (!secret || authHeader !== `Bearer ${secret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
}
```

The secret is stored on the host at `~/.payment-check-secret` and read by the cron wrapper script.

### **Cron Job**

```bash
# /home/hunter-dev/check-payments.sh — runs every 5 minutes
*/5 * * * * /home/hunter-dev/check-payments.sh
```

The wrapper script reads `PAYMENT_CHECK_SECRET` from `~/.payment-check-secret` (chmod 600) and makes the POST request. Output is logged to `/home/hunter-dev/payment-check.log`.

### **Environment Variables Required**

```
GMAIL_USER=hunters.hounds.payments@gmail.com
GMAIL_APP_PASSWORD=xxxx-xxxx-xxxx-xxxx
PAYMENT_CHECK_SECRET=a-long-random-secret-string
```

### **One-Time Setup (Before Going Live)**

1. Create dedicated Gmail account for Revolut notifications
2. Enable IMAP: Gmail Settings → Forwarding and POP/IMAP → Enable IMAP
3. Generate App Password (requires 2FA): Google Account → Security → App Passwords
4. Configure Revolut: Profile → Notifications → enable "Receiving money" email → use Gmail address
5. Add env vars to Next.js container configuration
6. Save secret for cron: `echo "your-secret" > ~/.payment-check-secret && chmod 600 ~/.payment-check-secret`

### **Admin UI — ClientEditor Enhancement**

A **Payment Account Name** text field was added to the ClientEditor (below the payment preference radio buttons), allowing the admin to:
- Manually set or correct the stored account name for any client at any time
- View what name is currently stored (auto-populated after first matched payment)
- Clear or update the name if a client changes their bank account details

### **Files Created**

```
lib/emailPoller.ts                                        → IMAP client: connect Gmail, fetch unread Revolut emails, mark as read
lib/paymentParser.ts                                      → Regex parser: extract { amountPounds, senderName } from subject/body
lib/paymentMatcher.ts                                     → DB matcher: two-tier lookup + payment_preference booking window + auto-save account name
app/api/dog-walking/admin/payment-check/route.ts          → Orchestration endpoint: wires together poller → parser → matcher → DB update → Telegram
/home/hunter-dev/check-payments.sh                        → Cron wrapper script (reads secret from ~/.payment-check-secret)
```

### **Files Modified**

```
app/dog-walking/admin/manage-clients/components/ClientEditor.tsx  → Added payment_account_name text field
app/api/dog-walking/admin/clients/[clientId]/route.ts             → Added payment_account_name to GET/PUT handler
```

### **Database Migration Applied**

```sql
ALTER TABLE hunters_hounds.owners
ADD COLUMN IF NOT EXISTS payment_account_name VARCHAR(255);
```

### **Package Added**

```
imapflow@1.2.12  — promise-based IMAP client for Node.js
```

### **V18 Summary**

**For AI Agents**: V18 adds fully automated Revolut payment processing via Gmail IMAP polling. Key patterns: (1) The payment-check endpoint at `/api/dog-walking/admin/payment-check` uses Bearer token auth (not the admin cookie) — it is called by cron, not a browser. The secret is in `process.env.PAYMENT_CHECK_SECRET`. (2) Email processing is idempotent — emails are marked as read (SEEN flag) immediately after fetching, so a second cron run will never re-process the same email. (3) The `payment_account_name` column on `hunters_hounds.owners` is the primary matching key. It is set automatically after the first successful fallback match where the amounts align, or can be set manually via the ClientEditor. If `payment_account_name` is empty, the system falls back to `owner_name` matching (exact, then first-name prefix). (4) Amount mismatch logic is conservative by design — if the received amount does not match expected total within £0.01, no bookings are auto-marked and a manual-review Telegram warning is sent. (5) The `payment_preference` field on the owner record determines which `completed` bookings are included in the expected total: `per_service` = most recent 1 booking, `weekly` = last 7 days, `fortnightly` = last 14 days, `monthly` = current calendar month. Only bookings with `status = 'completed'` and `price_pounds > 0` are included. (6) Three lib files handle distinct concerns: `emailPoller.ts` handles IMAP connection and email retrieval, `paymentParser.ts` handles regex extraction from email subjects/bodies, `paymentMatcher.ts` handles database lookup and booking aggregation. The route file orchestrates these three and handles all Telegram notifications and DB updates. (7) The cron wrapper script at `/home/hunter-dev/check-payments.sh` reads the secret from `~/.payment-check-secret` (chmod 600) to avoid exposing it in the crontab itself.
