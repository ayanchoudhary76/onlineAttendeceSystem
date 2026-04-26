const express = require('express');
const router = express.Router();

const TimeSlot = require('../models/TimeSlot');
const Session = require('../models/Session');
const LeaveRequest = require('../models/LeaveRequest');
const Attendance = require('../models/Attendance');

const { verifyToken, verifyTeacher } = require('../middleware/auth');

router.use(verifyToken, verifyTeacher);

// GET /timetable - fetch all time slots assigned to this teacher or where they are a substitute
router.get('/timetable', async (req, res) => {
  try {
    const timeslots = await TimeSlot.find({ teacherId: req.user.id })
      .populate('subjectId', 'name code')
      .populate('sectionId', 'name');
    res.json(timeslots);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// GET /today - today's schedule with session status
router.get('/today', async (req, res) => {
  try {
    const daysMap = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const todayDay = daysMap[new Date().getDay()];
    const startOfDay = new Date(); startOfDay.setHours(0,0,0,0);
    const endOfDay = new Date(); endOfDay.setHours(23,59,59,999);

    // Own scheduled slots
    const ownSlots = await TimeSlot.find({ teacherId: req.user.id, dayOfWeek: todayDay })
      .populate('subjectId', 'name code')
      .populate('sectionId', 'name');

    // Slots where this teacher is confirmed substitute (via leave requests)
    const LeaveRequest = require('../models/LeaveRequest');
    const activeLeaves = await LeaveRequest.find({
      confirmedSubstituteId: req.user.id,
      status: 'approved',
      startDate: { $lte: endOfDay },
      endDate: { $gte: startOfDay }
    });
    
    let substituteSlots = [];
    if (activeLeaves.length > 0) {
      const absentTeacherIds = activeLeaves.map(l => l.teacherId);
      substituteSlots = await TimeSlot.find({ teacherId: { $in: absentTeacherIds }, dayOfWeek: todayDay })
        .populate('subjectId', 'name code')
        .populate('sectionId', 'name');
    }

    // Today's sessions for this teacher
    const todaySessions = await Session.find({
      teacherId: req.user.id,
      createdAt: { $gte: startOfDay, $lte: endOfDay }
    });

    // Build response: merge slots with session status
    const buildSlotInfo = (slot, isSubstitute = false) => {
      const session = todaySessions.find(s => 
        s.timeSlotId && s.timeSlotId.toString() === slot._id.toString()
      );
      return {
        ...slot.toObject(),
        isSubstitute,
        session: session ? { _id: session._id, status: session.status, isActive: session.isActive } : null
      };
    };

    const schedule = [
      ...ownSlots.map(s => buildSlotInfo(s, false)),
      ...substituteSlots.map(s => buildSlotInfo(s, true))
    ].sort((a, b) => (a.startTime < b.startTime ? -1 : 1));

    // Also include extra classes (sessions without a timeslot)
    const extraSessions = await Session.find({
      teacherId: req.user.id,
      isExtraClass: true,
      createdAt: { $gte: startOfDay, $lte: endOfDay }
    }).populate('subjectId', 'name code').populate('sectionId', 'name');

    res.json({ schedule, extraSessions });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// POST /sessions - start a session
router.post('/sessions', async (req, res) => {
  try {
    const { timeSlotId, sectionId, subjectId, name, isExtraClass } = req.body;

    // Fix 2 — 4b: Check if the requesting teacher is a confirmed substitute for this slot today
    let substituteTeacherId = null;
    let sessionType = isExtraClass ? 'extra' : 'regular';

    if (timeSlotId) {
      const todayStart = new Date(); todayStart.setUTCHours(0, 0, 0, 0);
      const todayEnd = new Date(); todayEnd.setUTCHours(23, 59, 59, 999);

      const slot = await TimeSlot.findById(timeSlotId);
      if (slot) {
        // Check if the slot's original teacher is on approved leave today
        const activeLeave = await LeaveRequest.findOne({
          teacherId: slot.teacherId,
          confirmedSubstituteId: req.user.id,
          status: 'approved',
          startDate: { $lte: todayEnd },
          endDate: { $gte: todayStart }
        });

        if (activeLeave) {
          substituteTeacherId = req.user.id;
          sessionType = 'substitution';
        }
      }
    }

    const session = new Session({
      teacherId: req.user.id,
      timeSlotId: timeSlotId || null,
      sectionId,
      subjectId,
      name,
      isActive: true,
      status: 'active',
      isExtraClass: isExtraClass || false,
      sessionType,
      substituteTeacherId
    });

    await session.save();
    res.status(201).json(session);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// POST /sessions/:id/end - end session
router.post('/sessions/:id/end', async (req, res) => {
  try {
    const session = await Session.findOne({ _id: req.params.id, teacherId: req.user.id });
    if (!session) return res.status(404).json({ message: 'Session not found or unauthorized' });

    session.isActive = false;
    session.status = 'completed';
    session.currentQrToken = null;
    await session.save();

    res.json({ message: 'Session ended successfully', session });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// POST /leaves - apply for leave
router.post('/leaves', async (req, res) => {
  try {
    const { startDate, endDate, reason, suggestedSubstituteId } = req.body;

    // Fix 7 — 4a: Normalize to UTC boundaries to avoid timezone drift
    const normStart = new Date(startDate);
    normStart.setUTCHours(0, 0, 0, 0);
    const normEnd = new Date(endDate);
    normEnd.setUTCHours(23, 59, 59, 999);

    const leave = new LeaveRequest({
      teacherId: req.user.id,
      startDate: normStart,
      endDate: normEnd,
      reason,
      suggestedSubstituteId: suggestedSubstituteId || null
    });

    await leave.save();
    res.status(201).json(leave);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// GET /leaves - own leave history
router.get('/leaves', async (req, res) => {
  try {
    const leaves = await LeaveRequest.find({ teacherId: req.user.id })
      .populate('suggestedSubstituteId', 'name')
      .populate('confirmedSubstituteId', 'name');
    res.json(leaves);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// GET /sections/:id/attendance - aggregated attendance report for a section
router.get('/sections/:id/attendance', async (req, res) => {
  try {
    const { subjectId } = req.query; // optional filter
    // Fix 3 — 5a/6a: Include sessions where teacher is original OR confirmed substitute
    const sessionFilter = {
      sectionId: req.params.id,
      status: 'completed',
      $or: [
        { teacherId: req.user.id },
        { substituteTeacherId: req.user.id }
      ]
    };
    if (subjectId) sessionFilter.subjectId = subjectId;

    const sessions = await Session.find(sessionFilter).populate('subjectId', 'name code');
    const sessionIds = sessions.map(s => s._id);

    const attendanceRecords = await Attendance.find({ sessionId: { $in: sessionIds } })
      .populate('studentId', 'name email');

    // Group sessions by subject
    const subjectSessionCounts = {};
    sessions.forEach(s => {
      const sid = s.subjectId?._id?.toString();
      if (!subjectSessionCounts[sid]) {
        subjectSessionCounts[sid] = { subjectName: s.subjectId?.name, subjectCode: s.subjectId?.code, total: 0 };
      }
      subjectSessionCounts[sid].total++;
    });

    // Group attendance: student × subject → count
    const studentSubjectMap = {};
    attendanceRecords.forEach(rec => {
      const session = sessions.find(s => s._id.toString() === rec.sessionId.toString());
      if (!session) return;
      const subjectKey = session.subjectId?._id?.toString();
      const studentKey = rec.studentId?._id?.toString();
      const comboKey = `${studentKey}__${subjectKey}`;
      if (!studentSubjectMap[comboKey]) {
        studentSubjectMap[comboKey] = {
          studentId: rec.studentId?._id,
          studentName: rec.studentId?.name,
          studentEmail: rec.studentId?.email,
          subjectId: subjectKey,
          subjectName: session.subjectId?.name,
          attended: 0,
          total: subjectSessionCounts[subjectKey]?.total || 0
        };
      }
      studentSubjectMap[comboKey].attended++;
    });

    const report = Object.values(studentSubjectMap).map(entry => ({
      ...entry,
      percentage: entry.total > 0 ? Math.round((entry.attended / entry.total) * 100) : 0
    }));

    res.json({ report, subjectSessionCounts: Object.values(subjectSessionCounts) });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
