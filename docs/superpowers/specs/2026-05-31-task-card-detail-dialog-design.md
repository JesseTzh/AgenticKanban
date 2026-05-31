# Task Card Detail Dialog Design

## Goal

Simplify kanban task cards while keeping task information accessible:

- Remove the task description from the card body.
- Move the existing task action menu to the card's bottom-right corner.
- Open a read-only task detail dialog when the user clicks the card.

## Components

Add a `TaskDetailDialog` component under `web/src/features/board`. It receives the
task, an `open` boolean, and an `onOpenChange` callback. The dialog uses the
existing shadcn dialog components and the task data already loaded by the board.
It does not add an API request.

The dialog displays:

- Title
- Description
- Stage
- Status
- Assignee
- Locked state
- Agent-ready state

Each new rendered element includes a stable `data-test-id`.

Update `TaskCard` to manage whether its detail dialog is open. Clicking the card
opens the dialog. Keyboard users can focus the card and open the dialog with
Enter or Space.

## Action Menu Behavior

Keep the existing dropdown menu and mutations. Render the menu trigger in a
bottom-right aligned card footer. The trigger stops click and keyboard event
propagation so using the action menu does not open the task detail dialog.

## Card Layout

Keep the title and status badges in the card. Remove the description paragraph
from the card content. The action menu moves out of the title row into a footer
aligned to the right.

## Verification

Run the frontend build and the existing frontend test suite. Verify that the
task description is no longer rendered inside the card, card interaction opens
the detail dialog, and action-menu interaction remains independent.
