import { BadgeCheck, Building2, Camera, CheckCircle2, ClipboardCheck, FileCheck2, IdCard, MapPin, ShieldCheck, UserCheck, Users } from "lucide-react";
import styles from "./verifiedNetworkContent.module.css";

const Check = ({ children }) => <li><CheckCircle2 />{children}</li>;

export default function VerifiedNetworkContent() {
  const documents = [
    [Building2,"Business registration details"],[FileCheck2,"GST certificate"],[ClipboardCheck,"Business licence"],
    [IdCard,"Aadhaar or identity details"],[BadgeCheck,"Business experience"],[Users,"Services offered"],
    [Camera,"Business photographs"],[MapPin,"Location and establishment details"]
  ];
  return <div className={styles.content}>
    <section className={styles.statement}><ShieldCheck/><div><span>MassClick verified business</span><h3>Verified through a real, physical business visit</h3><p>A MassClick marketing team member visits the submitted location, meets the business person, reviews evidence, and confirms that the business is genuinely operating before verified status is activated.</p></div></section>

    <section className={styles.alert}><BadgeCheck/><div><b>Not an online-only verification</b><p>MassClick does not grant verified status based only on an online form or uploaded information.</p></div></section>

    <section className={styles.block}><header><b>01</b><div><span>On-site confirmation</span><h3>Direct Business Visit</h3></div></header><p>Our marketing team directly visits the business location and meets the owner or person in charge. The team confirms physical operations and discusses the business, its services, and experience.</p><ul><Check>Business location visited</Check><Check>Business person met</Check><Check>Business activity checked</Check></ul></section>

    <section className={styles.block}><header><b>02</b><div><span>Information collection</span><h3>Business &amp; Owner Details</h3></div></header><p>During the visit, relevant business information and supporting details are collected and reviewed where applicable.</p><div className={styles.documents}>{documents.map(([Icon,label])=><div key={label}><Icon/><span>{label}</span></div>)}</div><ul><Check>Details collected</Check><Check>Supporting information reviewed</Check></ul></section>

    <section className={styles.block}><header><b>03</b><div><span>Evidence review</span><h3>Physical &amp; Document Verification</h3></div></header><p>MassClick cross-checks submitted information against the physical location, documents, photographs, and other available business evidence. Existing presence, history, and service experience may also be considered.</p><div className={styles.evidence}><div><FileCheck2/><b>Documents checked</b></div><div><Camera/><b>Photos checked</b></div><div><ClipboardCheck/><b>Information cross-checked</b></div></div></section>

    <section className={styles.block}><header><b>04</b><div><span>Trust activation</span><h3>MassClick Verified Status</h3></div></header><p>Verified status is updated only after the physical and document verification process is completed. This helps customers and business members identify businesses reviewed through MassClick&apos;s direct process.</p><ul><Check>Verification completed</Check><Check>Verified status activated</Check><Check>Business added to the trusted network</Check></ul></section>

    <section className={styles.path}><span>Why verification matters</span><h3>From real business to trusted network</h3><div><b><Building2/>Real Business</b><i>→</i><b><UserCheck/>Direct Visit</b><i>→</i><b><FileCheck2/>Documents Checked</b><i>→</i><b><ClipboardCheck/>Information Verified</b><i>→</i><strong><ShieldCheck/>Trusted Network</strong></div><p>Physical verification provides a stronger trust signal than online submission alone because the business, person, location, and supporting evidence are reviewed directly.</p></section>
  </div>;
}
