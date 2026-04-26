const mongoose = require('mongoose');

const SessionSchema = new mongoose.Schema({
  teacherId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  timeSlotId: { type: mongoose.Schema.Types.ObjectId, ref: 'TimeSlot', default: null }, // Null for extra classes
  sectionId: { type: mongoose.Schema.Types.ObjectId, ref: 'Section', required: true },
  subjectId: { type: mongoose.Schema.Types.ObjectId, ref: 'Subject', required: true },
  name: { type: String, required: true }, // Class or Subject name
  isActive: { type: Boolean, default: true },
  status: { type: String, enum: ['scheduled', 'active', 'completed', 'cancelled'], default: 'active' },
  isExtraClass: { type: Boolean, default: false },
  sessionType: { type: String, enum: ['regular', 'extra', 'substitution'], default: 'regular' },
  substituteTeacherId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },

  currentQrToken: { type: String, default: null } // The actively rotating JWT token or random string
}, { timestamps: true });

module.exports = mongoose.model('Session', SessionSchema);
