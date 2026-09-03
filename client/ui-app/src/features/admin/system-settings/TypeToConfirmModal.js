/**
 * Type-to-confirm modal for commit actions on the S3 key migration card (plan/copy/
 * verify-s3/verify stay read-only or dry-run and never need this). No dialog/modal
 * component existed anywhere in the admin frontend before this — every other
 * destructive action here uses `window.confirm()`. This one is deliberately heavier:
 * the phrase must be TYPED, not just clicked past, matching the backend's independent
 * `confirm` field check (`s3KeyMigrationController.js`'s `expectedConfirmPhrase`) so a
 * misclick alone can never trigger a `--commit` run.
 *
 * `phrase` must exactly match what the backend computes for the same action —
 * `${subcommand}:${scope}` normally, or the literal "RUN ON PROD" once `target ===
 * "prod"`. Computing it in one place (the caller, passed down) rather than twice
 * keeps the two from silently drifting apart.
 */
import { useState } from "react";
import { createScopedClassNames } from "shared/utils/createScopedClassNames.js";
import styles from "features/admin/system-settings/TypeToConfirmModal.module.css";

const cx = createScopedClassNames(styles);

export default function TypeToConfirmModal({
  title,
  params = [],
  phrase,
  danger = false,
  confirmLabel = "Confirm",
  busy = false,
  onConfirm,
  onCancel,
}) {
  const [typed, setTyped] = useState("");
  const matches = typed === phrase;

  return (
    <div className={cx("overlay")} onClick={onCancel}>
      <div className={cx("dialog")} onClick={(event) => event.stopPropagation()}>
        <h4 className={cx(`title ${danger ? "danger" : ""}`)}>{title}</h4>

        {params.length ? (
          <div className={cx("paramsList")}>
            {params.map(([label, value]) => (
              <div key={label}>
                <span>{label}</span>
                <span>{String(value)}</span>
              </div>
            ))}
          </div>
        ) : null}

        <p className={cx("prompt")}>
          Type <strong>{phrase}</strong> to confirm.
        </p>
        <input
          className={cx("input")}
          type="text"
          autoFocus
          value={typed}
          onChange={(event) => setTyped(event.target.value)}
          placeholder={phrase}
          autoComplete="off"
          spellCheck={false}
        />

        <div className={cx("actions")}>
          <button type="button" className={cx("button cancel")} onClick={onCancel} disabled={busy}>
            Cancel
          </button>
          <button
            type="button"
            className={cx("button confirm")}
            onClick={() => onConfirm(typed)}
            disabled={!matches || busy}
          >
            {busy ? "Working..." : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
