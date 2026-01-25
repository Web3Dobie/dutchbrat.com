// lib/emailTemplates.ts
/**
 * Email templates for Hunter's Hounds
 */

import { getServiceDisplayName } from './serviceTypes';

export interface WelcomeEmailData {
    ownerName: string;
    dogName: string;
    dogBreed: string;
    dogAge: number;
}

export interface NoShowEmailData {
    ownerName: string;
    serviceType: string;
    appointmentDate: string;
    appointmentTime: string;
    dogNames: string;
}

export interface ChristmasEmailData {
    ownerName: string;
    dogNames: string;
}

/**
 * Formats duration intelligently for display in emails
 * - Multi-day: "2 days", "3 days"
 * - Hours (>= 60 min): "1 hour", "2 hours"
 * - Minutes (< 60 min): "30 minutes"
 */
export function formatDurationForEmail(minutes: number | null, startTime?: Date, endTime?: Date): string {
    // For multi-day bookings, calculate days from dates
    if (startTime && endTime) {
        const startDay = new Date(startTime.getFullYear(), startTime.getMonth(), startTime.getDate());
        const endDay = new Date(endTime.getFullYear(), endTime.getMonth(), endTime.getDate());
        if (startDay.getTime() !== endDay.getTime()) {
            const diffMs = endTime.getTime() - startTime.getTime();
            const days = Math.round(diffMs / (1000 * 60 * 60 * 24));
            return days === 1 ? "1 day" : `${days} days`;
        }
    }

    // If minutes is null, calculate from start/end times
    let durationMins = minutes;
    if (durationMins === null && startTime && endTime) {
        durationMins = Math.round((endTime.getTime() - startTime.getTime()) / (1000 * 60));
    }

    // Fallback if still no duration
    if (durationMins === null) {
        return "Variable";
    }

    // For bookings >= 60 minutes, show hours
    if (durationMins >= 60) {
        const hours = durationMins / 60;
        return hours === 1 ? "1 hour" : `${hours} hours`;
    }

    // For short bookings (< 60 min), show minutes
    return `${durationMins} minutes`;
}

export function generateWelcomeEmail(data: WelcomeEmailData): string {
    const { ownerName, dogName, dogBreed, dogAge } = data;

    return `
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Welcome to Hunter's Hounds</title>
    </head>
    <body style="margin: 0; padding: 0; background-color: #f8fafc; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;">
        <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">
            
            <!-- Header with Hunter's Hounds branding -->
            <div style="background: linear-gradient(135deg, #3b82f6 0%, #1e40af 100%); padding: 40px 30px; text-align: center;">
                <h1 style="color: #ffffff; margin: 0; font-size: 28px; font-weight: bold;">Hunter's Hounds</h1>
                <p style="color: #e0e7ff; margin: 10px 0 0 0; font-size: 16px;">Professional Dog Walking & Pet Care</p>
            </div>

            <!-- Welcome content -->
            <div style="padding: 40px 30px;">
                
                <!-- Personal welcome -->
                <h2 style="color: #1f2937; margin: 0 0 20px 0; font-size: 24px;">Welcome to the pack, ${ownerName}! 🐕</h2>
                
                <p style="color: #4b5563; line-height: 1.6; font-size: 16px; margin: 0 0 20px 0;">
                    We're absolutely delighted to welcome you and <strong>${dogName}</strong> to the Hunter's Hounds family! 
                    I'm Ernesto, and I can't wait to meet your beautiful ${dogAge}-year-old ${dogBreed}.
                </p>

                <p style="color: #4b5563; line-height: 1.6; font-size: 16px; margin: 0 0 25px 0;">
                    Hunter's Hounds was named after my beloved Dobermann who was my best friend for 7 years. 
                    I bring the same love, care, and dedication I gave Hunter to every dog I work with.
                </p>

                <!-- Services overview -->
                <div style="background-color: #f3f4f6; border-radius: 8px; padding: 25px; margin: 25px 0;">
                    <h3 style="color: #1f2937; margin: 0 0 15px 0; font-size: 18px;">Our Services</h3>
                    <ul style="color: #4b5563; line-height: 1.6; margin: 0; padding-left: 20px;">
                        <li><strong>Meet & Greet</strong> - Perfect for new clients to get acquainted</li>
                        <li><strong>Solo Walks (60 min)</strong> - One-on-one attention for your dog</li>
                        <li><strong>Quick Walks (30 min)</strong> - Perfect for busy schedules</li>
                        <li><strong>Dog Sitting</strong> - Flexible care when you're away</li>
                    </ul>
                </div>

                <!-- What's next -->
                <h3 style="color: #1f2937; margin: 30px 0 15px 0; font-size: 18px;">What's Next?</h3>
                
                <p style="color: #4b5563; line-height: 1.6; font-size: 16px; margin: 0 0 20px 0;">
                    Your details are now in our system, which means you can easily book services online whenever you need them. 
                    If you'd like to schedule a Meet & Greet or any of our services, simply visit our booking page.
                </p>

                <!-- Call to action -->
                <div style="text-align: center; margin: 30px 0;">
                    <a href="https://hunters-hounds.london/book-now" 
                       style="display: inline-block; background-color: #3b82f6; color: #ffffff; padding: 12px 30px; 
                              text-decoration: none; border-radius: 6px; font-weight: bold; font-size: 16px;">
                        Book a Service
                    </a>
                </div>

                <!-- Personal touch -->
                <div style="background: linear-gradient(135deg, #fef3c7 0%, #fde68a 100%); border-radius: 8px; padding: 20px; margin: 25px 0; border-left: 4px solid #f59e0b;">
                    <p style="color: #92400e; margin: 0; font-style: italic; font-size: 15px;">
                        "I treat every dog as if they were my own Hunter. Your furry family member will receive 
                        the love, attention, and care they deserve." - Ernesto
                    </p>
                </div>

                <!-- Contact information -->
                <div style="border-top: 1px solid #e5e7eb; padding-top: 25px; margin-top: 30px;">
                    <h3 style="color: #1f2937; margin: 0 0 15px 0; font-size: 16px;">Get in Touch</h3>
                    <p style="color: #6b7280; line-height: 1.5; margin: 0; font-size: 14px;">
                        <strong>Phone:</strong> <a href="tel:07932749772" style="color: #3b82f6;">07932749772</a><br>
                        <strong>Email:</strong> <a href="mailto:bookings@hunters-hounds.london" style="color: #3b82f6;">bookings@hunters-hounds.london</a><br>
                        <strong>Website:</strong> <a href="https://hunters-hounds.london" style="color: #3b82f6;">hunters-hounds.london</a>
                    </p>
                </div>

            </div>

            <!-- Footer -->
            <div style="background-color: #f9fafb; padding: 20px 30px; text-align: center; border-top: 1px solid #e5e7eb;">
                <p style="color: #6b7280; font-size: 12px; margin: 0;">
                    Hunter's Hounds - Professional Dog Walking Service<br>
                    Serving Highbury Fields & Clissold Park Areas
                </p>
            </div>

        </div>
    </body>
    </html>
    `;
}

