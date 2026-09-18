import React, { useCallback, useEffect, useState } from "react";
import { Helmet } from "react-helmet-async";
import { Link, useParams } from "react-router-dom";
import { AlertTriangle, CheckCircle2, Clock, Loader2, ShieldCheck } from "lucide-react";
import massClickLogo from "assets/mclogo.webp";
import { createScopedClassNames } from "shared/utils/createScopedClassNames.js";
import { fetchRechargeOrderStatus } from "features/public/recharge-services/rechargeOrderApi.js";
import { getBillService } from "features/public/recharge-services/billPaymentConfig.js";
import styles from "features/public/recharge-services/RechargeStatusPage.module.css";

const cx = createScopedClassNames(styles);

const AUTO_RETRY_DELAY_MS = 3000;

export default function RechargeStatusPage() {
  const { transactionId } = useParams();
  const [status, setStatus] = useState(null);
  const [error, setError] = useState("");
  const [checking, setChecking] = useState(true);
  const [retryCount, setRetryCount] = useState(0);

  const checkStatus = useCallback(async () => {
    setChecking(true);
    setError("");
    try {
      const result = await fetchRechargeOrderStatus(transactionId);
      setStatus(result);
    } catch (fetchError) {
      setError(fetchError.response?.data || fetchError.message || "Could not verify payment status.");
    } finally {
      setChecking(false);
    }
  }, [transactionId]);

  useEffect(() => {
    checkStatus();
  }, [checkStatus]);

  useEffect(() => {
    if (status?.paymentStatus === "PENDING" && retryCount < 2) {
      const timer = setTimeout(() => {
        setRetryCount((count) => count + 1);
        checkStatus();
      }, AUTO_RETRY_DELAY_MS);
      return () => clearTimeout(timer);
    }
  }, [status, retryCount, checkStatus]);

  const service = status ? getBillService(status.serviceSlug) : null;

  return (
    <main className={cx("page")}>
      <Helmet><title>Payment status | MassClick</title></Helmet>
      <header className={cx("topbar")}><Link to="/" className={cx("brand")}><img src={massClickLogo} alt="MassClick" /></Link></header>

      <section className={cx("card")}>
        {checking && !status ? (
          <div className={cx("state")}>
            <Loader2 className={cx("spin")} />
            <h1>Verifying your payment</h1>
            <p>Please wait while we confirm this with PhonePe.</p>
          </div>
        ) : error ? (
          <div className={cx("state", "state-error")}>
            <AlertTriangle />
            <h1>Couldn&apos;t verify payment</h1>
            <p>{error}</p>
            <button type="button" onClick={checkStatus}>Try again</button>
          </div>
        ) : status?.paymentStatus === "SUCCESS" ? (
          <div className={cx("state", "state-success")}>
            <CheckCircle2 />
            <h1>Payment successful</h1>
            <p>₹{status.amount} paid for {service?.title || status.serviceName}.</p>
            <span className={cx("txn")}>Transaction ID: {status.transactionId}</span>
            <Link to="/" className={cx("primary")}>Back to MassClick</Link>
          </div>
        ) : status?.paymentStatus === "FAILED" ? (
          <div className={cx("state", "state-error")}>
            <AlertTriangle />
            <h1>Payment failed</h1>
            <p>Your payment for {service?.title || status.serviceName} could not be completed.</p>
            <Link to={`/bills-payment/${status.serviceSlug}`} className={cx("primary")}>Try again</Link>
          </div>
        ) : (
          <div className={cx("state")}>
            <Clock />
            <h1>Payment pending</h1>
            <p>We haven&apos;t received confirmation yet. This can take a few minutes.</p>
            <button type="button" onClick={checkStatus} disabled={checking}>{checking ? "Checking…" : "Check again"}</button>
          </div>
        )}
        <div className={cx("assurance")}><ShieldCheck /> Secured by PhonePe</div>
      </section>
    </main>
  );
}
