import nodemailer from 'nodemailer';
import { env, isTest } from '../config/env.js';
import { escapeHtml as e } from '../utils/escape.js';

let transporter;

const getTransporter = () => {
  if (isTest || !env.ADMIN_EMAIL || !env.ADMIN_EMAIL_PASSWORD) return null;
  transporter ??= nodemailer.createTransport({
    service: 'gmail',
    auth: { user: env.ADMIN_EMAIL, pass: env.ADMIN_EMAIL_PASSWORD },
  });
  return transporter;
};

// Never throws: a failing mail server must not fail the API request.
const send = async (options) => {
  const t = getTransporter();
  if (!t) return false;
  try {
    await t.sendMail({ from: `"Royal Horizon" <${env.ADMIN_EMAIL}>`, ...options });
    return true;
  } catch (err) {
    console.error('[email] failed:', err.message);
    return false;
  }
};

const fmtDate = (d) =>
  new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' });

export const sendAdminNotification = (booking) =>
  send({
    to: env.ADMIN_EMAIL,
    replyTo: booking.email,
    subject: `New enquiry: ${booking.tourName} - ${booking.fullName}`,
    html: `
      <p>New tour enquiry received.</p>
      <ul>
        <li><strong>Tour:</strong> ${e(booking.tourName)}</li>
        <li><strong>Name:</strong> ${e(booking.fullName)}</li>
        <li><strong>Email:</strong> ${e(booking.email)}</li>
        <li><strong>Phone:</strong> ${e(booking.phone || '-')}</li>
        <li><strong>Travel date:</strong> ${fmtDate(booking.travelDate)}</li>
        <li><strong>Travellers:</strong> ${booking.numberOfPeople}</li>
        <li><strong>Requirements:</strong> ${e(booking.otherRequirements || '-')}</li>
      </ul>`,
  });

export const sendUserConfirmation = (booking) =>
  send({
    to: booking.email,
    subject: `We received your enquiry - ${booking.tourName}`,
    html: `
      <p>Hi ${e(booking.fullName)},</p>
      <p>Thank you for your interest in <strong>${e(booking.tourName)}</strong>.
      Your reference is <strong>${booking._id}</strong>.</p>
      <ul>
        <li><strong>Travel date:</strong> ${fmtDate(booking.travelDate)}</li>
        <li><strong>Travellers:</strong> ${booking.numberOfPeople}</li>
      </ul>
      <p>Our team will contact you shortly to plan your trip.</p>`,
  });

export const sendStatusUpdate = (booking) =>
  send({
    to: booking.email,
    subject: `Enquiry update - ${booking.tourName} (${booking.status})`,
    html: `
      <p>Hi ${e(booking.fullName)},</p>
      <p>Your enquiry <strong>${booking._id}</strong> for <strong>${e(booking.tourName)}</strong>
      is now <strong>${e(booking.status)}</strong>.</p>
      ${booking.adminNotes ? `<p><strong>Note from our team:</strong> ${e(booking.adminNotes)}</p>` : ''}`,
  });

export const sendContactNotification = (contact) =>
  send({
    to: env.ADMIN_EMAIL,
    replyTo: contact.email,
    subject: `New message from ${contact.name}`,
    html: `
      <p><strong>${e(contact.name)}</strong> (${e(contact.email)}${contact.phone ? `, ${e(contact.phone)}` : ''}) wrote:</p>
      <p>${e(contact.message)}</p>`,
  });
