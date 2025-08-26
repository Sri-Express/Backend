// src/utils/sendEmail.ts
import nodemailer from 'nodemailer';

interface EmailOptions {
  email: string;
  subject: string;
  text?: string;
  htmlContent?: string;  // New format
  html?: string;         // Legacy format for backward compatibility
  replacements?: Record<string, string>;
}

// Brevo Transporter Configuration
const transporter = nodemailer.createTransport({
  host: 'smtp-relay.brevo.com',
  port: 587,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASSWORD,
  },
});

/**
 * Sends an email using the pre-configured Brevo transporter.
 * Supports HTML content with placeholder replacement.
 */
const sendEmail = async (options: EmailOptions): Promise<void> => {
  // Check if required transporter config environment variables were loaded
  if (!process.env.SMTP_USER || !process.env.SMTP_PASSWORD) {
    console.error("[Email] ERROR: Missing required Brevo email configuration environment variables (SMTP_USER, SMTP_PASSWORD).");
    throw new Error('Email service (Brevo) is not configured. Please set SMTP_USER and SMTP_PASSWORD environment variables.');
  }

  // 1. Prepare HTML content with replacements (support both htmlContent and html properties)
  let finalHtml = options.htmlContent || options.html || '';
  if (options.replacements) {
    const replacements = options.replacements;
    Object.keys(replacements).forEach(key => {
      // Simple regex replace for placeholders like {{key}}
      const regex = new RegExp(`\\{\\{${key}\\}\\}`, 'g');
      finalHtml = finalHtml.replace(regex, replacements[key]);
    });
  }

  // 2. Define the email options
  const mailOptions = {
    from: process.env.EMAIL_FROM || `"Sri Express" <${process.env.SMTP_USER}>`,
    to: options.email,
    subject: options.subject,
    text: options.text || 'Please view this email in an HTML-compatible client.',
    html: finalHtml,
  };

  // 3. Actually send the email using the pre-configured transporter
  try {
    const info = await transporter.sendMail(mailOptions);
    console.log(`[Email] Message sent via Brevo: ${info.messageId} to ${options.email}`);
  } catch (error) {
    console.error(`[Email] Error sending email via Brevo to ${options.email}:`, error);
    throw new Error(`Email could not be sent via Brevo. Reason: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
};

export const sendTicketEmail = async (
  email: string,
  passengerName: string,
  bookingId: string,
  qrCodeDataURL: string,
  bookingDetails: any
): Promise<void> => {
  const htmlContent = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <title>Sri Express - Your Ticket</title>
      <style>
        body { font-family: Arial, sans-serif; margin: 0; padding: 20px; background: #f8f9fa; }
        .container { max-width: 600px; margin: 0 auto; background: white; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 12px rgba(0,0,0,0.15); }
        .header { background: linear-gradient(135deg, #F59E0B, #EF4444); color: white; padding: 30px 20px; text-align: center; }
        .header h1 { margin: 0; font-size: 32px; text-shadow: 0 2px 4px rgba(0,0,0,0.3); }
        .header p { margin: 10px 0 0 0; opacity: 0.9; font-size: 16px; }
        .content { padding: 30px; }
        .greeting { font-size: 18px; color: #333; margin-bottom: 20px; }
        .qr-section { text-align: center; margin: 30px 0; }
        .qr-code { border: 3px solid #F59E0B; border-radius: 12px; padding: 15px; display: inline-block; background: white; box-shadow: 0 4px 12px rgba(245, 158, 11, 0.2); }
        .qr-code img { max-width: 200px; display: block; }
        .qr-instruction { margin-top: 15px; color: #666; font-size: 16px; font-weight: 500; }
        .details { margin: 30px 0; }
        .detail-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin: 20px 0; }
        .detail-item { padding: 15px; background: #f8f9fa; border-radius: 8px; border-left: 4px solid #F59E0B; }
        .detail-label { font-size: 12px; color: #666; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 5px; }
        .detail-value { font-size: 16px; color: #333; font-weight: 600; }
        .important { background: #FEF3C7; padding: 20px; border-radius: 8px; margin: 30px 0; border: 1px solid #F59E0B; border-left: 4px solid #F59E0B; }
        .important h3 { margin: 0 0 15px 0; color: #92400E; font-size: 18px; }
        .important ul { margin: 10px 0; padding-left: 20px; color: #92400E; line-height: 1.6; }
        .footer { background: #f8f9fa; padding: 20px; text-align: center; color: #666; font-size: 14px; border-top: 1px solid #eee; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>{{companyName}}</h1>
          <p>Your Electronic Ticket</p>
        </div>
        
        <div class="content">
          <div class="greeting">
            Dear {{passengerName}},
          </div>
          
          <p>Your booking has been confirmed! Please find your e-ticket details below.</p>
          
          <div class="qr-section">
            <div class="qr-code">
              <img src="{{qrCodeDataURL}}" alt="Ticket QR Code" />
            </div>
            <div class="qr-instruction">Show this QR code to the conductor</div>
          </div>
          
          <div class="details">
            <div class="detail-grid">
              <div class="detail-item">
                <div class="detail-label">Booking ID</div>
                <div class="detail-value">{{bookingId}}</div>
              </div>
              <div class="detail-item">
                <div class="detail-label">Passenger</div>
                <div class="detail-value">{{passengerName}}</div>
              </div>
              <div class="detail-item">
                <div class="detail-label">Route</div>
                <div class="detail-value">{{routeName}}</div>
              </div>
              <div class="detail-item">
                <div class="detail-label">Travel Date</div>
                <div class="detail-value">{{travelDate}}</div>
              </div>
              <div class="detail-item">
                <div class="detail-label">Departure Time</div>
                <div class="detail-value">{{departureTime}}</div>
              </div>
              <div class="detail-item">
                <div class="detail-label">Seat</div>
                <div class="detail-value">{{seatInfo}}</div>
              </div>
            </div>
          </div>
          
          <div class="important">
            <h3>Important Instructions</h3>
            <ul>
              <li>Present this QR code for verification before boarding</li>
              <li>Arrive at the departure point 15 minutes early</li>
              <li>Carry valid photo ID matching the passenger name</li>
              <li>This ticket is non-transferable and valid only for the specified journey</li>
              <li>Contact support at +94 11 123 4567 for assistance</li>
            </ul>
          </div>
        </div>
        
        <div class="footer">
          <p>Thank you for choosing {{companyName}}!</p>
          <p>© {{currentYear}} Sri Express. All rights reserved.</p>
        </div>
      </div>
    </body>
    </html>
  `;

  await sendEmail({
    email,
    subject: `Sri Express - Your Ticket (${bookingId})`,
    htmlContent,
    replacements: {
      companyName: 'ශ්‍රී Express',
      passengerName,
      bookingId,
      qrCodeDataURL,
      routeName: bookingDetails.routeId?.name || 'N/A',
      travelDate: new Date(bookingDetails.travelDate).toLocaleDateString(),
      departureTime: bookingDetails.departureTime,
      seatInfo: `${bookingDetails.seatInfo?.seatNumber} (${bookingDetails.seatInfo?.seatType})`,
      currentYear: new Date().getFullYear().toString()
    }
  });
};

export const sendPasswordResetOTP = async (
  email: string,
  otp: string,
  name: string
): Promise<void> => {
  const htmlContent = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e4e4e4; border-radius: 8px;">
      <div style="text-align: center; margin-bottom: 20px;">
        <h1 style="color: #1a73e8; margin-bottom: 5px;">{{companyName}}</h1>
        <p style="color: #5f6368; font-size: 16px;">Password Reset Request</p>
      </div>
      
      <div style="border-top: 2px solid #f0f0f0; border-bottom: 2px solid #f0f0f0; padding: 20px 0; margin-bottom: 20px;">
        <p style="margin-bottom: 15px;">Hello{{greeting}},</p>
        <p style="margin-bottom: 15px;">You requested a password reset for your {{companyName}} account.</p>
        <p style="margin-bottom: 15px;">Your One-Time Password (OTP) is:</p>
        
        <div style="text-align: center; margin: 30px 0;">
          <div style="display: inline-block; padding: 15px 30px; background-color: #f8f9fa; border: 1px dashed #1a73e8; border-radius: 4px;">
            <span style="font-size: 24px; font-weight: bold; color: #1a73e8; letter-spacing: 5px;">{{otp}}</span>
          </div>
        </div>
        
        <p style="margin-bottom: 15px;">This OTP will <strong>expire in 1 hour</strong>.</p>
        <p>Enter this code on the password reset page to create a new password.</p>
      </div>
      
      <div style="color: #5f6368; font-size: 13px;">
        <p>If you did not request this password reset, please ignore this email or contact support if you have concerns.</p>
        <p style="margin-top: 15px;">© {{currentYear}} {{companyName}}. All rights reserved.</p>
      </div>
    </div>
  `;

  await sendEmail({
    email,
    subject: 'Password Reset OTP for ශ්‍රී Express Account',
    htmlContent,
    replacements: {
      companyName: 'ශ්‍රී Express',
      greeting: name ? ` ${name}` : '',
      otp,
      currentYear: new Date().getFullYear().toString()
    }
  });
};

export default sendEmail;