# ADR-005 Modal usage-alert production evidence

Date: 2026-11-20

## Scope

This read-only provider check verified the owner spend-alert requirement for Modal workspace `faresmohamed260`. It made no billing, notification, environment, app, secret, route or deployment change.

## Provider read-back

The authenticated Modal Usage & billing page showed:

- Starter workspace `faresmohamed260`;
- a $30 monthly workspace usage limit marked `Set by you`;
- current-cycle usage of $2.54 in credits and $0 in charges against that $30 limit;
- $27.46 in remaining workspace credits;
- no separate custom net spend limit.

The authenticated Modal Notifications page showed global notifications enabled and both owner channels checked for `Usage alerts`:

- Email: enabled;
- In-app: enabled.

Modal describes this notification as: `Alerts when a usage threshold is reached or an inactive Function incurs charges.` The workspace usage limit is the threshold authority for this Starter workspace; environment-specific budgets require a higher plan and are not needed for RenderLab's one-workspace private demo. Modal's current [Budgets documentation](https://modal.com/docs/guide/budgets) confirms that the workspace usage limit is the monthly outer usage cap and that owner/manager roles control it.

The separate net spend-limit control is not the ADR-005 requirement and was not changed. ADR-005 requires a simple owner provider-spend alert, not a new billing dashboard or a lower hard cap.

## Gate result

The owner Modal provider-spend alert is configured and production-verified through the provider's own Email and In-app usage-alert channels against the existing $30 workspace usage limit. This gate is closed without introducing RenderLab code, another notification provider or a broader account mutation.
