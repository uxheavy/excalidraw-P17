import clsx from "clsx";

import { CaptureUpdateAction } from "@excalidraw/element";

import { invariant } from "@excalidraw/common";

import { getClientColor } from "../clients";
import { Avatar } from "../components/Avatar";
import {
  eyeIcon,
  microphoneIcon,
  microphoneMutedIcon,
} from "../components/icons";
import { t } from "../i18n";

import { register } from "./register";

import type { GoToCollaboratorComponentProps } from "../components/UserList";
import type { Collaborator } from "../types";

export const actionGoToCollaborator = register<Collaborator>({
  name: "goToCollaborator",
  label: "Go to a collaborator",
  viewMode: true,
  trackEvent: { category: "collab" },
  perform: (_elements, appState, collaborator, app) => {
    invariant(
      collaborator,
      "actionGoToCollaborator: collaborator should be defined when actionGoToCollaborator is called",
    );

    if (
      !collaborator.socketId ||
      app.props.userToFollow?.socketId === collaborator.socketId ||
      collaborator.isCurrentUser
    ) {
      app.requestUnfollow();
      return {
        appState,
        captureUpdate: CaptureUpdateAction.EVENTUALLY,
      };
    }

    app.emitUserFollowIntent({
      userToFollow: {
        socketId: collaborator.socketId,
        username: collaborator.username || "",
      },
      action: "FOLLOW",
    });

    return {
      appState: {
        ...appState,
        // Close mobile menu
        openMenu: appState.openMenu === "canvas" ? null : appState.openMenu,
      },
      captureUpdate: CaptureUpdateAction.EVENTUALLY,
    };
  },
  PanelComponent: ({ updateData, data }) => {
    const {
      socketId,
      collaborator,
      withName,
      isBeingFollowed,
      renderCollaboratorAvatar,
    } = data as GoToCollaboratorComponentProps;

    const background = getClientColor(socketId, collaborator);
    const statusClassNames = clsx({
      "is-followed": isBeingFollowed,
      "is-current-user": collaborator.isCurrentUser === true,
      "is-speaking": collaborator.isSpeaking,
      "is-in-call": collaborator.isInCall,
      "is-muted": collaborator.isMuted,
    });
    const name = collaborator.username || "";
    const avatarOnClick = withName ? () => {} : () => updateData(collaborator);
    const customAvatar = renderCollaboratorAvatar?.({
      name,
      src: collaborator.avatarUrl,
      size: withName ? 24 : 28,
    });
    const avatar = customAvatar ?? (
      <Avatar
        color={background}
        onClick={avatarOnClick}
        name={name}
        src={collaborator.avatarUrl}
        className={statusClassNames}
      />
    );
    const renderedAvatar = customAvatar ? (
      <div
        className={clsx("Avatar", statusClassNames)}
        onClick={!withName ? avatarOnClick : undefined}
      >
        {customAvatar}
      </div>
    ) : (
      avatar
    );

    const statusIconJSX = collaborator.isInCall ? (
      collaborator.isSpeaking ? (
        <div
          className="UserList__collaborator-status-icon-speaking-indicator"
          title={t("userList.hint.isSpeaking")}
        >
          <div />
          <div />
          <div />
        </div>
      ) : collaborator.isMuted ? (
        <div
          className="UserList__collaborator-status-icon-microphone-muted"
          title={t("userList.hint.micMuted")}
        >
          {microphoneMutedIcon}
        </div>
      ) : (
        <div title={t("userList.hint.inCall")}>{microphoneIcon}</div>
      )
    ) : null;

    return withName ? (
      <div
        className={`dropdown-menu-item dropdown-menu-item-base UserList__collaborator ${statusClassNames}`}
        style={{ [`--avatar-size` as any]: "1.5rem" }}
        onClick={
          collaborator.isCurrentUser
            ? undefined
            : () => updateData<Collaborator>(collaborator)
        }
      >
        {renderedAvatar}
        <div className="UserList__collaborator-name">
          {collaborator.username}
        </div>
        <div className="UserList__collaborator-status-icons" aria-hidden>
          {isBeingFollowed && (
            <div
              className="UserList__collaborator-status-icon-is-followed"
              title={t("userList.hint.followStatus")}
            >
              {eyeIcon}
            </div>
          )}
          {collaborator.isCurrentUser && ` (${t("labels.you")})`}
          {statusIconJSX}
        </div>
      </div>
    ) : (
      <div
        className={`UserList__collaborator UserList__collaborator--avatar-only ${statusClassNames}`}
      >
        {renderedAvatar}
        {statusIconJSX && (
          <div className="UserList__collaborator-status-icon">
            {statusIconJSX}
          </div>
        )}
      </div>
    );
  },
});
