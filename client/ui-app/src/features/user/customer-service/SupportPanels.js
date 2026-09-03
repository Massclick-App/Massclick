import React, { useEffect, useMemo, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { AlertCircle, ArrowLeft, BookOpen, CheckCircle2, ChevronDown, Clock3, ExternalLink, FileText, Mail, MessageCircle, Paperclip, Phone, Plus, Search, Send, Ticket, Upload, X } from "lucide-react";
import { closeSupportTicket, createSupportTicket, loadSupportTicket, loadSupportTickets, replySupportTicket, setSupportSection, setSupportSearch } from "state/actions/supportAction.js";
import styles from "features/user/customer-service/SupportPanels.module.css";

const ARTICLES = [
  { id: "business", category: "Business profile", title: "Update your business details", body: "Open My Business from your dashboard, choose the business, select Edit Profile, update the required fields, and submit. Changes that affect identity may be reviewed before publishing." },
  { id: "leads", category: "Leads", title: "Improve lead delivery", body: "Confirm that your category, service area, phone number, opening hours, and notification permissions are current. A complete and verified profile is more likely to receive relevant enquiries." },
  { id: "verify", category: "Verification", title: "Complete business verification", body: "Upload a clear accepted business document showing the same business name and address as your profile. You can track the review state from My Business." },
  { id: "payment", category: "Billing", title: "Resolve a failed payment", body: "Check whether money was debited. If not, retry with a stable connection or another payment method. If debited without confirmation, create a Billing ticket and include the transaction reference." },
  { id: "account", category: "Account", title: "Secure and recover your account", body: "Use your registered mobile number to sign in. Never share OTP codes. If your number changed or access is blocked, create an Account ticket for identity verification." },
];

const GUIDES = [
  { title: "Getting started with MassClick", description: "Set up your account and complete a trusted business profile.", steps: ["Sign in with your registered mobile number", "Add or claim your business", "Complete all profile fields", "Submit verification documents"] },
  { title: "Managing leads effectively", description: "Keep enquiries organised and improve response quality.", steps: ["Enable lead notifications", "Review new leads promptly", "Contact customers using verified details", "Track outcomes in your dashboard"] },
  { title: "Payments and billing", description: "Understand payments and report transaction problems safely.", steps: ["Verify the selected plan", "Use a supported payment method", "Save the transaction reference", "Create a billing ticket if confirmation is delayed"] },
];

const formatDate = (value) => value ? new window.Intl.DateTimeFormat(undefined, { dateStyle: "medium", timeStyle: "short" }).format(new Date(value)) : "";
const titleCase = (value) => String(value || "").replaceAll("_", " ").replace(/\b\w/g, (letter) => letter.toUpperCase());
const FILE_TYPES = ["image/jpeg", "image/png", "image/gif", "image/webp", "video/mp4", "video/webm", "video/quicktime", "application/pdf", "text/plain", "application/msword", "application/vnd.openxmlformats-officedocument.wordprocessingml.document", "application/vnd.ms-excel", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", "application/zip", "application/x-zip-compressed"];
const FILE_ACCEPT = "image/*,video/mp4,video/webm,video/quicktime,.pdf,.txt,.doc,.docx,.xls,.xlsx,.zip";
const fileSize = (bytes = 0) => bytes >= 1048576 ? `${(bytes / 1048576).toFixed(1)} MB` : `${Math.max(1, Math.round(bytes / 1024))} KB`;
const readFiles = async (fileList, current = []) => {
  const files = [...fileList];
  if (current.length + files.length > 3) throw new Error("You can attach up to 3 files.");
  if (files.some((file) => !FILE_TYPES.includes(file.type))) throw new Error("One or more selected file types are not supported.");
  if (files.some((file) => file.size > 15 * 1024 * 1024)) throw new Error("Each file must be 15 MB or smaller.");
  if ([...current, ...files].reduce((sum, file) => sum + (file.fileSize || file.size), 0) > 25 * 1024 * 1024) throw new Error("Attachments must be 25 MB or smaller in total.");
  return Promise.all(files.map((file) => new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve({ dataUrl: reader.result, fileName: file.name, mimeType: file.type, fileSize: file.size });
    reader.onerror = () => reject(new Error(`Unable to read ${file.name}.`));
    reader.readAsDataURL(file);
  })));
};

