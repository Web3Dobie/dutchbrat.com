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