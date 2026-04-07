import React, { useEffect } from "react";
import { useParams } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import { checkPhonePeStatus } from "../../redux/actions/phonePayAction.js";
import { useNavigate } from "react-router-dom";

const PaymentStatus = () => {
  const { transactionId } = useParams();
  const navigate = useNavigate();

  const dispatch = useDispatch();
  const { statusData, loading } = useSelector((state) => state.phonepe);
  const handleHomeClick = () => {
    navigate("/dashboard");
  };
  useEffect(() => {
    if (transactionId) {
      dispatch(checkPhonePeStatus(transactionId));
    }
  }, [transactionId, dispatch]);

  if (loading) return <p>Checking Payment Status...</p>;

  return (
    <div style={{ textAlign: "center", marginTop: "100px" }}>
      <h2>Payment Status</h2>
      {statusData ? (
        <p>{statusData.code === "PAYMENT_SUCCESS" ? "✅ Payment Successful!" : "❌ Payment Failed"}</p>
      ) : (
        <p>No status found.</p>
      )}
      <button onClick={handleHomeClick}>
        Home
      </button>    </div>
  );
};

export default PaymentStatus;