export function generateNoShowEmail(data: NoShowEmailData): string {
    const { ownerName, serviceType, appointmentDate, appointmentTime, dogNames } = data;

    return `
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Missed Appointment - Hunter's Hounds</title>
    </head>
    <body style="margin: 0; padding: 0; background-color: #f8fafc; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;">
        <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">
            
            <!-- Header with Hunter's Hounds branding -->
            <div style="background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%); padding: 40px 30px; text-align: center;">
                <h1 style="color: #ffffff; margin: 0; font-size: 28px; font-weight: bold;">Hunter's Hounds</h1>
                <p style="color: #fde68a; margin: 10px 0 0 0; font-size: 16px;">Professional Dog Walking & Pet Care</p>
            </div>

            <!-- Main content -->
            <div style="padding: 40px 30px;">
                
                <!-- Missed appointment notice -->
                <h2 style="color: #1f2937; margin: 0 0 20px 0; font-size: 24px;">We missed you today, ${ownerName} 🐕</h2>
                
                <p style="color: #4b5563; line-height: 1.6; font-size: 16px; margin: 0 0 20px 0;">
                    We missed you and <strong>${dogNames}</strong> today for your scheduled <strong>${getServiceDisplayName(serviceType)}</strong> appointment.
                </p>

                <!-- Appointment details -->
                <div style="background-color: #f3f4f6; border-radius: 8px; padding: 25px; margin: 25px 0;">
                    <h3 style="color: #1f2937; margin: 0 0 15px 0; font-size: 18px;">Appointment Details</h3>
                    <p style="color: #4b5563; line-height: 1.6; margin: 0;">
                        <strong>Service:</strong> ${getServiceDisplayName(serviceType)}<br>
                        <strong>Date:</strong> ${appointmentDate}<br>
                        <strong>Time:</strong> ${appointmentTime}<br>
                        <strong>Dog(s):</strong> ${dogNames}
                    </p>
                </div>

                <!-- No charge message -->
                <div style="background: linear-gradient(135deg, #dcfce7 0%, #bbf7d0 100%); border-radius: 8px; padding: 25px; margin: 25px 0; border-left: 4px solid #16a34a;">
                    <h3 style="color: #166534; margin: 0 0 10px 0; font-size: 18px;">No Charge This Time</h3>
                    <p style="color: #166534; margin: 0; font-size: 16px; line-height: 1.5;">
                        We understand that unexpected situations arise, and <strong>you will not be charged for today's missed appointment</strong>.
                    </p>
                </div>

                <!-- Future cancellation policy -->
                <h3 style="color: #1f2937; margin: 30px 0 15px 0; font-size: 18px;">For Future Bookings</h3>
                
                <p style="color: #4b5563; line-height: 1.6; font-size: 16px; margin: 0 0 20px 0;">
                    Please let us know at least 2 hours in advance if you need to cancel or reschedule by calling <strong>07932749772</strong>. 
                    This helps us manage our schedule and potentially offer the slot to another customer.
                </p>

                <!-- Easy rebooking -->
                <div style="text-align: center; margin: 30px 0;">
                    <a href="https://hunters-hounds.london/book-now" 
                       style="display: inline-block; background-color: #3b82f6; color: #ffffff; padding: 12px 30px; 
                              text-decoration: none; border-radius: 6px; font-weight: bold; font-size: 16px;">
                        Book Another Service
                    </a>
                </div>

                <!-- Personal message -->
                <div style="background: linear-gradient(135deg, #fef3c7 0%, #fde68a 100%); border-radius: 8px; padding: 20px; margin: 25px 0; border-left: 4px solid #f59e0b;">
                    <p style="color: #92400e; margin: 0; font-style: italic; font-size: 15px;">
                        "Life happens, and I completely understand. I look forward to meeting ${dogNames} soon!" - Ernesto
                    </p>
                </div>

                <!-- Contact information -->
                <div style="border-top: 1px solid #e5e7eb; padding-top: 25px; margin-top: 30px;">
                    <h3 style="color: #1f2937; margin: 0 0 15px 0; font-size: 16px;">Get in Touch</h3>
                    <p style="color: #6b7280; line-height: 1.5; margin: 0; font-size: 14px;">
                        <strong>Phone:</strong> <a href="tel:07932749772" style="color: #3b82f6;">07932749772</a><br>
                        <strong>Email:</strong> <a href="mailto:bookings@hunters-hounds.london" style="color: #3b82f6;">bookings@hunters-hounds.london</a><br>
                        <strong>Website:</strong> <a href="https://hunters-hounds.london" style="color: #3b82f6;">hunters-hounds.london</a>
                    </p>
                </div>

            </div>

            

            <!-- Footer -->
            <div style="background-color: #f9fafb; padding: 20px 30px; text-align: center; border-top: 1px solid #e5e7eb;">
                <p style="color: #6b7280; font-size: 12px; margin: 0;">
                    Hunter's Hounds - Professional Dog Walking Service<br>
                    Serving Highbury Fields & Clissold Park Areas
                </p>
            </div>

        </div>
    </body>
    </html>
    `;
}

