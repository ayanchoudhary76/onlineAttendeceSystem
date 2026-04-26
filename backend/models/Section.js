const mongoose = require('mongoose');

const SectionSchema = new mongoose.Schema({
  name: { type: String, required: true, unique: true }, // e.g., 'CSE-3A'
  department: { type: String },
  semester: { type: Number },
  students: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  teachers: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }]
}, { timestamps: true });

module.exports = mongoose.model('Section', SectionSchema);
