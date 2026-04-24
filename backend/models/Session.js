const mongoose = require('mongoose');

const SessionSchema = new mongoose.Schema({
  teacherId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  name: { type: String, required: true }, // Class or Subject name
  isActive: { type: Boolean, default: true },
  currentQrToken: { type: String, default: null } // The actively rotating JWT token or random string
}, { timestamps: true });

module.exports = mongoose.model('Session', SessionSchema);
