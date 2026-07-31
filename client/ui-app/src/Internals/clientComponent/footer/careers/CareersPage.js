import React, { useEffect, useState } from "react";
import { Helmet } from "react-helmet-async";
import { Link, useNavigate } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import {
  ArrowRight, BriefcaseBusiness, Building2, Check, ChevronRight,
  HeartHandshake, MapPin, Menu, MessageCircle, Rocket,
  Search, ShieldCheck, Users, X, Zap,
} from "lucide-react";
import { createScopedClassNames } from "../../../../utils/createScopedClassNames";
import Footer from "../footer";
import logo from "../../../../assets/mclogo.webp";
import teamImage from "../../../../assets/hiringpage-img1.webp";
import ceoImage from "../../../../assets/Ceo.webp";
import advisorImage from "../../../../assets/advicers.webp";
import ambassadorImage from "../../../../assets/ambassador.webp";
import styles from "./CareersPage.module.css";
import { fetchHiringFilters } from "../../../../redux/actions/hiringActions.js";

const cx = createScopedClassNames(styles);
const navItems = [["Our story", "story"], ["Our team", "team"], ["Values", "values"], ["Why MassClick", "benefits"], ["Business journey", "process"], ["Careers", "careers"]];
const teamRoles = [
  {
    id: "ceo",
    image: ceoImage,
    eyebrow: "Leadership",
    title: "Muruganantham",
    role: "Chief Executive Officer",
    organization: "MassClick Technologies Private Limited",
    description: "Leading MassClick's vision, growth and commitment to building trusted digital connections for businesses across India.",
    details: ["Strategic leadership", "Business transformation", "Customer-first growth"],
  },
  {
    id: "advisor",
    image: advisorImage,
    eyebrow: "Guidance",
    title: "Rtn. Dr. AKS. K. Srinivasan",
    role: "Advisor",
    organization: "MassClick Technologies Private Limited",
    description: "A respected civic, business and communications leader whose experience across professional institutions, public service and community organizations strengthens MassClick's leadership vision.",
    sections: [
      {
        title: "Leadership & advisory",
        items: [
          "Director, Governing Council, PRCI",
          "PRCI National Executive",
          "Director, Rockcity Nidhi Ltd, Trichy",
          "Advisor to Niraali Paramedical Institution, Mahalakshmi Group of Institutions and the Institute of Ophthalmology, Joseph Eye Hospital",
        ],
      },
      {
        title: "Professional & community service",
        items: [
          "Media Publicity Officer, Rotary Club of Tiruchirapalli, 2024–2027",
          "Vice Chairman & Promotions, Pro Legal Trust",
          "Chairman, India Red Cross Society, Srirangam Sub-Taluk",
          "Professional Associate, Press Club of Bangalore",
        ],
      },
      {
        title: "Recognition & memberships",
        items: [
          "Chanakya Awardee — Humanitarian Award 2025",
          "Ambassador Extraordinaire, Pachyderm Tales",
          "Patron Member, Builders Association of India, Trichy Centre",
          "Member, Rotary Club of Tiruchirapalli, RID 3000",
        ],
      },
    ],
  },
  {
    id: "ambassador",
    image: ambassadorImage,
    eyebrow: "Community",
    title: "Rtn. U. Rubini",
    role: "Brand Ambassador",
    organization: "MassClick Technologies Private Limited",
    description: "A finance professional, consultant and social activist representing MassClick through community leadership, public awareness and meaningful customer connections.",
    sections: [
      {
        title: "Professional highlights",
        items: [
          "Finance Analyst & Consultant",
          "Managing Director, Storia Portraits",
          "Licensed Insurance Agent — life, health and general insurance solutions",
          "Awareness Speaker, Professional Counsellor and Social Media Influencer",
        ],
      },
      {
        title: "Leadership & positions",
        items: [
          "President, E Save Social Welfare & Charitable Trust",
          "State Co-ordinator, Global Social Welfare Protection Movement",
          "Treasurer, Trichy Payaneettalar Iyakam",
          "Board Committee Member, The Thiruchi Seva Sangam",
          "Social Media Chairman, Rotary Club of Tiruchirapalli, 2025–2026",
        ],
      },
      {
        title: "Achievements & recognition",
        items: [
          "Food Adulteration Awareness — Consumer Association of India",
          "FSSAI Food Safety Education Program",
          "Bureau of Indian Standards — Consumer Protection",
          "Southern Railway — Friend of Indian Railways",
          "Safety Rights for All — Rights & Safety Awareness",
        ],
      },
    ],
  },
];
const values = [
  {
    icon: Rocket,
    title: "Innovate Continuously",
    promise: "Build the Future",
    text: "We develop smarter technologies that simplify business discovery, generate quality leads and create better digital experiences.",
  },
  {
    icon: HeartHandshake,
    title: "Grow Together",
    promise: "Customer Success First",
    text: "Every business we support becomes part of our journey. We focus on measurable growth through digital marketing, local search and intelligent lead generation.",
  },
  {
    icon: ShieldCheck,
    title: "Trust & Transparency",
    promise: "Earn Every Connection",
    text: "Lasting relationships begin with verified business information, transparent communication and reliable solutions customers can trust.",
  },
  {
    icon: Zap,
    title: "Deliver Real Results",
    promise: "Performance That Matters",
    text: "Our goal goes beyond visibility. Every feature is designed to increase enquiries, generate quality leads and improve business success.",
  },
];
const benefits = [
  {
    icon: Search,
    title: "Smart Business Discovery",
    promise: "Get Discovered Instantly",
    text: "Appear in location-based searches and connect with customers actively looking for your products and services.",
  },
  {
    icon: MessageCircle,
    title: "Quality Lead Generation",
    promise: "Receive Genuine Enquiries",
    text: "Receive high-quality customer leads directly through WhatsApp, phone calls and enquiry forms without unnecessary intermediaries.",
  },
  {
    icon: Rocket,
    title: "Complete Digital Growth",
    promise: "All-in-One Business Platform",
    text: "Bring digital marketing, business promotion, verified listings and customer engagement together in one powerful ecosystem.",
  },
  {
    icon: HeartHandshake,
    title: "Trusted Business Partner",
    promise: "Grow With Confidence",
    text: "Join thousands of businesses using MassClick to increase visibility, attract customers and build long-term success.",
  },
];
const steps = [
  ["01", "Create Your Business Profile", "Add your business information, products, services and contact details to establish your digital presence."],
  ["02", "Get Verified", "Complete profile verification to build customer trust and improve your visibility across local search results."],
  ["03", "Reach More Customers", "Appear in location-based searches and receive genuine enquiries through WhatsApp, calls and enquiry forms."],
  ["04", "Grow with MassClick", "Use digital promotions, analytics and smart business tools to increase visibility and accelerate growth."],
];
const storyStats = [
  { icon: Rocket, value: "Est. 2018", label: "7+ years of digital excellence" },
  { icon: Building2, value: "50,000+", label: "Verified business listings" },
  { icon: Search, value: "Millions", label: "Search impressions generated" },
  { icon: MapPin, value: "Across India", label: "An expanding business network" },
  { icon: MessageCircle, value: "Google + WhatsApp", label: "Smart customer lead generation" },
  { icon: HeartHandshake, value: "MSME focused", label: "Affordable digital growth solutions" },
];
const CareersPage = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const hiringFilters = useSelector((state) => state.hiring.filters);
  const [menuOpen, setMenuOpen] = useState(false);
  const [activeProfile, setActiveProfile] = useState(null);
  const [department, setDepartment] = useState("");
  const [location, setLocation] = useState("");
  const scrollToSection = (event, sectionId, closeMenu = false) => {
    event.preventDefault();
    document.getElementById(sectionId)?.scrollIntoView({ behavior: "smooth", block: "start" });
    window.history.replaceState(null, "", `${window.location.pathname}${window.location.search}`);
    if (closeMenu) setMenuOpen(false);
  };
  useEffect(() => {
    const previous = document.documentElement.style.scrollBehavior;
    document.documentElement.style.scrollBehavior = "smooth";
    return () => { document.documentElement.style.scrollBehavior = previous; };
  }, []);
  useEffect(() => {
    dispatch(fetchHiringFilters()).catch(() => {});
  }, [dispatch]);
  useEffect(() => {
    if (!activeProfile) return undefined;
    const previousOverflow = document.body.style.overflow;
    const closeOnEscape = (event) => {
      if (event.key === "Escape") setActiveProfile(null);
    };
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", closeOnEscape);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", closeOnEscape);
    };
  }, [activeProfile]);
  return (
    <div className={cx("page")}>
      <Helmet>
        <title>MassClick | Business Discovery and Digital Growth Platform</title>
        <meta name="description" content="Discover MassClick's journey, leadership and technology-driven platform helping businesses increase visibility, generate quality leads and grow." />
        <link rel="canonical" href="https://massclick.in/careers" />
      </Helmet>
      <header className={cx("header")}>
        <div className={cx("nav-shell")}>
          <Link className={cx("brand")} to="/" aria-label="MassClick home"><img src={logo} alt="MassClick" /></Link>
          <nav className={cx("desktop-nav")} aria-label="Careers navigation">
            {navItems.map(([label, id]) => <a key={id} href={`#${id}`} onClick={(event) => scrollToSection(event, id)}>{label}</a>)}
          </nav>
          <a className={cx("nav-cta")} href="#get-started" onClick={(event) => scrollToSection(event, "get-started")}>Register your business <ArrowRight size={17} /></a>
          <button className={cx("menu-button")} type="button" onClick={() => setMenuOpen(!menuOpen)} aria-expanded={menuOpen} aria-label={menuOpen ? "Close navigation" : "Open navigation"}>{menuOpen ? <X /> : <Menu />}</button>
        </div>
        {menuOpen && <nav className={cx("mobile-nav")} aria-label="Mobile careers navigation">
          {navItems.map(([label, id]) => <a key={id} href={`#${id}`} onClick={(event) => scrollToSection(event, id, true)}>{label}<ChevronRight size={18} /></a>)}
        </nav>}
      </header>
      <main>
        <section className={cx("hero")} id="top">
          <div className={cx("hero-inner")}>
            <div className={cx("hero-copy")}>
              <div className={cx("eyebrow")}><span /> The MassClick story</div>
              <h1>Helping businesses<br /><em>get discovered</em> and grow.</h1>
              <p>One intelligent platform for local search visibility, verified business discovery and genuine customer lead generation across India.</p>
              <div className={cx("hero-actions")}>
                <a className={cx("primary-button")} href="#get-started" onClick={(event) => scrollToSection(event, "get-started")}>Start growing today <ArrowRight size={19} /></a>
                <a className={cx("text-button")} href="#story" onClick={(event) => scrollToSection(event, "story")}>Discover our story <ChevronRight size={18} /></a>
              </div>
              <div className={cx("trust-row")}>
                <div><strong>2018</strong><span>Our journey began</span></div>
                <div><strong>50K+</strong><span>Verified listings</span></div>
                <div><strong>India</strong><span>Built for local growth</span></div>
              </div>
            </div>
            <div className={cx("hero-visual")}>
              <div className={cx("image-frame")}><img src={teamImage} alt="Business team reviewing digital growth insights" /></div>
              <div className={cx("floating-card", "float-top")}><span className={cx("icon-box")}><Users size={20} /></span><span><small>One team</small><strong>Big ambitions</strong></span></div>
              <div className={cx("floating-card", "float-bottom")}><span className={cx("status-dot")} /><span><small>Built for business</small><strong>Visibility that drives growth</strong></span></div>
            </div>
          </div>
        </section>
        <section className={cx("story-section")} id="story">
          <div className={cx("section-shell")}>
            <div className={cx("story-layout")}>
              <div className={cx("story-heading")}>
                <span>Our story</span>
                <h2>From digital promotions to digital transformation.</h2>
                <div className={cx("story-year")}>
                  <strong>2018</strong>
                  <span>Where our journey began</span>
                </div>
              </div>
              <div className={cx("story-copy")}>
                <p className={cx("story-lead")}>
                  Founded in <strong>2018</strong>, <strong>MassClick</strong> began as a
                  digital marketing and digital promotions company with a mission to help
                  local businesses build a strong online presence and connect with more customers.
                </p>
                <p>
                  Starting with website development, social media marketing, SEO, Google
                  Business optimization and branding solutions, MassClick quickly became a
                  trusted digital growth partner for businesses across Tamil Nadu.
                </p>
                <p>
                  As the digital landscape evolved, we recognized a major challenge: customers
                  could search online, but local businesses struggled to receive genuine,
                  high-quality enquiries directly. That insight inspired the
                  <strong> MassClick Local Search Engine</strong>—a smart discovery platform
                  connecting customers and businesses through location-based search and
                  instant lead generation.
                </p>
                <p>
                  Today, MassClick is an innovative <strong>Business Discovery and Lead
                  Generation Platform</strong>. Intelligent search, verified profiles,
                  digital promotions and AI-powered matching help businesses reach the right
                  audience and receive real enquiries through WhatsApp and other channels.
                </p>
                <blockquote>
                  Our vision is to digitally empower every small and medium business with
                  affordable, technology-driven marketing that generates measurable results.
                </blockquote>
              </div>
            </div>
            <div className={cx("story-stats")} aria-label="MassClick statistics">
              {storyStats.map(({ icon: Icon, value, label }) => (
                <article key={value}>
                  <span><Icon size={22} /></span>
                  <div><strong>{value}</strong><p>{label}</p></div>
                </article>
              ))}
            </div>
          </div>
        </section>
        <section className={cx("team-section")} id="team">
          <div className={cx("section-shell")}>
            <div className={cx("section-heading")}>
              <span>Meet our team</span>
              <h2>Leadership, guidance and influence</h2>
              <p>Meet the people who shape our direction, strengthen our decisions and represent the MassClick promise.</p>
            </div>
            <article className={cx("executive-feature")}>
              <div className={cx("executive-main")}>
                <span className={cx("ceo-image")}>
                  <img src={teamRoles[0].image} alt={teamRoles[0].title} />
                  <span className={cx("executive-badge")}>Executive leadership</span>
                </span>
                <div className={cx("ceo-content")}>
                  <span className={cx("executive-kicker")}>Founder&apos;s office</span>
                  <h3>{teamRoles[0].title}</h3>
                  <span className={cx("role-name")}><BriefcaseBusiness size={16} />{teamRoles[0].role}</span>
                  <span className={cx("role-organization")}><Building2 size={16} />{teamRoles[0].organization}</span>
                  <p className={cx("ceo-description")}>Muruganantham leads MassClick with a clear belief: every credible local business deserves the technology and opportunity to be discovered, trusted and chosen.</p>
                  <blockquote>“We are building an inclusive growth platform where better discovery creates meaningful business opportunity.”</blockquote>
                  <button className={cx("executive-link")} type="button" onClick={() => setActiveProfile(teamRoles[0])}>
                    Explore the CEO profile <ArrowRight size={17} />
                  </button>
                </div>
              </div>
              <div className={cx("leadership-principles")}>
                <div className={cx("principles-intro")}>
                  <small>Our leadership agenda</small>
                  <strong>Building lasting value, responsibly.</strong>
                </div>
                <div>
                  <span><Rocket size={19} /></span>
                  <strong>Digital inclusion</strong>
                  <p>Making modern discovery and growth tools accessible to businesses of every size.</p>
                </div>
                <div>
                  <span><ShieldCheck size={19} /></span>
                  <strong>Trust by design</strong>
                  <p>Creating verified, transparent connections between businesses and customers.</p>
                </div>
                <div>
                  <span><HeartHandshake size={19} /></span>
                  <strong>Shared progress</strong>
                  <p>Measuring success through stronger enterprises, communities and customer outcomes.</p>
                </div>
              </div>
            </article>
            <div className={cx("supporting-heading")}>
              <div><span>Advisory &amp; representation</span><h3>Experience that strengthens our perspective</h3></div>
              <p>Independent guidance and community leadership help us make thoughtful decisions and stay connected to the people we serve.</p>
            </div>
            <div className={cx("supporting-team-grid")}>
              {[teamRoles[2], teamRoles[1]].map((profile) => (
                <button
                  className={cx("team-card")}
                  type="button"
                  key={profile.id}
                  onClick={() => setActiveProfile(profile)}
                  aria-label={`View ${profile.title} profile`}
                >
                  <span className={cx("team-image")}>
                    <img src={profile.image} alt={profile.title} />
                  </span>
                  <div className={cx("team-content")}>
                    <small>{profile.eyebrow}</small>
                    <strong>{profile.title}</strong>
                    <div className={cx("role-block")}>
                      <span className={cx("role-name")}><BriefcaseBusiness size={16} />{profile.role}</span>
                      <span className={cx("role-organization")}><Building2 size={16} />{profile.organization}</span>
                    </div>
                    <span className={cx("profile-link")}>View profile <ArrowRight size={17} /></span>
                  </div>
                </button>
              ))}
            </div>
          </div>
        </section>
        <section className={cx("values-section")} id="values"><div className={cx("section-shell")}>
          <div className={cx("section-heading")}><span>What drives us</span><h2>Empowering every business through innovation</h2><p>At MassClick, we combine technology, trust and digital expertise to help businesses get discovered, generate quality leads and achieve sustainable growth.</p></div>
          <div className={cx("values-grid")}>{values.map(({ icon: Icon, title, promise, text }, index) => <article className={cx("value-card")} key={title}><span className={cx("card-number")}>0{index + 1}</span><span className={cx("value-icon")}><Icon size={23} /></span><h3>{title}</h3><h4>{promise}</h4><p>{text}</p></article>)}</div>
        </div></section>
        <section className={cx("benefits-section")} id="benefits"><div className={cx("section-shell", "benefits-layout")}>
          <div className={cx("benefits-copy")}><span className={cx("section-kicker")}>Why businesses choose MassClick</span><h2>Get found.<br />Get connected.<br />Get growing.</h2><p>MassClick empowers businesses with intelligent local search, AI-powered matching and direct customer enquiries—helping them grow faster in today&apos;s digital economy.</p><div className={cx("quote")}><span>“</span><p>At MassClick, every search creates an opportunity, every enquiry becomes a potential customer, and every business deserves the chance to grow.</p></div></div>
          <div className={cx("benefits-grid")}>{benefits.map(({ icon: Icon, title, promise, text }) => <article key={title}><span><Icon size={22} /></span><div><h3>{title}</h3><h4>{promise}</h4><p>{text}</p></div></article>)}</div>
        </div></section>
        <section className={cx("process-section")} id="process"><div className={cx("section-shell")}>
          <div className={cx("section-heading")}><span>Your business journey</span><h2>Grow your business. Reach more customers.</h2><p>Join thousands of businesses using MassClick to increase visibility, generate genuine enquiries and build a stronger digital presence.</p></div>
          <div className={cx("steps")}>{steps.map(([number, title, text]) => <article key={number}><span>{number}</span><h3>{title}</h3><p>{text}</p></article>)}</div>
        </div></section>
        <section className={cx("roles-section")} id="get-started"><div className={cx("roles-card")}>
          <div className={cx("roles-icon")}><Rocket size={28} /></div><span className={cx("roles-kicker")}>Start your digital journey</span><h2>Ready to grow your business?</h2><p>Whether you&apos;re a startup, local shop, professional service, educational institution or enterprise, MassClick provides the technology and digital solutions to help you reach more customers and grow faster.</p>
          <Link className={cx("light-button")} to="/publicize">Register your business <ArrowRight size={19} /></Link><small><Check size={15} /> Join 50,000+ business listings and connect with customers every day.</small>
        </div></section>
        <section className={cx("jobs-section")} id="careers">
          <div className={cx("section-shell")}>
            <div className={cx("section-heading")}>
              <span>We&apos;re hiring</span>
              <h2>Current job vacancies at MassClick</h2>
              <p>Find where your skills can make an impact. Search opportunities by department or location and build the future of local business discovery with us.</p>
            </div>
            <form className={cx("job-filters")} onSubmit={(event) => {
              event.preventDefault();
              const params = new URLSearchParams();
              if (department) params.set("department", department);
              if (location) params.set("location", location);
              navigate(`/careers/jobs${params.toString() ? `?${params.toString()}` : ""}`);
            }}>
              <label>
                <span>Department</span>
                <select value={department} onChange={(event) => setDepartment(event.target.value)}>
                  <option value="">Select department</option>
                  {hiringFilters.departments.map((item) => <option key={item} value={item}>{item}</option>)}
                </select>
              </label>
              <label>
                <span>Location</span>
                <select value={location} onChange={(event) => setLocation(event.target.value)}>
                  <option value="">Select location</option>
                  {hiringFilters.locations.map((item) => <option key={item} value={item}>{item}</option>)}
                </select>
              </label>
              <button type="submit">Search jobs <ArrowRight size={17} /></button>
            </form>
            <Link className={cx("all-jobs-link")} to="/careers/jobs">View all jobs</Link>
          </div>
        </section>
      </main>
      <Footer />
      {activeProfile && (
        <div className={cx("profile-overlay")} role="presentation" onMouseDown={() => setActiveProfile(null)}>
          <div
            className={cx("profile-modal")}
            role="dialog"
            aria-modal="true"
            aria-labelledby="profile-title"
            onMouseDown={(event) => event.stopPropagation()}
          >
            <button className={cx("modal-close")} type="button" onClick={() => setActiveProfile(null)} aria-label="Close profile"><X /></button>
            <div className={cx("modal-image")}><img src={activeProfile.image} alt="" /></div>
            <div className={cx("modal-content")}>
              <span>{activeProfile.eyebrow}</span>
              <h2 id="profile-title">{activeProfile.title}</h2>
              <div className={cx("modal-role")}>
                <span><BriefcaseBusiness size={17} />{activeProfile.role}</span>
                <small><Building2 size={17} />{activeProfile.organization}</small>
              </div>
              <p>{activeProfile.description}</p>
              {activeProfile.sections ? (
                <div className={cx("profile-sections")}>
                  {activeProfile.sections.map((section) => (
                    <section key={section.title}>
                      <h3>{section.title}</h3>
                      <ul>
                        {section.items.map((detail) => <li key={detail}><Check size={17} />{detail}</li>)}
                      </ul>
                    </section>
                  ))}
                </div>
              ) : (
                <ul>
                  {activeProfile.details.map((detail) => <li key={detail}><Check size={17} />{detail}</li>)}
                </ul>
              )}
              <button type="button" onClick={() => setActiveProfile(null)}>Close profile</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
export default CareersPage;
