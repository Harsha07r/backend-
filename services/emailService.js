const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.ADMIN_EMAIL,
    pass: process.env.ADMIN_EMAIL_PASSWORD,
  },
});

async function sendAdminNotification(booking) {
  try {
    const mailOptions = {
      from: process.env.ADMIN_EMAIL,
      to: process.env.ADMIN_EMAIL,
      subject: `New booking: ${booking.tourName} - ${booking.fullName}`,
      html: `
        <p>New booking received</p>
        <ul>
          <li><strong>Tour:</strong> ${booking.tourName}</li>
          <li><strong>Name:</strong> ${booking.fullName}</li>
          <li><strong>Email:</strong> ${booking.email}</li>
          <li><strong>Phone:</strong> ${booking.phone}</li>
          <li><strong>Date:</strong> ${new Date(booking.travelDate).toLocaleString()}</li>
          <li><strong>People:</strong> ${booking.numberOfPeople}</li>
          <li><strong>Total:</strong> ₹${booking.totalPrice}</li>
        </ul>
      `,
    };
    return transporter.sendMail(mailOptions);
  } catch (err) {
    console.error('sendAdminNotification error:', err);
    throw err;
  }
}

async function sendUserConfirmation(booking) {
  try {
    const mailOptions = {
      from: process.env.ADMIN_EMAIL,
      to: booking.email,
      subject: `Booking confirmation — ${booking.tourName}`,
      html: `
        <p>Hi ${booking.fullName},</p>
        <p>Thanks for booking <strong>${booking.tourName}</strong>. Your booking id is <strong>${booking._id}</strong>.</p>
        <ul>
          <li><strong>Date:</strong> ${new Date(booking.travelDate).toLocaleDateString()}</li>
          <li><strong>People:</strong> ${booking.numberOfPeople}</li>
          <li><strong>Total:</strong> ₹${booking.totalPrice}</li>
        </ul>
        <p>We will contact you shortly with further details.</p>
      `,
    };
    return transporter.sendMail(mailOptions);
  } catch (err) {
    console.error('sendUserConfirmation error:', err);
    throw err;
  }
}

async function sendStatusUpdate(booking, status, adminNotes = '') {
  try {
    const mailOptions = {
      from: process.env.ADMIN_EMAIL,
      to: booking.email,
      subject: `Booking Update — ${booking.tourName} (${status})`,
      html: `
        <p>Hi ${booking.fullName},</p>
        <p>Your booking <strong>${booking._id}</strong> status has been updated to <strong>${status}</strong>.</p>
        ${adminNotes ? `<p><strong>Notes:</strong> ${adminNotes}</p>` : ''}
      `,
    };
    return transporter.sendMail(mailOptions);
  } catch (err) {
    console.error('sendStatusUpdate error:', err);
    throw err;
  }
}

module.exports = {
  sendAdminNotification,
  sendUserConfirmation,
  sendStatusUpdate,
};
