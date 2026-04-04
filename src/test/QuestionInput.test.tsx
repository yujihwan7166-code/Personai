import { afterEach, describe, expect, it } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import { QuestionInput } from "@/components/QuestionInput";

afterEach(() => {
  cleanup();
});

describe("QuestionInput", () => {
  it("renders in general mode without crashing on first paint", () => {
    expect(() =>
      render(<QuestionInput onSubmit={() => {}} discussionMode="general" />)
    ).not.toThrow();

    expect(screen.getByRole("textbox")).toBeInTheDocument();
  });

  it("renders in procon mode without exposing the file input", () => {
    const { container } = render(<QuestionInput onSubmit={() => {}} discussionMode="procon" />);

    expect(screen.getByRole("textbox")).toBeInTheDocument();
    expect(container.querySelector('input[type="file"]')).toBeNull();
  });
});
