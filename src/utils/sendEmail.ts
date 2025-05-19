// src/utils/sendEmail.ts
import nodemailer from 'nodemailer';

interface EmailOptions {
  email: string;
  subject: string;
  html: string;
}

const sendEmail = async (options: EmailOptions): Promise<void> => {
  try {
    // Create a transporter
    const transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST || 'smtp-relay.brevo.com',
      port: parseInt(process.env.SMTP_PORT || '587'),
      secure: parseInt(process.env.SMTP_PORT || '587') === 465, // true for 465 (SSL)
      auth: {
        user: process.env.SMTP_USER || '',
        pass: process.env.SMTP_PASSWORD || '',
      },
    });

    // Define email options
    const mailOptions = {
      from: process.env.EMAIL_FROM || '"ශ්‍රී Express" <noreply@sri-express.com>',
      to: options.email,
      subject: options.subject,
      html: options.html,
    };

    // Send the email
    const info = await transporter.sendMail(mailOptions);
    console.log('Email sent successfully:', info.messageId);
  } catch (error) {
    console.error('Error sending email:', error);
    throw new Error('Email could not be sent');
  }
};

export const sendPasswordResetOTP = async (
  email: string,
  otp: string,
  name: string
): Promise<void> => {
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

export default sendEmail;