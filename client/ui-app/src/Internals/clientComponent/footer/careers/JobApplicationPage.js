import React, { useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { Link, useParams } from "react-router-dom";
import { ArrowLeft, BriefcaseBusiness, CheckCircle2, Clock3, MapPin, Send } from "lucide-react";
import { Helmet } from "react-helmet-async";
import { createScopedClassNames } from "../../../../utils/createScopedClassNames";
import { clearApplicationSuccess, fetchPublicJob, submitJobApplication } from "../../../../redux/actions/hiringActions.js";
import Footer from "../footer";
import logo from "../../../../assets/mclogo.webp";
import styles from "./HiringPublic.module.css";

const cx = createScopedClassNames(styles);
const initialForm = { fullName: "", email: "", phone: "", qualification: "", experience: "", currentLocation: "", socialUrl: "", coverNote: "", resumeData: "", resumeFileName: "" };

export default function JobApplicationPage() {
  const { idOrSlug } = useParams();
  const dispatch = useDispatch();
  const { selectedJob: job, loading, error, applicationSuccess } = useSelector((state) => state.hiring);
  const [form, setForm] = useState(initialForm);
  const [fileError, setFileError] = useState("");

  useEffect(() => { dispatch(clearApplicationSuccess()); dispatch(fetchPublicJob(idOrSlug)).catch(() => {}); }, [dispatch, idOrSlug]);
  const change = (event) => setForm((prev) => ({ ...prev, [event.target.name]: event.target.value }));
  const chooseResume = (event) => {
    const file = event.target.files?.[0];
    setFileError("");
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) { setFileError("Resume must be 5 MB or smaller."); return; }
    if (!["application/pdf", "application/msword", "application/vnd.openxmlformats-officedocument.wordprocessingml.document"].includes(file.type)) { setFileError("Upload a PDF, DOC or DOCX resume."); return; }
    const reader = new FileReader();
    reader.onload = () => setForm((prev) => ({ ...prev, resumeData: reader.result, resumeFileName: file.name }));
    reader.readAsDataURL(file);
  };
  const submit = async (event) => {
    event.preventDefault();
    if (!form.resumeData) { setFileError("Please attach your resume."); return; }
    try {
      await dispatch(submitJobApplication(job._id, form));
    } catch (submitError) {
      // Redux exposes the API error beside the form.
      void submitError;
    }
  };

  return <div className={cx("page")}>
    <Helmet><title>{job ? `${job.title} | Careers at MassClick` : "Job opportunity | MassClick"}</title></Helmet>
    <header className={cx("header")}><div className={cx("headerInner")}><Link to="/"><img src={logo} alt="MassClick" /></Link><Link to="/careers/jobs"><ArrowLeft size={17} />All jobs</Link></div></header>
    <main>
      <section className={cx("hero")}><span className={cx("eyebrow")}>Join MassClick</span><h1>{job?.title || (loading ? "Loading opportunity…" : "Job opportunity")}</h1>{job && <div className={cx("meta")} style={{ justifyContent: "center" }}><span><MapPin size={15} />{job.location}</span><span><BriefcaseBusiness size={15} />{job.employmentType} · {job.workplaceType}</span><span><Clock3 size={15} />{job.experience}</span></div>}</section>
      <div className={cx("shell")}>
        {error && <div className={cx("empty")}><h2>Unable to load this opportunity</h2><p>{error}</p></div>}
        {job && <div className={cx("detailGrid")}>
          <article className={cx("detail")}><small className={cx("eyebrow")}>{job.department}</small><h2>About the role</h2><p>{job.description}</p>{job.responsibilities?.length > 0 && <><h2>Responsibilities</h2><ul>{job.responsibilities.map((item) => <li key={item}>{item}</li>)}</ul></>}{job.requirements?.length > 0 && <><h2>What we&apos;re looking for</h2><ul>{job.requirements.map((item) => <li key={item}>{item}</li>)}</ul></>}</article>
          <aside className={cx("formCard")}>
            {applicationSuccess ? <div className={cx("success")}><CheckCircle2 size={42} /><h2>Application received</h2><p>Thank you for applying. Our hiring team will review your profile and contact you if your experience matches the role.</p></div> : <>
              <h2>Apply for this position</h2><p>Fields marked with * are required. Your résumé is securely shared with the MassClick hiring team.</p>
              <form className={cx("form")} onSubmit={submit}>
                <div className={cx("field", "full")}><label htmlFor="fullName">Full name *</label><input id="fullName" name="fullName" value={form.fullName} onChange={change} required /></div>
                <div className={cx("field")}><label htmlFor="email">Email *</label><input id="email" type="email" name="email" value={form.email} onChange={change} required /></div>
                <div className={cx("field")}><label htmlFor="phone">Contact number *</label><input id="phone" name="phone" value={form.phone} onChange={change} required /></div>
                <div className={cx("field")}><label htmlFor="qualification">Highest qualification *</label><input id="qualification" name="qualification" value={form.qualification} onChange={change} required /></div>
                <div className={cx("field")}><label htmlFor="experience">Experience *</label><input id="experience" name="experience" placeholder="e.g. 2 years" value={form.experience} onChange={change} required /></div>
                <div className={cx("field", "full")}><label htmlFor="currentLocation">Current location *</label><input id="currentLocation" name="currentLocation" value={form.currentLocation} onChange={change} required /></div>
                <div className={cx("field", "full")}><label htmlFor="socialUrl">LinkedIn or portfolio</label><input id="socialUrl" type="url" name="socialUrl" value={form.socialUrl} onChange={change} /></div>
                <div className={cx("field", "full")}><label htmlFor="coverNote">Cover note</label><textarea id="coverNote" name="coverNote" value={form.coverNote} onChange={change} placeholder="Tell us why this role interests you." /></div>
                <div className={cx("field", "full")}><label htmlFor="resume">Resume *</label><div className={cx("upload")}><input id="resume" type="file" accept=".pdf,.doc,.docx" onChange={chooseResume} /><small>{form.resumeFileName || "PDF, DOC or DOCX · maximum 5 MB"}</small></div></div>
                {(fileError || error) && <div className={cx("formError")}>{fileError || error}</div>}
                <button className={cx("primaryButton")} type="submit" disabled={loading}>{loading ? "Submitting…" : <>Save & apply <Send size={17} /></>}</button>
              </form>
            </>}
          </aside>
        </div>}
      </div>
    </main>
    <Footer />
  </div>;
}
