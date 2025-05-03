import { useState, useRef } from 'react';
import axios from 'axios';
import Webcam from 'react-webcam';

const API_URL = 'http://localhost:5001';
const FACE_API_URL = 'http://localhost:5000';

const compressImage = (imageData) => {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      
      const width = img.width * 0.5;
      const height = img.height * 0.5;
      
      canvas.width = width;
      canvas.height = height;
      
      ctx.drawImage(img, 0, 0, width, height);
      
      resolve(canvas.toDataURL('image/jpeg', 0.8));
    };
    img.src = imageData;
  });
};

export default function Advisor() {
  const [loggedIn, setLoggedIn] = useState(false);
  const [form, setForm] = useState({});
  const [classCreated, setClassCreated] = useState(false);
  const [attendanceData, setAttendanceData] = useState([]);
  const [classId, setClassId] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [startRollNo, setStartRollNo] = useState('');
  const [endRollNo, setEndRollNo] = useState('');
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [attendanceStats, setAttendanceStats] = useState(null);
  const [registrationMode, setRegistrationMode] = useState(false);
  const [currentStudent, setCurrentStudent] = useState('');
  const [registeredStudents, setRegisteredStudents] = useState([]);
  const [editMode, setEditMode] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [studentList, setStudentList] = useState([]);
  const [currentRegistration, setCurrentRegistration] = useState(null);
  const [showWebcam, setShowWebcam] = useState(false);
  const [studentNames, setStudentNames] = useState({});
  const webcamRef = useRef(null);

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
  };

  const buttonPrimaryStyle = {
    background: 'rgba(0, 188, 242, 0.3)',
    color: '#ffffff',
    border: '1px solid #00bcf2',
    boxShadow: '0 0 10px rgba(0, 188, 242, 0.3)',
    transition: 'all 0.3s ease',
    fontWeight: 'bold',
  };

  const inputStyle = {
    backgroundColor: 'rgba(0, 30, 60, 0.6)',
    color: '#ffffff',
    border: '1px solid rgba(0, 188, 242, 0.5)',
    transition: 'all 0.3s ease',
    fontWeight: 'normal',
  };

  const helperTextStyle = {
    color: '#e0e0e0',
    textShadow: '1px 1px 2px rgba(0, 0, 0, 0.7)',
    fontWeight: 'normal',
    fontSize: '0.9rem'
  };
  
  const headingStyle = {
    color: '#ffffff',
    fontWeight: 'bold',
    textShadow: '1px 1px 3px rgba(0, 0, 0, 0.8)',
    marginBottom: '15px'
  };

  const subHeadingStyle = {
    color: '#00bcf2',
    fontWeight: 'bold',
    textShadow: '1px 1px 2px rgba(0, 0, 0, 0.8)',
    marginBottom: '10px'
  };

  const webcamContainerStyle = {
    border: '1px solid #00bcf2',
    padding: '5px',
    borderRadius: '5px',
    boxShadow: '0 0 15px rgba(0, 188, 242, 0.5)',
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    login();
  };

  const login = async () => {
    try {
      const trimmedEmail = email.trim();
      const trimmedPassword = password.trim();

      if (!trimmedEmail || !trimmedPassword) {
        alert('Please enter both email and password');
        return;
      }

      const response = await axios.post(`${API_URL}/api/login`, {
        email: trimmedEmail,
        password: trimmedPassword
      });

      if (response?.data?.success) {
        setLoggedIn(true);
      } else {
        throw new Error(response?.data?.message || 'Login failed');
      }
    } catch (error) {
      const errorMessage = error.response?.data?.message || error.message || 'Login failed. Please try again.';
      alert(errorMessage);
    }
  };

  const registerStudentFace = async () => {
    try {
      const imageSrc = webcamRef.current.getScreenshot();
      
      const response = await axios.post(`${FACE_API_URL}/api/register`, {
        name: currentStudent,
        image: imageSrc
      });

      if (response.data.status.includes('✅')) {
        setRegisteredStudents([...registeredStudents, currentStudent]);
        alert(`Successfully registered ${currentStudent}`);
        setCurrentStudent('');
      } else {
        throw new Error(response.data.status);
      }
    } catch (error) {
      alert(`Error registering face: ${error.message}`);
    }
  };

  const deleteStudent = async (studentId) => {
    try {
      await axios.delete(`${API_URL}/api/students/${studentId}`);
      setRegisteredStudents(registeredStudents.filter(id => id !== studentId));
      alert(`Student ${studentId} deleted successfully`);
    } catch (error) {
      alert(`Error deleting student: ${error.message}`);
    }
  };

  const updateStudentFace = async () => {
    try {
      const imageSrc = webcamRef.current.getScreenshot();
      
      const response = await axios.put(`${FACE_API_URL}/api/register`, {
        name: selectedStudent,
        image: imageSrc
      });

      if (response.data.status.includes('✅')) {
        alert(`Successfully updated ${selectedStudent}'s face`);
        setEditMode(false);
        setSelectedStudent(null);
      }
    } catch (error) {
      alert(`Error updating face: ${error.message}`);
    }
  };

  const createClass = async () => {
    try {
      const start = parseInt(startRollNo);
      const end = parseInt(endRollNo);
      
      if (isNaN(start) || isNaN(end) || start > end) {
        alert('Please enter valid roll number range');
        return;
      }

      // Validate latitude and longitude
      const latitude = parseFloat(form.latitude);
      const longitude = parseFloat(form.longitude);
      
      if (!form.classId || !form.name || isNaN(latitude) || isNaN(longitude)) {
        alert('Please fill in all required fields: Class ID, Name, Latitude, and Longitude');
        return;
      }

      const classData = {
        classId: form.classId,
        name: form.name,
        latitude: latitude,
        longitude: longitude,
        totalStudents: end - start + 1
      };

      console.log('Creating class with data:', classData);

      const response = await axios.post(`${API_URL}/api/create-class`, classData);

      if (response.data.success) {
        setStudentList(Array.from(
          { length: end - start + 1 },
          (_, i) => ({
            id: `${start + i}`,
            name: studentNames[`${start + i}`] || `Student ${start + i}`,
            isRegistered: false
          })
        ));
        setClassCreated(true);
      } else {
        throw new Error(response.data.message);
      }
    } catch (error) {
      alert(error.response?.data?.message || error.message || 'Error creating class');
    }
  };

  const fetchAttendance = async () => {
    try {
      if (!classId) {
        alert('Please enter a Class ID');
        return;
      }
      const res = await axios.get(`${API_URL}/api/attendance/${classId}`);
      
      const filteredData = res.data.filter(record => record.date === selectedDate);
      setAttendanceData(filteredData);

      const stats = {
        total: parseInt(form.totalStudents) || 0,
        present: filteredData.length,
        absent: (parseInt(form.totalStudents) || 0) - filteredData.length
      };
      setAttendanceStats(stats);
    } catch (error) {
      alert('Error fetching attendance data');
    }
  };

  const registerFace = async (studentId) => {
    try {
      if (!webcamRef.current) {
        throw new Error('Webcam not initialized');
      }

      const imageSrc = webcamRef.current.getScreenshot();
      if (!imageSrc) {
        throw new Error('Failed to capture image');
      }

      const compressedImage = await compressImage(imageSrc);

      if (!studentId || !form.classId) {
        throw new Error('Missing student ID or class ID');
      }

      const name = studentNames[studentId] || `Student ${studentId}`;

      const response = await axios.post(`${API_URL}/api/register`, {
        studentId,
        classId: form.classId,
        name: name,
        image: compressedImage
      });

      if (response.data.success) {
        setStudentList(prev => prev.map(student => 
          student.id === studentId 
            ? { ...student, isRegistered: true }
            : student
        ));
        setShowWebcam(false);
        setCurrentRegistration(null);
        alert('Face registered successfully!');
      } else {
        throw new Error(response.data.message || 'Registration failed');
      }
    } catch (error) {
      alert(`Registration failed: ${error.message}`);
    }
  };

  const renderWebcam = () => (
    <div style={webcamContainerStyle}>
      <Webcam
        audio={false}
        ref={webcamRef}
        screenshotFormat="image/jpeg"
        className="img-fluid rounded mb-3"
        videoConstraints={{ 
          width: 640,
          height: 480,
          facingMode: "user"
        }}
        width={640}
        height={480}
      />
    </div>
  );

  const renderRegistrationView = () => (
    <div className="container py-4">
      <div className="card shadow" style={cardStyle}>
        <div className="card-header d-flex justify-content-between align-items-center" style={cardHeaderStyle}>
          <h3 className="mb-0" style={{ color: '#ffffff', textShadow: '1px 1px 3px rgba(0, 0, 0, 0.8)' }}>
            <i className="bi bi-fingerprint me-2"></i>
            Student Face Management
          </h3>
          <button 
            className="btn"
            style={buttonPrimaryStyle}
            onClick={() => setEditMode(false)}
          >
            {editMode ? <><i className="bi bi-x-circle me-2"></i>Cancel Edit</> : <><i className="bi bi-person-plus me-2"></i>Add New Student</>}
          </button>
        </div>
        <div className="card-body">
          {editMode ? (
            <div className="row">
              <div className="col-md-6">
                <div className="card" style={cardStyle}>
                  <div className="card-body">
                    <h5 style={subHeadingStyle}><i className="bi bi-camera me-2"></i>Update Face for {selectedStudent}</h5>
                    {renderWebcam()}
                    <button
                      className="btn w-100 mt-3"
                      style={{...buttonPrimaryStyle, borderColor: '#ffc107', background: 'rgba(255, 193, 7, 0.2)'}}
                      onClick={updateStudentFace}
                    >
                      <i className="bi bi-arrow-repeat me-2"></i>Update Face
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="row mb-4">
              <div className="col-md-6">
                <div className="card" style={cardStyle}>
                  <div className="card-body">
                    <h5 style={subHeadingStyle}><i className="bi bi-people me-2"></i>Unregistered Students</h5>
                    <div className="list-group">
                      {form.students?.filter(id => !registeredStudents.includes(id))
                        .map(studentId => (
                          <button
                            key={studentId}
                            className="list-group-item list-group-item-action"
                            style={{...inputStyle, cursor: 'pointer'}}
                            onClick={() => setCurrentStudent(studentId)}
                          >
                            <i className="bi bi-person-badge me-2"></i>{studentId}
                          </button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
              <div className="col-md-6">
                {currentStudent && (
                  <div className="card" style={cardStyle}>
                    <div className="card-body">
                      <h5 style={subHeadingStyle}><i className="bi bi-person-plus me-2"></i>Register {currentStudent}</h5>
                      {renderWebcam()}
                      <button
                        className="btn w-100 mt-3"
                        style={{...buttonPrimaryStyle, borderColor: '#28a745', background: 'rgba(40, 167, 69, 0.2)'}}
                        onClick={registerStudentFace}
                      >
                        <i className="bi bi-check-circle me-2"></i>Register Face
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
          
          <div className="card" style={cardStyle}>
            <div className="card-body">
              <h5 style={subHeadingStyle}>
                <i className="bi bi-list-check me-2"></i>Registered Students
              </h5>
              <div className="table-responsive">
                <table className="table table-hover" style={{color: '#ffffff'}}>
                  <thead>
                    <tr style={{borderBottom: '1px solid #00bcf2'}}>
                      <th>Student ID</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {registeredStudents.map(studentId => (
                      <tr key={studentId} style={{borderBottom: '1px solid rgba(0, 188, 242, 0.2)'}}>
                        <td><i className="bi bi-person-check me-2"></i>{studentId}</td>
                        <td>
                          <button
                            className="btn btn-sm me-2"
                            style={{...buttonPrimaryStyle, borderColor: '#ffc107', background: 'rgba(255, 193, 7, 0.2)'}}
                            onClick={() => {
                              setSelectedStudent(studentId);
                              setEditMode(true);
                            }}
                          >
                            <i className="bi bi-pencil"></i> Update
                          </button>
                          <button
                            className="btn btn-sm"
                            style={{...buttonPrimaryStyle, borderColor: '#dc3545', background: 'rgba(220, 53, 69, 0.2)'}}
                            onClick={() => deleteStudent(studentId)}
                          >
                            <i className="bi bi-trash"></i> Delete
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  const renderStudentCard = (student) => (
    <div key={student.id} className="col">
      <div className="card h-100" style={cardStyle}>
        <div className="card-body">
          <div className="mb-3">
            <label className="form-label" style={{ color: '#ffffff', fontWeight: 'bold' }}>Student Name</label>
            <input
              type="text"
              className="form-control"
              style={inputStyle}
              placeholder="Enter student name"
              value={studentNames[student.id] || ''}
              onChange={(e) => setStudentNames({
                ...studentNames,
                [student.id]: e.target.value
              })}
            />
          </div>
          <p className="card-text" style={{ color: '#ffffff', fontWeight: 'bold' }}>
            <i className="bi bi-person-badge me-2"></i>ID: {student.id}
          </p>
          {student.isRegistered ? (
            <div style={{
              background: 'rgba(40, 167, 69, 0.3)',
              border: '1px solid #28a745',
              color: '#ffffff',
              borderRadius: '5px',
              padding: '10px',
              textAlign: 'center',
              fontWeight: 'bold',
              textShadow: '1px 1px 2px rgba(0, 0, 0, 0.7)'
            }}>
              <i className="bi bi-shield-check me-2"></i> Registered
            </div>
          ) : (
            <button
              className="btn w-100"
              style={buttonPrimaryStyle}
              onClick={() => {
                setCurrentRegistration(student.id);
                setShowWebcam(true);
              }}
            >
              <i className="bi bi-camera me-2"></i>Register Face
            </button>
          )}
        </div>
      </div>
    </div>
  );

  const renderStudentList = () => (
    <div className="container py-4">
      <div className="card shadow" style={cardStyle}>
        <div className="card-header d-flex justify-content-between align-items-center" style={cardHeaderStyle}>
          <h3 className="mb-0"><i className="bi bi-person-plus-fill me-2"></i>Student Registration</h3>
          <button 
            className="btn" 
            style={buttonPrimaryStyle}
            onClick={() => setRegistrationMode(true)}
          >
            <i className="bi bi-list-ul me-2"></i>View All Registrations
          </button>
        </div>
        <div className="card-body">
          {showWebcam && currentRegistration && (
            <div className="mb-4">
              <div className="card" style={cardStyle}>
                <div className="card-body">
                  <h5><i className="bi bi-camera-fill me-2"></i>Register {currentRegistration}</h5>
                  {renderWebcam()}
                  <div className="d-flex gap-2 mt-3">
                    <button
                      className="btn flex-grow-1"
                      style={{...buttonPrimaryStyle, borderColor: '#28a745', background: 'rgba(40, 167, 69, 0.2)'}}
                      onClick={() => registerFace(currentRegistration)}
                    >
                      <i className="bi bi-camera me-2"></i>Capture & Register
                    </button>
                    <button
                      className="btn"
                      style={{...buttonPrimaryStyle, borderColor: '#6c757d', background: 'rgba(108, 117, 125, 0.2)'}}
                      onClick={() => {
                        setShowWebcam(false);
                        setCurrentRegistration(null);
                      }}
                    >
                      <i className="bi bi-x-circle me-2"></i>Cancel
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          <div className="row row-cols-1 row-cols-md-2 row-cols-lg-3 g-4">
            {studentList.map(renderStudentCard)}
          </div>
        </div>
      </div>
    </div>
  );

  return !loggedIn ? (
    <div className="container py-4">
      <div className="row justify-content-center">
        <div className="col-md-6">
          <div className="card shadow" style={cardStyle}>
            <div className="card-header" style={cardHeaderStyle}>
              <h4 className="mb-0" style={{ color: '#ffffff' }}>
                <i className="bi bi-shield-lock me-2"></i>Advisor Authentication
              </h4>
            </div>
            <div className="card-body">
              <form onSubmit={handleSubmit} className="d-flex flex-column gap-3">
                <div className="mb-3">
                  <label className="form-label" style={{ color: '#ffffff', fontWeight: 'bold' }}>Email Address</label>
                  <div className="input-group">
                    <span className="input-group-text" style={{...inputStyle, borderRight: 'none'}}>
                      <i className="bi bi-envelope-fill" style={{ color: '#00bcf2' }}></i>
                    </span>
                    <input
                      type="email"
                      className="form-control"
                      style={{...inputStyle, borderLeft: 'none'}}
                      placeholder="Email"
                      value={email}
                      onChange={e => setEmail(e.target.value)}
                      required
                    />
                  </div>
                </div>
                <div className="mb-3">
                  <label className="form-label" style={{ color: '#ffffff', fontWeight: 'bold' }}>Password</label>
                  <div className="input-group">
                    <span className="input-group-text" style={{...inputStyle, borderRight: 'none'}}>
                      <i className="bi bi-key-fill" style={{ color: '#00bcf2' }}></i>
                    </span>
                    <input
                      type="password"
                      className="form-control"
                      style={{...inputStyle, borderLeft: 'none'}}
                      placeholder="Password"
                      value={password}
                      onChange={e => setPassword(e.target.value)}
                      required
                    />
                  </div>
                </div>
                <button 
                  type="submit" 
                  className="btn"
                  style={buttonPrimaryStyle}
                >
                  <i className="bi bi-box-arrow-in-right me-2"></i>
                  Secure Login
                </button>
              </form>
              <div style={{
                background: 'rgba(23, 162, 184, 0.2)',
                border: '1px solid rgba(23, 162, 184, 0.5)',
                borderRadius: '5px',
                padding: '10px',
                marginTop: '15px',
                color: '#ffffff',
                textShadow: '1px 1px 2px rgba(0, 0, 0, 0.5)',
              }}>
                <i className="bi bi-info-circle me-2"></i>
                <strong>Demo Credentials:</strong> mukild.22it@kongu.edu / mukil@16
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  ) : classCreated ? (
    registrationMode ? renderRegistrationView() : renderStudentList()
  ) : (
    <div className="container py-4">
      <h2 style={headingStyle}>
        <i className="bi bi-laptop me-2"></i>Create Class
      </h2>
      <div className="card shadow" style={cardStyle}>
        <div className="card-body">
          <div className="mb-3">
            <label className="form-label" style={{ color: '#ffffff', fontWeight: 'bold' }}>Class ID</label>
            <div className="input-group">
              <span className="input-group-text" style={{...inputStyle, borderRight: 'none'}}>
                <i className="bi bi-hash" style={{ color: '#00bcf2' }}></i>
              </span>
              <input
                className="form-control"
                style={{...inputStyle, borderLeft: 'none'}}
                placeholder="Class ID"
                onChange={(e) => setForm({ ...form, classId: e.target.value })}
              />
            </div>
          </div>
          <div className="mb-3">
            <label className="form-label" style={{ color: '#ffffff', fontWeight: 'bold' }}>Class Name</label>
            <div className="input-group">
              <span className="input-group-text" style={{...inputStyle, borderRight: 'none'}}>
                <i className="bi bi-tag-fill" style={{ color: '#00bcf2' }}></i>
              </span>
              <input
                className="form-control"
                style={{...inputStyle, borderLeft: 'none'}}
                placeholder="Class Name"
                onChange={(e) => setForm({ ...form, name: e.target.value })}
              />
            </div>
          </div>

          <div className="card mb-3" style={cardStyle}>
            <div className="card-body">
              <h3 style={subHeadingStyle}><i className="bi bi-geo-alt-fill me-2"></i>Class Location</h3>
              <p style={{
                color: '#ffffff',
                marginBottom: '15px',
                fontWeight: 'normal',
                textShadow: '1px 1px 2px rgba(0, 0, 0, 0.5)',
              }}>
                Get coordinates from Google Maps: Right-click on location → "What's here?"
              </p>
              <div className="row g-3">
                <div className="col-md-6">
                  <label className="form-label" style={{ color: '#ffffff', fontWeight: 'bold' }}>Latitude</label>
                  <div className="input-group">
                    <span className="input-group-text" style={{...inputStyle, borderRight: 'none'}}>
                      <i className="bi bi-compass" style={{ color: '#00bcf2' }}></i>
                    </span>
                    <input
                      type="number"
                      step="any"
                      className="form-control"
                      style={{...inputStyle, borderLeft: 'none'}}
                      placeholder="Latitude (e.g., 11.2733)"
                      value={form.latitude || ''}
                      onChange={(e) => setForm({ ...form, latitude: e.target.value })}
                    />
                  </div>
                </div>
                <div className="col-md-6">
                  <label className="form-label" style={{ color: '#ffffff', fontWeight: 'bold' }}>Longitude</label>
                  <div className="input-group">
                    <span className="input-group-text" style={{...inputStyle, borderRight: 'none'}}>
                      <i className="bi bi-compass" style={{ color: '#00bcf2' }}></i>
                    </span>
                    <input
                      type="number"
                      step="any"
                      className="form-control"
                      style={{...inputStyle, borderLeft: 'none'}}
                      placeholder="Longitude (e.g., 77.6066)"
                      value={form.longitude || ''}
                      onChange={(e) => setForm({ ...form, longitude: e.target.value })}
                    />
                  </div>
                </div>
              </div>
              <p style={{
                color: '#ffffff',
                marginTop: '12px',
                fontWeight: 'normal',
                fontSize: '0.9rem',
                textShadow: '1px 1px 2px rgba(0, 0, 0, 0.5)',
              }}>
                Example: Kongu Engineering College - Latitude: 11.2733, Longitude: 77.6066
              </p>
            </div>
          </div>

          <div className="card mb-3" style={cardStyle}>
            <div className="card-body">
              <h3 style={subHeadingStyle}><i className="bi bi-people-fill me-2"></i>Student Roll Numbers Range</h3>
              <div className="row g-3">
                <div className="col-md-6">
                  <label className="form-label" style={{ color: '#ffffff', fontWeight: 'bold' }}>Start Roll No</label>
                  <div className="input-group">
                    <span className="input-group-text" style={{...inputStyle, borderRight: 'none'}}>
                      <i className="bi bi-123" style={{ color: '#00bcf2' }}></i>
                    </span>
                    <input
                      type="number"
                      className="form-control"
                      style={{...inputStyle, borderLeft: 'none'}}
                      placeholder="Start Roll No"
                      value={startRollNo}
                      onChange={(e) => setStartRollNo(e.target.value)}
                    />
                  </div>
                </div>
                <div className="col-md-6">
                  <label className="form-label" style={{ color: '#ffffff', fontWeight: 'bold' }}>End Roll No</label>
                  <div className="input-group">
                    <span className="input-group-text" style={{...inputStyle, borderRight: 'none'}}>
                      <i className="bi bi-123" style={{ color: '#00bcf2' }}></i>
                    </span>
                    <input
                      type="number"
                      className="form-control"
                      style={{...inputStyle, borderLeft: 'none'}}
                      placeholder="End Roll No"
                      value={endRollNo}
                      onChange={(e) => setEndRollNo(e.target.value)}
                    />
                  </div>
                </div>
              </div>
              {startRollNo && endRollNo && (
                <p style={{
                  color: '#ffffff',
                  marginTop: '12px',
                  fontWeight: 'normal',
                  fontSize: '0.9rem',
                  textShadow: '1px 1px 2px rgba(0, 0, 0, 0.5)',
                }}>
                  <i className="bi bi-info-circle me-2"></i>
                  Will create {parseInt(endRollNo) - parseInt(startRollNo) + 1} student entries
                </p>
              )}
            </div>
          </div>

          <button 
            onClick={createClass}
            className="btn w-100"
            style={{...buttonPrimaryStyle, borderColor: '#28a745', background: 'rgba(40, 167, 69, 0.2)'}}
          >
            <i className="bi bi-plus-circle me-2"></i>Create Class
          </button>
        </div>
      </div>
    </div>
  );
}
