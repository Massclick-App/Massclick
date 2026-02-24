import { useState, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { login } from '../../redux/actions/authAction.js';
import { useNavigate } from 'react-router-dom';
import companyLogo from "../../assets/mclogo.png";
import VisibilityIcon from "@mui/icons-material/Visibility";
import VisibilityOffIcon from "@mui/icons-material/VisibilityOff";
import { Link } from "react-router-dom";

import './login.css';

export default function Login({ setIsAuthenticated }) {
  const dispatch = useDispatch();
  const auth = useSelector((state) => state.auth);
  const navigate = useNavigate();

  const [userName, setUserName] = useState('');
  const [password, setPassword] = useState('');
  const [remember, setRemember] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const handleSubmit = (e) => {
    e.preventDefault();
    dispatch(login(userName, password));
  };

  useEffect(() => {
    if (auth.user && auth.accessToken) {
      setIsAuthenticated(true);
      navigate("/dashboard");
    }
  }, [auth, navigate, setIsAuthenticated]);

  return (
    <div className="corp-shell">
      <div className="corp-container">

        <section className="corp-left corp-animate-left">
          <header className="corp-left-header">
            <div className="corp-logo-wrap">
              <img src={companyLogo} alt="MassClick" />
            </div>
          </header>

          <div className="corp-hero">
            <h1>
              Discover &amp; manage
              <span>local businesses globally.</span>
            </h1>
            <p>
              MassClick helps teams search, organize and activate business data
              across markets – with a single, scalable platform.
            </p>
          </div>

          <div className="corp-stats">
            <div className="corp-stat-card">
              <div className="stat-icon">🌍</div>
              <div>
                <span className="stat-number">5k+</span>
                <span className="stat-label">Clients globally</span>
              </div>
            </div>
            <div className="corp-stat-card">
              <div className="stat-icon">⏱</div>
              <div>
                <span className="stat-number">24/7</span>
                <span className="stat-label">Support</span>
              </div>
            </div>
            <div className="corp-stat-card">
              <div className="stat-icon">📊</div>
              <div>
                <span className="stat-number">Single</span>
                <span className="stat-label">Unified console</span>
              </div>
            </div>
          </div>
        </section>

        <section className="corp-right">
          <div className="corp-card corp-animate-card">
            <header className="corp-card-header">
              <div>
                <h2>Sign in</h2>
                <p>Use your work credentials to access the console.</p>
              </div>

              <div className="corp-lang">
                <label htmlFor="lang-select">Language</label>
                <select id="lang-select" defaultValue="en">
                  <option value="en">English</option>
                  <option value="es">Español</option>
                  <option value="fr">Français</option>
                  <option value="de">Deutsch</option>
                </select>
              </div>
            </header>
            <form className="corp-form" onSubmit={handleSubmit}>

              {auth.error && (
                <div style={{
                  background: '#ffe6e6',
                  color: '#d00000',
                  padding: '10px',
                  borderRadius: '6px',
                  marginBottom: '15px',
                  textAlign: 'center',
                  fontWeight: 'bold'
                }}>
                  {auth.error}
                </div>
              )}

              <div className="corp-field">
                <label htmlFor="username">Username</label>
                <input
                  id="username"
                  type="text"
                  value={userName}
                  onChange={(e) => setUserName(e.target.value)}
                  placeholder="name@company.com"
                  autoComplete="username"
                  required
                />
              </div>

              <div className="corp-field">
                <label htmlFor="password">Password</label>
                <div className="corp-password-wrap">
                  <input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Enter your password"
                    autoComplete="current-password"
                    required
                  />
                  <button
                    type="button"
                    className="corp-eye"
                    onClick={() => setShowPassword(!showPassword)}
                    aria-label={showPassword ? "Hide password" : "Show password"}
                  >
                    {showPassword ? <VisibilityOffIcon /> : <VisibilityIcon />}
                  </button>
                </div>
              </div>

              <div className="corp-row-between">
                <label className="corp-checkbox">
                  <input
                    type="checkbox"
                    checked={remember}
                    onChange={(e) => setRemember(e.target.checked)}
                  />
                  <span>Remember me</span>
                </label>
                <button type="button" className="corp-link">
                  Forgot password?
                </button>
              </div>
              <button
                type="submit"
                className="corp-primary-btn"
                disabled={auth.loading}
              >
                {auth.loading ? 'Signing you in...' : 'Login'}
              </button>
              <p className="corp-signup">
                New to MassClick? <Link to="/contact-sales">Talk to sales</Link>
              </p>
            </form>
            <footer className="corp-card-footer">
              <span>© {new Date().getFullYear()} Massclick</span>
              <span className="corp-status">
                <span className="status-dot" /> Systems: Operational
              </span>
            </footer>
          </div>
        </section>

      </div>
    </div>
  );
}
