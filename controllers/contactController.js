import Contact from '../models/Contact.js';
import { AppError } from '../utils/AppError.js';
import { sendContactNotification } from '../services/emailService.js';

export const submitContact = async (req, res) => {
  const { name, email, phone, message, website } = req.body;

  if (website) return res.status(201).json({ success: true, message: 'Message sent successfully' });

  const contact = await Contact.create({ name, email, phone, message });
  res.status(201).json({ success: true, message: 'Message sent successfully' });

  sendContactNotification(contact);
};

export const listContacts = async (req, res) => {
  const { status, page, limit } = req.valid.query;
  const filter = status ? { status } : {};

  const [contacts, total] = await Promise.all([
    Contact.find(filter)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .lean(),
    Contact.countDocuments(filter),
  ]);

  res.json({
    success: true,
    contacts,
    pagination: { page, limit, total, pages: Math.max(1, Math.ceil(total / limit)) },
  });
};

export const updateContact = async (req, res) => {
  const contact = await Contact.findByIdAndUpdate(
    req.params.id,
    { status: req.body.status },
    { new: true }
  );
  if (!contact) throw new AppError(404, 'Message not found');
  res.json({ success: true, contact });
};
