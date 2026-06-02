import { createScopedClassNames } from "../../../../utils/createScopedClassNames";
import { useState } from "react";
import styles from "./deleteAccount.module.css";
const cx = createScopedClassNames(styles);
const DeleteAccount = () => {
  const [confirm, setConfirm] = useState(false);
  return <div className={cx("delete-container")}>
      <div className={cx("delete-card")}>
        <h2 className={cx("title")}>Delete Account</h2>

        <p className={cx("warning-text")}>    
          This action is <span>permanent</span> and cannot be undone.
          All your data, including profile and activity, will be deleted.
        </p>

        <div className={cx("danger-box")}>
          <h4>⚠️ Danger Zone</h4>
          <ul>
            <li>Your account will be permanently removed</li>
            <li>All your data will be lost</li>
            <li>You cannot recover this account</li>
          </ul>
        </div>

        <div className={cx("confirm-section")}>
          <input type="checkbox" id="confirm" onChange={e => setConfirm(e.target.checked)} />
          <label htmlFor="confirm">
            I understand the consequences of deleting my account
          </label>
        </div>

        <button className={cx(`delete-btn ${confirm ? "active" : ""}`)} disabled={!confirm}>
          Delete My Account
        </button>
        
      </div>
    </div>;
};
export default DeleteAccount;
