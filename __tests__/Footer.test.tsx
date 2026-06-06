import React from "react";
import { render, screen } from "@testing-library/react";
import Footer from "@/app/components/Footer";
import { LangProvider } from "@/lib/lang";

const renderWithLang = (ui: React.ReactElement) =>
  render(<LangProvider>{ui}</LangProvider>);

describe("Footer", () => {
  beforeEach(() => renderWithLang(<Footer />));

  it("shows Sadahaq International Dubai", () => {
    expect(screen.getByText(/Sadahaq International Dubai/i)).toBeTruthy();
  });

  it("shows Saanvi Enterprises India", () => {
    expect(screen.getByText(/Saanvi Enterprises India/i)).toBeTruthy();
  });

  it("shows Sadahaq Trust India Regd-2017", () => {
    expect(screen.getByText(/Sadahaq Trust India/i)).toBeTruthy();
    expect(screen.getByText(/Regd-2017/i)).toBeTruthy();
  });

  it("shows copyright", () => {
    expect(screen.getAllByText(/Sadahaq International/i).length).toBeGreaterThan(0);
  });
});