export interface PaymentReceivedEmailData {
    ownerName: string;
    dogNames: string;
    dogImageUrls: string[];
    serviceType: string;
    serviceDate: string;
    reviewUrl: string;
}

export function generatePaymentReceivedEmail(data: PaymentReceivedEmailData): { subject: string; html: string } {
    const { ownerName, dogNames, dogImageUrls, serviceType, serviceDate, reviewUrl } = data;

    const subject = `Review request: How did ${dogNames} enjoy their time with me`;

    // Build dog image HTML (circular, centered)
    const dogImageHtml = dogImageUrls.length > 0
        ? `
            <div style="text-align: center; margin: 25px 0;">
                ${dogImageUrls.map(url => `
                    <img src="${url}"
                         alt="${dogNames}"
                         style="width: 120px; height: 120px; border-radius: 50%; object-fit: cover; border: 4px solid #3b82f6; margin: 0 8px;"
                    />
                `).join('')}
            </div>
        `
        : '';

    const html = `
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Payment Received - Hunter's Hounds</title>
    </head>
    <body style="margin: 0; padding: 0; background-color: #f8fafc; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;">
        <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">

            <!-- Header with Hunter's Hounds branding -->
            <div style="background: linear-gradient(135deg, #10b981 0%, #059669 100%); padding: 40px 30px; text-align: center;">
                <h1 style="color: #ffffff; margin: 0; font-size: 28px; font-weight: bold;">Hunter's Hounds</h1>
                <p style="color: #d1fae5; margin: 10px 0 0 0; font-size: 16px;">Professional Dog Walking & Pet Care</p>
            </div>

            <!-- Main content -->
            <div style="padding: 40px 30px;">

                <!-- Payment confirmation -->
                <h2 style="color: #1f2937; margin: 0 0 20px 0; font-size: 24px;">Hi ${ownerName}!</h2>

                <p style="color: #4b5563; line-height: 1.6; font-size: 16px; margin: 0 0 20px 0;">
                    Just a quick note to say I've received your payment for <strong>${dogNames}'s</strong>
                    <strong>${getServiceDisplayName(serviceType)}</strong> on <strong>${serviceDate}</strong> - thank you so much!
                </p>

                <!-- Dog Image -->
                ${dogImageHtml}

                <p style="color: #4b5563; line-height: 1.6; font-size: 16px; margin: 0 0 20px 0;">
                    It was an absolute pleasure spending time with ${dogNames}. Every walk is a joy,
                    and I truly appreciate you trusting me with your furry family member.
                </p>

                <!-- Review Request -->
                <p style="color: #4b5563; line-height: 1.6; font-size: 16px; margin: 0 0 25px 0;">
                    If you have a moment, I'd love to hear how we did:
                </p>

                <!-- Call to action -->
                <div style="text-align: center; margin: 30px 0;">
                    <a href="${reviewUrl}"
                       style="display: inline-block; background: linear-gradient(135deg, #facc15 0%, #eab308 100%); color: #1f2937; padding: 16px 40px;
                              text-decoration: none; border-radius: 8px; font-weight: bold; font-size: 18px; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
                        ⭐ Leave a Review ⭐
                    </a>
                </div>

                <p style="color: #6b7280; line-height: 1.6; font-size: 14px; margin: 25px 0 0 0; text-align: center;">
                    Your feedback helps other dog owners find quality care, and it means the world to me!
                </p>

                <!-- Personal signature -->
                <div style="margin-top: 30px; padding-top: 25px; border-top: 1px solid #e5e7eb;">
                    <p style="color: #4b5563; line-height: 1.6; font-size: 16px; margin: 0;">
                        Warm regards,<br>
                        <strong>Ernesto</strong><br>
                        Hunter's Hounds
                    </p>
                </div>

            </div>

            <!-- Footer -->
            <div style="background-color: #f9fafb; padding: 20px 30px; text-align: center; border-top: 1px solid #e5e7eb;">
                <p style="color: #6b7280; font-size: 12px; margin: 0;">
                    Hunter's Hounds - Professional Dog Walking Service<br>
                    Serving Highbury Fields & Clissold Park Areas
                </p>
            </div>

        </div>
    </body>
    </html>
    `;

    return { subject, html };
}

