import { useState } from "react";
import "./deleteAccount.css";

const DeleteAccount = () => {
  const [confirm, setConfirm] = useState(false);

  return (
    <div className="delete-container">
      <div className="delete-card">
        <h2 className="title">Delete Account</h2>

        <p className="warning-text">    
          This action is <span>permanent</span> and cannot be undone.
          All your data, including profile and activity, will be deleted.
        </p>

        <div className="danger-box">
          <h4>⚠️ Danger Zone</h4>
          <ul>
            <li>Your account will be permanently removed</li>
            <li>All your data will be lost</li>
            <li>You cannot recover this account</li>
          </ul>
        </div>

        <div className="confirm-section">
          <input
            type="checkbox"
            id="confirm"
            onChange={(e) => setConfirm(e.target.checked)}
          />
          <label htmlFor="confirm">
            I understand the consequences of deleting my account
          </label>
        </div>

        <button
          className={`delete-btn ${confirm ? "active" : ""}`}
          disabled={!confirm}
        >
          Delete My Account
        </button>
        
      </div>
    </div>
  );
};

export default DeleteAccount;