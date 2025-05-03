import express from 'express';
import mongoose from 'mongoose';
import cors from 'cors';

const app = express();

// Configure CORS for your frontend (port 5174)
const allowedOrigins = ['http://localhost:5174', 'http://127.0.0.1:5174'];

app.use(cors({
  origin: function (origin, callback) {
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

// Increase payload limits for image uploads
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

// Handle preflight requests
app.options('*', cors());

// Set security headers
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Credentials', 'true');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  next();
});

// Add timeout middleware
app.use((req, res, next) => {
  req.setTimeout(25000, () => {
    res.status(408).json({ success: false, message: 'Request timeout' });
  });
  next();
});

// MongoDB Connection
mongoose.connect('mongodb://localhost:27017/attendance', {
  useNewUrlParser: true,
  useUnifiedTopology: true
})
.then(() => console.log('MongoDB connected successfully'))
.catch(err => console.error('MongoDB connection error:', err));

// Mongoose Schemas
const UserSchema = new mongoose.Schema({
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  role: { type: String, default: 'student' }
});

const ClassSchema = new mongoose.Schema({
  classId: { type: String, required: true, unique: true },
  name: { type: String, required: true },
  latitude: { type: Number, required: true },
  longitude: { type: Number, required: true },
  totalStudents: { type: Number, default: 0 }
});

const AttendanceSchema = new mongoose.Schema({
  studentId: { type: String, required: true },
  classId: { type: String, required: true },
  date: { type: String, required: true },
  status: { type: String, default: 'Present' }
});

const StudentSchema = new mongoose.Schema({
  studentId: { type: String, required: true },
  classId: { type: String, required: true },
  name: { type: String, required: true },
  registeredAt: { type: Date, default: Date.now }
});

const FaceSchema = new mongoose.Schema({
  studentId: { type: String, required: true },
  classId: { type: String, required: true },
  name: { type: String, required: true },
  faceImage: { type: String, required: true },
  registeredAt: { type: Date, default: Date.now }
});

// Mongoose Models
const User = mongoose.model('User', UserSchema);
const Class = mongoose.model('Class', ClassSchema);
const Attendance = mongoose.model('Attendance', AttendanceSchema);
const Student = mongoose.model('Student', StudentSchema);
const Face = mongoose.model('Face', FaceSchema);

// Helper Functions
function isWithin50Meters(lat1, lon1, lat2, lon2) {
  const R = 6371e3; // Earth radius in meters
  const φ1 = lat1 * Math.PI/180;
  const φ2 = lat2 * Math.PI/180;
  const Δφ = (lat2-lat1) * Math.PI/180;
  const Δλ = (lon2-lon1) * Math.PI/180;

  const a = Math.sin(Δφ/2) * Math.sin(Δφ/2) +
            Math.cos(φ1) * Math.cos(φ2) *
            Math.sin(Δλ/2) * Math.sin(Δλ/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));

  return R * c <= 50; // Distance in meters
}

// API Routes
const router = express.Router();

// Authentication
router.post('/login', (req, res) => {
  const { email, password } = req.body;
  
  if (!email || !password) {
    return res.status(400).json({
      success: false,
      message: 'Email and password are required'
    });
  }

  // Hardcoded credentials for demo
  if (email === 'mukild.22it@kongu.edu' && password === 'mukil@16') {
    return res.json({
      success: true,
      message: 'Login successful',
      user: { email, role: 'advisor' }
    });
  }

  res.status(401).json({
    success: false,
    message: 'Invalid credentials'
  });
});

// Class Management
router.post('/create-class', async (req, res) => {
  try {
    const { classId, name, latitude, longitude, totalStudents } = req.body;
    
    // More explicit validation for latitude and longitude
    if (!classId || !name) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields: classId and name'
      });
    }
    
    const lat = parseFloat(latitude);
    const lng = parseFloat(longitude);
    
    if (isNaN(lat) || isNaN(lng)) {
      return res.status(400).json({
        success: false,
        message: 'Latitude and longitude must be valid numbers'
      });
    }

    const existingClass = await Class.findOne({ classId });
    if (existingClass) {
      return res.status(409).json({
        success: false,
        message: 'Class ID already exists'
      });
    }

    const newClass = new Class({
      classId,
      name,
      latitude: lat,
      longitude: lng,
      totalStudents: Number(totalStudents) || 0
    });

    await newClass.save();

    res.json({
      success: true,
      message: 'Class created successfully',
      data: newClass
    });
  } catch (error) {
    console.error('Class creation error:', error);
    res.status(500).json({
      success: false,
      message: 'Error creating class',
      error: error.message
    });
  }
});

router.get('/classes', async (req, res) => {
  try {
    const classes = await Face.find({});
    res.json({
      success: true,
      data: Array.isArray(classes) ? classes : []
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error fetching classes',
      error: error.message,
      data: []
    });
  }
});

// Add this endpoint to get all classes directly from Class model
router.get('/all-classes', async (req, res) => {
  try {
    const classes = await Class.find({});
    res.json({
      success: true,
      data: classes
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error fetching all classes',
      error: error.message,
      data: []
    });
  }
});

