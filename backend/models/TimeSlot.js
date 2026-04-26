const mongoose = require('mongoose');

const TimeSlotSchema = new mongoose.Schema({
  dayOfWeek: { type: String, enum: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'], required: true },
  startTime: { type: String, required: true }, // format: 'HH:mm'
  endTime: { type: String, required: true }, // format: 'HH:mm'
  subjectId: { type: mongoose.Schema.Types.ObjectId, ref: 'Subject', required: true },
  teacherId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  sectionId: { type: mongoose.Schema.Types.ObjectId, ref: 'Section', required: true }
}, { timestamps: true });

module.exports = mongoose.model('TimeSlot', TimeSlotSchema);
