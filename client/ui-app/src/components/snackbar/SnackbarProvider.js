import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import styles from "./SnackbarProvider.module.css";

const SnackbarContext = createContext({
  enqueueSnackbar: () => null,
  closeSnackbar: () => {},
});

let snackbarSequence = 0;

const getSnackbarInput = (messageOrOptions, options) => {
  if (
    messageOrOptions &&
    typeof messageOrOptions === "object" &&
    !React.isValidElement(messageOrOptions) &&
    Object.prototype.hasOwnProperty.call(messageOrOptions, "message")
  ) {
    const { message, ...messageOptions } = messageOrOptions;
    return {
      message,
      options: {
        ...messageOptions,
        ...options,
      },
    };
  }

  return {
    message: messageOrOptions,
    options,
  };
};

export const SnackbarProvider = ({
  children,
  maxSnack = 3,
  anchorOrigin = {
    vertical: "top",
    horizontal: "center",
  },
  autoHideDuration = 4000,
  preventDuplicate = false,
}) => {
  const [snackbars, setSnackbars] = useState([]);
  const timersRef = useRef(new Map());

  const closeSnackbar = useCallback((key) => {
    if (key === undefined || key === null) {
      timersRef.current.forEach((timerId) => window.clearTimeout(timerId));
      timersRef.current.clear();
      setSnackbars([]);
      return;
    }

    const timerId = timersRef.current.get(key);
    if (timerId) {
      window.clearTimeout(timerId);
      timersRef.current.delete(key);
    }
    setSnackbars((current) => current.filter((snackbar) => snackbar.key !== key));
  }, []);

  const enqueueSnackbar = useCallback(
    (messageOrOptions, suppliedOptions = {}) => {
      const { message, options } = getSnackbarInput(
        messageOrOptions,
        suppliedOptions,
      );
      const key = options.key ?? `snackbar-${Date.now()}-${snackbarSequence++}`;
      const duration = options.autoHideDuration ?? autoHideDuration;
      const shouldPreventDuplicate =
        options.preventDuplicate ?? preventDuplicate;
      const normalizedMessage =
        typeof message === "string" ? message : String(message ?? "");

      setSnackbars((current) => {
        if (
          shouldPreventDuplicate &&
          current.some(
            (snackbar) => snackbar.normalizedMessage === normalizedMessage,
          )
        ) {
          return current;
        }

        return [
          ...current,
          {
            key,
            message,
            normalizedMessage,
            variant: options.variant || "default",
          },
        ].slice(-Math.max(1, maxSnack));
      });

      if (!options.persist && Number.isFinite(duration) && duration > 0) {
        const timerId = window.setTimeout(() => closeSnackbar(key), duration);
        timersRef.current.set(key, timerId);
      }

      return key;
    },
    [autoHideDuration, closeSnackbar, maxSnack, preventDuplicate],
  );

  useEffect(
    () => () => {
      timersRef.current.forEach((timerId) => window.clearTimeout(timerId));
      timersRef.current.clear();
    },
    [],
  );

  const contextValue = useMemo(
    () => ({
      enqueueSnackbar,
      closeSnackbar,
    }),
    [closeSnackbar, enqueueSnackbar],
  );
  const stackPosition = `${anchorOrigin.vertical || "top"}-${
    anchorOrigin.horizontal || "center"
  }`;

  return (
    <SnackbarContext.Provider value={contextValue}>
      {children}
      <div
        className={[
          styles["snackbar-stack"],
          styles[`snackbar-stack--${stackPosition}`],
        ]
          .filter(Boolean)
          .join(" ")}
        aria-live="polite"
        aria-atomic="false"
      >
        {snackbars.map((snackbar) => (
          <div
            className={[
              styles.snackbar,
              styles[`snackbar--${snackbar.variant}`],
            ]
              .filter(Boolean)
              .join(" ")}
            key={snackbar.key}
            role={snackbar.variant === "error" ? "alert" : "status"}
          >
            <span className={styles.snackbar__message}>
              {snackbar.message}
            </span>
            <button
              type="button"
              className={styles.snackbar__close}
              aria-label="Dismiss notification"
              onClick={() => closeSnackbar(snackbar.key)}
            >
              {"\u00d7"}
            </button>
          </div>
        ))}
      </div>
    </SnackbarContext.Provider>
  );
};

export const useSnackbar = () => useContext(SnackbarContext);
