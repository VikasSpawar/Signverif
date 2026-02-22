const SibApiV3Sdk = require('sib-api-v3-sdk');

/**
 * Escape HTML to prevent injection
 */
const escapeHtml = (str = '') =>
  String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');

/**
 * Send email via Brevo API (HTTPS-based)
 * Fixed for 'unauthorized' errors by configuring headers per request.
 */
const sendEmail = async (options) => {
  try {
    const { to, subject, html, text } = options;

    // 1. Validation & API Key Security Check
    if (!process.env.BREVO_API_KEY) {
      console.error("❌ BREVO_API_KEY is missing from environment variables!");
      throw new Error('Email configuration error');
    }

    if (!to || !subject || (!html && !text)) {
      throw new Error('Missing required fields: to, subject, and (html or text)');
    }

    // 2. Configure the API Client
    const defaultClient = SibApiV3Sdk.ApiClient.instance;
    const apiKey = defaultClient.authentications['api-key'];
    apiKey.apiKey = process.env.BREVO_API_KEY;

    const apiInstance = new SibApiV3Sdk.TransactionalEmailsApi();
    const sendSmtpEmail = new SibApiV3Sdk.SendSmtpEmail();

    // 3. Construct the Email
    sendSmtpEmail.subject = subject;
    sendSmtpEmail.htmlContent = html;
    sendSmtpEmail.textContent = text;
    sendSmtpEmail.sender = { 
      name: process.env.EMAIL_FROM_NAME || "Signverif", 
      email: process.env.EMAIL_USER // Ensure this is verified in Brevo
    };
    sendSmtpEmail.to = [{ email: to }];

    console.log(`📧 Attempting to send email to ${to}...`);
    
    // 4. Send
    const data = await apiInstance.sendTransacEmail(sendSmtpEmail);
    
    console.log(`✅ Email sent! Message ID: ${data.messageId}`);
    return { success: true, messageId: data.messageId };

  } catch (error) {
    // Detailed error logging for debugging unauthorized issues
    const errorBody = error.response ? error.response.body : error.message;
    console.error('❌ Brevo API Error Detail:', JSON.stringify(errorBody, null, 2));
    
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
          <h1 style="letter-spacing:8px;color:#2563eb;margin:0;font-size:36px;font-family:monospace;">${safeCode}</h1>
        </div>
      </div>
    `
  });
};

module.exports = {
  sendEmail,
  sendShareInvitation,
  sendAccessCode,
  // Empty init function to prevent errors in your controller
  initEmailTransporter: async () => { 
    if (!process.env.BREVO_API_KEY) return false;
    return true; 
  }
};