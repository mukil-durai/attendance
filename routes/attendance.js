const express = require('express');
const router = express.Router();
const Attendance = require('../models/Attendance');

// Mark attendance for multiple students
router.post('/mark-attendance', async (req, res) => {
  try {
    const { studentIds, classId } = req.body;
    const today = new Date().toISOString().split('T')[0];
    
    // Validate input
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

module.exports = router;