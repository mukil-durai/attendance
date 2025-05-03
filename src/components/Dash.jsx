import React, { useState, useEffect } from 'react';
import axios from 'axios';

const API_URL = 'http://localhost:5001';

// Configure axios defaults
axios.defaults.baseURL = API_URL;
axios.defaults.withCredentials = true;
axios.defaults.timeout = 30000; // Increase timeout to 30 seconds
axios.defaults.headers.common['Content-Type'] = 'application/json';

// Add error handling utility
const handleApiError = (error) => {
  console.error('API Error:', {
    message: error.message,
    status: error.response?.status,
    data: error.response?.data
  });
  return error.response?.data?.message || 'Network error. Please try again.';
};

// Add ErrorBoundary component
class ErrorBoundary extends React.Component {
  state = { hasError: false };

  static getDerivedStateFromError(error) {
    return { hasError: true };
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="alert alert-danger">
          Something went wrong. Please refresh the page.
        </div>
      );
    }
    return this.props.children;
  }
}

export default function Dashboard() {
  const [classData, setClassData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [totalStudents, setTotalStudents] = useState(0);
  const [totalPresent, setTotalPresent] = useState(0);
  const [selectedClass, setSelectedClass] = useState(null);
  const [studentAttendance, setStudentAttendance] = useState([]);
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [loadingAttendance, setLoadingAttendance] = useState(false);
  const [message, setMessage] = useState('');

  // Cybersecurity theme styles
  const cardStyle = {
    backgroundColor: 'rgba(0, 30, 60, 0.85)',
    borderColor: '#00bcf2',
    borderWidth: '1px',
    boxShadow: '0 0 15px rgba(0, 188, 242, 0.3)',
    color: '#ffffff',
    backdropFilter: 'blur(5px)',
    transition: 'all 0.3s ease',
  };

  const cardHeaderStyle = {
    background: 'linear-gradient(to right, #001428, #004e92)',
    color: '#ffffff',
    borderBottom: '1px solid #00bcf2',
    fontWeight: 'bold',
    textShadow: '1px 1px 3px rgba(0, 0, 0, 0.8)',
    padding: '15px',
  };

  const summaryCardStyle = {
    background: 'rgba(0, 30, 60, 0.7)',
    borderColor: '#00bcf2',
    borderWidth: '1px',
    boxShadow: '0 0 15px rgba(0, 188, 242, 0.3)',
    color: '#ffffff',
    height: '100%',
    transition: 'all 0.3s ease',
  };

  const inputStyle = {
    backgroundColor: 'rgba(0, 30, 60, 0.6)',
    color: '#ffffff',
    border: '1px solid rgba(0, 188, 242, 0.5)',
    borderRadius: '4px',
    padding: '8px 12px',
    transition: 'all 0.3s ease',
  };

  const classCardStyle = {
    background: 'rgba(0, 30, 60, 0.7)',
    borderColor: '#00bcf2',
    borderWidth: '1px',
    boxShadow: '0 0 15px rgba(0, 188, 242, 0.3)',
    color: '#ffffff',
    height: '100%',
    transition: 'all 0.3s ease',
  };

  const progressContainerStyle = {
    height: '20px',
    backgroundColor: 'rgba(0, 20, 40, 0.5)',
    borderRadius: '5px',
    overflow: 'hidden',
    border: '1px solid rgba(0, 188, 242, 0.3)',
  };

  const progressBarStyle = (percentage) => ({
    height: '100%',
    width: `${percentage}%`,
    backgroundColor: '#00bcf2',
    boxShadow: '0 0 10px rgba(0, 188, 242, 0.7)',
    textAlign: 'center',
    lineHeight: '20px',
    color: '#ffffff',
    fontWeight: 'bold',
    textShadow: '1px 1px 3px rgba(0, 0, 0, 0.8)',
    fontSize: '0.8rem',
  });

  useEffect(() => {
    fetchClasses();
    // Set up interval to refresh data every 5 minutes
    const intervalId = setInterval(fetchClasses, 300000);
    return () => clearInterval(intervalId);
  }, []);

  const fetchClasses = async () => {
    try {
      setLoading(true);
      setMessage(''); // Clear previous error messages

      let classes = [];
      
      // Try to get classes from different endpoints until we succeed
      try {
        // First try all-classes endpoint
        const allClassesResponse = await axios.get('/api/all-classes');
        if (allClassesResponse.data?.data) {
          classes = allClassesResponse.data.data;
        }
      } catch (error) {
        console.log('Could not fetch from all-classes, trying classes endpoint');
        try {
          // If all-classes fails, try the classes endpoint
          const classesResponse = await axios.get('/api/classes');
          if (classesResponse.data?.data) {
            classes = classesResponse.data.data;
          }
        } catch (innerError) {
          console.error('Error fetching from both class endpoints:', innerError);
        }
      }
      
      if (classes.length === 0) {
        setMessage('No classes found. Please create a class first.');
        setClassData([]);
        setLoading(false);
        return;
      }
      
      // Get attendance data for today
      const today = new Date().toISOString().split('T')[0];
      const classesWithAttendance = await Promise.all(classes.map(async (cls) => {
        try {
          // Get attendance records for today
          const attendanceResponse = await axios.get(`/api/attendance/${cls.classId}?date=${today}`);
          const todayAttendance = attendanceResponse.data?.data || [];
          
          // Make sure totalStudents is available - use the one from class data
          const totalStudents = parseInt(cls.totalStudents) || 0;
          
          // Calculate present and absent counts
          const presentCount = todayAttendance.length;
          const absentCount = Math.max(0, totalStudents - presentCount);
          
          // Calculate attendance percentage based on these values
          const attendancePercentage = totalStudents > 0 
            ? (presentCount / totalStudents) * 100 
            : 0;
            
          return {
            ...cls,
            presentCount,
            absentCount,
            totalStudents,
            attendancePercentage
          };
        } catch (error) {
          console.error(`Error processing class ${cls.classId}:`, error);
          return {
            ...cls,
            presentCount: 0,
            absentCount: parseInt(cls.totalStudents) || 0,
            totalStudents: parseInt(cls.totalStudents) || 0,
            attendancePercentage: 0
          };
        }
      }));
      
      setClassData(classesWithAttendance);
      
      // Calculate totals for the summary cards
      const totalStudentsCount = classesWithAttendance.reduce((sum, cls) => sum + cls.totalStudents, 0);
      const totalPresentCount = classesWithAttendance.reduce((sum, cls) => sum + cls.presentCount, 0);
      
      setTotalStudents(totalStudentsCount);
      setTotalPresent(totalPresentCount);
      
    } catch (error) {
      console.error('Error fetching classes:', error);
      setClassData([]); // Set empty array on error
      setMessage('Could not fetch classes. Please make sure the server is running.');
    } finally {
      setLoading(false);
    }
  };

  const fetchClassAttendance = async (classId) => {
    try {
      setLoadingAttendance(true);
      
      // Find the class details in our existing data
      const classDetails = classData.find(cls => cls.classId === classId);
      
      if (!classDetails) {
        throw new Error(`Class ${classId} not found in data`);
      }
      
      // Ensure date is properly formatted as YYYY-MM-DD
      const formattedDate = selectedDate ? new Date(selectedDate).toISOString().split('T')[0] : new Date().toISOString().split('T')[0];
      console.log('Fetching attendance for date:', formattedDate);
      
      // Get all attendance records for the selected date
      const response = await axios.get(`/api/attendance/${classId}?date=${formattedDate}`);
      console.log('Attendance response:', response.data);
      const attendanceData = response.data?.data || [];
      
      // Get the student IDs that are present
      const presentStudentIds = attendanceData.map(record => record.studentId);
      
      // Set the found class details as the selected class
      setSelectedClass({
        ...classDetails,
        presentCount: presentStudentIds.length,
        absentCount: Math.max(0, classDetails.totalStudents - presentStudentIds.length),
        attendancePercentage: classDetails.totalStudents > 0 
          ? (presentStudentIds.length / classDetails.totalStudents) * 100
          : 0
      });
      
      setStudentAttendance(presentStudentIds);
    } catch (error) {
      console.error('Error fetching class attendance:', error);
      setMessage(`Failed to load attendance: ${handleApiError(error)}`);
      setStudentAttendance([]);
    } finally {
      setLoadingAttendance(false);
    }
  };

  const handleDateChange = (e) => {
    const newDate = e.target.value;
    console.log('Date changed to:', newDate);
    setSelectedDate(newDate);
    
    // Only fetch if we have a selected class
    if (selectedClass && selectedClass.classId) {
      setTimeout(() => {
        fetchClassAttendance(selectedClass.classId);
      }, 0); // Use setTimeout to ensure state is updated before fetch
    }
  };

  const downloadAttendanceCSV = () => {
    if (!selectedClass || studentAttendance.length === 0) return;
    
    // Format the date for filename - ensure it's properly formatted
    const formattedDate = selectedDate ? new Date(selectedDate).toISOString().split('T')[0].replace(/-/g, '') : 
                         new Date().toISOString().split('T')[0].replace(/-/g, '');
    const fileName = `${selectedClass.name.replace(/\s+/g, '_')}_${formattedDate}_attendance.csv`;
    
    // Create CSV header
    let csvContent = "Student ID,Status,Date\n";
    
    // Add each present student with proper date formatting
    const dateForCSV = selectedDate ? new Date(selectedDate).toISOString().split('T')[0] : new Date().toISOString().split('T')[0];
    studentAttendance.forEach(studentId => {
      csvContent += `${studentId},Present,${dateForCSV}\n`;
    });
    
    // Create missing students list if we know the total count
    if (selectedClass.totalStudents > 0) {
      // Calculate which students are absent (assuming sequential IDs or known IDs)
      const absentCount = selectedClass.totalStudents - studentAttendance.length;
      if (absentCount > 0) {
        // Since we don't have the actual absent student IDs, we'll note this in the CSV
        csvContent += `\nNote: ${absentCount} students absent on this date.\n`;
      }
    }
    
    // Create a blob and download link
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', fileName);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const filteredClasses = (classData || []).filter(cls => 
    (cls.name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
    (cls.classId || '').toLowerCase().includes(searchTerm.toLowerCase())
  );

  const renderClassCard = (cls) => {
    const totalStudents = cls.totalStudents || 0;
    const presentStudents = cls.presentCount || 0;
    const absentStudents = cls.absentCount || 0;
    const attendancePercentage = cls.attendancePercentage || 0;

    return (
      <div key={cls._id || cls.classId} className="col-12 mb-3">
        <div style={classCardStyle}>
          <div style={cardHeaderStyle}>
            <h5 className="mb-0">
              <i className="bi bi-laptop me-2"></i>
              {cls.name || 'Unnamed Class'}
            </h5>
          </div>
          <div className="p-3">
            <div className="row">
              <div className="col-md-4">
                <div style={{ fontSize: '0.9rem', color: '#00bcf2' }}>Class ID</div>
                <div style={{ fontWeight: 'bold', textShadow: '1px 1px 2px rgba(0, 0, 0, 0.7)' }}>
                  <i className="bi bi-hash me-2"></i>
                  {cls.classId}
                </div>
                <div style={{ fontSize: '0.9rem', color: '#00bcf2', marginTop: '10px' }}>Total Students</div>
                <div style={{ fontWeight: 'bold', textShadow: '1px 1px 2px rgba(0, 0, 0, 0.7)' }}>
                  <i className="bi bi-people-fill me-2"></i>
                  {totalStudents}
                </div>
              </div>
              <div className="col-md-8">
                <div style={{ fontSize: '0.9rem', color: '#00bcf2' }}>Today's Attendance</div>
                <div className="d-flex align-items-center">
                  <div style={progressContainerStyle} className="flex-grow-1 me-3">
                    <div style={progressBarStyle(attendancePercentage)}>
                      {Math.round(attendancePercentage)}%
                    </div>
                  </div>
                </div>
                <div className="d-flex justify-content-between mt-2">
                  <span className="badge bg-success">
                    <i className="bi bi-person-check-fill me-1"></i>
                    Present: {presentStudents}
                  </span>
                  <span className="badge bg-danger">
                    <i className="bi bi-person-x-fill me-1"></i>
                    Absent: {absentStudents}
                  </span>
                </div>
              </div>
            </div>
            
            <div className="d-flex justify-content-end mt-3">
              <button 
                className="btn btn-sm"
                style={{
                  background: 'rgba(0, 188, 242, 0.2)',
                  border: '1px solid #00bcf2',
                  color: '#ffffff',
                  textShadow: '1px 1px 2px rgba(0, 0, 0, 0.7)'
                }}
                onClick={() => {
                  setSelectedClass(cls);
                  fetchClassAttendance(cls.classId);
                }}
              >
                <i className="bi bi-list-check me-1"></i>
                View Attendance Details
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  };

  const renderAttendanceTable = () => {
    if (!selectedClass) return null;
    
    const totalStudents = selectedClass.totalStudents || 0;
    const presentStudents = studentAttendance.length;
    const absentStudents = Math.max(0, totalStudents - presentStudents);
    const attendancePercentage = totalStudents > 0 
      ? (presentStudents / totalStudents) * 100 
      : 0;
    
    // Format the date display
    const displayDate = selectedDate ? new Date(selectedDate).toLocaleDateString() : 'Today';
    
    return (
      <div style={cardStyle} className="mb-4">
        <div style={cardHeaderStyle} className="d-flex justify-content-between align-items-center">
          <h3 className="mb-0">
            <i className="bi bi-list-check me-2"></i>
            {selectedClass.name} - Attendance Details
          </h3>
          <div className="d-flex gap-2">
            <input
              type="date"
              className="form-control"
              style={inputStyle}
              value={selectedDate}
              onChange={handleDateChange}
            />
            <button 
              className="btn btn-sm"
              style={{
                background: 'rgba(220, 53, 69, 0.2)',
                border: '1px solid #dc3545',
                color: '#ffffff',
                textShadow: '1px 1px 2px rgba(0, 0, 0, 0.7)'
              }}
              onClick={() => setSelectedClass(null)}
            >
              <i className="bi bi-x-circle me-1"></i>
              Close
            </button>
          </div>
        </div>
        <div className="p-3">
          {loadingAttendance ? (
            <div className="text-center p-4">
              <div className="spinner-border text-info" role="status">
                <span className="visually-hidden">Loading...</span>
              </div>
              <div className="mt-2 text-info">Loading attendance data...</div>
            </div>
          ) : (
            <>
              <div className="card mb-3" style={{
                background: 'rgba(0, 40, 70, 0.5)',
                border: '1px solid rgba(0, 188, 242, 0.3)'
              }}>
                <div className="card-body">
                  <div className="row">
                    <div className="col-md-6">
                      <h5 className="mb-2" style={{ color: '#00bcf2' }}>
                        <i className="bi bi-calendar-date me-2"></i>
                        {selectedClass.name} - {displayDate}
                      </h5>
                      <div className="mb-3" style={{ color: '#e0e0e0' }}>
                        <i className="bi bi-people-fill me-2"></i>
                        Total class strength: <span className="fw-bold">{totalStudents}</span> students
                      </div>
                      <div style={progressContainerStyle}>
                        <div style={progressBarStyle(attendancePercentage)}>
                          {Math.round(attendancePercentage)}% Present
                        </div>
                      </div>
                    </div>
                    <div className="col-md-6">
                      <div className="row text-center">
                        <div className="col-4">
                          <div className="fs-3 fw-bold" style={{ color: '#00bcf2' }}>
                            {totalStudents}
                          </div>
                          <div style={{ color: '#e0e0e0', fontSize: '0.9rem' }}>
                            <i className="bi bi-people-fill me-1"></i>
                            Total
                          </div>
                        </div>
                        <div className="col-4">
                          <div className="fs-3 fw-bold" style={{ color: '#28a745' }}>
                            {presentStudents}
                          </div>
                          <div style={{ color: '#e0e0e0', fontSize: '0.9rem' }}>
                            <i className="bi bi-person-check-fill me-1"></i>
                            Present
                          </div>
                        </div>
                        <div className="col-4">
                          <div className="fs-3 fw-bold" style={{ color: '#dc3545' }}>
                            {absentStudents}
                          </div>
                          <div style={{ color: '#e0e0e0', fontSize: '0.9rem' }}>
                            <i className="bi bi-person-x-fill me-1"></i>
                            Absent
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {studentAttendance.length === 0 ? (
                <div style={{
                  background: 'rgba(220, 53, 69, 0.2)',
                  border: '1px solid #dc3545',
                  borderRadius: '5px',
                  padding: '15px',
                  color: '#ffffff',
                  textShadow: '1px 1px 2px rgba(0, 0, 0, 0.5)'
                }}>
                  <i className="bi bi-exclamation-circle me-2"></i>
                  No attendance records found for this date.
                </div>
              ) : (
                <div className="card" style={{
                  background: 'rgba(0, 40, 70, 0.5)',
                  border: '1px solid rgba(0, 188, 242, 0.3)'
                }}>
                  <div className="card-header d-flex justify-content-between align-items-center" style={{ borderBottom: '1px solid rgba(0, 188, 242, 0.3)' }}>
                    <h5 className="mb-0" style={{ color: '#00bcf2' }}>
                      <i className="bi bi-person-check me-2"></i>
                      Students Present ({presentStudents} of {totalStudents})
                    </h5>
                    <button 
                      className="btn btn-sm"
                      style={{
                        background: 'rgba(0, 123, 255, 0.2)',
                        border: '1px solid #007bff',
                        color: '#ffffff',
                        textShadow: '1px 1px 2px rgba(0, 0, 0, 0.7)'
                      }}
                      onClick={downloadAttendanceCSV}
                      disabled={studentAttendance.length === 0}
                    >
                      <i className="bi bi-download me-1"></i>
                      Download CSV
                    </button>
                  </div>
                  <div className="card-body">
                    <div className="row">
                      {studentAttendance.map(studentId => (
                        <div key={studentId} className="col-md-4 mb-2">
                          <div style={{
                            background: 'rgba(40, 167, 69, 0.2)',
                            border: '1px solid #28a745',
                            borderRadius: '5px',
                            padding: '8px 12px',
                          }}>
                            <i className="bi bi-person-badge me-2"></i>
                            {studentId}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    );
  };

  if (loading) return (
    <div className="d-flex justify-content-center align-items-center" style={{ height: '80vh' }}>
      <div className="spinner-border text-info" role="status" style={{ width: '3rem', height: '3rem', color: '#00bcf2' }}>
        <span className="visually-hidden">Loading...</span>
      </div>
      <div className="ms-3" style={{ color: '#ffffff', fontWeight: 'bold', textShadow: '1px 1px 3px rgba(0, 0, 0, 0.8)' }}>
        Loading Dashboard...
      </div>
    </div>
  );

  return (
    <ErrorBoundary>
      <div className="container py-4">
        <h2 style={{ 
          color: '#ffffff', 
          textShadow: '0 0 10px rgba(0, 188, 242, 0.7), 0 0 20px rgba(0, 188, 242, 0.5)',
          fontWeight: 'bold',
          marginBottom: '20px'
        }}>
          <i className="bi bi-speedometer2 me-2"></i>
          Attendance Dashboard
        </h2>
        
        <div className="row mb-4">
          <div className="col-md-4 mb-3">
            <div style={{...summaryCardStyle, borderLeft: '5px solid #00bcf2'}}>
              <div className="p-3">
                <div style={{ fontSize: '1rem', color: '#00bcf2' }}>
                  <i className="bi bi-laptop me-2"></i>Total Classes
                </div>
                <div style={{ 
                  fontSize: '2.5rem', 
                  fontWeight: 'bold',
                  textShadow: '0 0 10px rgba(0, 188, 242, 0.5)',
                  color: '#ffffff'
                }}>
                  {classData.length}
                </div>
              </div>
            </div>
          </div>
          <div className="col-md-4 mb-3">
            <div style={{...summaryCardStyle, borderLeft: '5px solid #28a745'}}>
              <div className="p-3">
                <div style={{ fontSize: '1rem', color: '#28a745' }}>
                  <i className="bi bi-people me-2"></i>Total Students
                </div>
                <div style={{ 
                  fontSize: '2.5rem', 
                  fontWeight: 'bold',
                  textShadow: '0 0 10px rgba(40, 167, 69, 0.5)',
                  color: '#ffffff'
                }}>
                  {totalStudents}
                </div>
              </div>
            </div>
          </div>
          <div className="col-md-4 mb-3">
            <div style={{...summaryCardStyle, borderLeft: '5px solid #17a2b8'}}>
              <div className="p-3">
                <div style={{ fontSize: '1rem', color: '#17a2b8' }}>
                  <i className="bi bi-person-check me-2"></i>Present Today
                </div>
                <div style={{ 
                  fontSize: '2.5rem', 
                  fontWeight: 'bold',
                  textShadow: '0 0 10px rgba(23, 162, 184, 0.5)',
                  color: '#ffffff'
                }}>
                  {totalPresent}
                </div>
                <div style={{ fontSize: '0.9rem', color: '#e0e0e0' }}>
                  {totalStudents > 0 ? 
                    `${Math.round((totalPresent / totalStudents) * 100)}% Attendance Rate` : 
                    '0% Attendance Rate'}
                </div>
              </div>
            </div>
          </div>
        </div>
        
        {selectedClass ? renderAttendanceTable() : (
          <div style={cardStyle} className="mb-4">
            <div style={cardHeaderStyle} className="d-flex justify-content-between align-items-center">
              <h3 className="mb-0">
                <i className="bi bi-grid-3x3-gap me-2"></i>
                Classes Overview
              </h3>
              <div className="d-flex">
                <div className="input-group">
                  <span className="input-group-text" style={{...inputStyle, borderRight: 'none'}}>
                    <i className="bi bi-search" style={{ color: '#00bcf2' }}></i>
                  </span>
                  <input
                    type="text"
                    style={{...inputStyle, borderLeft: 'none'}}
                    placeholder="Search classes..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                </div>
                <button 
                  className="btn ms-2"
                  style={{
                    background: 'rgba(40, 167, 69, 0.2)',
                    border: '1px solid #28a745',
                    color: '#ffffff'
                  }}
                  onClick={fetchClasses}
                >
                  <i className="bi bi-arrow-clockwise me-1"></i>
                  Refresh
                </button>
              </div>
            </div>
            <div className="p-3">
              {message && (
                <div style={{
                  background: 'rgba(220, 53, 69, 0.2)',
                  border: '1px solid #dc3545',
                  borderRadius: '5px',
                  padding: '15px',
                  marginBottom: '20px',
                  color: '#ffffff',
                  textShadow: '1px 1px 2px rgba(0, 0, 0, 0.5)'
                }}>
                  <i className="bi bi-exclamation-triangle me-2"></i>
                  {message}
                </div>
              )}

              {filteredClasses.length === 0 ? (
                <div style={{
                  background: 'rgba(23, 162, 184, 0.2)',
                  border: '1px solid #17a2b8',
                  borderRadius: '5px',
                  padding: '15px',
                  marginBottom: '20px',
                  color: '#ffffff',
                  textShadow: '1px 1px 2px rgba(0, 0, 0, 0.5)'
                }}>
                  <i className="bi bi-info-circle me-2"></i>
                  {searchTerm ? 'No matching classes found.' : 'No classes created yet.'}
                </div>
              ) : (
                <div className="row">
                  {filteredClasses.map(renderClassCard)}
                </div>
              )}
            </div>
          </div>
        )}
        
        <div style={{...cardStyle, background: 'rgba(0, 20, 40, 0.5)'}} className="p-3 mt-4 text-center">
          <div style={{ color: '#e0e0e0', fontSize: '0.9rem' }}>
            <i className="bi bi-shield-lock me-2"></i>
            Secure Attendance Monitoring System
          </div>
        </div>
      </div>
    </ErrorBoundary>
  );
}
