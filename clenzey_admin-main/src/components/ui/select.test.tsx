import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { describe, it, expect } from "vitest";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "./select";

function TestSelect() {
  return (
    <Select value="a" onValueChange={() => {}}>
      <SelectTrigger aria-label="Test select">
        <SelectValue placeholder="Pick one" />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="a">Option A</SelectItem>
        <SelectItem value="b">Option B</SelectItem>
      </SelectContent>
    </Select>
  );
}

describe("Select", () => {
  it("opens the options list when the trigger is clicked", async () => {
    render(<TestSelect />);

    expect(screen.queryByRole("option", { name: "Option A" })).toBeNull();

    fireEvent.click(screen.getByRole("button", { name: "Test select" }));

    await waitFor(() => {
      expect(screen.getByRole("option", { name: "Option A" })).toBeVisible();
    });
  });

  it("opens after mousedown/mouseup/click sequence like a real pointer", async () => {
    render(<TestSelect />);
    const trigger = screen.getByRole("button", { name: "Test select" });

    fireEvent.mouseDown(trigger);
    fireEvent.mouseUp(trigger);
    fireEvent.click(trigger);

    await waitFor(() => {
      expect(screen.getByRole("option", { name: "Option A" })).toBeVisible();
    });
  });

  it("closes when clicking outside", async () => {
    render(<TestSelect />);
    const trigger = screen.getByRole("button", { name: "Test select" });

    fireEvent.click(trigger);

    await waitFor(() => {
      expect(screen.getByRole("option", { name: "Option A" })).toBeVisible();
    });

    await new Promise((resolve) => requestAnimationFrame(resolve));
    fireEvent.mouseDown(document.body);

    await waitFor(() => {
      expect(screen.queryByRole("option", { name: "Option A" })).toBeNull();
    });
  });
});
