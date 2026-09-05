import React from "react";
import { vi } from "vitest";

import { Excalidraw } from "../index";
import {
  act,
  fireEvent,
  getByText,
  render,
  waitFor,
} from "../tests/test-utils";

import type { Collaborator, SocketId } from "../types";

const socketId = (id: string) => id as SocketId;

describe("UserList", () => {
  it("refreshes custom avatars and keeps current-user navigation", async () => {
    (global as any).ResizeObserver = class ResizeObserver {
      observe() {}
      unobserve() {}
      disconnect() {}
    };
    const firstRenderer = ({ name }: { name: string }) => (
      <span data-testid={`avatar-first-${name}`}>first</span>
    );
    const secondRenderer = ({ name }: { name: string }) => (
      <span data-testid={`avatar-second-${name}`}>second</span>
    );
    const { container, rerender } = await render(
      <Excalidraw renderCollaboratorAvatar={firstRenderer} />,
    );
    const currentSocketId = socketId("current");

    act(() => {
      window.h.app.updateScene({
        collaborators: new Map<SocketId, Collaborator>([
          [
            currentSocketId,
            {
              id: "user",
              socketId: currentSocketId,
              username: "Ada",
              isCurrentUser: true,
            },
          ],
        ]),
      });
    });

    await waitFor(() => {
      expect(
        container.querySelector("[data-testid='avatar-first-Ada']"),
      ).not.toBeNull();
    });

    rerender(<Excalidraw renderCollaboratorAvatar={secondRenderer} />);

    await waitFor(() => {
      expect(
        container.querySelector("[data-testid='avatar-second-Ada']"),
      ).not.toBeNull();
    });

    const requestUnfollow = vi.spyOn(window.h.app, "requestUnfollow");
    const currentAvatar = container.querySelector<HTMLElement>(
      ".UserList__collaborator--avatar-only.is-current-user .Avatar",
    );
    expect(currentAvatar).not.toBeNull();
    fireEvent.click(currentAvatar!);
    expect(requestUnfollow).toHaveBeenCalledTimes(1);
    requestUnfollow.mockRestore();
  });

  it("retains the local dropdown when the same account has multiple clients", async () => {
    const { container } = await render(
      <Excalidraw
        currentUserControls={<button type="button">Spotlight me</button>}
      />,
    );
    const currentSocketId = socketId("current");
    const otherSocketId = socketId("other");

    act(() => {
      window.h.app.updateScene({
        collaborators: new Map<SocketId, Collaborator>([
          [
            otherSocketId,
            {
              id: "user",
              socketId: otherSocketId,
              username: "Ada",
              isCurrentUser: false,
            },
          ],
          [
            currentSocketId,
            {
              id: "user",
              socketId: currentSocketId,
              username: "Ada",
              isCurrentUser: true,
            },
          ],
        ]),
      });
    });

    await waitFor(() => {
      expect(container.querySelectorAll(".UserList__pill")).toHaveLength(1);
    });

    const currentUserPill =
      container.querySelector<HTMLElement>(".UserList__pill");
    expect(currentUserPill).not.toBeNull();

    // Radix Popover measures its content when opened.
    (global as any).ResizeObserver = class ResizeObserver {
      observe() {}
      unobserve() {}
      disconnect() {}
    };
    fireEvent.click(currentUserPill!);

    await waitFor(() => {
      const dropdown = document.querySelector(".UserList__collaborators");
      const dropdownCollaborators = dropdown?.querySelectorAll(
        ".UserList__collaborator",
      );
      expect(dropdownCollaborators).toHaveLength(2);
      expect(
        dropdown?.querySelectorAll(".UserList__collaborator.is-current-user"),
      ).toHaveLength(1);
      expect(getByText(document.body, "Spotlight me")).toBeVisible();
    });
  });
});
