import { useEffect } from "react";
import { ArrowRight, CheckCircle2, X } from "lucide-react";
import styles from "features/public/mrp/components/dynamicInfoModal.module.css";

export default function DynamicInfoModal({ open, onClose, icon: Icon, tone = "blue", eyebrow = "Dashboard insight", title, description, value, valueLabel, status, stats = [], items = [], itemsTitle = "Recent activity", itemsCaption, steps = [], note, action, children }) {
  useEffect(() => {
    if (!open) return undefined;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKeyDown = event => event.key === "Escape" && onClose();
    window.addEventListener("keydown", onKeyDown);
    return () => { document.body.style.overflow = previousOverflow; window.removeEventListener("keydown", onKeyDown); };
  }, [open, onClose]);
  if (!open) return null;
  return <div className={styles.backdrop} onMouseDown={event => event.target === event.currentTarget && onClose()}>
    <section className={styles.modal} role="dialog" aria-modal="true" aria-labelledby="dynamic-info-title">
      <header className={`${styles.header} ${styles[tone] || styles.blue}`}>
        {Icon && <div className={styles.icon}><Icon /></div>}
        <div className={styles.heading}><span>{eyebrow}</span><h2 id="dynamic-info-title">{title}</h2><p>{description}</p></div>
        <button type="button" className={styles.close} onClick={onClose} aria-label="Close"><X /></button>
      </header>
      {(value !== undefined || stats.length > 0) && <div className={styles.summary}>
        {value !== undefined && <div className={styles.primary}><small>{valueLabel}</small><strong>{value}</strong>{status && <span>{status}</span>}</div>}
        {stats.map(item => <div key={item.label}><small>{item.label}</small><b>{item.value}</b>{item.caption && <span>{item.caption}</span>}</div>)}
      </div>}
      <div className={styles.body}>
        {children}
        {items.length > 0 && <><div className={styles.sectionTitle}><h3>{itemsTitle}</h3><span>{itemsCaption || `${items.length} records`}</span></div><div className={styles.items}>{items.map((item,index) => <article key={`${item.title}-${index}`}><i>{index + 1}</i><div><b>{item.title}</b><small>{item.subtitle}</small></div><time>{item.value}</time></article>)}</div></>}
        {steps.length > 0 && <div className={styles.steps}>{steps.map((step,index) => <article key={step.title}><b>{String(index + 1).padStart(2,"0")}</b><div><h4>{step.title}</h4><p>{step.description}</p></div><CheckCircle2 /></article>)}</div>}
        {note && <aside className={styles.note}>{note.icon && <note.icon />}<div><b>{note.title}</b><p>{note.description}</p></div></aside>}
      </div>
      <footer className={styles.footer}><p><CheckCircle2 /> Live, contextual business information</p>{action ? <button type="button" onClick={action.onClick}>{action.label}<ArrowRight /></button> : <button type="button" onClick={onClose}>Understood</button>}</footer>
    </section>
  </div>;
}
