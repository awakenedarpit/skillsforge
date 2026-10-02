// @vitest-environment jsdom
import React, { useState } from "react";
import { describe, it, expect, vi } from "vitest";
import "@testing-library/jest-dom";
import { render, screen, fireEvent } from "@testing-library/react";

function HorizonSelector({
  initialHorizon = 30,
  onChange,
}: {
  initialHorizon?: number;
  onChange?: (val: number) => void;
}) {
  const [horizon, setHorizon] = useState<number>(initialHorizon);

  const handleSelect = (days: number) => {
    setHorizon(days);
    onChange?.(days);
  };

  return (
    <div>
      <div data-testid="horizon-selector">
        {[30, 60, 90].map((days) => (
          <button
            key={days}
            type="button"
            data-testid={`horizon-${days}`}
            onClick={() => handleSelect(days)}
            className={horizon === days ? "bg-blue-600 text-white font-bold" : "bg-slate-100"}
          >
            {days} Days
          </button>
        ))}
      </div>
      <div data-testid="active-horizon-label">Active: {horizon} Days</div>
    </div>
  );
}

describe("Simulator Horizon Selector UI", () => {
  it("renders 30, 60, and 90 day buttons with 30 selected by default", () => {
    render(<HorizonSelector initialHorizon={30} />);

    expect(screen.getByTestId("horizon-selector")).toBeInTheDocument();
    expect(screen.getByTestId("horizon-30")).toBeInTheDocument();
    expect(screen.getByTestId("horizon-60")).toBeInTheDocument();
    expect(screen.getByTestId("horizon-90")).toBeInTheDocument();
    expect(screen.getByTestId("active-horizon-label")).toHaveTextContent("Active: 30 Days");
  });

  it("updates selection when clicking 60 and 90 day buttons", () => {
    const handleChange = vi.fn();
    render(<HorizonSelector initialHorizon={30} onChange={handleChange} />);

    const btn60 = screen.getByTestId("horizon-60");
    fireEvent.click(btn60);

    expect(handleChange).toHaveBeenCalledWith(60);
    expect(screen.getByTestId("active-horizon-label")).toHaveTextContent("Active: 60 Days");

    const btn90 = screen.getByTestId("horizon-90");
    fireEvent.click(btn90);

    expect(handleChange).toHaveBeenCalledWith(90);
    expect(screen.getByTestId("active-horizon-label")).toHaveTextContent("Active: 90 Days");
  });
});