// Payment Invoice Email
export interface PaymentInvoiceEmailData {
    ownerName: string;
    dogNames: string;
    services: {
        date: string;
        serviceType: string;
        price: number;
    }[];
    totalAmount: number;
    paymentPreference: string;
}

export function generatePaymentInvoiceEmail(data: PaymentInvoiceEmailData): { subject: string; html: string } {
    const { ownerName, dogNames, services, totalAmount, paymentPreference } = data;

    const periodLabel = paymentPreference === 'weekly' ? 'Weekly' :
                        paymentPreference === 'fortnightly' ? 'Fortnightly' :
                        paymentPreference === 'monthly' ? 'Monthly' : '';

    const subject = `Hunter's Hounds ${periodLabel} Invoice - £${totalAmount.toFixed(2)}`;

    const servicesHtml = services.map(s => `
        <tr>
            <td style="padding: 12px; border-bottom: 1px solid #e5e7eb;">${s.date}</td>
            <td style="padding: 12px; border-bottom: 1px solid #e5e7eb;">${getServiceDisplayName(s.serviceType)}</td>
            <td style="padding: 12px; border-bottom: 1px solid #e5e7eb; text-align: right; font-weight: bold;">£${s.price.toFixed(2)}</td>
        </tr>
    `).join('');

    const html = `
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Payment Invoice - Hunter's Hounds</title>
    </head>
    <body style="margin: 0; padding: 0; background-color: #f8fafc; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;">
        <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">

            <!-- Header -->
            <div style="background: linear-gradient(135deg, #3b82f6 0%, #1e40af 100%); padding: 40px 30px; text-align: center;">
                <h1 style="color: #ffffff; margin: 0; font-size: 28px; font-weight: bold;">Hunter's Hounds</h1>
                <p style="color: #e0e7ff; margin: 10px 0 0 0; font-size: 16px;">Professional Dog Walking & Pet Care</p>
            </div>

            <!-- Main content -->
            <div style="padding: 40px 30px;">

                <h2 style="color: #1f2937; margin: 0 0 20px 0; font-size: 24px;">Hi ${ownerName}!</h2>

                <p style="color: #4b5563; line-height: 1.6; font-size: 16px; margin: 0 0 20px 0;">
                    Here's your ${periodLabel.toLowerCase()} invoice for <strong>${dogNames}</strong>'s services with Hunter's Hounds.
                </p>

                <!-- Services Table -->
                <table style="width: 100%; border-collapse: collapse; margin: 25px 0; background-color: #f9fafb; border-radius: 8px; overflow: hidden;">
                    <thead>
                        <tr style="background-color: #374151;">
                            <th style="padding: 12px; text-align: left; color: #fff; font-weight: bold;">Date</th>
                            <th style="padding: 12px; text-align: left; color: #fff; font-weight: bold;">Service</th>
                            <th style="padding: 12px; text-align: right; color: #fff; font-weight: bold;">Amount</th>
                        </tr>
                    </thead>
                    <tbody style="color: #4b5563;">
                        ${servicesHtml}
                    </tbody>
                    <tfoot>
                        <tr style="background-color: #1f2937;">
                            <td colspan="2" style="padding: 12px; color: #fff; font-weight: bold;">Total Amount Due</td>
                            <td style="padding: 12px; text-align: right; color: #10b981; font-weight: bold; font-size: 1.2rem;">£${totalAmount.toFixed(2)}</td>
                        </tr>
                    </tfoot>
                </table>

                <!-- Payment Details -->
                <div style="background-color: #f0fdf4; border-left: 4px solid #10b981; padding: 20px; border-radius: 8px; margin: 25px 0;">
                    <h3 style="color: #166534; margin: 0 0 15px 0; font-size: 18px;">Payment Details</h3>
                    <p style="color: #166534; line-height: 1.6; margin: 0; font-size: 16px;">
                        <strong>Account Name:</strong> Ernesto Becker<br>
                        <strong>Sort Code:</strong> 04-00-75<br>
                        <strong>Account Number:</strong> 19945388
                    </p>
                </div>

                <p style="color: #4b5563; line-height: 1.6; font-size: 16px; margin: 20px 0 0 0;">
                    Thank you for choosing Hunter's Hounds! It's been a pleasure caring for ${dogNames}.
                </p>

                <!-- Personal signature -->
                <div style="margin-top: 30px; padding-top: 25px; border-top: 1px solid #e5e7eb;">
                    <p style="color: #4b5563; line-height: 1.6; font-size: 16px; margin: 0;">
                        Warm regards,<br>
                        <strong>Ernesto</strong><br>
                        Hunter's Hounds
                    </p>
                </div>

            </div>

            <!-- Footer -->
            <div style="background-color: #f9fafb; padding: 20px 30px; text-align: center; border-top: 1px solid #e5e7eb;">
                <p style="color: #6b7280; font-size: 12px; margin: 0;">
                    Hunter's Hounds - Professional Dog Walking Service<br>
                    Phone: 07932749772 | Email: bookings@hunters-hounds.london
                </p>
            </div>

        </div>
    </body>
    </html>
    `;

    return { subject, html };
}