export function TicketsPanel({ onLogin }) {
  const dispatch = useDispatch();
  const { tickets, selectedTicket, loading, saving, error } = useSelector((state) => state.support);
  const [creating, setCreating] = useState(false);
  const [reply, setReply] = useState("");
  const [search, setSearch] = useState("");
  const [attachments, setAttachments] = useState([]);
  const [replyAttachments, setReplyAttachments] = useState([]);
  const [fileError, setFileError] = useState("");
  const [form, setForm] = useState({ subject: "", category: "business", priority: "normal", message: "" });

  useEffect(() => { dispatch(loadSupportTickets()).catch(() => {}); }, [dispatch]);

  const submit = async (event) => {
    event.preventDefault();
    try { await dispatch(createSupportTicket({ ...form, attachments })); setCreating(false); setAttachments([]); setForm({ subject: "", category: "business", priority: "normal", message: "" }); }
    catch (requestError) { if (requestError.response?.status === 401) onLogin(); }
  };

  const sendReply = async (event) => {
    event.preventDefault(); if (!reply.trim()) return;
    try { await dispatch(replySupportTicket(selectedTicket.id, reply, replyAttachments)); setReply(""); setReplyAttachments([]); } catch (requestError) { if (requestError.response?.status === 401) onLogin(); }
  };

  const chooseFiles = async (event, current, setter) => {
    try { const next = await readFiles(event.target.files || [], current); setter([...current, ...next]); setFileError(""); }
    catch (uploadError) { setFileError(uploadError.message); }
    event.target.value = "";
  };

  const filteredTickets = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return tickets;
    return tickets.filter((item) => `${item.subject} ${item.ticketNumber} ${item.category} ${item.status} ${item.priority}`.toLowerCase().includes(query));
  }, [search, tickets]);

  if (selectedTicket && !creating) return (
    <div className={styles.panel}>
      <div className={styles.panelHeader}>
        <button className={styles.backButton} onClick={() => dispatch({ type: "SUPPORT/DETAIL_SUCCESS", payload: null })}><ArrowLeft size={18} /> All tickets</button>
        <span className={`${styles.statusBadge} ${styles[selectedTicket.status]}`}>{titleCase(selectedTicket.status)}</span>
      </div>
      <div className={styles.ticketHeading}>
        <div><span>{selectedTicket.ticketNumber}</span><h2>{selectedTicket.subject}</h2></div>
        {selectedTicket.status !== "closed" && <button className={styles.secondaryButton} onClick={() => dispatch(closeSupportTicket(selectedTicket.id))}>Close ticket</button>}
      </div>
      {fileError && <div className={styles.error}><AlertCircle size={17} /> {fileError}</div>}
      <div className={styles.thread}>
        {(selectedTicket.replies || []).map((item) => <article key={item.id} className={`${styles.reply} ${item.senderType === "customer" ? styles.customerReply : ""}`}><div><strong>{item.senderType === "customer" ? "You" : item.senderName || "MassClick Support"}</strong><time>{formatDate(item.createdAt)}</time></div><p>{item.text}</p>{(item.attachments || []).map((file) => file.mimeType?.startsWith("image/") ? <a key={file.key} className={styles.threadImage} href={file.url} target="_blank" rel="noreferrer"><img src={file.url} alt={file.fileName} /><span>{file.fileName}</span></a> : file.mimeType?.startsWith("video/") ? <video key={file.key} className={styles.threadVideo} src={file.url} controls preload="metadata" /> : <a key={file.key} className={styles.threadFile} href={file.url} target="_blank" rel="noreferrer"><FileText size={17} /><span>{file.fileName}</span><small>{fileSize(file.fileSize)}</small></a>)}</article>)}
      </div>
      <form className={styles.replyForm} onSubmit={sendReply}><label htmlFor="ticket-reply">Add a reply</label>{replyAttachments.length > 0 && <div className={styles.selectedFiles}>{replyAttachments.map((file, index) => <span key={`${file.fileName}-${index}`}><Paperclip size={14} /><b>{file.fileName}</b><small>{fileSize(file.fileSize)}</small><button type="button" onClick={() => setReplyAttachments(replyAttachments.filter((_, fileIndex) => fileIndex !== index))}><X size={13} /></button></span>)}</div>}<div><textarea id="ticket-reply" value={reply} onChange={(event) => setReply(event.target.value)} maxLength={4000} placeholder="Write your reply..." /><label className={styles.replyAttach} title="Attach files"><Paperclip size={17} /><input type="file" multiple accept={FILE_ACCEPT} onChange={(event) => chooseFiles(event, replyAttachments, setReplyAttachments)} /></label><button disabled={saving || !reply.trim()} aria-label="Send reply"><Send size={18} /></button></div></form>
    </div>
  );

  return (
    <div className={styles.panel}>
      <div className={styles.panelHeader}><div><h2>Support tickets</h2><p>Track requests that need investigation or follow-up.</p></div><button className={styles.primaryButton} onClick={() => setCreating(!creating)}><Plus size={17} /> New ticket</button></div>
      {!creating && <section className={styles.ticketSearchCard}><div className={styles.searchIcon}><Search size={22} /></div><div><strong>Find your support request</strong><span>Search by ticket number, subject, category or status.</span></div><label><Search size={18} /><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search tickets..." />{search && <button type="button" onClick={() => setSearch("")} aria-label="Clear search"><X size={15} /></button>}</label><small>{filteredTickets.length} of {tickets.length} tickets</small></section>}
      {error && <div className={styles.error}><AlertCircle size={17} /> {error}</div>}
      {fileError && <div className={styles.error}><AlertCircle size={17} /> {fileError}</div>}
      {creating && <form className={styles.ticketForm} onSubmit={submit}>
        <div className={styles.formGrid}><label>Subject<input required maxLength={160} value={form.subject} onChange={(e) => setForm({ ...form, subject: e.target.value })} placeholder="Briefly describe the issue" /></label><label>Category<select value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })}><option value="account">Account</option><option value="business">Business profile</option><option value="leads">Leads</option><option value="verification">Verification</option><option value="billing">Billing</option><option value="technical">Technical</option><option value="other">Other</option></select></label><label>Priority<select value={form.priority} onChange={(e) => setForm({ ...form, priority: e.target.value })}><option value="low">Low</option><option value="normal">Normal</option><option value="high">High</option><option value="urgent">Urgent</option></select></label></div>
        <label>Details<textarea required maxLength={4000} value={form.message} onChange={(e) => setForm({ ...form, message: e.target.value })} placeholder="Include the steps you tried and any reference number. Do not share passwords or OTPs." /></label>
        <div className={styles.uploadBox}><input id="ticket-files" type="file" multiple accept={FILE_ACCEPT} onChange={(event) => chooseFiles(event, attachments, setAttachments)} /><label htmlFor="ticket-files"><span><Upload size={21} /></span><strong>Attach images, videos or documents</strong><small>Up to 3 files · 15 MB each · 25 MB total</small></label>{attachments.length > 0 && <div className={styles.selectedFiles}>{attachments.map((file, index) => <span key={`${file.fileName}-${index}`}><Paperclip size={14} /><b>{file.fileName}</b><small>{fileSize(file.fileSize)}</small><button type="button" onClick={() => setAttachments(attachments.filter((_, fileIndex) => fileIndex !== index))}><X size={13} /></button></span>)}</div>}</div>
        <div className={styles.formActions}><button type="button" className={styles.secondaryButton} onClick={() => setCreating(false)}>Cancel</button><button className={styles.primaryButton} disabled={saving}>{saving ? "Creating..." : "Create ticket"}</button></div>
      </form>}
      {!creating && <div className={styles.ticketList}>{loading ? <div className={styles.empty}>Loading tickets...</div> : tickets.length === 0 ? <div className={styles.empty}><Ticket size={34} /><h3>No support tickets</h3><p>Create a ticket when your issue needs detailed follow-up.</p></div> : filteredTickets.length === 0 ? <div className={styles.empty}><Search size={34} /><h3>No matching tickets</h3><p>Try another ticket number, subject or category.</p></div> : filteredTickets.map((item) => <button key={item.id} className={styles.ticketRow} onClick={() => dispatch(loadSupportTicket(item.id))}><div className={styles.ticketIcon}><Ticket size={19} /></div><div className={styles.ticketMain}><strong>{item.subject}</strong><span>{item.ticketNumber} · {titleCase(item.category)}</span></div><div className={styles.ticketMeta}><span className={`${styles.statusBadge} ${styles[item.status]}`}>{titleCase(item.status)}</span><time>{formatDate(item.lastReplyAt)}</time></div></button>)}</div>}
    </div>
  );
}

