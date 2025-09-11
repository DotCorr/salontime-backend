const nodemailer = require('nodemailer');
const config = require('./index');

// Create transporter using centralized config
const transporter = config.email.smtp_user && config.email.smtp_pass
  ? nodemailer.createTransport({
      host: config.email.smtp_host,
      port: config.email.smtp_port,
      secure: config.email.smtp_port === 465, // true for 465, false for other ports
      auth: {
        user: config.email.smtp_user,
        pass: config.email.smtp_pass,
      },
    })
  : null;

// Test email connection
const testEmailConnection = async () => {
  if (!transporter) {
    console.log('⚠️  Email not configured - notifications will be disabled');
    return;
  }

  try {
    await transporter.verify();
    console.log('✅ Email connection established');
  } catch (error) {
    console.log('⚠️  Email connection failed - notifications will be disabled');
    console.log('   Fix: Add valid EMAIL_* credentials to .env file');
  }
};

// Test connection on startup
testEmailConnection();

module.exports = {
  transporter,
  isEmailEnabled: !!transporter,
  fromEmail: config.email.from_email
};