// Payment Reminder Email
export interface PaymentReminderEmailData {
    ownerName: string;
    dogNames: string;
    services: {
        date: string;
        serviceType: string;
        price: number;
    }[];
    totalAmount: number;
}

export function generatePaymentReminderEmail(data: PaymentReminderEmailData): { subject: string; html: string } {
    const { ownerName, dogNames, services, totalAmount } = data;

    const subject = `Payment Reminder - Hunter's Hounds - £${totalAmount.toFixed(2)}`;

    const servicesHtml = services.map(s => `
        <tr>
            <td style="padding: 12px; border-bottom: 1px solid #e5e7eb;">${s.date}</td>
            <td style="padding: 12px; border-bottom: 1px solid #e5e7eb;">${getServiceDisplayName(s.serviceType)}</td>
            <td style="padding: 12px; border-bottom: 1px solid #e5e7eb; text-align: right; font-weight: bold;">£${s.price.toFixed(2)}</td>
        </tr>
    `).join('');

    const html = `
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Payment Reminder - Hunter's Hounds</title>
    </head>
    <body style="margin: 0; padding: 0; background-color: #f8fafc; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;">
        <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">

            <!-- Header -->
            <div style="background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%); padding: 40px 30px; text-align: center;">
                <h1 style="color: #ffffff; margin: 0; font-size: 28px; font-weight: bold;">Hunter's Hounds</h1>
                <p style="color: #fde68a; margin: 10px 0 0 0; font-size: 16px;">Professional Dog Walking & Pet Care</p>
            </div>

            <!-- Main content -->
            <div style="padding: 40px 30px;">

                <h2 style="color: #1f2937; margin: 0 0 20px 0; font-size: 24px;">Hi ${ownerName},</h2>

                <p style="color: #4b5563; line-height: 1.6; font-size: 16px; margin: 0 0 20px 0;">
                    I hope ${dogNames} is doing well! I understand life can get busy, and I just wanted to send a gentle reminder about the outstanding payment for the following services:
                </p>

                <!-- Services Table -->
                <table style="width: 100%; border-collapse: collapse; margin: 25px 0; background-color: #f9fafb; border-radius: 8px; overflow: hidden;">
                    <thead>
                        <tr style="background-color: #374151;">
                            <th style="padding: 12px; text-align: left; color: #fff; font-weight: bold;">Date</th>
                            <th style="padding: 12px; text-align: left; color: #fff; font-weight: bold;">Service</th>
                            <th style="padding: 12px; text-align: right; color: #fff; font-weight: bold;">Amount</th>
                        </tr>
                    </thead>
                    <tbody style="color: #4b5563;">
                        ${servicesHtml}
                    </tbody>
                    <tfoot>
                        <tr style="background-color: #7f1d1d;">
                            <td colspan="2" style="padding: 12px; color: #fff; font-weight: bold;">Total Amount Due</td>
                            <td style="padding: 12px; text-align: right; color: #fecaca; font-weight: bold; font-size: 1.2rem;">£${totalAmount.toFixed(2)}</td>
                        </tr>
                    </tfoot>
                </table>

                <!-- Payment Details -->
                <div style="background-color: #fef3c7; border-left: 4px solid #f59e0b; padding: 20px; border-radius: 8px; margin: 25px 0;">
                    <h3 style="color: #92400e; margin: 0 0 15px 0; font-size: 18px;">Payment Details</h3>
                    <p style="color: #92400e; line-height: 1.6; margin: 0; font-size: 16px;">
                        <strong>Account Name:</strong> Ernesto Becker<br>
                        <strong>Sort Code:</strong> 04-00-75<br>
                        <strong>Account Number:</strong> 19945388
                    </p>
                </div>

                <!-- Payment crossing notice -->
                <p style="color: #6b7280; line-height: 1.6; font-size: 14px; margin: 20px 0; font-style: italic;">
                    Please note: If you have already made payment and this email has crossed in the post, please disregard this reminder and accept my apologies for any inconvenience. Your payment may take a day or two to be reflected in our system.
                </p>

                <p style="color: #4b5563; line-height: 1.6; font-size: 16px; margin: 20px 0 0 0;">
                    If you have any questions about this invoice or need to discuss payment arrangements, please don't hesitate to get in touch.
                </p>

                <!-- Personal signature -->
                <div style="margin-top: 30px; padding-top: 25px; border-top: 1px solid #e5e7eb;">
                    <p style="color: #4b5563; line-height: 1.6; font-size: 16px; margin: 0;">
                        Thank you for choosing Hunter's Hounds!<br><br>
                        Warm regards,<br>
                        <strong>Ernesto</strong><br>
                        Hunter's Hounds
                    </p>
                </div>

            </div>

            <!-- Footer -->
            <div style="background-color: #f9fafb; padding: 20px 30px; text-align: center; border-top: 1px solid #e5e7eb;">
                <p style="color: #6b7280; font-size: 12px; margin: 0;">
                    Hunter's Hounds - Professional Dog Walking Service<br>
                    Phone: 07932749772 | Email: bookings@hunters-hounds.london
                </p>
            </div>

        </div>
    </body>
    </html>
    `;

    return { subject, html };
}

