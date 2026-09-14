import { useState, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { login } from 'state/actions/authAction.js';
import { Link, useNavigate } from 'react-router-dom';
import { Sun, Moon, Globe2, Mail, LockKeyhole, Eye, EyeOff, ArrowRight, Store, ChartNoAxesColumnIncreasing, Rocket, Users, ShieldCheck, Trophy, Zap, Gem, Sprout, MapPin } from 'lucide-react';
import companyLogo from 'assets/mclogo.webp';
import globe from 'assets/login-globe.png';
import styles from './LoginPage.module.css';

const features = [
  [Store, 'Discover Businesses', 'Find. Connect. Grow.', 'orange'],
  [ChartNoAxesColumnIncreasing, 'Data-Driven Insights', 'Smarter decisions.', 'blue'],
  [Rocket, 'Boost Local Growth', 'More opportunities.', 'green'],
  [Users, 'Build Communities', 'Together stronger.', 'purple'],
];
const benefits = [[Trophy, 'Trusted', 'by businesses', 'orange'], [Zap, 'Connected', 'in one place', 'blue'], [ShieldCheck, 'Account', 'access controls', 'green'], [Gem, 'Always', 'innovating', 'purple']];
const copy = {
  en: { welcome: 'Welcome Back!', subtitle: 'Sign in to access your MassClick admin console.', username: 'Username', password: 'Password', remember: 'Remember username', forgot: 'Forgot password?', submit: 'Sign In', loading: 'Signing you in…' },
  ta: { welcome: 'மீண்டும் வருக!', subtitle: 'MassClick நிர்வாகக் கணக்கில் உள்நுழையவும்.', username: 'பயனர் பெயர்', password: 'கடவுச்சொல்', remember: 'பயனர் பெயரை நினைவில் கொள்', forgot: 'கடவுச்சொல் மறந்துவிட்டதா?', submit: 'உள்நுழைய', loading: 'உள்நுழைகிறது…' },
};
const savedName = () => { try { return localStorage.getItem('massclick:login:username') || ''; } catch { return ''; } };

export default function Login({ setIsAuthenticated }) {
  const dispatch = useDispatch();
  const auth = useSelector(state => state.auth);
  const navigate = useNavigate();
  const [userName, setUserName] = useState(savedName);
  const [password, setPassword] = useState('');
  const [remember, setRemember] = useState(() => Boolean(savedName()));
  const [showPassword, setShowPassword] = useState(false);
  const [dark, setDark] = useState(false);
  const [language, setLanguage] = useState('en');
  const [recovery, setRecovery] = useState(false);
  const t = copy[language];
  const handleSubmit = e => {
    e.preventDefault();
    if (auth.loading) return;
    try {
      if (remember) localStorage.setItem('massclick:login:username', userName.trim());
      else localStorage.removeItem('massclick:login:username');
    } catch { /* Sign-in remains available when storage is blocked. */ }
    dispatch(login(userName.trim(), password));
  };
  useEffect(() => {
    if (auth.user && auth.accessToken) {
      setIsAuthenticated?.(true);
      navigate('/dashboard', { replace: true });
    }
  }, [auth.user, auth.accessToken, navigate, setIsAuthenticated]);

  return <main className={`${styles.page} ${dark ? styles.dark : ''}`}>
    <header className={styles.header}>
      <Link to='/' aria-label='MassClick home'><img className={styles.logo} src={companyLogo} alt='MassClick Technologies Pvt Ltd' /></Link>
      <div className={styles.controls}>
        <div className={styles.theme} aria-label='Color theme'>
          <button type='button' aria-label='Light theme' aria-pressed={!dark} onClick={() => setDark(false)}><Sun size={21} /></button>
          <button type='button' aria-label='Dark theme' aria-pressed={dark} onClick={() => setDark(true)}><Moon size={21} /></button>
        </div>
        <label className={styles.language}><Globe2 size={20} /><select aria-label='Sign-in language' value={language} onChange={e => setLanguage(e.target.value)}><option value='en'>English</option><option value='ta'>தமிழ்</option></select></label>
      </div>
    </header>
    <div className={styles.layout}>
      <section className={styles.intro} aria-label='About MassClick'>
        <div className={styles.artwork} aria-hidden='true'><img src={globe} alt='' /><span className={styles.orbit}>LOCAL BUSINESSES · GLOBAL IMPACT</span>
          <div className={`${styles.floatCard} ${styles.local}`}><MapPin /><span>Local<br /><b>Discoveries</b></span></div>
          <div className={`${styles.floatCard} ${styles.community}`}><Users /><span>Active<br /><b>Communities</b></span></div>
          <div className={`${styles.floatCard} ${styles.growth}`}><ChartNoAxesColumnIncreasing /><span>Business<br /><b>Growth</b></span></div>
          <div className={`${styles.floatCard} ${styles.global}`}><Globe2 /><span>Global<br /><b>Connections</b></span></div>
        </div>
        <div className={styles.pitch}><p className={styles.eyebrow}>ONE PLATFORM. LIMITLESS OPPORTUNITIES.</p>
          <h1>Empowering<br /><em>Local Businesses</em><br />for a <em>Smarter<br />Tomorrow</em></h1>
          <p className={styles.description}>MassClick Technologies Pvt Ltd connects people, businesses and communities with innovative technology, data and digital solutions.</p>
          <div className={styles.features}>{features.map(([Icon, title, subtitle, color]) => <div key={title}><span className={`${styles.icon} ${styles[color]}`}><Icon /></span><strong>{title}</strong><small>{subtitle}</small></div>)}</div>
        </div>
        <div className={styles.highlights}><Link to='/aboutus' className={styles.story}><span>See How MassClick<br />Empowers Local Businesses<small>Discover our story <ArrowRight size={16} /></small></span></Link>
          <div className={styles.benefits}>{benefits.map(([Icon, title, subtitle, color]) => <div key={title}><span className={`${styles.icon} ${styles[color]}`}><Icon /></span><strong>{title}</strong><span>{subtitle}</span></div>)}</div>
        </div>
      </section>
      <section className={styles.card} aria-labelledby='login-title'>
        <img className={styles.cardLogo} src={companyLogo} alt='MassClick' />
        <div lang={language}><h2 id='login-title'>{t.welcome}</h2><p className={styles.subtitle}>{t.subtitle}</p>
          <form onSubmit={handleSubmit}>
            {auth.error && <div role='alert' className={styles.error}>{typeof auth.error === 'string' ? auth.error : 'Unable to sign in. Please try again.'}</div>}
            <label className={styles.field} htmlFor='username'>{t.username}<span><Mail size={21} /><input id='username' name='username' value={userName} onChange={e => setUserName(e.target.value)} placeholder='Enter your username' autoComplete='username' autoCapitalize='none' spellCheck={false} required /></span></label>
            <label className={styles.field} htmlFor='password'>{t.password}<span><LockKeyhole size={21} /><input id='password' name='password' type={showPassword ? 'text' : 'password'} value={password} onChange={e => setPassword(e.target.value)} placeholder='Enter your password' autoComplete='current-password' required /><button type='button' aria-label={showPassword ? 'Hide password' : 'Show password'} onClick={() => setShowPassword(v => !v)}>{showPassword ? <EyeOff size={20} /> : <Eye size={20} />}</button></span></label>
            <div className={styles.formOptions}><label><input type='checkbox' checked={remember} onChange={e => { setRemember(e.target.checked); if (!e.target.checked) { try { localStorage.removeItem('massclick:login:username'); } catch {} } }} />{t.remember}</label><button type='button' onClick={() => setRecovery(v => !v)} aria-expanded={recovery}>{t.forgot}</button></div>
            {recovery && <p className={styles.notice} role='status'>Contact your administrator to reset your password, or <Link to='/contact-us'>contact MassClick support</Link>.</p>}
            <button type='submit' className={styles.submit} disabled={auth.loading}>{auth.loading ? t.loading : t.submit}<ArrowRight size={22} /></button>
          </form>
        </div>
        <div className={styles.divider}>OR CONTINUE WITH</div>
        <div className={styles.providers} aria-describedby='provider-note'><button disabled><b className={styles.google}>G</b>Google</button><button disabled><span className={styles.microsoft} />Microsoft</button><button disabled><span className={styles.apple}>●</span>Apple</button></div>
        <p id='provider-note' className={styles.providerNote}>Social sign-in is not enabled for admin accounts.</p>
        <div className={styles.security}><span className={`${styles.icon} ${styles.green}`}><ShieldCheck /></span><p>Use your authorized account to securely access your MassClick workspace.</p></div>
        <Link to='/aboutus' className={styles.communityLink}><Sprout size={48} /><strong>Together for<br />Stronger Communities</strong><span><ArrowRight /></span></Link>
      </section>
    </div>
    <footer className={styles.footer}><span>© {new Date().getFullYear()} MassClick Technologies Pvt Ltd. All rights reserved.</span><nav aria-label='Footer'><Link to='/privacy'>Privacy</Link><Link to='/terms'>Terms</Link><Link to='/contact-us'>Help</Link><Link to='/contact-us'>Contact</Link></nav></footer>
  </main>;
}
