const mongoose = require('mongoose');

const UserSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  role: { type: String, enum: ['teacher', 'student', 'admin'], required: true },
  sectionId: { type: mongoose.Schema.Types.ObjectId, ref: 'Section', default: null }, // Used for students
  suggestedSubstituteId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null }, // Default sub for teachers

  deviceId: { type: String, default: null } // Used for device fingerprinting
}, { timestamps: true });

module.exports = mongoose.model('User', UserSchema);
