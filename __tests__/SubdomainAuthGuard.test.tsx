import React from "react";
import { render, screen } from "@testing-library/react";
import SubdomainAuthGuard from "@/app/components/SubdomainAuthGuard";

// Mock useAuth
jest.mock("@/app/context/AuthContext", () => ({
  useAuth: jest.fn(),
}));
import { useAuth } from "@/app/context/AuthContext";
const mockUseAuth = useAuth as jest.Mock;

describe("SubdomainAuthGuard", () => {
  const originalLocation = window.location;

  beforeEach(() => {
    Object.defineProperty(window, "location", {
      writable: true,
      value: { href: "" },
    });
  });

  afterEach(() => {
    Object.defineProperty(window, "location", { writable: true, value: originalLocation });
  });

  it("redirects to root login when not authenticated", () => {
    mockUseAuth.mockReturnValue({ customer: null, loading: false });
    render(<SubdomainAuthGuard><div>secret</div></SubdomainAuthGuard>);
    expect(window.location.href).toContain("https://digitalrohtak.online/auth/login");
    expect(screen.queryByText("secret")).toBeNull();
  });

  it("renders children when authenticated", () => {
    mockUseAuth.mockReturnValue({ customer: { id: "1", first_name: "Test" }, loading: false });
    render(<SubdomainAuthGuard><div>secret</div></SubdomainAuthGuard>);
    expect(screen.getByText("secret")).toBeTruthy();
  });

  it("renders nothing while loading", () => {
    mockUseAuth.mockReturnValue({ customer: null, loading: true });
    const { container } = render(<SubdomainAuthGuard><div>secret</div></SubdomainAuthGuard>);
    expect(container.firstChild).toBeNull();
    expect(window.location.href).toBe("");
  });
});
