const nodemailer = require('nodemailer');

let transporter = null;

/**
 * Initialize email transporter
 * Called once at startup to verify credentials
 */
const initEmailTransporter = async () => {
  try {
    if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
      console.warn('⚠️ Email credentials not configured. Email sending will be disabled.');
      console.warn('   Set EMAIL_USER and EMAIL_PASS in .env file');
      return false;
    }

    transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS
      }
    });

    // Verify connection
    await transporter.verify();
    console.log('✅ Email service initialized successfully');
    return true;
  } catch (error) {
    console.error('❌ Email service initialization failed:');
    console.error('   Error:', error.message);
    console.error('   Possible causes:');
    console.error('   1. Wrong EMAIL_USER (should be your Gmail address)');
    console.error('   2. Wrong EMAIL_PASS (should be App Password, not regular password)');
    console.error('   3. Gmail 2FA not set up');
    console.error('   4. App Password not generated at https://myaccount.google.com/apppasswords');
    return false;
  }
};

/**
 * Send email with error handling
 */
const sendEmail = async (options) => {
  try {
    // Check if transporter is initialized
    if (!transporter) {
      console.error('❌ Email transporter not initialized');
      throw new Error('Email service not available. Check server logs.');
    }

    const { to, from, subject, html, text } = options;

    // Validate required fields
    if (!to || !subject || (!html && !text)) {
      throw new Error('Missing required email fields: to, subject, and (html or text)');
    }

    console.log(`📧 Sending email to: ${to}`);

    const result = await transporter.sendMail({
      from: from || `"Signverif" <${process.env.EMAIL_USER}>`,
      to,
      subject,
      html,
      text
    });

    console.log(`✅ Email sent successfully. Message ID: ${result.messageId}`);
    return { success: true, messageId: result.messageId };
  } catch (error) {
    console.error('❌ Email send error:', {
      message: error.message,
      code: error.code,
      response: error.response
    });

    throw {
      message: error.message,
      type: 'EMAIL_SEND_ERROR'
    };
  }
};

/**
 * Send document sharing invitation
 */
const sendShareInvitation = async (to, senderName, documentTitle, signLink) => {
  return sendEmail({
    to,
    subject: `Action Required: Please sign "${documentTitle}"`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #ddd; border-radius: 8px;">
        <h2 style="color: #2563eb;">Signature Request</h2>
        <p><strong>${senderName}</strong> has sent you a document to sign:</p>
        <p style="font-size: 18px; font-weight: bold; color: #1f2937;">${documentTitle}</p>
        
        <a href="${signLink}" style="display: inline-block; background: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; font-weight: bold; margin-top: 20px;">
          Review & Sign Document
        </a>
        
        <p style="color: #666; font-size: 12px; margin-top: 30px;">
          If the button doesn't work, copy and paste this link: ${signLink}
        </p>
        
        <p style="color: #999; font-size: 11px; border-top: 1px solid #eee; padding-top: 15px;">
          This is an automated message from Signverif. Please do not reply directly.
        </p>
      </div>
    `
  });
};

/**
 * Send OTP/Access code
 */
const sendAccessCode = async (to, documentTitle, accessCode) => {
  return sendEmail({
    to,
    subject: `Your Access Code for "${documentTitle}"`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #ddd; border-radius: 8px;">
        <h2 style="color: #2563eb;">Document Access Code</h2>
        <p>Your secure access code for <strong>${documentTitle}</strong>:</p>
        
        <div style="background: #f3f4f6; padding: 20px; border-radius: 6px; text-align: center; margin: 20px 0;">
          <h1 style="letter-spacing: 8px; color: #2563eb; margin: 0; font-size: 36px; font-family: monospace;">
            ${accessCode}
          </h1>
        </div>
        
        <p style="color: #666; font-size: 14px;">
          This code will expire in 24 hours. Do not share this code with anyone.
        </p>
        
        <p style="color: #999; font-size: 11px; border-top: 1px solid #eee; padding-top: 15px;">
          This is an automated message from Signverif. Please do not reply directly.
        </p>
      </div>
    `
  });
};

module.exports = {
  initEmailTransporter,
  sendEmail,
  sendShareInvitation,
  sendAccessCode
};
