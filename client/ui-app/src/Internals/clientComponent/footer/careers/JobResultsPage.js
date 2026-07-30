import React, { useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { ArrowLeft, ArrowRight, BriefcaseBusiness, Clock3, MapPin } from "lucide-react";
import { Helmet } from "react-helmet-async";
import { createScopedClassNames } from "../../../../utils/createScopedClassNames";
import { fetchHiringFilters, fetchPublicJobs } from "../../../../redux/actions/hiringActions.js";
import Footer from "../footer";
import logo from "../../../../assets/mclogo.webp";
import styles from "./HiringPublic.module.css";

const cx = createScopedClassNames(styles);

export default function JobResultsPage() {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const { jobs, filters, loading, error } = useSelector((state) => state.hiring);
  const [department, setDepartment] = useState(params.get("department") || "");
  const [location, setLocation] = useState(params.get("location") || "");

  useEffect(() => { dispatch(fetchHiringFilters()).catch(() => {}); }, [dispatch]);
  useEffect(() => {
    dispatch(fetchPublicJobs({ department: params.get("department") || "", location: params.get("location") || "" })).catch(() => {});
  }, [dispatch, params]);

  const search = (event) => {
    event.preventDefault();
    const next = new URLSearchParams();
    if (department) next.set("department", department);
    if (location) next.set("location", location);
    navigate(`/careers/jobs${next.toString() ? `?${next}` : ""}`);
  };

  return <div className={cx("page")}>
    <Helmet><title>Jobs at MassClick | Current Opportunities</title></Helmet>
    <header className={cx("header")}><div className={cx("headerInner")}><Link to="/"><img src={logo} alt="MassClick" /></Link><Link to="/careers"><ArrowLeft size={17} />Company page</Link></div></header>
    <main>
      <section className={cx("hero")}><span className={cx("eyebrow")}>Careers at MassClick</span><h1>Find where you fit in.</h1><p>Search current opportunities by department or location and help build technology that moves local businesses forward.</p></section>
      <div className={cx("shell")}>
        <form className={cx("filters")} onSubmit={search}>
          <label><span>Department</span><select value={department} onChange={(e) => setDepartment(e.target.value)}><option value="">All departments</option>{filters.departments.map((item) => <option key={item}>{item}</option>)}</select></label>
          <label><span>Location</span><select value={location} onChange={(e) => setLocation(e.target.value)}><option value="">All locations</option>{filters.locations.map((item) => <option key={item}>{item}</option>)}</select></label>
          <button type="submit">Search <ArrowRight size={17} /></button>
        </form>
        <div className={cx("count")}><strong>{loading ? "Loading opportunities…" : `${jobs.length} ${jobs.length === 1 ? "position" : "positions"}`}</strong><span>MassClick Technologies Private Limited</span></div>
        {error && <div className={cx("empty")}><h2>Unable to load jobs</h2><p>{error}</p></div>}
        {!error && !loading && jobs.length === 0 && <div className={cx("empty")}><BriefcaseBusiness size={30} /><h2>No matching openings</h2><p>Try another department or location, or check back again soon.</p></div>}
        <div className={cx("list")}>{jobs.map((job) => <article className={cx("card")} key={job._id}><div><small>{job.department}</small><h2>{job.title}</h2><div className={cx("meta")}><span><MapPin size={15} />{job.location}</span><span><BriefcaseBusiness size={15} />{job.employmentType} · {job.workplaceType}</span><span><Clock3 size={15} />{job.experience || "Experience open"}</span></div><p>{job.summary}</p></div><Link to={`/careers/jobs/${job.slug || job._id}`}>View & apply <ArrowRight size={16} /></Link></article>)}</div>
      </div>
    </main>
    <Footer />
  </div>;
}
