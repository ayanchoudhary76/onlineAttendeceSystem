const express = require('express');
const router = express.Router();
const multer = require('multer');
const csv = require('csv-parser');
const fs = require('fs');
const bcrypt = require('bcryptjs');

const Section = require('../models/Section');
const Subject = require('../models/Subject');
const TimeSlot = require('../models/TimeSlot');
const User = require('../models/User');
const LeaveRequest = require('../models/LeaveRequest');
const Session = require('../models/Session');
const Attendance = require('../models/Attendance');

const { verifyToken, verifyAdmin } = require('../middleware/auth');

const upload = multer({ dest: 'uploads/' });

router.use(verifyToken, verifyAdmin);

// POST /sections
router.post('/sections', async (req, res) => {
  try {
    const { name, department, semester } = req.body;
    const section = new Section({ name, department, semester });
    await section.save();
    res.status(201).json(section);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// GET /sections
router.get('/sections', async (req, res) => {
  try {
    const sections = await Section.find()
      .populate('students', 'name email')
      .populate('teachers', 'name email');
    res.json(sections);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// POST /sections/:id/students — assign a student
router.post('/sections/:id/students', async (req, res) => {
  try {
    const { studentId } = req.body;
    if (!studentId) return res.status(400).json({ message: 'studentId is required' });

    const section = await Section.findByIdAndUpdate(
      req.params.id,
      { $addToSet: { students: studentId } },
      { new: true }
    ).populate('students', 'name email').populate('teachers', 'name email');

    if (!section) return res.status(404).json({ message: 'Section not found' });

    // Keep User.sectionId in sync
    await User.findByIdAndUpdate(studentId, { sectionId: req.params.id });

    res.json(section);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// DELETE /sections/:id/students/:studentId — remove a student
router.delete('/sections/:id/students/:studentId', async (req, res) => {
  try {
    const section = await Section.findByIdAndUpdate(
      req.params.id,
      { $pull: { students: req.params.studentId } },
      { new: true }
    ).populate('students', 'name email').populate('teachers', 'name email');

    if (!section) return res.status(404).json({ message: 'Section not found' });

    // Clear User.sectionId
    await User.findByIdAndUpdate(req.params.studentId, { $unset: { sectionId: '' } });

    res.json(section);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// POST /sections/:id/teachers — assign a teacher
router.post('/sections/:id/teachers', async (req, res) => {
  try {
    const { teacherId } = req.body;
    if (!teacherId) return res.status(400).json({ message: 'teacherId is required' });

    const section = await Section.findByIdAndUpdate(
      req.params.id,
      { $addToSet: { teachers: teacherId } },
      { new: true }
    ).populate('students', 'name email').populate('teachers', 'name email');

    if (!section) return res.status(404).json({ message: 'Section not found' });

    res.json(section);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// DELETE /sections/:id/teachers/:teacherId — remove a teacher
router.delete('/sections/:id/teachers/:teacherId', async (req, res) => {
  try {
    const section = await Section.findByIdAndUpdate(
      req.params.id,
      { $pull: { teachers: req.params.teacherId } },
      { new: true }
    ).populate('students', 'name email').populate('teachers', 'name email');

    if (!section) return res.status(404).json({ message: 'Section not found' });

    res.json(section);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// POST /subjects
router.post('/subjects', async (req, res) => {
  try {
    const { name, code } = req.body;
    const subject = new Subject({ name, code });
    await subject.save();
    res.status(201).json(subject);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// GET /subjects
router.get('/subjects', async (req, res) => {
  try {
    const subjects = await Subject.find();
    res.json(subjects);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// POST /timeslots - with clash detection
router.post('/timeslots', async (req, res) => {
  try {
    const { dayOfWeek, startTime, endTime, subjectId, teacherId, sectionId } = req.body;
    
    // Simple Clash Detection
    // Assuming startTime and endTime are "HH:mm" strings, we can do simple string comparison for overlap
    // But better to check exact overlap logic. For simplicity:
    const existingSlots = await TimeSlot.find({ teacherId, dayOfWeek });
    const hasClash = existingSlots.some(slot => {
      // Overlap condition: start1 < end2 AND start2 < end1
      return (startTime < slot.endTime && slot.startTime < endTime);
    });

    if (hasClash) {
      return res.status(409).json({ message: 'Teacher has a scheduling clash at this time.' });
    }

    const timeslot = new TimeSlot({ dayOfWeek, startTime, endTime, subjectId, teacherId, sectionId });
    await timeslot.save();
    res.status(201).json(timeslot);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// PUT /timeslots/:id
router.put('/timeslots/:id', async (req, res) => {
  try {
    const { dayOfWeek, startTime, endTime, subjectId, teacherId, sectionId } = req.body;
    
    // Clash detection excluding current slot
    const existingSlots = await TimeSlot.find({ teacherId, dayOfWeek, _id: { $ne: req.params.id } });
    const hasClash = existingSlots.some(slot => {
      return (startTime < slot.endTime && slot.startTime < endTime);
    });

    if (hasClash) {
      return res.status(409).json({ message: 'Teacher has a scheduling clash at this time.' });
    }

    const timeslot = await TimeSlot.findByIdAndUpdate(req.params.id, {
      dayOfWeek, startTime, endTime, subjectId, teacherId, sectionId
    }, { new: true });
    
    res.json(timeslot);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// DELETE /timeslots/:id
router.delete('/timeslots/:id', async (req, res) => {
  try {
    await TimeSlot.findByIdAndDelete(req.params.id);
    // Also cancel associated scheduled sessions
    await Session.updateMany({ timeSlotId: req.params.id, status: 'scheduled' }, { status: 'cancelled' });
    res.json({ message: 'Timeslot deleted and associated sessions cancelled' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// GET /timeslots
router.get('/timeslots', async (req, res) => {
  try {
    const timeslots = await TimeSlot.find()
      .populate('subjectId', 'name code')
      .populate('teacherId', 'name')
      .populate('sectionId', 'name');
    res.json(timeslots);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// GET /users
router.get('/users', async (req, res) => {
  try {
    const filter = {};
    if (req.query.role) filter.role = req.query.role;
    // We can also filter by sectionId later if needed
    const users = await User.find(filter).select('-password').populate('sectionId', 'name');
    res.json(users);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// POST /users — create a single user
router.post('/users', async (req, res) => {
  try {
    const { name, email, password, role, sectionId } = req.body;

    if (!name || !email || !password || !role) {
      return res.status(400).json({ message: 'name, email, password, and role are required' });
    }

    const existing = await User.findOne({ email: email.toLowerCase().trim() });
    if (existing) {
      return res.status(409).json({ message: 'Email already exists' });
    }

    const hashed = await bcrypt.hash(password, 10);
    const user = new User({
      name: name.trim(),
      email: email.toLowerCase().trim(),
      password: hashed,
      role,
      ...(role === 'student' && sectionId ? { sectionId } : {})
    });
    await user.save();

    if (role === 'student' && sectionId) {
      await Section.findByIdAndUpdate(sectionId, { $addToSet: { students: user._id } });
    }

    return res.status(201).json({
      message: 'User created',
      user: { id: user._id, name: user.name, email: user.email, role: user.role }
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// POST /users/bulk
router.post('/users/bulk', upload.single('file'), (req, res) => {
  const results = [];
  const success = [];
  const failed = [];

  if (!req.file) return res.status(400).json({ message: 'No file uploaded' });

  fs.createReadStream(req.file.path)
    .pipe(csv())
    .on('data', (data) => results.push(data))
    .on('end', async () => {
      // Clean up uploaded file
      fs.unlinkSync(req.file.path);

      for (const row of results) {
        try {
          const { name, email, password, role, sectionCode } = row;
          if (!name || !email || !password || !role) {
            failed.push({ row, reason: 'Missing required fields' });
            continue;
          }

          let sectionId = null;
          if (role === 'student' && sectionCode) {
            const section = await Section.findOne({ name: sectionCode });
            if (!section) {
              failed.push({ row, reason: 'Section not found' });
              continue;
            }
            sectionId = section._id;
          }

          const existingUser = await User.findOne({ email });
          if (existingUser) {
            failed.push({ row, reason: 'Email already exists' });
            continue;
          }

          const hashedPassword = await bcrypt.hash(password, 10);
          const user = new User({ name, email, password: hashedPassword, role, sectionId });
          await user.save();
          success.push(user);
        } catch (err) {
          failed.push({ row, reason: err.message });
        }
      }

      res.json({ success, failed });
    });
});

// DELETE /users/:id
router.delete('/users/:id', async (req, res) => {
  try {
    if (req.params.id === req.user.id.toString()) {
      return res.status(403).json({ message: 'Cannot delete your own account' });
    }

    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ message: 'User not found' });

    if (user.role === 'student') {
      // Pull from section's students array
      await Section.updateMany({ students: user._id }, { $pull: { students: user._id } });
    } else if (user.role === 'teacher') {
      // Pull from any section's teachers array
      await Section.updateMany({ teachers: user._id }, { $pull: { teachers: user._id } });
    }

    await User.findByIdAndDelete(req.params.id);
    res.json({ message: 'User deleted' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// GET /leaves
router.get('/leaves', async (req, res) => {
  try {
    const leaves = await LeaveRequest.find()
      .populate('teacherId', 'name email')
      .populate('suggestedSubstituteId', 'name')
      .populate('confirmedSubstituteId', 'name');
    res.json(leaves);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Helper: enumerate all dates between start and end (inclusive), normalized to UTC midnight
const getDatesInRange = (start, end) => {
  const dates = [];
  // Clone and normalize to UTC midnight
  const current = new Date(start);
  current.setUTCHours(0, 0, 0, 0);
  const endNorm = new Date(end);
  endNorm.setUTCHours(23, 59, 59, 999);
  while (current <= endNorm) {
    dates.push(new Date(current));
    current.setUTCDate(current.getUTCDate() + 1);
  }
  return dates;
};

const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

// PATCH /leaves/:id
router.patch('/leaves/:id', async (req, res) => {
  try {
    const { status, confirmedSubstituteId } = req.body;
    const leave = await LeaveRequest.findById(req.params.id);

    if (!leave) return res.status(404).json({ message: 'Leave request not found' });

    // Normalize dates to UTC boundaries before saving (Fix 7 — 4a)
    const startNorm = new Date(leave.startDate);
    startNorm.setUTCHours(0, 0, 0, 0);
    leave.startDate = startNorm;
    const endNorm = new Date(leave.endDate);
    endNorm.setUTCHours(23, 59, 59, 999);
    leave.endDate = endNorm;

    leave.status = status;
    if (confirmedSubstituteId) {
      leave.confirmedSubstituteId = confirmedSubstituteId;
    }
    await leave.save();

    // Fix 1 — 3a: When approved, upsert substitution Sessions for every affected date+slot
    if (status === 'approved' && confirmedSubstituteId) {
      // All timeslots owned by the teacher on leave
      const timeslots = await TimeSlot.find({ teacherId: leave.teacherId });

      // All dates in the leave range
      const leaveDates = getDatesInRange(leave.startDate, leave.endDate);

      for (const date of leaveDates) {
        const dayName = DAY_NAMES[date.getUTCDay()];
        const slotsForDay = timeslots.filter(ts => ts.dayOfWeek === dayName);

        for (const slot of slotsForDay) {
          // Define the date window for this specific day
          const dayStart = new Date(date);
          dayStart.setUTCHours(0, 0, 0, 0);
          const dayEnd = new Date(date);
          dayEnd.setUTCHours(23, 59, 59, 999);

          // Find existing session for this slot on this date
          const existingSession = await Session.findOne({
            timeSlotId: slot._id,
            createdAt: { $gte: dayStart, $lte: dayEnd }
          });

          if (existingSession) {
            // Update existing session to mark as substitution
            existingSession.substituteTeacherId = confirmedSubstituteId;
            existingSession.sessionType = 'substitution';
            await existingSession.save();
          } else {
            // Create a new pre-scheduled substitution session
            const session = new Session({
              teacherId: leave.teacherId,          // original teacher — preserves ownership
              substituteTeacherId: confirmedSubstituteId,
              sessionType: 'substitution',
              timeSlotId: slot._id,
              sectionId: slot.sectionId,
              subjectId: slot.subjectId,
              name: `Substitution - ${slot.subjectId}`,
              isActive: false,
              status: 'scheduled',
              isExtraClass: false
            });
            // Set createdAt to the leave date so date-based queries work correctly
            await Session.collection.insertOne({
              ...session.toObject(),
              createdAt: dayStart,
              updatedAt: dayStart
            });
          }
        }
      }
    }

    // If rejected, cancel any pre-scheduled substitution sessions that were created
    if (status === 'rejected') {
      const leaveDates = getDatesInRange(leave.startDate, leave.endDate);
      const timeslots = await TimeSlot.find({ teacherId: leave.teacherId });
      const slotIds = timeslots.map(ts => ts._id);

      for (const date of leaveDates) {
        const dayStart = new Date(date); dayStart.setUTCHours(0, 0, 0, 0);
        const dayEnd = new Date(date); dayEnd.setUTCHours(23, 59, 59, 999);
        await Session.updateMany(
          { timeSlotId: { $in: slotIds }, sessionType: 'substitution', status: 'scheduled', createdAt: { $gte: dayStart, $lte: dayEnd } },
          { status: 'cancelled' }
        );
      }
    }

    res.json(leave);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// GET /analytics - aggregated reporting data for the admin dashboard
router.get('/analytics', async (req, res) => {
  try {
    // ── 1. Summary counts ──────────────────────────────────────────────────
    const totalStudents = await User.countDocuments({ role: 'student' });
    const totalTeachers = await User.countDocuments({ role: 'teacher' });

    const allCompletedSessions = await Session.find({ status: 'completed' });
    const allSessionIds = allCompletedSessions.map(s => s._id);
    const totalAttendanceRecords = await Attendance.countDocuments({ sessionId: { $in: allSessionIds } });

    // Overall attendance: (total marks / (total sessions × students per section))
    // Simplified: avg of per-session attendance rates
    let overallPercentage = 0;
    if (allCompletedSessions.length > 0) {
      const students = await User.find({ role: 'student' });
      // Group students by section
      const studentsBySection = {};
      students.forEach(s => {
        const sid = s.sectionId?.toString();
        if (sid) {
          if (!studentsBySection[sid]) studentsBySection[sid] = 0;
          studentsBySection[sid]++;
        }
      });

      let totalExpected = 0;
      allCompletedSessions.forEach(session => {
        const secId = session.sectionId?.toString();
        totalExpected += (studentsBySection[secId] || 0);
      });

      overallPercentage = totalExpected > 0 ? Math.round((totalAttendanceRecords / totalExpected) * 100) : 0;
    }

    // ── 2. Section-wise attendance ─────────────────────────────────────────
    const sections = await Section.find();
    const sectionStats = [];

    for (const section of sections) {
      const sectionSessions = allCompletedSessions.filter(s => s.sectionId?.toString() === section._id.toString());
      const sectionSessionIds = sectionSessions.map(s => s._id);
      const sectionAttendance = await Attendance.countDocuments({ sessionId: { $in: sectionSessionIds } });
      const studentsInSection = await User.countDocuments({ role: 'student', sectionId: section._id });
      const expected = sectionSessions.length * studentsInSection;
      const pct = expected > 0 ? Math.round((sectionAttendance / expected) * 100) : 0;

      sectionStats.push({
        sectionName: section.name,
        sectionId: section._id,
        totalSessions: sectionSessions.length,
        studentsInSection,
        attendanceCount: sectionAttendance,
        percentage: pct
      });
    }

    // ── 3. Low attendance students (below 75%) ─────────────────────────────
    const allStudents = await User.find({ role: 'student' }).populate('sectionId', 'name');
    const lowAttendance = [];

    for (const student of allStudents) {
      if (!student.sectionId) continue;
      const studentSessions = allCompletedSessions.filter(s => s.sectionId?.toString() === student.sectionId._id.toString());
      if (studentSessions.length === 0) continue;

      const studentSessionIds = studentSessions.map(s => s._id);
      const attended = await Attendance.countDocuments({ studentId: student._id, sessionId: { $in: studentSessionIds } });

      // Group by subject
      const subjectMap = {};
      for (const session of studentSessions) {
        const subId = session.subjectId?.toString();
        if (!subId) continue;
        if (!subjectMap[subId]) subjectMap[subId] = { total: 0, attended: 0 };
        subjectMap[subId].total++;
      }

      const studentAttendanceRecords = await Attendance.find({ studentId: student._id, sessionId: { $in: studentSessionIds } });
      for (const rec of studentAttendanceRecords) {
        const session = studentSessions.find(s => s._id.toString() === rec.sessionId.toString());
        if (session) {
          const subId = session.subjectId?.toString();
          if (subId && subjectMap[subId]) subjectMap[subId].attended++;
        }
      }

      // Find subjects with < 75%
      const Subject = require('../models/Subject');
      for (const [subId, counts] of Object.entries(subjectMap)) {
        const pct = counts.total > 0 ? Math.round((counts.attended / counts.total) * 100) : 0;
        if (pct < 75) {
          const subject = await Subject.findById(subId);
          lowAttendance.push({
            studentName: student.name,
            sectionName: student.sectionId?.name || '-',
            subjectName: subject?.name || '-',
            percentage: pct
          });
        }
      }
    }

    lowAttendance.sort((a, b) => a.percentage - b.percentage);

    // ── 4. Teacher activity ────────────────────────────────────────────────
    const allTeachers = await User.find({ role: 'teacher' });
    const TimeSlot = require('../models/TimeSlot');
    const teacherActivity = [];

    for (const teacher of allTeachers) {
      const teacherSessions = allCompletedSessions.filter(s => s.teacherId?.toString() === teacher._id.toString());
      const teacherSessionIds = teacherSessions.map(s => s._id);
      const teacherAttendance = await Attendance.countDocuments({ sessionId: { $in: teacherSessionIds } });

      // Unique sections assigned via timeslots
      const slots = await TimeSlot.find({ teacherId: teacher._id }).populate('sectionId', 'name');
      const uniqueSections = [...new Set(slots.map(s => s.sectionId?.name).filter(Boolean))];

      // Average attendance per session
      let avgPercentage = 0;
      if (teacherSessions.length > 0) {
        // count students per session
        let totalExpected = 0;
        for (const session of teacherSessions) {
          const studentsInSection = await User.countDocuments({ role: 'student', sectionId: session.sectionId });
          totalExpected += studentsInSection;
        }
        avgPercentage = totalExpected > 0 ? Math.round((teacherAttendance / totalExpected) * 100) : 0;
      }

      teacherActivity.push({
        teacherName: teacher.name,
        sectionsAssigned: uniqueSections.join(', ') || '-',
        totalSessions: teacherSessions.length,
        avgPercentage
      });
    }

    res.json({
      summary: { totalStudents, totalTeachers, overallPercentage },
      sectionStats,
      lowAttendance,
      teacherActivity
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
