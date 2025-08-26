"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.sendPasswordResetOTP = void 0;
// src/utils/sendEmail.ts
const nodemailer_1 = __importDefault(require("nodemailer"));
const sendEmail = async (options) => {
    try {
        console.log('Setting up email transport with config:', {
            host: process.env.SMTP_HOST || 'smtp-relay.brevo.com',
            port: parseInt(process.env.SMTP_PORT || '587'),
            user: process.env.SMTP_USER ? 'Configured' : 'Missing',
            from: process.env.EMAIL_FROM || '"ශ්‍රී Express" <noreply@sri-express.com>'
        });
        // For development mode, create a test account if SMTP fails
        if (process.env.NODE_ENV === 'development') {
            try {
                // Try to create an ethereal test account first
                const testAccount = await nodemailer_1.default.createTestAccount();
                console.log('📧 Created test email account for development');
                const transporter = nodemailer_1.default.createTransport({
                    host: 'smtp.ethereal.email',
                    port: 587,
                    secure: false,
                    auth: {
                        user: testAccount.user,
                        pass: testAccount.pass,
                    },
                });
                const mailOptions = {
                    from: process.env.EMAIL_FROM || '"ශ්‍රී Express" <noreply@sri-express.com>',
                    to: options.email,
                    subject: options.subject,
                    html: options.html,
                };
                console.log('Sending test email to:', options.email);
                const info = await transporter.sendMail(mailOptions);
                console.log('✅ Test email sent successfully:', {
                    messageId: info.messageId,
                    to: options.email,
                    previewURL: nodemailer_1.default.getTestMessageUrl(info)
                });
                console.log('🔗 View email at:', nodemailer_1.default.getTestMessageUrl(info));
                return;
            }
            catch (testError) {
                console.log('⚠️ Test email failed, falling back to mock mode:', testError instanceof Error ? testError.message : 'Unknown error');
            }
        }
        // Original Brevo configuration
        const transporter = nodemailer_1.default.createTransport({
            host: process.env.SMTP_HOST || 'smtp-relay.brevo.com',
            port: parseInt(process.env.SMTP_PORT || '587'),
            secure: false,
            auth: {
                user: process.env.SMTP_USER || '',
                pass: process.env.SMTP_PASSWORD || '',
            },
            tls: {
                rejectUnauthorized: false
            },
            connectionTimeout: 30000,
            greetingTimeout: 15000,
            socketTimeout: 30000,
        });
        const mailOptions = {
            from: process.env.EMAIL_FROM || '"ශ්‍රී Express" <noreply@sri-express.com>',
            to: options.email,
            subject: options.subject,
            html: options.html,
        };
        console.log('Sending email to:', options.email);
        console.log('Email subject:', options.subject);
        // Send the email with timeout
        try {
            const info = await Promise.race([
                transporter.sendMail(mailOptions),
                new Promise((_, reject) => setTimeout(() => reject(new Error('Email timeout after 30 seconds')), 30000))
            ]);
            console.log('✅ Email sent successfully:', {
                messageId: info.messageId,
                to: options.email,
                accepted: info.accepted,
                rejected: info.rejected
            });
        }
        catch (sendError) {
            console.error('❌ Failed to send email:', sendError);
            // For development, we'll log the error but not throw
            if (process.env.NODE_ENV === 'development') {
                console.log('⚠️ Email sending failed in development mode, returning successfully...');
                console.log('Email content that would have been sent:');
                console.log('To:', options.email);
                console.log('Subject:', options.subject);
                console.log('HTML length:', options.html.length);
                return; // Don't throw error in development
            }
            else {
                throw sendError;
            }
        }
    }
    catch (error) {
        console.error('❌ Error in sendEmail function:', error);
        // In development mode, don't throw errors for email issues
        if (process.env.NODE_ENV === 'development') {
            console.log('⚠️ Email error suppressed in development mode - returning successfully');
            return;
        }
        throw new Error(`Email could not be sent: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
};
const sendPasswordResetOTP = async (email, otp, name) => {
    // Create professional HTML template
    const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e4e4e4; border-radius: 8px;">
      <div style="text-align: center; margin-bottom: 20px;">
        <h1 style="color: #1a73e8; margin-bottom: 5px;">ශ්‍රී Express</h1>
        <p style="color: #5f6368; font-size: 16px;">Password Reset Request</p>
      </div>
      
      <div style="border-top: 2px solid #f0f0f0; border-bottom: 2px solid #f0f0f0; padding: 20px 0; margin-bottom: 20px;">
        <p style="margin-bottom: 15px;">Hello${name ? ' ' + name : ''},</p>
        <p style="margin-bottom: 15px;">You requested a password reset for your ශ්‍රී Express account.</p>
        <p style="margin-bottom: 15px;">Your One-Time Password (OTP) is:</p>
        
        <div style="text-align: center; margin: 30px 0;">
          <div style="display: inline-block; padding: 15px 30px; background-color: #f8f9fa; border: 1px dashed #1a73e8; border-radius: 4px;">
            <span style="font-size: 24px; font-weight: bold; color: #1a73e8; letter-spacing: 5px;">${otp}</span>
          </div>
        </div>
        
        <p style="margin-bottom: 15px;">This OTP will <strong>expire in 1 hour</strong>.</p>
        <p>Enter this code on the password reset page to create a new password.</p>
      </div>
      
      <div style="color: #5f6368; font-size: 13px;">
        <p>If you did not request this password reset, please ignore this email or contact support if you have concerns.</p>
        <p style="margin-top: 15px;">© ${new Date().getFullYear()} ශ්‍රී Express. All rights reserved.</p>
      </div>
    </div>
  `;
    await sendEmail({
        email,
        subject: 'Password Reset OTP for ශ්‍රී Express Account',
        html,
    });
};
exports.sendPasswordResetOTP = sendPasswordResetOTP;
exports.default = sendEmail;