// Review Request Email (separate from payment confirmation)
export interface ReviewRequestEmailData {
    ownerName: string;
    dogNames: string;
    dogImageUrls: string[];
    serviceType: string;
    serviceDate: string;
    walkSummary: string | null;
    reviewUrl: string;
}

export function generateReviewRequestEmail(data: ReviewRequestEmailData): { subject: string; html: string } {
    const { ownerName, dogNames, dogImageUrls, serviceType, serviceDate, walkSummary, reviewUrl } = data;

    const subject = `${dogNames} had a great time! Share your experience`;

    // Build dog image HTML (circular, centered)
    const dogImageHtml = dogImageUrls.length > 0
        ? `
            <div style="text-align: center; margin: 25px 0;">
                ${dogImageUrls.map(url => `
                    <img src="${url}"
                         alt="${dogNames}"
                         style="width: 120px; height: 120px; border-radius: 50%; object-fit: cover; border: 4px solid #7c3aed; margin: 0 8px;"
                    />
                `).join('')}
            </div>
        `
        : '';

    // Walk summary section if provided
    const walkSummaryHtml = walkSummary
        ? `
            <div style="background-color: #f0f9ff; border-left: 4px solid #0ea5e9; padding: 20px; border-radius: 8px; margin: 25px 0;">
                <h3 style="color: #0369a1; margin: 0 0 10px 0; font-size: 16px;">Note from Ernesto</h3>
                <p style="color: #0369a1; line-height: 1.6; margin: 0; font-size: 15px; font-style: italic;">
                    "${walkSummary}"
                </p>
            </div>
        `
        : '';

    const html = `
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>We'd Love Your Feedback - Hunter's Hounds</title>
    </head>
    <body style="margin: 0; padding: 0; background-color: #f8fafc; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;">
        <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">

            <!-- Header with purple gradient -->
            <div style="background: linear-gradient(135deg, #7c3aed 0%, #5b21b6 100%); padding: 40px 30px; text-align: center;">
                <h1 style="color: #ffffff; margin: 0; font-size: 28px; font-weight: bold;">Hunter's Hounds</h1>
                <p style="color: #e9d5ff; margin: 10px 0 0 0; font-size: 16px;">Professional Dog Walking & Pet Care</p>
            </div>

            <!-- Main content -->
            <div style="padding: 40px 30px;">

                <!-- Greeting -->
                <h2 style="color: #1f2937; margin: 0 0 20px 0; font-size: 24px;">Hi ${ownerName}! ⭐</h2>

                <p style="color: #4b5563; line-height: 1.6; font-size: 16px; margin: 0 0 20px 0;">
                    I hope you and <strong>${dogNames}</strong> are doing well! I wanted to reach out and ask
                    if you'd be willing to share your experience from our recent <strong>${getServiceDisplayName(serviceType)}</strong>
                    on <strong>${serviceDate}</strong>.
                </p>

                <!-- Dog Image -->
                ${dogImageHtml}

                <!-- Walk Summary -->
                ${walkSummaryHtml}

                <p style="color: #4b5563; line-height: 1.6; font-size: 16px; margin: 0 0 25px 0;">
                    Your feedback helps other dog owners in the neighbourhood discover quality care for their
                    furry family members. It would mean the world to me if you could take a moment to leave a review!
                </p>

                <!-- Call to action -->
                <div style="text-align: center; margin: 30px 0;">
                    <a href="${reviewUrl}"
                       style="display: inline-block; background: linear-gradient(135deg, #facc15 0%, #eab308 100%); color: #1f2937; padding: 16px 40px;
                              text-decoration: none; border-radius: 8px; font-weight: bold; font-size: 18px; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
                        ⭐ Leave a Review ⭐
                    </a>
                </div>

                <p style="color: #6b7280; line-height: 1.6; font-size: 14px; margin: 25px 0 0 0; text-align: center;">
                    It only takes a minute, and I'd really appreciate it!
                </p>

                <!-- Personal signature -->
                <div style="margin-top: 30px; padding-top: 25px; border-top: 1px solid #e5e7eb;">
                    <p style="color: #4b5563; line-height: 1.6; font-size: 16px; margin: 0;">
                        Thank you so much,<br>
                        <strong>Ernesto</strong><br>
                        Hunter's Hounds
                    </p>
                </div>

            </div>

            <!-- Footer -->
            <div style="background-color: #f9fafb; padding: 20px 30px; text-align: center; border-top: 1px solid #e5e7eb;">
                <p style="color: #6b7280; font-size: 12px; margin: 0;">
                    Hunter's Hounds - Professional Dog Walking Service<br>
                    Serving Highbury Fields & Clissold Park Areas
                </p>
            </div>

        </div>
    </body>
    </html>
    `;

    return { subject, html };
}

