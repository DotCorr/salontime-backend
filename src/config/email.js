const nodemailer = require('nodemailer');

// Validate required environment variables
const requiredEmailVars = ['SMTP_HOST', 'SMTP_PORT', 'SMTP_USER', 'SMTP_PASS', 'FROM_EMAIL'];
const missingVars = requiredEmailVars.filter(varName => !process.env[varName]);

if (missingVars.length > 0) {
  console.warn(`⚠️  Missing email environment variables: ${missingVars.join(', ')}`);
  console.warn('Email functionality will be disabled until these are provided.');
}

// Create transporter (will be null if missing config)
const transporter = missingVars.length === 0 
  ? nodemailer.createTransporter({
      host: process.env.SMTP_HOST,
      port: parseInt(process.env.SMTP_PORT),
      secure: parseInt(process.env.SMTP_PORT) === 465, // true for 465, false for other ports
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    })
  : null;

// Test email connection
const testEmailConnection = async () => {
  if (!transporter) {
    console.log('⚠️  Email not configured - add SMTP credentials to enable emails');
    return;
  }

  try {
    await transporter.verify();
    console.log('✅ Email service connection established');
  } catch (error) {
    console.error('❌ Email service connection failed:', error.message);
  }
};

// Test connection on startup
testEmailConnection();

module.exports = {
  transporter,
  isEmailEnabled: !!transporter,
  fromEmail: process.env.FROM_EMAIL || 'noreply@salontime.app'
};

