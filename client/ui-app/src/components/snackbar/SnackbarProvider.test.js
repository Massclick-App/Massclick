import { act, fireEvent, render, screen } from "@testing-library/react";
import {
  SnackbarProvider,
  useSnackbar,
} from "./SnackbarProvider.js";

const SnackbarTrigger = () => {
  const { enqueueSnackbar } = useSnackbar();

  return (
    <button
      type="button"
      onClick={() =>
        enqueueSnackbar("Saved successfully", {
          variant: "success",
        })
      }
    >
      Show notification
    </button>
  );
};

test("shows and automatically dismisses a notification", () => {
  jest.useFakeTimers();

  render(
    <SnackbarProvider autoHideDuration={1000}>
      <SnackbarTrigger />
    </SnackbarProvider>,
  );

  fireEvent.click(
    screen.getByRole("button", {
      name: "Show notification",
    }),
  );
  expect(screen.getByText("Saved successfully")).toBeInTheDocument();

  act(() => {
    jest.advanceTimersByTime(1000);
  });

  expect(screen.queryByText("Saved successfully")).not.toBeInTheDocument();
  jest.useRealTimers();
});
