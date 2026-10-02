// @vitest-environment jsdom
import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import "@testing-library/jest-dom";
import { render, screen, fireEvent } from "@testing-library/react";
import { ErrorBoundary } from "@/components/error-boundary";

// Component that throws on demand
function ThrowingComponent({ shouldThrow }: { shouldThrow: boolean }) {
  if (shouldThrow) {
    throw new Error("Simulated component explosion");
  }
  return <div>Normal Content Loaded</div>;
}

describe("ErrorBoundary Component", () => {
  beforeEach(() => {
    // Suppress console.error in test output for intentional errors
    vi.spyOn(console, "error").mockImplementation(() => {});
  });

  it("renders children normally when no error occurs", () => {
    render(
      <ErrorBoundary>
        <div>All Systems Normal</div>
      </ErrorBoundary>
    );

    expect(screen.getByText("All Systems Normal")).toBeInTheDocument();
  });

  it("renders fallback UI with retry button when a child throws", () => {
    render(
      <ErrorBoundary>
        <ThrowingComponent shouldThrow={true} />
      </ErrorBoundary>
    );

    expect(screen.getByRole("alert")).toBeInTheDocument();
    expect(screen.getByText("Simulated component explosion")).toBeInTheDocument();
    expect(screen.getByRole("button")).toBeInTheDocument();
  });

  it("isolates failure so that a throwing child does not crash siblings in separate boundaries", () => {
    render(
      <div>
        <ErrorBoundary>
          <ThrowingComponent shouldThrow={true} />
        </ErrorBoundary>
        <ErrorBoundary>
          <ThrowingComponent shouldThrow={false} />
        </ErrorBoundary>
      </div>
    );

    // The crashed component shows alert
    expect(screen.getByRole("alert")).toBeInTheDocument();
    // The sibling component continues rendering fine
    expect(screen.getByText("Normal Content Loaded")).toBeInTheDocument();
  });

  it("calls onReset callback and attempts recovery when retry button is clicked", () => {
    const onReset = vi.fn();

    const { rerender } = render(
      <ErrorBoundary onReset={onReset}>
        <ThrowingComponent shouldThrow={true} />
      </ErrorBoundary>
    );

    expect(screen.getByRole("alert")).toBeInTheDocument();

    const retryButton = screen.getByRole("button");
    fireEvent.click(retryButton);

    expect(onReset).toHaveBeenCalledTimes(1);
  });
});
