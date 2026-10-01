import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it } from "vitest";
import { App } from "./App";

describe("app shell", () => {
  it("renders the floor navigation", () => {
    render(
      <MemoryRouter>
        <App />
      </MemoryRouter>,
    );
    expect(screen.getByRole("link", { name: "Skill grid" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Coverage floor" })).toBeInTheDocument();
  });
});
