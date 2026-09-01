import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { describe, it, expect } from "vitest";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "./dropdown-menu";

describe("DropdownMenu", () => {
  it("shows menu items when the trigger is clicked", async () => {
    render(
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button type="button">Open menu</button>
        </DropdownMenuTrigger>
        <DropdownMenuContent>
          <DropdownMenuItem>Item 1</DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>,
    );

    fireEvent.click(screen.getByRole("button", { name: "Open menu" }));

    await waitFor(() => {
      expect(screen.getByText("Item 1")).toBeVisible();
    });
  });
});
