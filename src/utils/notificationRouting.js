const REQUEST_TARGETS = {
  admin: "/admin/request-management",
  client: "/client/request-tracker",
  sec_head: "/sec_head/coverage-management/assignment",
  staff: "/staff/my-assignment",
};

const NOTIFICATION_PAGES = {
  admin: "/admin/notifications",
  client: "/client/notifications",
  sec_head: "/sec_head/notifications",
  staff: "/staff/notifications",
};

function normalizePayload(payload) {
  if (!payload) return {};
  if (typeof payload === "string") {
    try {
      return JSON.parse(payload);
    } catch {
      return {};
    }
  }
  return payload;
}

export function getRoleFromPathname(pathname = "") {
  if (pathname.startsWith("/admin")) return "admin";
  if (pathname.startsWith("/client")) return "client";
  if (pathname.startsWith("/sec_head")) return "sec_head";
  if (pathname.startsWith("/staff")) return "staff";
  return null;
}

export function getNotificationPagePath(roleOrPathname) {
  const role = roleOrPathname?.startsWith?.("/")
    ? getRoleFromPathname(roleOrPathname)
    : roleOrPathname;
  return NOTIFICATION_PAGES[role] || null;
}

function getClientTrackerTab(type) {
  if (type === "declined") return "declined";
  if (type === "approved") return "approved";
  if (type === "new_request") return "pending";
  return "pipeline";
}

function getFallbackDestination(notification) {
  const role = notification?.recipient_role;

  if (notification?.request_id && REQUEST_TARGETS[role]) {
    if (role === "client") {
      return {
        path: REQUEST_TARGETS[role],
        state: {
          openRequestId: notification.request_id,
          tab: getClientTrackerTab(notification.type),
        },
      };
    }

    return {
      path: REQUEST_TARGETS[role],
      state: { openRequestId: notification.request_id },
    };
  }

  if (
    notification?.type === "duty_schedule_change_requested" &&
    role === "admin"
  ) {
    return {
      path: "/admin/duty-schedule-view",
      state: notification.created_by
        ? { openDutyChangeRequestStafferId: notification.created_by }
        : {},
    };
  }

  if (
    ["duty_schedule_change_approved", "duty_schedule_change_rejected"].includes(
      notification?.type,
    ) &&
    role === "staff"
  ) {
    return {
      path: "/staff/my-schedule",
      state: {},
    };
  }

  return null;
}

export function getNotificationDestination(notification) {
  if (!notification) return null;

  const payload = normalizePayload(notification.target_payload);
  if (notification.target_path) {
    return {
      path: notification.target_path,
      state: payload,
    };
  }

  return getFallbackDestination(notification);
}

export function isNotificationNavigable(notification) {
  return !!getNotificationDestination(notification);
}