export function generateChristmasEmail(data: ChristmasEmailData): string {
    const { ownerName, dogNames } = data;

    return `
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Christmas Wishes from Hunter's Hounds</title>
    </head>
    <body style="margin: 0; padding: 0; background-color: #f8fafc; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;">
        <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">
            
            <!-- Christmas Header -->
            <div style="background: linear-gradient(135deg, #dc2626 0%, #991b1b 100%); padding: 40px 30px; text-align: center;">
                <h1 style="color: #ffffff; margin: 0; font-size: 28px; font-weight: bold;">Hunter's Hounds</h1>
                <p style="color: #fecaca; margin: 10px 0 0 0; font-size: 16px;">Professional Dog Walking & Pet Care</p>
                <div style="margin-top: 15px; font-size: 24px;">🎄 🐕 ✨</div>
            </div>

            <!-- Christmas content -->
            <div style="padding: 40px 30px;">
                
                <!-- Personal Christmas message -->
                <h2 style="color: #1f2937; margin: 0 0 20px 0; font-size: 24px;">Merry Christmas, ${ownerName}! 🎄</h2>
                
                <p style="color: #4b5563; line-height: 1.6; font-size: 16px; margin: 0 0 20px 0;">
                    As we approach Christmas, I wanted to take a moment to thank you and <strong>${dogNames}</strong> 
                    for being part of the Hunter's Hounds family this year.
                </p>

                <p style="color: #4b5563; line-height: 1.6; font-size: 16px; margin: 0 0 25px 0;">
                    It's been an absolute pleasure caring for ${dogNames}, and I hope you both have had 
                    wonderful walks and adventures together. Your trust in me to care for your beloved 
                    furry family member means the world to me.
                </p>

                <!-- Holiday Schedule -->
                <div style="background-color: #fef3c7; border-left: 4px solid #f59e0b; padding: 20px; border-radius: 8px; margin: 25px 0;">
                    <h3 style="color: #92400e; margin: 0 0 15px 0; font-size: 18px;">🗓️ Holiday Schedule</h3>
                    <p style="color: #92400e; line-height: 1.5; margin: 0; font-size: 16px;">
                        <strong>Closed for Christmas:</strong> Monday, December 22nd - Sunday, December 28th<br>
                        <strong>Back to normal service:</strong> Monday, December 29th
                    </p>
                    <p style="color: #92400e; line-height: 1.5; margin: 10px 0 0 0; font-size: 14px; font-style: italic;">
                        For any urgent matters during the holiday period, please call 07932749772.
                    </p>
                </div>

                <!-- Christmas wishes -->
                <p style="color: #4b5563; line-height: 1.6; font-size: 16px; margin: 25px 0 0 0;">
                    I hope you and ${dogNames} have a wonderful Christmas filled with joy, warmth, 
                    and perhaps a few extra treats! 🦴🎁
                </p>

                <p style="color: #4b5563; line-height: 1.6; font-size: 16px; margin: 20px 0 0 0;">
                    Looking forward to continuing our adventures in the New Year!
                </p>

                <!-- Personal signature -->
                <div style="margin-top: 30px; padding-top: 25px; border-top: 1px solid #e5e7eb;">
                    <p style="color: #4b5563; line-height: 1.6; font-size: 16px; margin: 0;">
                        Warm Christmas wishes,<br>
                        <strong>Ernesto</strong><br>
                        Hunter's Hounds
                    </p>
                </div>

            </div>

            <!-- Footer -->
            <div style="background-color: #f9fafb; padding: 20px 30px; text-align: center; border-top: 1px solid #e5e7eb;">
                <p style="color: #6b7280; font-size: 14px; margin: 0 0 10px 0;">
                    <strong>Hunter's Hounds</strong><br>
                    Professional Dog Walking & Pet Care<br>
                    Phone: 07932749772 | Email: bookings@hunters-hounds.london
                </p>
                <p style="color: #9ca3af; font-size: 12px; margin: 0;">
                    Serving Highbury Fields & Clissold Park Areas
                </p>
            </div>

        </div>
    </body>
    </html>
    `;
}

// ============================================================================
// NEWSLETTER EMAIL TEMPLATE
// ============================================================================

export interface NewsletterContent {
    title: string;
    month: string;
    welcomeMessage: string;
    newPackMembers: {
        dogId: number;
        dogName: string;
        breed: string;
        ownerName: string;
        imageFilename: string | null;
        firstServiceDate: string;
    }[];
    packFarewells: string;
    walkHighlights: {
        text: string;
        images: string[];
    };
    seasonalTips: string;
    newFeatures: string;
}

/**
 * Generate newsletter email HTML
 * Uses {{UNSUBSCRIBE_URL}} placeholder which is replaced per-recipient
 */
