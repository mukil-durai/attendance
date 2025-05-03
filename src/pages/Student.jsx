import { useState, useRef, useEffect } from 'react';
import axios from 'axios';
import Webcam from 'react-webcam';
import * as faceapi from 'face-api.js';

const API_URL = 'http://localhost:5001';

export default function Student() {
  const [classId, setClassId] = useState('');
  const [message, setMessage] = useState('');
  const [isVerifying, setIsVerifying] = useState(false);
  const [verifiedName, setVerifiedName] = useState('');
  const [securityActions, setSecurityActions] = useState([]);
  const [currentActionIndex, setCurrentActionIndex] = useState(0);
  const [isActionPhase, setIsActionPhase] = useState(false);
  const webcamRef = useRef(null);
  const actions = ["Turn Right", "Turn Left", "Smile", "Smile"];
  const TURN_THRESHOLD = 50;

  useEffect(() => {
    loadFaceApiModels();
  }, []);

  useEffect(() => {
    if (isActionPhase) {
      const interval = setInterval(() => {
        validateAction();
      }, 3000);
      return () => clearInterval(interval);
    }
  }, [isActionPhase, currentActionIndex]);

  const loadFaceApiModels = async () => {
    try {
      await Promise.all([
        faceapi.nets.tinyFaceDetector.loadFromUri('/models'),
        faceapi.nets.faceLandmark68Net.loadFromUri('/models'),
        faceapi.nets.faceExpressionNet.loadFromUri('/models')
      ]);
      console.log('Face API models loaded');
    } catch (error) {
      console.error('Error loading Face API models:', error);
    }
  };

  const generateRandomActions = () => {
    const shuffledActions = [...actions].sort(() => 0.5 - Math.random());
    return shuffledActions.slice(0, 3);
  };

  const startActionPhase = () => {
    const randomActions = generateRandomActions();
    setSecurityActions(randomActions);
    setCurrentActionIndex(0);
    setIsActionPhase(true);
  };

  const validateAction = async () => {
    if (!webcamRef.current || !webcamRef.current.video) {
      console.error("Webcam not found or video stream not available");
      setMessage("Webcam not found. Please ensure the camera is enabled.");
      return;
    }

    const video = webcamRef.current.video;
    console.log("Validating action...");

    try {
      const detections = await faceapi
        .detectSingleFace(video, new faceapi.TinyFaceDetectorOptions())
        .withFaceLandmarks()
        .withFaceExpressions();

      if (!detections) {
        console.error("No face detected");
        setMessage("Face not detected. Please try again.");
        return;
      }

      console.log("Detections:", detections);

      const landmarks = detections.landmarks;
      const expressions = detections.expressions;
      const currentAction = securityActions[currentActionIndex];

      let isActionValid = false;

      switch (currentAction) {
        case "Turn Right":
          isActionValid = landmarks.getNose()[0].x > landmarks.getLeftEye()[0].x + 20;
          break;
        case "Turn Left":
          isActionValid = landmarks.getNose()[0].x < landmarks.getRightEye()[0].x - 20;
          break;
        case "Smile":
          isActionValid = expressions.happy > 0.7;
          break;
        default:
          console.error("Unknown action:", currentAction);
          break;
      }

      if (isActionValid) {
        console.log(`Action "${currentAction}" validated successfully`);
        if (currentActionIndex >= securityActions.length - 1) {
          setIsActionPhase(false);
          markAttendance(verifiedName);
        } else {
          setCurrentActionIndex(prev => prev + 1);
          setMessage(`Great! Now ${securityActions[currentActionIndex + 1]}`);
        }
      }
    } catch (error) {
      console.error("Validation error:", error);
    }
  };

  const verifyAndMarkAttendance = async () => {
    if (!classId) {
      setMessage('Please enter Class ID');
      return;
    }

    try {
      setIsVerifying(true);
      setMessage('Starting verification...');

      if (!webcamRef.current) {
        throw new Error('Webcam not initialized');
      }

      const imageSrc = webcamRef.current.getScreenshot();
      if (!imageSrc) {
        throw new Error('Failed to capture image');
      }

      // Reset previously verified name to avoid showing old information
      setVerifiedName('');

      console.log('Sending verification request for:', classId);
      const verifyResponse = await axios.post(`${API_URL}/api/verify`, {
        image: imageSrc,
        classId: classId.trim()
      });

      console.log('Verification response:', verifyResponse.data);

      if (verifyResponse.data.success) {
        const { studentId, name } = verifyResponse.data.data;
        // Use studentId as fallback if name is not provided
        const displayName = name || studentId;
        setVerifiedName(displayName);
        setMessage(`Face verified as ${displayName}! Starting security checks...`);
        startActionPhase();
      } else {
        throw new Error(verifyResponse.data.message);
      }
    } catch (error) {
      console.error('Verification error:', error);
      const errorMessage = error.response?.data?.message || error.message;
      setMessage(`Verification failed: ${errorMessage}`);
      setVerifiedName('');
    } finally {
      setIsVerifying(false);
    }
  };

  const markAttendance = async (studentId) => {
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        try {
          const res = await axios.post(`${API_URL}/api/mark-attendance`, {
            studentIds: [studentId], // Changed to send an array of studentIds
            classId,
            lat: position.coords.latitude,
            lng: position.coords.longitude
          });
          setMessage(`Attendance marked successfully for ${studentId}`);
          setClassId('');
          setIsActionPhase(false);
          setCurrentActionIndex(0);
        } catch (error) {
          setMessage(error.response?.data?.message || 'Error marking attendance');
        }
      },
      () => setMessage('Please enable location access')
    );
  };

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

  const webcamContainerStyle = {
    border: '1px solid #00bcf2',
    padding: '5px',
    borderRadius: '5px',
    boxShadow: '0 0 15px rgba(0, 188, 242, 0.5)',
    overflow: 'hidden',
    marginBottom: '20px'
  };

  const securityCheckStyle = {
    background: 'rgba(0, 30, 60, 0.7)',
    border: '1px solid #00bcf2',
    borderRadius: '5px',
    padding: '15px',
    color: '#ffffff',
    boxShadow: '0 0 10px rgba(0, 188, 242, 0.3)',
    marginBottom: '20px'
  };

  const progressBarContainerStyle = {
    height: '10px',
    backgroundColor: 'rgba(0, 30, 60, 0.6)',
    borderRadius: '5px',
    overflow: 'hidden',
    border: '1px solid rgba(0, 188, 242, 0.3)',
    marginTop: '10px'
  };

  const progressBarStyle = {
    height: '100%',
    backgroundColor: '#00bcf2',
    borderRadius: '5px',
    boxShadow: '0 0 10px rgba(0, 188, 242, 0.7)',
    transition: 'width 0.5s ease'
  };

  return (
    <div className="container py-4">
      <div className="row justify-content-center">
        <div className="col-md-6">
          <div className="card shadow" style={cardStyle}>
            <div className="card-header d-flex justify-content-between align-items-center" style={cardHeaderStyle}>
              <h4 className="mb-0">
                <i className="bi bi-shield-lock me-2"></i>
                Secure Facial Authentication
              </h4>
            </div>
            <div className="card-body">
              <div className="text-center" style={webcamContainerStyle}>
                <Webcam
                  audio={false}
                  ref={webcamRef}
                  screenshotFormat="image/jpeg"
                  className="img-fluid rounded"
                  videoConstraints={{ facingMode: 'user' }}
                  width="100%"
                />
              </div>

              {isActionPhase && (
                <div style={securityCheckStyle}>
                  <h5 style={{ color: '#00bcf2', textShadow: '0 0 5px rgba(0, 188, 242, 0.5)' }}>
                    <i className="bi bi-shield-check me-2"></i>
                    Biometric Verification
                  </h5>
                  <p style={{ color: '#ffffff', textShadow: '1px 1px 2px rgba(0, 0, 0, 0.7)' }}>
                    Please {securityActions[currentActionIndex]} to confirm your identity
                  </p>
                  <div style={progressBarContainerStyle}>
                    <div 
                      style={{ 
                        ...progressBarStyle,
                        width: `${((currentActionIndex + 1) / securityActions.length) * 100}%`
                      }}
                    />
                  </div>
                  <div className="text-center mt-2" style={{ fontSize: '0.9rem', color: '#e0e0e0' }}>
                    Step {currentActionIndex + 1} of {securityActions.length}
                  </div>
                </div>
              )}

              <form className="d-flex flex-column gap-3">
                <div className="form-group mb-3">
                  <label className="form-label" style={{ color: '#ffffff', fontWeight: 'bold' }}>Class ID</label>
                  <div className="input-group">
                    <span className="input-group-text" style={{...inputStyle, borderRight: 'none'}}>
                      <i className="bi bi-hash" style={{ color: '#00bcf2' }}></i>
                    </span>
                    <input
                      type="text"
                      className="form-control"
                      placeholder="Enter Class ID"
                      value={classId}
                      onChange={e => setClassId(e.target.value)}
                      disabled={isActionPhase}
                      style={{...inputStyle, borderLeft: 'none'}}
                    />
                  </div>
                </div>
                <button 
                  type="button"
                  className="btn"
                  style={buttonPrimaryStyle}
                  onClick={verifyAndMarkAttendance}
                  disabled={isVerifying || isActionPhase}
                >
                  {isVerifying ? (
                    <>
                      <span className="spinner-border spinner-border-sm me-2" />
                      <span>Verifying Identity...</span>
                    </>
                  ) : (
                    <>
                      <i className="bi bi-fingerprint me-2" />
                      <span>Begin Verification</span>
                    </>
                  )}
                </button>
              </form>

              {verifiedName && (
                <div style={{
                  background: 'rgba(0, 188, 242, 0.2)',
                  border: '1px solid #00bcf2',
                  borderRadius: '5px',
                  padding: '15px',
                  marginTop: '20px',
                  color: '#ffffff',
                  textShadow: '1px 1px 2px rgba(0, 0, 0, 0.5)'
                }}>
                  <i className="bi bi-person-check-fill me-2"></i>
                  <span style={{ fontWeight: 'bold' }}>Verified Student:</span> {verifiedName}
                </div>
              )}

              {message && (
                <div style={{
                  background: message.includes('success') ? 'rgba(40, 167, 69, 0.2)' : 'rgba(220, 53, 69, 0.2)',
                  border: `1px solid ${message.includes('success') ? '#28a745' : '#dc3545'}`,
                  borderRadius: '5px',
                  padding: '15px',
                  marginTop: '20px',
                  color: '#ffffff',
                  textShadow: '1px 1px 2px rgba(0, 0, 0, 0.5)'
                }}>
                  <i className={`bi ${message.includes('success') ? 'bi-check-circle' : 'bi-exclamation-triangle'} me-2`}></i>
                  {message}
                </div>
              )}
            </div>
            <div className="card-footer" style={{ 
              borderTop: '1px solid rgba(0, 188, 242, 0.3)',
              backgroundColor: 'rgba(0, 20, 40, 0.5)',
              padding: '10px 15px'
            }}>
              <div className="text-center" style={{ color: '#e0e0e0', fontSize: '0.9rem' }}>
                <i className="bi bi-shield-lock me-2"></i>
                Secure Authentication System
              </div>
            </div>
          </div>

          <div className="card mt-4" style={cardStyle}>
            <div className="card-body">
              <h5 style={{ color: '#00bcf2', textShadow: '0 0 5px rgba(0, 188, 242, 0.5)' }}>
                <i className="bi bi-info-circle me-2"></i>
                Instructions
              </h5>
              <ul style={{ color: '#ffffff' }}>
                <li>Enter your Class ID in the field above</li>
                <li>Make sure your face is clearly visible in the camera</li>
                <li>Click "Begin Verification" to start the process</li>
                <li>Follow the prompts to complete the security checks</li>
                <li>Your attendance will be marked upon successful verification</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
