# AGENTS-hunters-hounds-V10.md - AI Agent Documentation for Hunter's Hounds Professional Website

## 🐶 Business Overview for AI Agents

**Service Name**: Hunter's Hounds Professional Dog Walking Service
**Architecture**: Independent Next.js Website + PostgreSQL + External Service Integrations
**Purpose**: Complete professional dog walking business website with booking, customer management, and marketing platform
**Domain**: **hunters-hounds.london** & **hunters-hounds.com** (independent professional website)
**Status**: **V10 - 15-Minute Time Slots + Persistent Customer Sessions** 🎉

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
📸 hunters-hounds.london/gallery          → Dog walking photos/videos (planned)
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
🔗 /api/dog-walking/admin/reviews               → GET: Admin review list, PUT: Add response, DELETE: Remove response

# Admin Authentication Routes
🔗 /api/dog-walking/admin/auth          → POST: Admin login (sets session cookie)
🔗 /api/dog-walking/admin/auth/check    → GET: Check authentication status
🔗 /api/dog-walking/admin/auth/logout   → POST: Logout (clears session cookie)

# NEW V10: Customer Session Routes
🔗 /api/dog-walking/customer-session    → GET: Check session, POST: Set session, DELETE: Clear session
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
  - **Dog Sitting**: Monday-Friday, 00:00-23:59 (24-hour availability)
- **Maximum Dogs**: 2 dogs per walk/sitting
- **Service Areas**: Highbury Fields & Clissold Park areas (EXPANDED with secondary addresses)
- **Time Buffers**: 15-minute buffer between appointments
- **Multi-Day Support**: Dog sitting supports single-day and multi-day bookings

**Availability Logic - Service Type Awareness:**
The walk availability API (`/api/dog-walking/availability`) uses smart conflict detection based on booking type:

| Existing Booking | Can Book Walk? | Reason |
|------------------|----------------|--------|
| Multi-day dog sitting (e.g., 4 days) | **YES** | Dog stays at home, walker can go out to walk other dogs |
| Single-day timed sitting (e.g., 4 hours) | **NO** | Actively watching the dog during those hours |
| Other walks | **NO** | Buffer time applied between walk appointments |
| Weekend | **NO** | Walks only available Monday-Friday |

**Implementation:** Calendar events with "Multi-Day Dog Sitting" in the description are excluded from busy time calculations, allowing walk bookings on those days. Single-day sitting events (containing "Single-Day Dog Sitting") still block walk availability during those hours.

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
**Purpose**: Allow customers to leave reviews after bookings are marked as paid, with admin response capability
**Trigger**: Automated review request email sent when booking is marked "completed & paid"
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
🔗 /api/dog-walking/admin/reviews       → GET: List all submitted reviews (with filters)
                                        → PUT: Add/update admin response
                                        → DELETE: Remove admin response
```

### **Review Workflow**

```
Complete Review Flow:
1. Admin marks booking as "completed & paid" via admin dashboard
2. System creates review record with unique UUID token in database
3. Payment received email sent to customer with embedded review link
4. Customer clicks link → Review form loads with dog image + service details
5. Customer selects 1-5 star rating and writes review text
6. Customer submits → Review marked as submitted with timestamp
7. Review appears immediately on public /reviews page
8. Admin sees review in manage-reviews page (appears in "Pending Response")
9. Admin adds optional response → Response displays on public review
10. Customer and public can see complete review with business response
```

### **Email Integration**

**Automatic Review Request (Triggered by Mark Paid):**
```typescript
// In /api/dog-walking/admin/mark-paid/route.ts
// Creates review record and sends payment received email with review link

const reviewUrl = `https://hunters-hounds.london/review/${reviewToken}`;
const { subject, html } = generatePaymentReceivedEmail({
    ownerName: booking.owner_name.split(' ')[0],
    dogNames,
    dogImageUrls,
    serviceType: booking.service_type,
    serviceDate,
    reviewUrl
});
```

**Email Content:**
- Thanks customer for payment
- Shows dog image(s) and service details
- Includes prominent "Leave a Review" button/link
- Uses Hunter's Hounds branding

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
/app/dog-walking/admin/manage-reviews/page.tsx → Admin review management

# API Routes
/app/api/dog-walking/reviews/submit/route.ts    → Submit review endpoint
/app/api/dog-walking/reviews/public/route.ts    → Public reviews endpoint
/app/api/dog-walking/admin/reviews/route.ts     → Admin review management

# Components
/app/components/StarRating.tsx          → Interactive/readonly star rating
/app/components/ReviewCard.tsx          → Review display card

# Database Scripts
/sql/create_reviews_table.sql           → Initial table creation
/sql/add_admin_response_to_reviews.sql  → Admin response columns migration
```

### **Review System Summary**

**For AI Agents**: Hunter's Hounds includes a complete customer review system. When bookings are marked as "completed & paid" via the admin panel, the system automatically creates a review record with a unique UUID token and sends a payment confirmation email containing a review link. Customers can click the link to access a secure review form (no login required) where they see their dog's image, service details, and can submit a 1-5 star rating with written feedback. Submitted reviews immediately appear on the public `/reviews` page showing the average rating, individual reviews with dog images, and admin responses. The admin panel at `/dog-walking/admin/manage-reviews` allows filtering reviews by response status and adding/editing professional responses that display publicly. Database table `hunters_hounds.reviews` stores review data with token-based security, and all admin endpoints are protected by authentication.