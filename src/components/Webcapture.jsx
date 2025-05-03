import React, { useRef, useState, useEffect } from 'react';
import Webcam from 'react-webcam';
import axios from 'axios';
import * as faceapi from 'face-api.js';
import 'bootstrap/dist/css/bootstrap.min.css';
import { Container, Row, Col, Card, Button, Form, Alert, Spinner, Modal } from 'react-bootstrap';

const WebcamCapture = () => {
  const webcamRef = useRef(null);
  const [isLoading, setIsLoading] = useState(false);
  const [feedback, setFeedback] = useState({ message: '', type: '' });
  const [showCamera, setShowCamera] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [userName, setUserName] = useState('');
  const [capturedImage, setCapturedImage] = useState(null);
  const [activeTab, setActiveTab] = useState('login'); // 'login' or 'register'
  const [welcomeMessage, setWelcomeMessage] = useState('');
  const [securityActions, setSecurityActions] = useState([]);
  const [currentActionIndex, setCurrentActionIndex] = useState(0);
  const [isActionPhase, setIsActionPhase] = useState(false);

  const actions = ["Turn Right", "Turn Left", "Smile", "Smile"]; // Updated actions array

  useEffect(() => {
    const loadModels = async () => {
      const MODEL_URL = '/models'; // Use a relative path for models
      try {
        await faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_URL);
        await faceapi.nets.faceLandmark68Net.loadFromUri(MODEL_URL);
        await faceapi.nets.faceExpressionNet.loadFromUri(MODEL_URL);
        console.log('Models loaded successfully');
      } catch (error) {
        console.error('Error loading models:', error);
      }
    };
    loadModels();
  }, []);

  const generateRandomActions = () => {
    const shuffledActions = [...actions].sort(() => 0.5 - Math.random());
    return shuffledActions.slice(0, 3); // Pick 3 random actions
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
      showFeedback("Webcam not found. Please ensure the camera is enabled.", "danger");
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
        showFeedback("Face not detected. Please try again.", "danger");
        return;
      }

      console.log("Detections:", detections);

      const landmarks = detections.landmarks;
      const expressions = detections.expressions;
      const currentAction = securityActions[currentActionIndex];

      let isActionValid = false;

      switch (currentAction) {
        case "Turn Right":
          isActionValid = landmarks.getNose()[0].x > landmarks.getLeftEye()[0].x + 20; // Nose moves right
          break;
        case "Turn Left":
          isActionValid = landmarks.getNose()[0].x < landmarks.getRightEye()[0].x - 20; // Nose moves left
          break;
        case "Smile":
          isActionValid = expressions.happy > 0.7; // Smile detected (threshold set to 0.7 for reliability)
          break;
        default:
          console.error("Unknown action:", currentAction);
          break;
      }

      if (isActionValid) {
        console.log(`Action "${currentAction}" validated successfully`);
        if (currentActionIndex < securityActions.length - 1) {
          setCurrentActionIndex(currentActionIndex + 1);
        } else {
          setIsActionPhase(false);
          setWelcomeMessage("Welcome! You have successfully logged in.");
        }
      } else {
        console.warn(`Action "${currentAction}" not detected correctly`);
        showFeedback(`Action "${currentAction}" not detected correctly. Please try again.`, "danger");
      }
    } catch (error) {
      console.error("Error during validation:", error);
      showFeedback("An error occurred during validation. Please try again.", "danger");
    }
  };

  useEffect(() => {
    if (isActionPhase) {
      const interval = setInterval(() => {
        validateAction();
      }, 3000); // Automatically validate every 3 seconds
      return () => clearInterval(interval);
    }
  }, [isActionPhase, currentActionIndex]);

  const captureImage = () => {
    console.log("WebcamRef:", webcamRef.current);
    const imageSrc = webcamRef.current.getScreenshot();
    setCapturedImage(imageSrc);
    if (activeTab === 'register') {
      setShowModal(true); // Show the registration modal
    } else {
      handleLogin(imageSrc); // Handle login
    }
  };

  const retakePhoto = () => {
    setCapturedImage(null);
  };

  const handleRegister = async () => {
    if (!userName.trim()) {
      showFeedback("Please enter your name", "danger");
      return;
    }
    
    setIsLoading(true);
    try {
      const response = await axios.post("http://localhost:5000/api/register", {
        name: userName,
        image: capturedImage,
      });
      showFeedback(`Registration successful! Welcome, ${userName}!`, "success");
      setShowModal(false); // Close the registration modal
      setCapturedImage(null); // Clear the captured image
      setUserName(''); // Reset the username field
    } catch (error) {
      handleError(error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogin = async (imageSrc) => {
    setIsLoading(true);
    try {
      const response = await axios.post("http://localhost:5000/api/login", {
        image: imageSrc || capturedImage,
      });
      setWelcomeMessage(`Face verified. Please complete the security actions.`);
      setCapturedImage(null);
      startActionPhase(); // Start the action phase after face verification
    } catch (error) {
      handleError(error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogout = () => {
    setWelcomeMessage(''); // Clear the welcome message
    setActiveTab('login'); // Reset to login tab
    setCapturedImage(null); // Clear captured image
    showFeedback("You have been logged out.", "info");
  };

  const handleError = (error) => {
    if (error.response) {
      showFeedback(error.response.data.status || "Unknown error from server", "danger");
    } else if (error.request) {
      showFeedback("No response from server. Please check if the backend is running.", "danger");
    } else {
      showFeedback(error.message, "danger");
    }
  };

  const showFeedback = (message, type) => {
    setFeedback({ message, type });
    setTimeout(() => {
      setFeedback({ message: '', type: '' });
    }, 5000);
  };

  const toggleCamera = () => {
    setShowCamera(!showCamera);
    if (capturedImage) {
      setCapturedImage(null);
    }
  };

  return (
    <Container className="py-5">
      <Row className="justify-content-center">
        <Col md={8} lg={6}>
          <Card className="shadow">
            <Card.Header className="bg-primary text-white">
              <div className="d-flex justify-content-between align-items-center">
                <h3 className="mb-0">Face Recognition Authentication</h3>
                <Button 
                  variant={showCamera ? "light" : "outline-light"} 
                  size="sm" 
                  onClick={toggleCamera}
                  title={showCamera ? "Turn off camera" : "Turn on camera"}
                >
                  <i className={`bi ${showCamera ? "bi-camera-video-off" : "bi-camera-video"}`}></i>
                  {showCamera ? " Disable" : " Enable"} Camera
                </Button>
              </div>
            </Card.Header>
            
            <Card.Body>
              {welcomeMessage && !isActionPhase ? (
                <div className="text-center">
                  <Alert variant="success" className="text-center">
                    {welcomeMessage}
                  </Alert>
                  <Button 
                    variant="danger" 
                    size="lg" 
                    onClick={handleLogout}
                  >
                    Logout
                  </Button>
                </div>
              ) : (
                <>
                  {feedback.message && (
                    <Alert variant={feedback.type} dismissible onClose={() => setFeedback({ message: '', type: '' })}>
                      {feedback.message}
                    </Alert>
                  )}

                  <nav>
                    <div className="nav nav-tabs mb-4">
                      <button
                        className={`nav-link ${activeTab === 'login' ? 'active' : ''}`}
                        onClick={() => { setActiveTab('login'); setCapturedImage(null); }}
                      >
                        Login
                      </button>
                      <button
                        className={`nav-link ${activeTab === 'register' ? 'active' : ''}`}
                        onClick={() => { setActiveTab('register'); setCapturedImage(null); }}
                      >
                        Register
                      </button>
                    </div>
                  </nav>

                  {isActionPhase && (
                    <div className="text-center mb-4">
                      <h5 className="mb-4">Perform the following action:</h5>
                      <Alert variant="info" className="text-center">
                        {securityActions[currentActionIndex]}
                      </Alert>
                    </div>
                  )}

                  <div className="webcam-container text-center mb-4">
                    {showCamera && (
                      <Webcam
                        audio={false}
                        ref={webcamRef}
                        screenshotFormat="image/jpeg"
                        className="img-fluid rounded border"
                        videoConstraints={{
                          facingMode: "user"
                        }}
                      />
                    )}
                  </div>

                  <div className="d-grid gap-2">
                    {!capturedImage ? (
                      <Button
                        variant="primary"
                        size="lg"
                        onClick={captureImage}
                        disabled={isLoading || !showCamera}
                      >
                        {isLoading ? (
                          <>
                            <Spinner as="span" animation="border" size="sm" className="me-2" />
                            Processing...
                          </>
                        ) : (
                          <>
                            <i className="bi bi-camera me-2"></i>
                            {activeTab === 'login' ? 'Scan Face to Login' : 'Capture Photo to Register'}
                          </>
                        )}
                      </Button>
                    ) : (
                      activeTab === 'login' && (
                        <Button
                          variant="success"
                          size="lg"
                          onClick={() => handleLogin()}
                          disabled={isLoading}
                        >
                          {isLoading ? (
                            <>
                              <Spinner as="span" animation="border" size="sm" className="me-2" />
                              Verifying...
                            </>
                          ) : (
                            <>
                              <i className="bi bi-box-arrow-in-right me-2"></i>
                              Verify & Login
                            </>
                          )}
                        </Button>
                      )
                    )}
                  </div>
                </>
              )}
            </Card.Body>
          </Card>
        </Col>
      </Row>

      {/* Registration Modal */}
      <Modal show={showModal} onHide={() => setShowModal(false)} centered>
        <Modal.Header closeButton>
          <Modal.Title>Complete Registration</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <Form>
            <Form.Group className="mb-3">
              <Form.Label>Your Name</Form.Label>
              <Form.Control
                type="text"
                placeholder="Enter your full name"
                value={userName}
                onChange={(e) => setUserName(e.target.value)}
                autoFocus
              />
              <Form.Text className="text-muted">
                This name will be used to identify you during login.
              </Form.Text>
            </Form.Group>
            
            <div className="text-center mb-3">
              <img 
                src={capturedImage} 
                alt="Your photo" 
                className="img-thumbnail" 
                style={{ maxHeight: '200px' }}
              />
            </div>
          </Form>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => {setShowModal(false); setCapturedImage(null);}}>
            Cancel
          </Button>
          <Button variant="success" onClick={handleRegister} disabled={isLoading}>
            {isLoading ? (
              <>
                <Spinner as="span" animation="border" size="sm" className="me-2" />
                Registering...
              </>
            ) : (
              'Complete Registration'
            )}
          </Button>
        </Modal.Footer>
      </Modal>
    </Container>
  );
};

export default WebcamCapture;   