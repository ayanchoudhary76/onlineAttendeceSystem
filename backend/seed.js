require('dotenv').config();
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const User = require('./models/User');
const Section = require('./models/Section');
const Subject = require('./models/Subject');
const TimeSlot = require('./models/TimeSlot');
const Session = require('./models/Session');
const Attendance = require('./models/Attendance');
const LeaveRequest = require('./models/LeaveRequest');

mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log('MongoDB connected for seeding'))
  .catch(err => {
    console.error(err);
    process.exit(1);
  });

const seedDatabase = async () => {
  try {
    // Clear existing data (Be careful with this in production!)
    await User.deleteMany({});
    await Section.deleteMany({});
    await Subject.deleteMany({});
    await TimeSlot.deleteMany({});
    await Session.deleteMany({});
    await Attendance.deleteMany({});
    await LeaveRequest.deleteMany({});


    // Create Sections
    const sectionA = await Section.create({ name: 'CSE-3A', department: 'Computer Science', semester: 3 });
    const sectionB = await Section.create({ name: 'CSE-3B', department: 'Computer Science', semester: 3 });

    // Create Subjects
    const subOS = await Subject.create({ name: 'Operating Systems', code: 'CS301' });
    const subDB = await Subject.create({ name: 'Database Systems', code: 'CS302' });

    // Create Admin
    const hashedAdminPassword = await bcrypt.hash('admin123', 10);
    const admin = await User.create({
      name: 'System Admin',
      email: 'admin@college.edu',
      password: hashedAdminPassword,
      role: 'admin'
    });

    // Create Teachers
    const hashedTeacherPassword = await bcrypt.hash('teacher123', 10);
    const teacher1 = await User.create({
      name: 'Prof. Smith',
      email: 'smith@college.edu',
      password: hashedTeacherPassword,
      role: 'teacher'
    });
    
    const teacher2 = await User.create({
      name: 'Dr. Jones',
      email: 'jones@college.edu',
      password: hashedTeacherPassword,
      role: 'teacher'
    });

    // Create Students
    const hashedStudentPassword = await bcrypt.hash('student123', 10);
    const student1 = await User.create({
      name: 'Alice Johnson',
      email: 'alice@college.edu',
      password: hashedStudentPassword,
      role: 'student',
      sectionId: sectionA._id
    });

    const student2 = await User.create({
      name: 'Bob Williams',
      email: 'bob@college.edu',
      password: hashedStudentPassword,
      role: 'student',
      sectionId: sectionB._id
    });

    // Create TimeSlots
    // Monday OS class for CSE-3A by Prof. Smith
    await TimeSlot.create({
      dayOfWeek: 'Monday',
      startTime: '09:00',
      endTime: '10:00',
      subjectId: subOS._id,
      teacherId: teacher1._id,
      sectionId: sectionA._id
    });

    // Tuesday DB class for CSE-3A by Dr. Jones
    await TimeSlot.create({
      dayOfWeek: 'Tuesday',
      startTime: '10:00',
      endTime: '11:00',
      subjectId: subDB._id,
      teacherId: teacher2._id,
      sectionId: sectionA._id
    });

    console.log('Database seeded successfully!');
    process.exit(0);
  } catch (error) {
    console.error('Error seeding database:', error);
    process.exit(1);
  }
};

seedDatabase();
