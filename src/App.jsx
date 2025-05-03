import { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Advisor from './pages/Advisor';
import Student from './pages/Student';
import Navbar from './components/Navbar';
import Dashboard from './components/Dash';
import 'bootstrap/dist/css/bootstrap.min.css';
import 'bootstrap-icons/font/bootstrap-icons.css';

export default function App() {
  const [role, setRole] = useState('dashboard');

  const cyberBackgroundStyle = {
    background: 'linear-gradient(to right, #000428, #004e92)',
    backgroundImage: `
      linear-gradient(to right, #000428, #004e92),
      url("data:image/svg+xml,%3Csvg width='100' height='100' viewBox='0 0 100 100' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M11 18c3.866 0 7-3.134 7-7s-3.134-7-7-7-7 3.134-7 7 3.134 7 7 7zm48 25c3.866 0 7-3.134 7-7s-3.134-7-7-7-7 3.134-7 7 3.134 7 7 7zm-43-7c1.657 0 3-1.343 3-3s-1.343-3-3-3-3 1.343-3 3 1.343 3 3 3zm63 31c1.657 0 3-1.343 3-3s-1.343-3-3-3-3 1.343-3 3 1.343 3 3 3zM34 90c1.657 0 3-1.343 3-3s-1.343-3-3-3-3 1.343-3 3 1.343 3 3 3zm56-76c1.657 0 3-1.343 3-3s-1.343-3-3-3-3 1.343-3 3 1.343 3 3 3zM12 86c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm28-65c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm23-11c2.76 0 5-2.24 5-5s-2.24-5-5-5-5 2.24-5 5 2.24 5 5 5zm-6 60c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm29 22c2.76 0 5-2.24 5-5s-2.24-5-5-5-5 2.24-5 5 2.24 5 5 5zM32 63c2.76 0 5-2.24 5-5s-2.24-5-5-5-5 2.24-5 5 2.24 5 5 5zm57-13c2.76 0 5-2.24 5-5s-2.24-5-5-5-5 2.24-5 5 2.24 5 5 5zm-9-21c1.105 0 2-.895 2-2s-.895-2-2-2-2 .895-2 2 .895 2 2 2zM60 91c1.105 0 2-.895 2-2s-.895-2-2-2-2 .895-2 2 .895 2 2 2zM35 41c1.105 0 2-.895 2-2s-.895-2-2-2-2 .895-2 2 .895 2 2 2zM12 60c1.105 0 2-.895 2-2s-.895-2-2-2-2 .895-2 2 .895 2 2 2z' fill='%2300bcf2' fill-opacity='0.1' fill-rule='evenodd'/%3E%3C/svg%3E")
    `,
    backgroundSize: 'cover',
    position: 'relative',
    minHeight: '100vh',
    overflow: 'hidden',
  };

  const contentStyle = {
    position: 'relative',
    zIndex: 1,
    color: '#ffffff',
    padding: '20px',
  };

  // Add a global style to update text input placeholder colors
  useEffect(() => {
    const style = document.createElement('style');
    style.textContent = `
      ::placeholder {
        color: #b0b0b0 !important;
        opacity: 1 !important;
      }
      
      .text-muted {
        color: #e0e0e0 !important;
        text-shadow: 1px 1px 2px rgba(0, 0, 0, 0.5);
      }
    `;
    document.head.appendChild(style);
    return () => {
      document.head.removeChild(style);
    };
  }, []);

  const matrixOverlayStyle = {
    position: 'absolute',
    top: 0,
    left: 0,
    width: '100%',
    height: '100%',
    backgroundImage: `url("data:image/svg+xml,%3Csvg width='50' height='50' viewBox='0 0 100 100' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M10 10L90 10M10 30L90 30M10 50L90 50M10 70L90 70M10 90L90 90M30 10L30 90M50 10L50 90M70 10L70 90M90 10L90 90' stroke='%230af' stroke-width='0.6' stroke-opacity='0.2'/%3E%3C/svg%3E")`,
    opacity: 0.2,
    zIndex: 0,
  };

  return (
    <div style={cyberBackgroundStyle}>
      <div style={matrixOverlayStyle}></div>
      <BrowserRouter>
        <div style={{ minHeight: '100vh' }}>
          <Navbar setRole={setRole} currentRole={role} />
          <div style={contentStyle}>
            <Routes>
              <Route path="/" element={<Navigate to="/dashboard" />} />
              <Route path="/dashboard" element={<Dashboard />} />
              <Route path="/advisor" element={<Advisor />} />
              <Route path="/student" element={<Student />} />
              <Route path="*" element={
                <div style={{ textAlign: 'center', marginTop: '50px' }}>
                  <h1 style={{ 
                    color: '#ffffff', 
                    textShadow: '0 0 10px rgba(0, 188, 242, 0.7), 0 0 20px rgba(0, 188, 242, 0.5)',
                    fontSize: '2.5rem',
                    fontWeight: 'bold'
                  }}>
                    Welcome to Secure Attendance System
                  </h1>
                  <p style={{ 
                    color: '#ffffff', 
                    fontSize: '1.2rem',
                    textShadow: '1px 1px 3px rgba(0, 0, 0, 0.8)'
                  }}>
                    Please select a portal from the navigation bar
                  </p>
                </div>
              } />
            </Routes>
          </div>
        </div>
      </BrowserRouter>
    </div>
  );
}