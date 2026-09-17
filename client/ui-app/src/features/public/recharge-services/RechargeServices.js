import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  ArrowRight,
  BusFront,
  Cable,
  Clock3,
  Droplets,
  Fuel,
  GraduationCap,
  HandHeart,
  HeartHandshake,
  HousePlug,
  Landmark,
  Lightbulb,
  Phone,
  ReceiptIndianRupee,
  Repeat2,
  Router,
  SatelliteDish,
  ShieldCheck,
  Smartphone,
  Tv,
  Users,
  Zap,
} from "lucide-react";
import { createScopedClassNames } from "shared/utils/createScopedClassNames.js";
import styles from "features/public/recharge-services/RechargeServices.module.css";
import { BILL_SERVICES } from "features/public/recharge-services/billPaymentConfig.js";
import campaignHero from "assets/recharge-campaign-hero.png";

const cx = createScopedClassNames(styles);

const SERVICES = [
  { name: "Prepaid", icon: Smartphone },
  { name: "Postpaid", icon: ReceiptIndianRupee },
  { name: "Electricity", icon: Lightbulb },
  { name: "DTH", icon: SatelliteDish },
  { name: "Water Bill", icon: Droplets },
  { name: "Broadband", icon: Router },
  { name: "Gas Bill", icon: Fuel },
  { name: "Landline", icon: Phone },
  { name: "Insurance", icon: ShieldCheck },
  { name: "Cable TV", icon: Tv },
  { name: "FASTag", icon: BusFront },
  { name: "Loan Repayment", icon: HandHeart },
  { name: "Subscription", icon: Repeat2 },
  { name: "Education", icon: GraduationCap },
  { name: "Donation", icon: HeartHandshake },
  { name: "Rental", icon: HousePlug },
  { name: "Municipal Services", icon: Landmark },
  { name: "EV Recharge", icon: Zap },
].map((service) => ({
  ...service,
  slug: BILL_SERVICES.find((item) => item.name === service.name)?.slug,
}));

const BENEFITS = [
  { title: "Fast & Convenient", text: "Complete payments in seconds", icon: Zap },
  { title: "Secure Payments", text: "100% safe and encrypted", icon: ShieldCheck },
  { title: "Multiple Biller Options", text: "All major providers supported", icon: Users },
  { title: "Track & Manage", text: "View history and set auto-pay", icon: Clock3 },
];

export default function RechargeServices() {
  const navigate = useNavigate();
  const [showAllServices, setShowAllServices] = useState(false);
  const selectedService = "Prepaid";
  const visibleServices = showAllServices ? SERVICES : SERVICES.slice(0, 6);

  const openPayment = (service) => navigate(`/bills-payment/${service.slug}`);

  return (
    <section className={cx("recharge-section", showAllServices && "recharge-section--expanded")} aria-labelledby="recharge-title">
      <header className={cx("section-header")}>
        <div className={cx("heading-icon")} aria-hidden="true">
          <ReceiptIndianRupee size={30} />
        </div>
        <div className={cx("heading-copy")}>
          <h2 id="recharge-title">Bills &amp; <span>Recharge</span></h2>
          <p>Pay all your bills and recharge in one place.</p>
          <small>Fast. Secure. Reliable. Keep your life running, effortlessly.</small>
        </div>
        <button
          className={cx("view-all")}
          type="button"
          onClick={() => setShowAllServices((current) => !current)}
          aria-expanded={showAllServices}
          aria-controls="recharge-services-grid"
        >
          {showAllServices ? "Show Less" : "View All Services"} <ArrowRight className={cx(showAllServices && "arrow--expanded")} size={17} />
        </button>
      </header>

      <div className={cx("content")}>
        <div className={cx("services-grid")} id="recharge-services-grid">
          {visibleServices.map((service) => {
            const { name, icon: Icon } = service;
            return (
            <button
              className={cx("service", selectedService === name && "service--active")}
              type="button"
              key={name}
              onClick={() => openPayment(service)}
              aria-pressed={selectedService === name}
            >
              <span className={cx("service-icon")} aria-hidden="true"><Icon /></span>
              <span>{name}</span>
            </button>
          );})}
        </div>

        <aside className={cx("quick-card")} id="quick-recharge" aria-label="Quick recharge">
          <div className={cx("quick-copy")}>
            <span className={cx("quick-kicker")}>ONE PLACE. EVERY PAYMENT.</span>
            <h3>Life moves fast.<br /><em>So should your payments.</em></h3>
            <p>Recharge, pay and stay ahead with a seamless MassClick experience.</p>
            <button
              type="button"
              onClick={() => openPayment(SERVICES.find((service) => service.name === selectedService))}
            >
              Start with {selectedService} <ArrowRight size={17} />
            </button>
          </div>
          <img className={cx("campaign-art")} src={campaignHero} alt="" aria-hidden="true" />
          <div className={cx("quick-visual")} aria-hidden="true">
            <Smartphone />
            <span>₹</span>
            <Cable />
          </div>
        </aside>
      </div>

      <div className={cx("benefits")}>
        {BENEFITS.map(({ title, text, icon: Icon }) => (
          <div className={cx("benefit")} key={title}>
            <span aria-hidden="true"><Icon /></span>
            <div><strong>{title}</strong><small>{text}</small></div>
          </div>
        ))}
      </div>
    </section>
  );
}
