import React, { useState } from 'react';
import { Eye, EyeOff, Mail, Lock, User } from 'lucide-react';

import './LoginPage.css';

export default function LoginPage() {
  const [isLogin, setIsLogin] = useState(true);
  const [showPassword, setShowPassword] = useState(false);
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    name: ''
  });

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // const navigate = useNavigate();
      //navigate('/exchange');
    //console.log('Form submitted:', formData);
  };

  return (
    <div className="login-container">
      {/* Animated background particles */}
      <div className="particles">
        {[...Array(50)].map((_, i) => (
          <div
            key={i}
            className="particle"
            style={{
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`,
              animationDelay: `${Math.random() * 3}s`,
              animationDuration: `${2 + Math.random() * 3}s`
            }}
          />
        ))}
      </div>

      {/* Main login container */}
      <div className="form-wrapper">
        {/* Animated border container */}
        <div className="border-container">
          <div className="border-glow"></div>
          
          {/* Inner container */}
          <div className="form-container">
            {/* Glowing effect */}
            <div className="inner-glow"></div>
            
            <div className="form-content">
              {/* Header */}
              <div className="header">
                <h1 className="title">
                  {isLogin ? 'Welcome Back' : 'Create Account'}
                </h1>
                <p className="subtitle">
                  {isLogin ? 'Sign in to your account' : 'Join us today'}
                </p>
              </div>

              {/* Form */}
              <div className="form">
                {!isLogin && (
                  <div className="input-group">
                    <User className="input-icon" />
                    <input
                      type="text"
                      name="name"
                      placeholder="Full Name"
                      value={formData.name}
                      onChange={handleInputChange}
                      className="form-input"
                    />
                  </div>
                )}

                <div className="input-group">
                  <Mail className="input-icon" />
                  <input
                    type="email"
                    name="email"
                    placeholder="Email Address"
                    value={formData.email}
                    onChange={handleInputChange}
                    className="form-input"
                  />
                </div>

                <div className="input-group">
                  <Lock className="input-icon" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    name="password"
                    placeholder="Password"
                    value={formData.password}
                    onChange={handleInputChange}
                    className="form-input password-input"
                  />
                  {
                 <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="password-toggle"
                  >
                    {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                  </button>}
                </div>

                {isLogin && (
                  <div className="forgot-password">
                    <a href="#" className="forgot-link">
                      Forgot Password?
                    </a>
                  </div>
                )}

                <button
                  type="submit"
                  onClick={handleSubmit}
                  className="submit-button"
                >
                  {isLogin ? 'Sign In' : 'Create Account'}
                </button>
              </div>

              {/* Toggle between login and signup */}
             

              {/* Social login options */}
            
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}