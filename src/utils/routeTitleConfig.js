const ROUTE_TITLE_CONFIG = {
  admin: [
    {
      path: "/admin/dashboard",
      title: "Dashboard",
      
    },
    {
      path: "/admin/request-management",
      title: "Request Management",
    },
    {
      path: "/admin/coverage-tracker/requests",
      title: "Coverage Tracker",
      
    },
    {
      path: "/admin/coverage-tracker/time-record",
      title: "Coverage Time Record",
    },
    {      path: "/admin/coverage-request-details",
      title: "Request Details",
      matchType: "prefix",
    },
    {      path: "/admin/duty-schedule-view",
      title: "Duty Schedule View",
      
    },
    {
      path: "/admin/calendar-management",
      title: "Calendar Management",
      
    },
    {
      path: "/admin/calendar-management/blocking-details",
      title: "Blocking Details Log",
    },
    {
      path: "/admin/staffers-management",
      title: "Staffers Management",
    
    },
    {
      path: "/admin/semester-management",
      title: "Semester Management",
    },
    {
      path: "/admin/notifications",
      title: "Notifications",
    },
    {
      path: "/admin/profile",
      title: "Profile & Settings",
    },
  ],
  sec_head: [
    {
      path: "/sec_head/dashboard",
      title: "Dashboard",
      
    },
    {
      path: "/sec_head/coverage-management/assignment",
      title: "Coverage Assignment",
      
    },
    {
      path: "/sec_head/coverage-management/tracker",
      title: "Coverage Tracker",
      
    },
    {
      path: "/sec_head/coverage-management/time-record",
      title: "Coverage Time Record",
    },
    {
      path: "/sec_head/reassignment-history",
      title: "Reassignment History",
    },
    {
      path: "/sec_head/my-staffers",
      title: "My Staffers",
      
    },
    {
      path: "/sec_head/notifications",
      title: "Notifications",
      
    },
    {
      path: "/sec_head/profile",
      title: "Profile & Settings",
      
    },
  ],
  staff: [
    {
      path: "/staff/my-assignment",
      title: "My Assignment",
      
    },
    {
      path: "/staff/my-schedule",
      title: "My Schedule",
      
    },
    {
      path: "/staff/notifications",
      title: "Notifications",
      
    },
    {
      path: "/staff/profile",
      title: "Profile & Settings",
      
    },
  ],
};

function normalizePath(pathname) {
  if (!pathname) return "/";
  if (pathname === "/") return pathname;
  return pathname.replace(/\/+$/, "");
}

function titleizePathSegment(segment) {
  return segment
    .replace(/[-_]+/g, " ")
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

export function resolveRouteTitle(role, pathname) {
  const normalizedPath = normalizePath(pathname);
  const routeSet = ROUTE_TITLE_CONFIG[role] || [];

  for (const route of routeSet) {
    const routePath = normalizePath(route.path);
    const isPrefix = route.matchType === "prefix";
    const matched = isPrefix
      ? normalizedPath.startsWith(routePath)
      : normalizedPath === routePath;

    if (matched) {
      return {
        title: route.title,
        description: route.description || "",
      };
    }
  }

  const fallbackSegment = normalizedPath.split("/").filter(Boolean).pop() || "Home";
  return {
    title: titleizePathSegment(fallbackSegment),
    description: "",
  };
}

export default ROUTE_TITLE_CONFIG;
