// Debug script - Add this temporarily to check email configuration on production
// Run once on deployed server to diagnose email issues

const emailService = require('./utils/emailService');

async function debugEmailConfig() {
  console.log('\n=== 📧 EMAIL CONFIGURATION DEBUG ===\n');
  
  // Check environment variables
  console.log('1. Environment Variables:');
  console.log(`   EMAIL_USER: ${process.env.EMAIL_USER ? '✅ SET' : '❌ NOT SET'}`);
  console.log(`   EMAIL_PASS: ${process.env.EMAIL_PASS ? '✅ SET' : '❌ NOT SET'}`);
  console.log(`   Length: ${process.env.EMAIL_PASS?.length || 0} chars`);
  
  console.log('\n2. Email Service Status:');
  try {
    const result = await emailService.initEmailTransporter();
    console.log(`   Status: ${result ? '✅ READY' : '❌ FAILED'}`);
  } catch (err) {
    console.log(`   Error: ${err.message}`);
  }
  
  console.log('\n3. Check Gmail App Password:');
  if (process.env.EMAIL_PASS) {
    console.log(`   Length: ${process.env.EMAIL_PASS.length} chars`);
    console.log(`   Contains space: ${process.env.EMAIL_PASS.includes(' ') ? '⚠️ YES (remove spaces!)' : '✅ NO spaces'}`);
    console.log(`   Should be: 16 characters`);
  }
  
  console.log('\n4. Render Environment Check:');
  console.log(`   NODE_ENV: ${process.env.NODE_ENV || 'not set'}`);
  console.log(`   PORT: ${process.env.PORT || 'not set'}`);
  
  console.log('\n=== END DEBUG ===\n');
}

// Run it
debugEmailConfig().catch(console.error);
