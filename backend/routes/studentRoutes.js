const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');

const TimeSlot = require('../models/TimeSlot');
const Attendance = require('../models/Attendance');
const Session = require('../models/Session');
const LeaveRequest = require('../models/LeaveRequest');

const { verifyToken, verifyStudent } = require('../middleware/auth');

router.use(verifyToken, verifyStudent);

// GET /timetable - time slots for the student's section, with substitute info for today
router.get('/timetable', async (req, res) => {
  try {
    // If sectionId is not in JWT, fetch from DB
    const User = require('../models/User');
    const user = await User.findById(req.user.id);
    if (!user || !user.sectionId) {
      return res.status(400).json({ message: 'User is not assigned to any section' });
    }

    const timeslots = await TimeSlot.find({ sectionId: user.sectionId })
      .populate('subjectId', 'name code')
      .populate('teacherId', 'name');

    // Fix 5 — 7a: For each slot, check if original teacher is on approved leave today
    const todayStart = new Date(); todayStart.setUTCHours(0, 0, 0, 0);
    const todayEnd = new Date(); todayEnd.setUTCHours(23, 59, 59, 999);

    // Collect unique teacher IDs from all slots to batch the leave query
    const teacherIds = [...new Set(timeslots.map(s => s.teacherId?._id?.toString()).filter(Boolean))];

    const activeLeaves = await LeaveRequest.find({
      teacherId: { $in: teacherIds },
      status: 'approved',
      startDate: { $lte: todayEnd },
      endDate: { $gte: todayStart }
    }).populate('confirmedSubstituteId', 'name');

    // Build a map: originalTeacherId → substituteInfo
    const substituteMap = {};
    activeLeaves.forEach(leave => {
      if (leave.confirmedSubstituteId) {
        substituteMap[leave.teacherId.toString()] = {
          _id: leave.confirmedSubstituteId._id,
          name: leave.confirmedSubstituteId.name
        };
      }
    });

    // Attach substituteTeacher field to affected slots
    const enriched = timeslots.map(slot => {
      const obj = slot.toObject();
      const teacherId = obj.teacherId?._id?.toString();
      if (teacherId && substituteMap[teacherId]) {
        obj.substituteTeacher = substituteMap[teacherId];
      }
      return obj;
    });

    res.json(enriched);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});


// GET /attendance - personal attendance history
router.get('/attendance', async (req, res) => {
  try {
    const attendance = await Attendance.find({ studentId: req.user.id })
      .sort({ timestamp: -1 })
      .populate({
         path: 'sessionId',
         select: 'name createdAt subjectId',
         populate: [
            { path: 'teacherId', select: 'name' },
            { path: 'subjectId', select: 'name code' }
         ]
      });
    res.json(attendance);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// GET /attendance/summary - subject-wise percentages
router.get('/attendance/summary', async (req, res) => {
  try {
    const User = require('../models/User');
    const user = await User.findById(req.user.id);
    if (!user || !user.sectionId) {
      return res.status(400).json({ message: 'User is not assigned to any section' });
    }

    // Find all completed sessions for this student's section
    const sessions = await Session.find({ sectionId: user.sectionId, status: 'completed' })
      .populate('subjectId', 'name code');

    // Find all attendance records for this student
    const attendanceRecords = await Attendance.find({ studentId: req.user.id });
    const attendedSessionIds = attendanceRecords.map(a => a.sessionId.toString());

    // Aggregate by subject
    const summary = {};
    
    sessions.forEach(session => {
      if (!session.subjectId) return;
      const subjectCode = session.subjectId.code;
      const subjectName = session.subjectId.name;
      
      if (!summary[subjectCode]) {
        summary[subjectCode] = { name: subjectName, totalSessions: 0, attendedSessions: 0 };
      }
      
      summary[subjectCode].totalSessions += 1;
      if (attendedSessionIds.includes(session._id.toString())) {
        summary[subjectCode].attendedSessions += 1;
      }
    });

    const result = Object.values(summary).map(item => ({
      ...item,
      percentage: item.totalSessions === 0 ? 0 : Math.round((item.attendedSessions / item.totalSessions) * 100)
    }));

    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// POST /attendance - scan QR and mark attendance
router.post('/attendance', async (req, res) => {
  try {
    const { sessionId, qrToken, deviceId } = req.body;
    
    const session = await Session.findById(sessionId);
    if (!session || !session.isActive) {
      return res.status(400).json({ message: 'Invalid or inactive session' });
    }

    // Verify dynamic token
    if (session.currentQrToken !== qrToken) {
      return res.status(400).json({ message: 'Expired or invalid QR code. Please scan the current one.' });
    }

    const existingDeviceUsed = await Attendance.findOne({ sessionId, deviceId, studentId: { $ne: req.user.id } });
    if (existingDeviceUsed) {
        return res.status(403).json({ message: 'This device has already been used to mark attendance for someone else.' });
    }

    const attendanceRecord = new Attendance({
      sessionId,
      studentId: req.user.id,
      deviceId
    });

    try {
        await attendanceRecord.save();
        
        // Notify the teacher via socket
        const io = req.app.get('io');
        if (io) {
          io.to(sessionId.toString()).emit('student_scanned', {
              studentName: req.user.name,
              studentId: req.user.id,
              timestamp: new Date()
          });
        }

        res.json({ message: 'Attendance marked successfully!' });
    } catch (saveWaitError) {
        if(saveWaitError.code === 11000) {
            return res.status(400).json({ message: 'You have already marked your attendance.'});
        }
        throw saveWaitError;
    }

  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