export function KnowledgePanel({ mode }) {
  const dispatch = useDispatch();
  const query = useSelector((state) => state.support.search);
  const [open, setOpen] = useState("");
  const items = mode === "help" ? ARTICLES : GUIDES;
  const filtered = useMemo(() => items.filter((item) => `${item.title} ${item.category || ""} ${item.description || ""} ${item.body || ""}`.toLowerCase().includes(query.toLowerCase())), [items, query]);
  return <div className={styles.panel}><div className={styles.knowledgeHero}><div className={styles.largeIcon}>{mode === "help" ? <Search /> : <BookOpen />}</div><h2>{mode === "help" ? "How can we help?" : "Guides and walkthroughs"}</h2><p>{mode === "help" ? "Search answers to common MassClick questions." : "Practical steps for getting the most from MassClick."}</p><label className={styles.search}><Search size={18} /><input value={query} onChange={(e) => dispatch(setSupportSearch(e.target.value))} placeholder="Search support content..." /></label></div><div className={styles.articleList}>{filtered.map((item) => <article key={item.id || item.title} className={styles.article}><button onClick={() => setOpen(open === (item.id || item.title) ? "" : (item.id || item.title))}><div>{item.category && <span>{item.category}</span>}<strong>{item.title}</strong>{item.description && <small>{item.description}</small>}</div><ChevronDown size={19} className={open === (item.id || item.title) ? styles.rotated : ""} /></button>{open === (item.id || item.title) && <div className={styles.articleBody}>{item.body ? <p>{item.body}</p> : <ol>{item.steps.map((step) => <li key={step}>{step}</li>)}</ol>}<button onClick={() => dispatch(setSupportSection("chat"))}><MessageCircle size={16} /> Still need help? Chat with us</button></div>}</article>)}{filtered.length === 0 && <div className={styles.empty}>No results match “{query}”.</div>}</div></div>;
}

export function ContactPanel() {
  const dispatch = useDispatch();
  return <div className={styles.panel}><div className={styles.contactHero}><CheckCircle2 size={36} /><h2>Contact MassClick Support</h2><p>Choose the channel that best matches your issue. Never share passwords, OTPs, or full payment details.</p></div><div className={styles.contactGrid}><button onClick={() => dispatch(setSupportSection("chat"))}><MessageCircle /><strong>Live chat</strong><span>Best for quick questions</span><small><Clock3 size={14} /> Replies typically arrive quickly</small></button><a href="mailto:support@massclick.in"><Mail /><strong>Email support</strong><span>Best for detailed, non-urgent requests</span><small>support@massclick.in <ExternalLink size={13} /></small></a><a href="tel:+919789104201"><Phone /><strong>Call support</strong><span>For urgent account assistance</span><small>+91 97891 04201 <ExternalLink size={13} /></small></a><button onClick={() => dispatch(setSupportSection("tickets"))}><Ticket /><strong>Create a ticket</strong><span>Track technical and billing issues</span><small>View status and reply history</small></button></div></div>;
}
