// lib/emailTemplates.ts
/**
 * Email templates for Hunter's Hounds
 */

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
                    We missed you and <strong>${dogNames}</strong> today for your scheduled <strong>${serviceType}</strong> appointment.
                </p>

                <!-- Appointment details -->
                <div style="background-color: #f3f4f6; border-radius: 8px; padding: 25px; margin: 25px 0;">
                    <h3 style="color: #1f2937; margin: 0 0 15px 0; font-size: 18px;">Appointment Details</h3>
                    <p style="color: #4b5563; line-height: 1.6; margin: 0;">
                        <strong>Service:</strong> ${serviceType}<br>
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
                    <strong>${serviceType}</strong> on <strong>${serviceDate}</strong> - thank you so much!
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
            <td style="padding: 12px; border-bottom: 1px solid #e5e7eb;">${s.serviceType}</td>
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
            <td style="padding: 12px; border-bottom: 1px solid #e5e7eb;">${s.serviceType}</td>
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


