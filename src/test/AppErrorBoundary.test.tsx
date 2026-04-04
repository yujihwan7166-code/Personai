import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { AppErrorBoundary } from "@/components/AppErrorBoundary";

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

function CrashOnRender() {
  throw new Error("QuestionInput crashed during render");
}

describe("AppErrorBoundary", () => {
  it("shows a recovery screen instead of leaving the app blank", () => {
    vi.spyOn(console, "error").mockImplementation(() => {});

    render(
      <AppErrorBoundary>
        <CrashOnRender />
      </AppErrorBoundary>
    );

    expect(screen.getByText("앱 화면을 불러오던 중 문제가 발생했어요.")).toBeInTheDocument();
    expect(screen.getByText("QuestionInput crashed during render")).toBeInTheDocument();
  });

  it("reloads the page when the recovery action is clicked", () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    const reload = vi.fn();

    render(
      <AppErrorBoundary onReload={reload}>
        <CrashOnRender />
      </AppErrorBoundary>
    );

    fireEvent.click(screen.getByRole("button", { name: "새로고침" }));
    expect(reload).toHaveBeenCalledTimes(1);
  });
});
