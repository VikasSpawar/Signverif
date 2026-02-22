const nodemailer = require('nodemailer');

let transporter = null;
let transporterInitializing = null;

/**
 * Escape HTML to prevent injection in email templates
 */
const escapeHtml = (str = '') =>
  String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');

/**
 * Create transporter using Google OAuth2
 * includes the 'family: 4' fix to prevent ENETUNREACH errors on Render.
 */
const createTransporter = () => {
  if (
    !process.env.EMAIL_USER || 
    !process.env.OAUTH_CLIENT_ID || 
    !process.env.OAUTH_REFRESH_TOKEN
  ) {
    console.warn('⚠️ Email disabled: missing OAuth credentials in environment');
    return null;
  }

  return nodemailer.createTransport({
    service: 'gmail',
    host: 'smtp.gmail.com',
    port: 465,
    secure: true,
    auth: {
      type: 'OAuth2',
      user: process.env.EMAIL_USER,
      clientId: process.env.OAUTH_CLIENT_ID,
      clientSecret: process.env.OAUTH_CLIENT_SECRET,
      refreshToken: process.env.OAUTH_REFRESH_TOKEN
    },
    // Force IPv4 to avoid Render's networking issues with IPv6
    tls: {
      family: 4
    },
    // Prevent the connection from hanging too long
    connectionTimeout: 10000, 
    greetingTimeout: 10000
  });
};

/**
 * Initialize transporter safely
 */
const initEmailTransporter = async () => {
  if (transporter) {
    try {
        // Verify existing connection is still alive
        await transporter.verify();
        return true;
    } catch (e) {
        transporter = null; // Reset if connection went stale
    }
  }
  
  if (transporterInitializing) return transporterInitializing;

  transporterInitializing = (async () => {
    try {
      const t = createTransporter();
      if (!t) return false;

      await t.verify();
      transporter = t;
      console.log('✅ Email transporter ready (IPv4 OAuth2)');
      return true;
    } catch (err) {
      console.error('❌ Email init failed:', err.message);
      transporter = null;
      return false;
    } finally {
      transporterInitializing = null;
    }
  })();

  return transporterInitializing;
};

/**
 * Send email with retry + auto re-init
 */
const sendEmail = async (options, attempt = 1) => {
  try {
    const ready = await initEmailTransporter();
    if (!ready || !transporter) {
      throw new Error('Email service not available');
    }

    const { to, from, subject, html, text } = options;

    if (!to || !subject || (!html && !text)) {
      throw new Error('Missing required fields: to, subject, and (html or text)');
    }

    const mail = {
      from: from || `"${process.env.EMAIL_FROM_NAME || 'Signverif'}" <${process.env.EMAIL_USER}>`,
      to,
      subject,
      html,
      text
    };

    console.log(`📧 Sending email → ${to}`);
    const result = await transporter.sendMail(mail);
    console.log(`✅ Email sent successfully: ${result.messageId}`);

    return { success: true, messageId: result.messageId };
  } catch (error) {
    console.error('❌ Email send error:', error.message);

    // Reset transporter to allow a fresh connection on retry
    transporter = null;

    if (attempt < 2) {
      console.log('🔁 Retrying email send...');
      return sendEmail(options, attempt + 1);
    }

    const err = new Error(error.message);
    err.type = 'EMAIL_SEND_ERROR';
    throw err;
  }
};

/**
 * Send document sharing invitation
 */
const sendShareInvitation = async (to, senderName, documentTitle, signLink) => {
  const safeSender = escapeHtml(senderName);
  const safeTitle = escapeHtml(documentTitle);
  const safeLink = escapeHtml(signLink);

  return sendEmail({
    to,
    subject: `Action Required: Please sign "${safeTitle}"`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width:600px;margin:0 auto;padding:20px;border:1px solid #ddd;border-radius:8px;">
        <h2 style="color:#2563eb;">Signature Request</h2>
        <p><strong>${safeSender}</strong> has sent you a document to sign:</p>
        <p style="font-size:18px;font-weight:bold;color:#1f2937;">${safeTitle}</p>
        <a href="${safeLink}" style="display:inline-block;background:#2563eb;color:white;padding:12px 24px;text-decoration:none;border-radius:5px;font-weight:bold;margin-top:20px;">
          Review & Sign Document
        </a>
        <p style="color:#666;font-size:12px;margin-top:30px;">
          If the button doesn't work, copy this link: ${safeLink}
        </p>
        <p style="color:#999;font-size:11px;border-top:1px solid #eee;padding-top:15px;">
          Automated message from Signverif.
        </p>
      </div>
    `
  });
};

/**
 * Send OTP / Access Code
 */
const sendAccessCode = async (to, documentTitle, accessCode) => {
  const safeTitle = escapeHtml(documentTitle);
  const safeCode = escapeHtml(accessCode);

  return sendEmail({
    to,
    subject: `Your Access Code for "${safeTitle}"`,
    html: `
      <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:20px;border:1px solid #ddd;border-radius:8px;">
        <h2 style="color:#2563eb;">Document Access Code</h2>
        <p>Your secure access code for <strong>${safeTitle}</strong>:</p>
        <div style="background:#f3f4f6;padding:20px;border-radius:6px;text-align:center;margin:20px 0;">
          <h1 style="letter-spacing:8px;color:#2563eb;margin:0;font-size:36px;font-family:monospace;">
            ${safeCode}
          </h1>
        </div>
        <p style="color:#666;font-size:14px;">
          This code expires soon. Do not share it.
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