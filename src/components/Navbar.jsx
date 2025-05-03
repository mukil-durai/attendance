import { useNavigate, useLocation } from 'react-router-dom';
import { useState, useEffect } from 'react';

export default function Navbar({ setRole, currentRole }) {
  const navigate = useNavigate();
  const location = useLocation();
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 20);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const handleNavigation = (path) => {
    setRole(path);
    navigate(`/${path}`);
  };

  const navbarStyle = {
    background: 'linear-gradient(to right, #000428, #004e92)',
    borderBottom: '1px solid rgba(0, 188, 242, 0.3)',
    boxShadow: scrolled ? '0 5px 15px rgba(0, 188, 242, 0.2)' : 'none',
    transition: 'all 0.3s ease',
  };

  const brandStyle = {
    fontWeight: 'bold',
    color: '#ffffff',
    textShadow: '0 0 5px rgba(0, 188, 242, 0.5), 0 0 10px rgba(0, 188, 242, 0.3)',
    fontSize: '1.25rem',
  };

  const activeButtonStyle = {
    background: 'rgba(0, 188, 242, 0.3)',
    color: '#ffffff',
    border: '1px solid #00bcf2',
    boxShadow: '0 0 10px rgba(0, 188, 242, 0.5)',
    transition: 'all 0.3s ease',
    fontWeight: 'bold',
  };

  const inactiveButtonStyle = {
    background: 'rgba(0, 30, 60, 0.4)',
    color: '#ffffff',
    border: '1px solid rgba(0, 188, 242, 0.3)',
    transition: 'all 0.3s ease',
  };

  return (
    <nav className="navbar navbar-expand-lg navbar-dark mb-4" style={navbarStyle}>
      <div className="container">
        <span className="navbar-brand" style={brandStyle}>
          <i className="bi bi-shield-lock me-2"></i>
          Secure Attendance System
        </span>
        <div className="navbar-nav ms-auto">
          <button 
            className="btn mx-2"
            style={location.pathname === '/dashboard' ? activeButtonStyle : inactiveButtonStyle}
            onClick={() => handleNavigation('dashboard')}
            onMouseOver={(e) => {
              if (location.pathname !== '/dashboard') 
                e.currentTarget.style.borderColor = '#00bcf2';
            }}
            onMouseOut={(e) => {
              if (location.pathname !== '/dashboard') 
                e.currentTarget.style.borderColor = 'rgba(0, 188, 242, 0.3)';
            }}
          >
            <i className="bi bi-grid-3x3-gap me-2"></i>Dashboard
          </button>
          <button 
            className="btn mx-2"
            style={location.pathname === '/advisor' ? activeButtonStyle : inactiveButtonStyle}
            onClick={() => handleNavigation('advisor')}
            onMouseOver={(e) => {
              if (location.pathname !== '/advisor') 
                e.currentTarget.style.borderColor = '#00bcf2';
            }}
            onMouseOut={(e) => {
              if (location.pathname !== '/advisor') 
                e.currentTarget.style.borderColor = 'rgba(0, 188, 242, 0.3)';
            }}
          >
            <i className="bi bi-fingerprint me-2"></i>Advisor Portal
          </button>
          <button 
            className="btn mx-2"
            style={location.pathname === '/student' ? activeButtonStyle : inactiveButtonStyle}
            onClick={() => handleNavigation('student')}
            onMouseOver={(e) => {
              if (location.pathname !== '/student') 
                e.currentTarget.style.borderColor = '#00bcf2';
            }}
            onMouseOut={(e) => {
              if (location.pathname !== '/student') 
                e.currentTarget.style.borderColor = 'rgba(0, 188, 242, 0.3)';
            }}
          >
            <i className="bi bi-person-badge me-2"></i>Student Portal
          </button>
        </div>
      </div>
    </nav>
  );
}
