import React, { useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import { checkPhonePeStatus } from "../../redux/actions/phonePayAction.js";

const PaymentStatus = () => {
  const { transactionId } = useParams();
  const navigate = useNavigate();

  const dispatch = useDispatch();
  const { statusData: rawStatusData } = useSelector((state) => state.phonepe);
  useEffect(() => {
    if (transactionId) {
      dispatch(checkPhonePeStatus(transactionId));
    }
  }, [transactionId, dispatch]);

  const paymentStatus = rawStatusData?.paymentStatus || "";
  const isSuccess = paymentStatus === "SUCCESS";
  const statusData = rawStatusData
    ? {
        ...rawStatusData,
        code: isSuccess ? "PAYMENT_SUCCESS" : "PAYMENT_FAILED",
      }
    : rawStatusData;


  return (
    <div style={{ textAlign: "center", marginTop: "100px" }}>
      <h2>Payment Status</h2>
      {statusData ? (
        <p>{statusData.code === "PAYMENT_SUCCESS" ? "✅ Payment Successful!" : "❌ Payment Failed"}</p>
      ) : (
        <p>No status found.</p>
      )}
      <button onClick={() => navigate("/dashboard")}>
        Home
      </button>    </div>
  );
};

export default PaymentStatus;