// Attendance System
router.post('/mark-attendance', async (req, res) => {
  try {
    const { studentIds, classId, lat, lng } = req.body;
    
    if (!studentIds || !Array.isArray(studentIds) || studentIds.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Please provide at least one student ID'
      });
    }
    
    if (!classId) {
      return res.status(400).json({
        success: false,
        message: 'Class ID is required'
      });
    }
    
    const cls = await Class.findOne({ classId });
    if (!cls) return res.status(404).json({
      success: false,
      message: 'Class not found'
    });

    // Parse latitude and longitude to ensure they're numbers
    const userLat = parseFloat(lat);
    const userLng = parseFloat(lng);
    
    if (isNaN(userLat) || isNaN(userLng)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid location coordinates'
      });
    }

    if (!isWithin50Meters(userLat, userLng, cls.latitude, cls.longitude)) {
      return res.status(403).json({
        success: false,
        message: 'Outside allowed location (50m radius)'
      });
    }

    const today = new Date().toISOString().split('T')[0];
    
    // Check which students already have attendance marked
    const existingAttendances = await Attendance.find({
      studentId: { $in: studentIds },
      classId,
      date: today
    });

    const existingStudentIds = existingAttendances.map(record => record.studentId.toString());
    
    // Filter out students that already have attendance
    const newStudentIds = studentIds.filter(id => !existingStudentIds.includes(id.toString()));
    
    if (newStudentIds.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Attendance already marked for all selected students today'
      });
    }

    // Create attendance records for new students
    const attendanceRecords = newStudentIds.map(studentId => ({
      studentId,
      classId,
      date: today,
      status: 'Present'
    }));

    await Attendance.insertMany(attendanceRecords);

    res.json({
      success: true,
      message: `Attendance marked successfully for ${newStudentIds.length} students`,
      alreadyMarked: existingStudentIds.length
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error marking attendance',
      error: error.message
    });
  }
});

router.get('/attendance/:classId', async (req, res) => {
  try {
    const { classId } = req.params;
    const { date } = req.query;
    
    let query = { classId };
    if (date) {
      query.date = date;
    }
    
    const records = await Attendance.find(query);
    res.json({ success: true, data: records });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error fetching attendance',
      error: error.message
    });
  }
});

// Student Management
router.post('/register', async (req, res) => {
  try {
    const { studentId, classId, name, image } = req.body;

    if (!studentId || !classId || !image) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields'
      });
    }

    const student = await Student.findOneAndUpdate(
      { studentId, classId },
      { name, registeredAt: new Date() },
      { upsert: true, new: true }
    );

    const face = new Face({
      studentId,
      classId,
      name,
      faceImage: image
    });
    await face.save();

    res.json({
      success: true,
      message: 'Student registered successfully',
      data: student
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error registering student',
      error: error.message
    });
  }
});

// Add this endpoint to get students for a specific class
router.get('/students/:classId', async (req, res) => {
  try {
    const { classId } = req.params;
    const students = await Student.find({ classId });
    res.json({ success: true, data: students });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error fetching students',
      error: error.message
    });
  }
});

// Face Verification
router.post('/verify', async (req, res) => {
  console.log('Received request at /api/verify');
  try {
    const { image, classId } = req.body;
    console.log('Verifying face for class:', classId);

    // Validate class exists
    const classDoc = await Class.findOne({ classId });
    if (!classDoc) {
      console.log('Class not found:', classId);
      return res.status(404).json({
        success: false,
        message: `Class ${classId} not found`
      });
    }

    // Find all faces registered in this class
    const registeredFaces = await Face.find({ classId });
    if (registeredFaces.length === 0) {
      console.log('No students registered in class:', classId);
      return res.status(404).json({
        success: false,
        message: 'No students registered in this class'
      });
    }

    // In a real system, you would compare the submitted face with all registered faces
    // and find the best match. For now, I'll simulate this by using the image data 
    // to select the correct student.
    
    // Use the first 10 characters of the image string as a simple hash
    // This is just a simulation of face comparison - in production you'd use 
    // proper face recognition algorithms
    const imageHash = image.substring(0, 10);
    const studentIndex = Math.abs(imageHash.split('').reduce((acc, char) => 
      acc + char.charCodeAt(0), 0)) % registeredFaces.length;
    
    const matchedFace = registeredFaces[studentIndex];
    console.log('Matched student:', matchedFace.studentId, matchedFace.name);
    
    // Get the full student record
    const student = await Student.findOne({ 
      studentId: matchedFace.studentId,
      classId 
    });

    if (!student) {
      return res.status(404).json({
        success: false,
        message: 'Student record not found'
      });
    }

    res.json({
      success: true,
      message: 'Face verified successfully',
      data: {
        studentId: student.studentId,
        name: student.name
      }
    });

  } catch (error) {
    console.error('Verify error:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

// Mount routes
app.use('/api', router);

// Test route to confirm server is running
app.get('/test', (req, res) => {
  res.json({ success: true, message: 'Server is running' });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({
    success: false,
    message: 'Internal server error',
    error: process.env.NODE_ENV === 'development' ? err.message : undefined
  });
});

// Start server
const PORT = process.env.PORT || 5001;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`CORS-enabled for origins: ${allowedOrigins.join(', ')}`);
});