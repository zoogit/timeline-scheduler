// src/components/LoginForm.jsx
// Updated to remove read_only role option and fix all styling

import React, { useState } from 'react';
import { useAuth } from './AuthContext';
import HoulihanLokeyLogo from "../../Assets/Houlihan_Lokey_logo.png";

const LoginForm = () => {
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [role, setRole] = useState('team_member'); // ✅ UPDATED: Default to team_member instead of read_only
  const [team, setTeam] = useState('');
  const [userName, setUserName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const { signIn, signUp } = useAuth();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      if (isSignUp) {
        const { error } = await signUp(
          email,
          password,
          fullName,
          role,
          team,
          userName
        );
        if (error) throw error;
        alert(
          'Account created! Please check your email to verify your account.'
        );
      } else {
        const { error } = await signIn(email, password);
        if (error) throw error;
      }
    } catch (error) {
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  // ✅ COMPLETE: All inline styles for modern glassmorphism design
  const containerStyle = {
    minHeight: '100vh',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '40px 20px',
    position: 'relative',
    overflow: 'hidden',
    background:
      'linear-gradient(135deg,rgb(129, 129, 129) 0%,rgba(229, 229, 229, 0.65) 100%)',
    fontFamily:
      '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Oxygen, Ubuntu, Cantarell, sans-serif',
  };

  // ✅ ADDED: The missing backgroundStyle that was causing the error
  const backgroundStyle = {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    background:
      'radial-gradient(circle at 20% 80%, rgba(255, 255, 255, 0.3) 0%, transparent 50%), radial-gradient(circle at 80% 20%, rgba(255, 255, 255, 0.2) 0%, transparent 50%)',
    animation: 'glassBgFloat 15s ease-in-out infinite',
  };

  const formWrapperStyle = {
    position: 'relative',
    zIndex: 10,
    animation: 'glassFormSlideIn 0.8s ease-out',
    maxWidth: '480px',
    width: '100%',
  };

  const formStyle = {
    background: 'rgba(255, 255, 255, 0.95)',
    backdropFilter: 'blur(20px)',
    borderRadius: '24px',
    padding: '48px 40px',
    border: '1px solid rgba(255, 255, 255, 0.2)',
    boxShadow:
      '0 25px 50px rgba(0, 0, 0, 0.1), 0 0 0 1px rgba(255, 255, 255, 0.1)',
    position: 'relative',
    overflow: 'hidden',
  };

  const headerStyle = {
    textAlign: 'center',
    marginBottom: '40px',
  };

  const logoStyle = {
    height: '50px',
    width: 'auto',
    marginBottom: '24px',
    filter: 'drop-shadow(0 4px 8px rgba(0, 0, 0, 0.1))',
    transition: 'transform 0.3s ease',
  };

  const titleStyle = {
    fontSize: '32px',
    fontWeight: '700',
    background: 'linear-gradient(135deg, #1a1a1a 0%, #4a4a4a 100%)',
    WebkitBackgroundClip: 'text',
    WebkitTextFillColor: 'transparent',
    backgroundClip: 'text',
    margin: '0 0 12px 0',
  };

  const subtitleStyle = {
    fontSize: '16px',
    color: '#6c757d',
    fontWeight: '400',
    margin: 0,
  };

  const errorStyle = {
    background:
      'linear-gradient(135deg, rgba(220, 53, 69, 0.1) 0%, rgba(220, 53, 69, 0.05) 100%)',
    border: '1px solid rgba(220, 53, 69, 0.2)',
    borderRadius: '12px',
    padding: '16px',
    marginBottom: '24px',
    color: '#dc3545',
    fontSize: '14px',
    fontWeight: '500',
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    animation: 'glassSlideDown 0.4s ease-out',
  };

  const formGroupStyle = {
    marginBottom: '24px',
  };

  const labelStyle = {
    display: 'block',
    marginBottom: '8px',
    fontSize: '14px',
    fontWeight: '600',
    color: '#374151',
    letterSpacing: '0.025em',
  };

  const inputStyle = {
    width: '100%',
    padding: '16px 20px',
    border: '2px solid rgba(229, 231, 235, 0.8)',
    borderRadius: '12px',
    fontSize: '16px',
    fontWeight: '500',
    background: 'rgba(255, 255, 255, 0.9)',
    backdropFilter: 'blur(10px)',
    transition: 'all 0.3s ease',
    outline: 'none',
    color: '#374151',
    boxSizing: 'border-box',
  };

  const selectStyle = {
    ...inputStyle,
    cursor: 'pointer',
    backgroundImage: `url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3e%3cpath stroke='%236b7280' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='m6 8 4 4 4-4'/%3e%3c/svg%3e")`,
    backgroundPosition: 'right 12px center',
    backgroundRepeat: 'no-repeat',
    backgroundSize: '16px',
    paddingRight: '48px',
  };

  const signupFieldsStyle = {
    animation: isSignUp ? 'glassSlideDown 0.5s ease-out' : undefined,
  };

  const buttonStyle = {
    width: '100%',
    padding: '18px 24px',
    background: 'linear-gradient(135deg, #0267ff 0%, #0056d3 100%)',
    color: 'white',
    border: 'none',
    borderRadius: '12px',
    fontSize: '16px',
    fontWeight: '700',
    cursor: loading ? 'not-allowed' : 'pointer',
    transition: 'all 0.3s ease',
    position: 'relative',
    overflow: 'hidden',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '12px',
    letterSpacing: '0.025em',
    boxShadow: '0 8px 25px rgba(2, 103, 255, 0.3)',
    opacity: loading ? 0.7 : 1,
  };

  const toggleSectionStyle = {
    textAlign: 'center',
    marginTop: '32px',
    paddingTop: '24px',
    borderTop: '1px solid rgba(229, 231, 235, 0.5)',
  };

  const toggleTextStyle = {
    fontSize: '14px',
    color: '#6b7280',
    margin: '0 0 12px 0',
    fontWeight: '500',
  };

  const toggleButtonStyle = {
    background: 'none',
    border: 'none',
    color: '#0267ff',
    fontSize: '14px',
    fontWeight: '700',
    cursor: 'pointer',
    textDecoration: 'none',
    transition: 'all 0.2s ease',
    padding: '8px 16px',
    borderRadius: '8px',
    letterSpacing: '0.025em',
  };

  return (
    <>
      {/* ✅ COMPLETE: CSS animations and hover effects */}
      <style>
        {`
          @keyframes glassBgFloat {
            0%, 100% { transform: translateY(0px) rotate(0deg); }
            50% { transform: translateY(-20px) rotate(180deg); }
          }
          @keyframes glassFormSlideIn {
            from { opacity: 0; transform: translateY(30px) scale(0.95); }
            to { opacity: 1; transform: translateY(0) scale(1); }
          }
          @keyframes glassSlideDown {
            from { opacity: 0; transform: translateY(-10px); }
            to { opacity: 1; transform: translateY(0); }
          }
          @keyframes glassSpinner {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
          }
          
          /* Logo hover effect */
          .glass-logo-hover:hover {
            transform: scale(1.05) rotate(1deg);
          }
          
          /* Input focus effects */
          .glass-input-focus:focus {
            border-color: #0267ff !important;
            box-shadow: 0 0 0 3px rgba(2, 103, 255, 0.1) !important;
            background: rgba(255, 255, 255, 1) !important;
          }
          
          /* Button hover effects */
          .glass-button-hover:hover:not(.glass-button-disabled) {
            background: linear-gradient(135deg, #0056d3 0%, #004bb5 100%) !important;
            transform: translateY(-2px);
            box-shadow: 0 12px 35px rgba(2, 103, 255, 0.4) !important;
          }
          
          .glass-button-hover:active:not(.glass-button-disabled) {
            transform: translateY(0);
            box-shadow: 0 6px 20px rgba(2, 103, 255, 0.3) !important;
          }
          
          .glass-button-disabled {
            background: linear-gradient(135deg, #9ca3af 0%, #6b7280 100%) !important;
            box-shadow: none !important;
            transform: none !important;
          }
          
          /* Toggle button hover */
          .glass-toggle-hover:hover {
            background: rgba(2, 103, 255, 0.1) !important;
            color: #0056d3 !important;
          }
          
          /* Input hover effects */
          .glass-input-focus:hover:not(:focus) {
            border-color: rgba(2, 103, 255, 0.3) !important;
            background: rgba(255, 255, 255, 0.95) !important;
          }
          
          /* Select styling */
          .glass-input-focus:focus {
            background-position: right 12px center !important;
          }
          
          /* Responsive design */
          @media (max-width: 640px) {
            .glass-form-container {
              padding: 32px 24px !important;
              margin: 20px !important;
            }
            
            .glass-form-title {
              font-size: 28px !important;
            }
            
            .glass-form-input {
              padding: 14px 16px !important;
              font-size: 16px !important;
            }
            
            .glass-form-button {
              padding: 16px 20px !important;
            }
          }
          
          /* Additional glassmorphism effects */
          .glass-form-container::before {
            content: '';
            position: absolute;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            background: linear-gradient(135deg, rgba(255, 255, 255, 0.1) 0%, rgba(255, 255, 255, 0.05) 100%);
            border-radius: 24px;
            pointer-events: none;
          }
          
          /* Form field animations */
          .glass-form-group {
            position: relative;
            transition: all 0.3s ease;
          }
          
          .glass-form-group:focus-within {
            transform: translateY(-2px);
          }
          
          /* Error message styling */
          .glass-error {
            backdrop-filter: blur(10px);
            position: relative;
          }
          
          .glass-error::before {
            content: '';
            position: absolute;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            background: linear-gradient(135deg, rgba(220, 53, 69, 0.05) 0%, rgba(220, 53, 69, 0.02) 100%);
            border-radius: 12px;
            pointer-events: none;
          }
        `}
      </style>

      <div style={containerStyle}>
        {/* Animated Background */}
        <div style={backgroundStyle}></div>

        {/* Main Glass Form */}
        <div style={formWrapperStyle}>
          <form
            style={formStyle}
            onSubmit={handleSubmit}
            className="glass-form-container"
          >
            <div style={headerStyle}>
              <img
                src={HoulihanLokeyLogo}
                alt="Houlihan Lokey"
                style={logoStyle}
                className="glass-logo-hover"
                onError={(e) => {
                  console.error('Logo failed to load:', e);
                  e.target.style.display = 'none';
                }}
              />
              <h2 style={titleStyle} className="glass-form-title">
                {isSignUp ? 'Get Set Up' : 'Welcome Back'}
              </h2>
              <p style={subtitleStyle}>
                {isSignUp
                  ? 'Create your account to gain access to your dashboard'
                  : 'Sign in to access your dashboard'}
              </p>
            </div>

            {error && (
              <div style={errorStyle} className="glass-error">
                <span style={{ fontSize: '16px', flexShrink: 0 }}>⚠️</span>
                {error}
              </div>
            )}

            <div style={{ marginBottom: '32px' }}>
              {/* Email Field */}
              <div style={formGroupStyle} className="glass-form-group">
                <label htmlFor="email" style={labelStyle}>
                  Email Address
                </label>
                <input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  style={inputStyle}
                  className="glass-input-focus glass-form-input"
                  placeholder="Enter your email"
                  required
                />
              </div>

              {/* Password Field */}
              <div style={formGroupStyle} className="glass-form-group">
                <label htmlFor="password" style={labelStyle}>
                  Password
                </label>
                <input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  style={inputStyle}
                  className="glass-input-focus glass-form-input"
                  placeholder="Enter your password"
                  required
                />
              </div>

              {/* Sign Up Additional Fields */}
              {isSignUp && (
                <div style={signupFieldsStyle}>
                  {/* Full Name */}
                  <div style={formGroupStyle} className="glass-form-group">
                    <label htmlFor="fullName" style={labelStyle}>
                      Full Name
                    </label>
                    <input
                      id="fullName"
                      type="text"
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      style={inputStyle}
                      className="glass-input-focus glass-form-input"
                      placeholder="Enter your full name"
                      required
                    />
                  </div>

                  {/* ✅ UPDATED: Role Selection - Removed read_only option */}
                  <div style={formGroupStyle} className="glass-form-group">
                    <label htmlFor="role" style={labelStyle}>
                      Role
                    </label>
                    <select
                      id="role"
                      value={role}
                      onChange={(e) => setRole(e.target.value)}
                      style={selectStyle}
                      className="glass-input-focus"
                    >
                      <option value="team_member">Team Member</option>
                      <option value="coordinator">Coordinator</option>
                      <option value="manager">Manager</option>
                    </select>
                  </div>

                  {/* Team Selection */}
                  <div style={formGroupStyle} className="glass-form-group">
                    <label htmlFor="team" style={labelStyle}>
                      Team
                    </label>
                    <select
                      id="team"
                      value={team}
                      onChange={(e) => setTeam(e.target.value)}
                      style={selectStyle}
                      className="glass-input-focus"
                    >
                      <option value="">Select Team</option>
                      <option value="London">London</option>
                      <option value="Day">Day</option>
                      <option value="Night">Night</option>
                      <option value="SP">SP</option>
                    </select>
                  </div>

                  {/* System Username */}
                  <div style={formGroupStyle} className="glass-form-group">
                    <label htmlFor="userName" style={labelStyle}>
                      System Username
                    </label>
                    <input
                      id="userName"
                      type="text"
                      value={userName}
                      onChange={(e) => setUserName(e.target.value)}
                      style={inputStyle}
                      className="glass-input-focus glass-form-input"
                      placeholder="Your display name"
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={loading}
              style={buttonStyle}
              className={`glass-button-hover glass-form-button ${
                loading ? 'glass-button-disabled' : ''
              }`}
            >
              {loading ? (
                <>
                  <div
                    style={{
                      width: '16px',
                      height: '16px',
                      border: '2px solid rgba(255, 255, 255, 0.3)',
                      borderTop: '2px solid white',
                      borderRadius: '50%',
                      animation: 'glassSpinner 1s linear infinite',
                    }}
                  ></div>
                  Loading...
                </>
              ) : isSignUp ? (
                'Create Account'
              ) : (
                'Sign In'
              )}
            </button>

            {/* Toggle Link */}
            <div style={toggleSectionStyle}>
              <p style={toggleTextStyle}>
                {isSignUp
                  ? 'Already have an account?'
                  : "Don't have an account?"}
              </p>
              <button
                type="button"
                onClick={() => setIsSignUp(!isSignUp)}
                style={toggleButtonStyle}
                className="glass-toggle-hover"
              >
                {isSignUp ? 'Sign In' : 'Sign Up'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </>
  );
};

export default LoginForm;