export function generateNewsletterEmail(content: NewsletterContent): string {
    const { title, month, welcomeMessage, newPackMembers, packFarewells, walkHighlights, seasonalTips, newFeatures } = content;

    // Generate new pack members section
    let newMembersHtml = '';
    if (newPackMembers && newPackMembers.length > 0) {
        const memberCards = newPackMembers.map(dog => `
            <div style="display: inline-block; width: 150px; text-align: center; margin: 10px; vertical-align: top;">
                ${dog.imageFilename ? `
                    <img src="https://hunters-hounds.london/api/dog-images/${dog.imageFilename}"
                         alt="${dog.dogName}"
                         style="width: 100px; height: 100px; border-radius: 50%; object-fit: cover; border: 3px solid #3b82f6; margin-bottom: 8px;">
                ` : `
                    <div style="width: 100px; height: 100px; border-radius: 50%; background: linear-gradient(135deg, #3b82f6, #60a5fa); margin: 0 auto 8px; display: flex; align-items: center; justify-content: center;">
                        <span style="font-size: 36px;">🐕</span>
                    </div>
                `}
                <div style="font-weight: 600; color: #1f2937; font-size: 14px;">${dog.dogName}</div>
                <div style="color: #6b7280; font-size: 12px;">${dog.breed}</div>
            </div>
        `).join('');

        newMembersHtml = `
            <div style="margin: 30px 0; padding: 25px; background-color: #f0f9ff; border-radius: 12px;">
                <h2 style="color: #1e40af; margin: 0 0 20px 0; font-size: 20px;">🐕 Welcome to the Pack!</h2>
                <p style="color: #4b5563; margin: 0 0 20px 0;">
                    We're excited to welcome ${newPackMembers.length === 1 ? 'a new member' : `${newPackMembers.length} new members`} to Hunter's Hounds this month!
                </p>
                <div style="text-align: center;">
                    ${memberCards}
                </div>
            </div>
        `;
    }

    // Generate pack farewells section
    let farewellsHtml = '';
    if (packFarewells && packFarewells.trim()) {
        farewellsHtml = `
            <div style="margin: 30px 0; padding: 25px; background-color: #fef3c7; border-radius: 12px;">
                <h2 style="color: #92400e; margin: 0 0 15px 0; font-size: 20px;">👋 Pack Farewells</h2>
                <p style="color: #78350f; line-height: 1.6; margin: 0; white-space: pre-line;">${packFarewells}</p>
            </div>
        `;
    }

    // Generate walk highlights section
    let highlightsHtml = '';
    if (walkHighlights && (walkHighlights.text || walkHighlights.images?.length > 0)) {
        const imagesHtml = walkHighlights.images && walkHighlights.images.length > 0
            ? `<div style="margin-top: 20px; text-align: center;">
                ${walkHighlights.images.map(url => `
                    <img src="${url}" alt="Walk highlight" style="max-width: 280px; height: auto; border-radius: 8px; margin: 5px; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">
                `).join('')}
               </div>`
            : '';

        highlightsHtml = `
            <div style="margin: 30px 0;">
                <h2 style="color: #1f2937; margin: 0 0 15px 0; font-size: 20px;">📸 Walk Highlights</h2>
                <p style="color: #4b5563; line-height: 1.6; margin: 0; white-space: pre-line;">${walkHighlights.text || ''}</p>
                ${imagesHtml}
            </div>
        `;
    }

    // Generate seasonal tips section
    let tipsHtml = '';
    if (seasonalTips && seasonalTips.trim()) {
        tipsHtml = `
            <div style="margin: 30px 0; padding: 25px; background-color: #ecfdf5; border-radius: 12px;">
                <h2 style="color: #065f46; margin: 0 0 15px 0; font-size: 20px;">🌿 Seasonal Tips</h2>
                <p style="color: #047857; line-height: 1.6; margin: 0; white-space: pre-line;">${seasonalTips}</p>
            </div>
        `;
    }

    // Generate new features section
    let featuresHtml = '';
    if (newFeatures && newFeatures.trim()) {
        featuresHtml = `
            <div style="margin: 30px 0; padding: 25px; background-color: #f5f3ff; border-radius: 12px;">
                <h2 style="color: #5b21b6; margin: 0 0 15px 0; font-size: 20px;">✨ What's New</h2>
                <p style="color: #6d28d9; line-height: 1.6; margin: 0; white-space: pre-line;">${newFeatures}</p>
            </div>
        `;
    }

    return `
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>${title}</title>
    </head>
    <body style="margin: 0; padding: 0; background-color: #f3f4f6; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;">
        <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff;">

            <!-- Header -->
            <div style="background: linear-gradient(135deg, #1e3a8a 0%, #3b82f6 100%); padding: 30px; text-align: center;">
                <h1 style="color: #ffffff; margin: 0; font-size: 28px; font-weight: bold;">🐕 Hunter's Hounds</h1>
                <p style="color: #bfdbfe; margin: 10px 0 0 0; font-size: 16px;">${month} Newsletter</p>
            </div>

            <!-- Content -->
            <div style="padding: 30px;">

                <!-- Welcome Message -->
                <div style="margin-bottom: 30px;">
                    <p style="color: #1f2937; line-height: 1.7; font-size: 16px; margin: 0; white-space: pre-line;">${welcomeMessage}</p>
                </div>

                ${newMembersHtml}
                ${farewellsHtml}
                ${highlightsHtml}
                ${tipsHtml}
                ${featuresHtml}

                <!-- Signature -->
                <div style="margin-top: 40px; padding-top: 25px; border-top: 1px solid #e5e7eb;">
                    <p style="color: #4b5563; line-height: 1.6; font-size: 16px; margin: 0;">
                        Until next time,<br>
                        <strong>Ernesto</strong><br>
                        Hunter's Hounds
                    </p>
                </div>

            </div>

            <!-- Footer -->
            <div style="background-color: #f9fafb; padding: 25px; text-align: center; border-top: 1px solid #e5e7eb;">
                <p style="color: #6b7280; font-size: 14px; margin: 0 0 10px 0;">
                    <strong>Hunter's Hounds</strong><br>
                    Professional Dog Walking & Pet Care<br>
                    Phone: 07932749772 | Email: bookings@hunters-hounds.london
                </p>
                <p style="color: #9ca3af; font-size: 12px; margin: 15px 0 0 0;">
                    <a href="{{UNSUBSCRIBE_URL}}" style="color: #9ca3af; text-decoration: underline;">
                        Unsubscribe from Hunter's Pack newsletter
                    </a>
                </p>
            </div>

        </div>
    </body>
    </html>
    `;
}


