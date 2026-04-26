const express = require('express');
const http = require('http');
const mongoose = require('mongoose');
const { Server } = require('socket.io');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
require('dotenv').config();

const User = require('./models/User');
const Session = require('./models/Session');
const Attendance = require('./models/Attendance');
const { verifyToken, verifyTeacher } = require('./middleware/auth');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: '*', methods: ['GET', 'POST'] }
});

app.use(cors());
app.use(express.json());


console.log("MONGO_URI exists:", process.env.MONGO_URI ? "YES ✅" : "NO ❌");
// DB Connection
mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log('MongoDB connected'))
  .catch(err => console.error(err));

app.set('io', io);

app.use('/api/admin', require('./routes/adminRoutes'));
app.use('/api/teacher', require('./routes/teacherRoutes'));
app.use('/api/student', require('./routes/studentRoutes'));


// --- Auth Routes ---
app.post('/api/auth/register', async (req, res) => {
  try {
    const { name, email, password, role } = req.body;
    const existing = await User.findOne({ email });
    if (existing) return res.status(400).json({ message: 'Email already exists' });
    
    const hashedPassword = await bcrypt.hash(password, 10);
    const user = new User({ name, email, password: hashedPassword, role });
    await user.save();
    
    res.status(201).json({ message: 'User created' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ email });
    if (!user) return res.status(404).json({ message: 'User not found' });
    
    const isMatched = await bcrypt.compare(password, user.password);
    if (!isMatched) return res.status(400).json({ message: 'Invalid credentials' });
    
    const token = jwt.sign(
      { id: user._id, role: user.role, name: user.name }, 
      process.env.JWT_SECRET || 'fallback_secret', 
      { expiresIn: '1d' }
    );
    res.json({ token, user: { id: user._id, name: user.name, role: user.role } });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// --- Socket.IO Implementation ---
// Manage active rotating intervals
const activeIntervals = {};

io.on('connection', (socket) => {
  console.log('A user connected:', socket.id);

  // Teacher joining a session room and starting rotation
  socket.on('start_session', async (data) => {
    const { sessionId, token } = data;
    
    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET || 'fallback_secret');
        if (decoded.role !== 'teacher') return;
        
        // Join the room for this session (for receiving student_scanned events)
        socket.join(sessionId);

        // Generate a new token every 5 seconds
        if(activeIntervals[sessionId]) clearInterval(activeIntervals[sessionId]);
        
        const generateToken = async () => {
            const qrToken = require('crypto').randomBytes(16).toString('hex');
            
            // Save to DB
            await Session.findByIdAndUpdate(sessionId, { currentQrToken: qrToken });
            
            // Emit to the teacher who started it
            io.to(sessionId).emit('qr_update', { qrToken, sessionId });
        };
        
        generateToken(); // immediate first run
        activeIntervals[sessionId] = setInterval(generateToken, 5000);
        
    } catch(err) {
        console.error('Teacher socket auth failed', err);
    }
  });

  socket.on('stop_session', async (data) => {
      const { sessionId } = data;
      if (activeIntervals[sessionId]) {
          clearInterval(activeIntervals[sessionId]);
          delete activeIntervals[sessionId];
      }
      await Session.findByIdAndUpdate(sessionId, { isActive: false, currentQrToken: null });
  });

  socket.on('disconnect', () => {
    console.log('User disconnected:', socket.id);
    // Ideally we should handle clearing intervals if teacher disconnects,
    // but for MVP we will let the teacher stop the session explicitly.
  });
});

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
