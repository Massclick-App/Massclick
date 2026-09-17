import React, { useEffect, useMemo, useState } from "react";
import { Helmet } from "react-helmet-async";
import { Link, Navigate, useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, Check, CheckCircle2, ChevronRight, CreditCard, Headphones, LockKeyhole, ReceiptIndianRupee, ShieldCheck, Sparkles } from "lucide-react";
import massClickLogo from "assets/mclogo.webp";
import campaignHero from "assets/recharge-campaign-hero.png";
import { createScopedClassNames } from "shared/utils/createScopedClassNames.js";
import { BILL_SERVICES, FIELD_CONFIG, getBillService, getQuickRechargeAmounts } from "features/public/recharge-services/billPaymentConfig.js";
import styles from "features/public/recharge-services/BillsPaymentPage.module.css";

const cx = createScopedClassNames(styles);

export default function BillsPaymentPage() {
  const { serviceSlug } = useParams();
  const navigate = useNavigate();
  const service = useMemo(() => getBillService(serviceSlug), [serviceSlug]);
  const [values, setValues] = useState({});
  const [saveBill, setSaveBill] = useState(true);
  const [step, setStep] = useState("details");

  useEffect(() => {
    setValues({});
    setSaveBill(true);
    setStep("details");
  }, [serviceSlug]);

  if (!service) return <Navigate to="/" replace />;
  const isMobilePrepaid = service.slug === "mobile-prepaid";
  const quickAmounts = isMobilePrepaid ? getQuickRechargeAmounts(values.operator) : [];

  const updateField = (key, value) => setValues((current) => ({
    ...current,
    [key]: value,
    ...(key === "operator" ? { amount: "" } : {}),
    ...(key === "state" ? { provider: "" } : {}),
  }));
  const selectQuickAmount = (amount) => updateField("amount", String(amount));
  const submitDetails = (event) => {
    event.preventDefault();
    setStep("review");
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  return (
    <main className={cx("page")}>
      <Helmet><title>{service.title} | MassClick</title></Helmet>
      <header className={cx("topbar")}>
        <div className={cx("topbar-inner")}>
          <Link to="/" className={cx("brand")} aria-label="MassClick home"><span className={cx("logo-crop")}><img src={massClickLogo} alt="MassClick" /></span></Link>
          <div className={cx("product-title")}><span>Bills &amp; Recharge</span><small>Fast, simple and secure</small></div>
          <div className={cx("secure-label")}><ShieldCheck /><span>Secure payments<small>Protected checkout</small></span></div>
        </div>
      </header>

      <section className={cx("workspace")}>
        <div className={cx("workspace-head")}>
          <button className={cx("back")} type="button" onClick={() => navigate(-1)}><ArrowLeft /> Back to MassClick</button>
          <div className={cx("progress")} aria-label="Payment progress">
            <span className={cx("current")}><b>{step === "review" ? <Check /> : "1"}</b> Details</span><i /><span className={cx(step === "review" && "current")}><b>2</b> Review</span><i /><span><b>3</b> Payment</span>
          </div>
        </div>

        <label className={cx("mobile-service-select")}><span>Choose a payment service</span><select value={service.slug} onChange={(event) => navigate(`/bills-payment/${event.target.value}`)}>{BILL_SERVICES.map((item) => <option value={item.slug} key={item.slug}>{item.name}</option>)}</select></label>

        <div className={cx("checkout-layout")}>
          <aside className={cx("service-panel")}><div className={cx("panel-heading")}><span>Payment services</span><small>Choose a category</small></div><nav aria-label="Bill payment services">{BILL_SERVICES.map((item) => <Link className={cx(item.slug === service.slug && "active")} to={`/bills-payment/${item.slug}`} key={item.slug}><span>{item.name}</span><ChevronRight /></Link>)}</nav></aside>

          <div className={cx("payment-card")}>
          {step === "details" ? (
            <form onSubmit={submitDetails}>
              <div className={cx("card-heading")}>
                <span><CreditCard /></span>
                <div><small>{service.name} payment</small><h1>{service.title}</h1><p>Enter the details exactly as shown on your bill.</p></div>
              </div>

              {service.group === "Mobile" && (
                <div className={cx("mobile-toggle")}>
                  <Link className={cx(service.slug === "mobile-prepaid" && "selected")} to="/bills-payment/mobile-prepaid"><span /> Prepaid</Link>
                  <Link className={cx(service.slug === "mobile-postpaid" && "selected")} to="/bills-payment/mobile-postpaid"><span /> Postpaid</Link>
                </div>
              )}

              <div className={cx("fields")}>
                {service.fields.map((fieldKey) => {
                  const field = FIELD_CONFIG[fieldKey];
                  const stateOptions = fieldKey === "provider" && service.optionsByState
                    ? service.optionsByState[values.state] || []
                    : null;
                  const serviceOptions = stateOptions || service.options?.[fieldKey];
                  const { label, prefix, options: defaultOptions, ...inputProps } = field;
                  const options = serviceOptions || defaultOptions;
                  return (
                    <label className={cx("field")} key={fieldKey}>
                      <span>{label}</span>
                      <div className={cx("input-wrap")}>
                        {prefix && <b>{prefix}</b>}
                        {field.type === "select" ? (
                          <select
                            required
                            disabled={fieldKey === "provider" && service.optionsByState && !values.state}
                            value={values[fieldKey] || ""}
                            onChange={(event) => updateField(fieldKey, event.target.value)}
                          >
                            <option value="" disabled>
                              {fieldKey === "provider" && service.optionsByState && !values.state
                                ? "Select state first"
                                : field.placeholder}
                            </option>
                            {options.map((option) => <option value={option} key={option}>{option}</option>)}
                          </select>
                        ) : (
                          <input {...inputProps} required value={values[fieldKey] || ""} onChange={(event) => updateField(fieldKey, event.target.value)} />
                        )}
                      </div>
                    </label>
                  );
                })}
              </div>

              {isMobilePrepaid && (
                <div className={cx("plan-picker")}>
                  <div className={cx("plan-picker-head")}>
                    <span>Quick amounts</span>
                    <small>{values.operator ? values.operator : "Select operator"}</small>
                  </div>
                  <div className={cx("plan-grid")}>
                    {quickAmounts.map((amount) => (
                      <button
                        className={cx(Number(values.amount) === amount && "selected")}
                        type="button"
                        key={amount}
                        onClick={() => selectQuickAmount(amount)}
                      >
                        <strong>₹{amount}</strong>
                        <small>Recharge amount</small>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              <label className={cx("save-bill")}><input type="checkbox" checked={saveBill} onChange={(event) => setSaveBill(event.target.checked)} /><span><Check /></span> Save details and remind me before the next due date</label>
              <button className={cx("primary")} type="submit"><span>Review bill details</span><ChevronRight /></button>
              <p className={cx("privacy")}><LockKeyhole /> Your information is encrypted and securely transmitted.</p>
            </form>
          ) : (
            <div className={cx("review")}>
              <div className={cx("card-heading")}><span><ReceiptIndianRupee /></span><div><small>Final check</small><h1>Review bill details</h1><p>Confirm the information before payment.</p></div></div>
              <dl>
                <div><dt>Service</dt><dd>{service.name}</dd></div>
                {service.fields.map((key) => <div key={key}><dt>{FIELD_CONFIG[key].label}</dt><dd>{key === "amount" ? `₹${values[key]}` : values[key]}</dd></div>)}
              </dl>
              <div className={cx("notice")}><ShieldCheck /> Biller verification and payment gateway integration are required before money can be collected.</div>
              <div className={cx("review-actions")}>
                <button type="button" onClick={() => setStep("details")}>Edit details</button>
                <button className={cx("primary")} type="button" disabled>Continue to payment</button>
              </div>
            </div>
          )}
          </div>

          <aside className={cx("assurance-panel")}>
            <div className={cx("assurance-hero")}><img src={campaignHero} alt="" aria-hidden="true" /><span><ShieldCheck /></span><h2>Pay with confidence</h2><p>Your payment journey is designed around security and transparency.</p></div>
            <ul><li><CheckCircle2 /><span><strong>Secure by design</strong><small>Encrypted data transmission</small></span></li><li><Sparkles /><span><strong>No hidden charges</strong><small>Review everything before paying</small></span></li><li><ReceiptIndianRupee /><span><strong>Clear confirmation</strong><small>Transaction details at every step</small></span></li></ul>
            <div className={cx("help-card")}><Headphones /><span><strong>Need help?</strong><small>MassClick support is here for you.</small></span></div>
          </aside>
        </div>

        <div className={cx("trust-row")}><span><ShieldCheck /> Secure checkout</span><span><LockKeyhole /> Data encrypted</span><span><ReceiptIndianRupee /> Transparent payments</span></div>
      </section>
    </main>
  );
}
