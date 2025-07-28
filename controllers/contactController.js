// backend/controllers/contactController.js
const Contact = require('../models/Contact');
exports.submitContact = async (req, res) => {
  try {
    console.log('Incoming contact data:', req.body); // show request

    const { name, email, message } = req.body;

    const contact = new Contact({ name, email, message });
    await contact.save();

    res.status(201).json({ message: 'Message sent successfully' });
  } catch (err) {
    console.error('Error saving contact:', err); // full object
    res.status(500).json({
      message: 'Server error',
      error: err.message,
      stack: err.stack // optional: for full trace
    });
  }
};

