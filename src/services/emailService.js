const { transporter, isEmailEnabled, fromEmail } = require('../config/email');
const { AppError } = require('../middleware/errorHandler');

class EmailService {
  constructor() {
    this.transporter = transporter;
    this.isEnabled = isEmailEnabled;
    this.fromEmail = fromEmail;
  }

  // Check if email is enabled
  _checkEmailEnabled() {
    if (!this.isEnabled) {
      console.warn('Email not configured - email will be skipped');
      return false;
    }
    return true;
  }

  // Send booking confirmation email
  async sendBookingConfirmation(booking, client, salon) {
    if (!this._checkEmailEnabled()) return null;

    try {
      const mailOptions = {
        from: this.fromEmail,
        to: client.email,
        subject: 'Booking Confirmation - SalonTime',
        html: this._generateBookingConfirmationTemplate(booking, client, salon),
      };

      const result = await this.transporter.sendMail(mailOptions);
      return result;
    } catch (error) {
      console.error('Failed to send booking confirmation email:', error);
      // Don't throw error to avoid breaking the booking flow
      return null;
    }
  }

  // Send booking reminder email
  async sendBookingReminder(booking, client, salon) {
    if (!this._checkEmailEnabled()) return null;

    try {
      const mailOptions = {
        from: this.fromEmail,
        to: client.email,
        subject: 'Appointment Reminder - SalonTime',
        html: this._generateBookingReminderTemplate(booking, client, salon),
      };

      const result = await this.transporter.sendMail(mailOptions);
      return result;
    } catch (error) {
      console.error('Failed to send booking reminder email:', error);
      return null;
    }
  }

  // Send cancellation notice
  async sendCancellationNotice(booking, client, salon, reason = '') {
    if (!this._checkEmailEnabled()) return null;

    try {
      const mailOptions = {
        from: this.fromEmail,
        to: client.email,
        subject: 'Appointment Cancelled - SalonTime',
        html: this._generateCancellationTemplate(booking, client, salon, reason),
      };

      const result = await this.transporter.sendMail(mailOptions);
      return result;
    } catch (error) {
      console.error('Failed to send cancellation notice:', error);
      return null;
    }
  }

  // Send payment receipt
  async sendPaymentReceipt(payment, booking, client, salon) {
    if (!this._checkEmailEnabled()) return null;

    try {
      const mailOptions = {
        from: this.fromEmail,
        to: client.email,
        subject: 'Payment Receipt - SalonTime',
        html: this._generatePaymentReceiptTemplate(payment, booking, client, salon),
      };

      const result = await this.transporter.sendMail(mailOptions);
      return result;
    } catch (error) {
      console.error('Failed to send payment receipt:', error);
      return null;
    }
  }

  // Generate booking confirmation template
  _generateBookingConfirmationTemplate(booking, client, salon) {
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: #FF6B35; color: white; padding: 20px; text-align: center; }
          .content { padding: 20px; background: #f9f9f9; }
          .booking-details { background: white; padding: 20px; margin: 20px 0; border-radius: 8px; }
          .footer { text-align: center; padding: 20px; color: #666; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>Booking Confirmed!</h1>
          </div>
          <div class="content">
            <p>Hi ${client.first_name},</p>
            <p>Your appointment has been confirmed. Here are the details:</p>
            
            <div class="booking-details">
              <h3>Appointment Details</h3>
              <p><strong>Salon:</strong> ${salon.business_name}</p>
              <p><strong>Date:</strong> ${booking.appointment_date}</p>
              <p><strong>Time:</strong> ${booking.start_time} - ${booking.end_time}</p>
              <p><strong>Service:</strong> ${booking.service_name}</p>
              <p><strong>Total:</strong> €${booking.total_amount}</p>
              ${booking.client_notes ? `<p><strong>Notes:</strong> ${booking.client_notes}</p>` : ''}
            </div>
            
            <p>If you need to cancel or reschedule, please contact the salon directly or use the SalonTime app.</p>
          </div>
          <div class="footer">
            <p>Thank you for using SalonTime!</p>
          </div>
        </div>
      </body>
      </html>
    `;
  }

  // Generate booking reminder template
  _generateBookingReminderTemplate(booking, client, salon) {
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: #FF6B35; color: white; padding: 20px; text-align: center; }
          .content { padding: 20px; background: #f9f9f9; }
          .reminder { background: #fff3cd; border: 1px solid #ffeaa7; padding: 15px; border-radius: 8px; margin: 20px 0; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>Appointment Reminder</h1>
          </div>
          <div class="content">
            <p>Hi ${client.first_name},</p>
            <div class="reminder">
              <p><strong>Don't forget!</strong> You have an appointment tomorrow:</p>
              <p><strong>Salon:</strong> ${salon.business_name}</p>
              <p><strong>Date:</strong> ${booking.appointment_date}</p>
              <p><strong>Time:</strong> ${booking.start_time}</p>
            </div>
            <p>We look forward to seeing you!</p>
          </div>
        </div>
      </body>
      </html>
    `;
  }

  // Generate cancellation template
  _generateCancellationTemplate(booking, client, salon, reason) {
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: #e74c3c; color: white; padding: 20px; text-align: center; }
          .content { padding: 20px; background: #f9f9f9; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>Appointment Cancelled</h1>
          </div>
          <div class="content">
            <p>Hi ${client.first_name},</p>
            <p>Your appointment has been cancelled:</p>
            <p><strong>Salon:</strong> ${salon.business_name}</p>
            <p><strong>Date:</strong> ${booking.appointment_date}</p>
            <p><strong>Time:</strong> ${booking.start_time}</p>
            ${reason ? `<p><strong>Reason:</strong> ${reason}</p>` : ''}
            <p>You can book a new appointment anytime using the SalonTime app.</p>
          </div>
        </div>
      </body>
      </html>
    `;
  }

  // Generate payment receipt template
  _generatePaymentReceiptTemplate(payment, booking, client, salon) {
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: #27ae60; color: white; padding: 20px; text-align: center; }
          .content { padding: 20px; background: #f9f9f9; }
          .receipt { background: white; padding: 20px; margin: 20px 0; border-radius: 8px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>Payment Receipt</h1>
          </div>
          <div class="content">
            <p>Hi ${client.first_name},</p>
            <p>Thank you for your payment. Here's your receipt:</p>
            
            <div class="receipt">
              <h3>Receipt #${payment.id}</h3>
              <p><strong>Date:</strong> ${payment.created_at}</p>
              <p><strong>Amount:</strong> €${payment.amount}</p>
              <p><strong>Payment Method:</strong> ${payment.payment_method?.type || 'Card'}</p>
              <p><strong>Service:</strong> ${booking.service_name}</p>
              <p><strong>Salon:</strong> ${salon.business_name}</p>
            </div>
          </div>
        </div>
      </body>
      </html>
    `;
  }
}

module.exports = new EmailService();

