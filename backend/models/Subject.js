const mongoose = require('mongoose');

const SubjectSchema = new mongoose.Schema({
  name: { type: String, required: true },
  code: { type: String, required: true, unique: true } // e.g., 'CS301'
}, { timestamps: true });

module.exports = mongoose.model('Subject', SubjectSchema);
