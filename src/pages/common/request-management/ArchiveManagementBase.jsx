import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  Alert,
  Box,
  CircularProgress,
  Typography,
  useTheme,
} from "@mui/material";
import ArchiveOutlinedIcon from "@mui/icons-material/ArchiveOutlined";
import DeleteOutlineOutlinedIcon from "@mui/icons-material/DeleteOutlineOutlined";
import UnarchiveOutlinedIcon from "@mui/icons-material/UnarchiveOutlined";
import { DataGrid } from "../../../components/common/AppDataGrid";
import { pushSuccessToast } from "../../../components/common/SuccessToast";
import RequestBulkBar from "./RequestBulkBar";
import RequestConfirmDialog from "./RequestConfirmDialog";
import BrandedLoader from "../../../components/common/BrandedLoader";
import {
  TABLE_FIRST_COL_FLEX,
  TABLE_FIRST_COL_MIN_WIDTH,
} from "../../../utils/layoutTokens";
import {
  BORDER,
  BORDER_DARK,
  buildEventDateDisplay,
  DM,
  fmt,
  GOLD,
  GOLD_08,
  StatusPill,
} from "./sharedStyles.jsx";

export default function ArchiveManagementBase({
  embedded = false,
  onStateChange,
  onToast,
  adapter,
}) {
  const theme = useTheme();
  const isDark = theme.palette.mode === "dark";
  const border = isDark ? BORDER_DARK : BORDER;

  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [msg, setMsg] = useState(null);
  const [ctx, setCtx] = useState(null);
  const [archivedRequests, setArchivedRequests] = useState([]);
  const [selected, setSelected] = useState([]);
  const [confirm, setConfirm] = useState({
    open: false,
    title: "",
    message: "",
    destructive: false,
    action: null,
    confirmLabel: "Confirm",
  });

  const notify = useCallback(
    (type, text) => {
      if (embedded && onToast) {
        onToast({ severity: type, text });
        return;
      }
      if (type === "success") {
        pushSuccessToast(text);
        return;
      }
      setMsg({ type, text });
    },
    [embedded, onToast],
  );

  const initialize = useCallback(async () => {
    if (!adapter?.init) return {};
    const nextCtx = await adapter.init();
    return nextCtx || {};
  }, [adapter]);

  const refresh = useCallback(
    async (scope) => {
      if (!scope) return;
      const archived = await adapter.fetchArchived(scope);
      setArchivedRequests(archived || []);
    },
    [adapter],
  );

  useEffect(() => {
    let mounted = true;
    (async () => {
      setLoading(true);
      try {
        const initialCtx = await initialize();
        if (!mounted) return;
        setCtx(initialCtx);
        await refresh(initialCtx);
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => {
      mounted = false;
    };
  }, [initialize, refresh]);

  const runAction = useCallback(
    async (type, ids) => {
      if (!ids.length) return;
      setActionLoading(true);
      try {
        if (type === "unarchive") {
          await adapter.unarchive(ids, ctx);
          notify("success", `${ids.length} request(s) unarchived.`);
        }
        if (type === "moveToTrash") {
          await adapter.moveToTrash(ids, ctx);
          notify("success", `${ids.length} request(s) moved to trash.`);
        }
        setSelected([]);
        await refresh(ctx);
        await onStateChange?.();
      } catch (error) {
        notify("error", error.message || "Action failed.");
      } finally {
        setActionLoading(false);
      }
    },
    [adapter, ctx, notify, onStateChange, refresh],
  );

  const openConfirm = (
    title,
    message,
    action,
    destructive = false,
    confirmLabel = "Confirm",
  ) =>
    setConfirm({
      open: true,
      title,
      message,
      destructive,
      action,
      confirmLabel,
    });

  const closeConfirm = () => setConfirm((prev) => ({ ...prev, open: false }));

  const runConfirm = async () => {
    if (confirm.action) await confirm.action();
    closeConfirm();
  };

  const requestColumns = useMemo(
    () => [
      {
        field: "title",
        headerName: "Title",
        flex: TABLE_FIRST_COL_FLEX,
        minWidth: TABLE_FIRST_COL_MIN_WIDTH,
        renderCell: ({ row }) => (
          <Box sx={{ display: "flex", alignItems: "center", height: "100%" }}>
            <Typography
              sx={{
                fontFamily: DM,
                fontSize: "0.82rem",
                fontWeight: 600,
                color: "text.primary",
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
              }}
            >
              {row.title}
            </Typography>
          </Box>
        ),
      },
      {
        field: "status",
        headerName: "Status",
        width: 130,
        renderCell: ({ row }) => (
          <Box sx={{ display: "flex", alignItems: "center", height: "100%" }}>
            <StatusPill status={row.status} isDark={isDark} />
          </Box>
        ),
      },
      {
        field: "event_date",
        headerName: "Event Date",
        width: 170,
        renderCell: ({ row }) => (
          <Box sx={{ display: "flex", alignItems: "center", height: "100%" }}>
            <Typography
              sx={{
                fontFamily: DM,
                fontSize: "0.8rem",
                color: "text.secondary",
              }}
            >
              {buildEventDateDisplay(row)}
            </Typography>
          </Box>
        ),
      },
      {
        field: "submitted_at",
        headerName: "Submitted",
        width: 140,
        renderCell: ({ row }) => (
          <Box sx={{ display: "flex", alignItems: "center", height: "100%" }}>
            <Typography
              sx={{
                fontFamily: DM,
                fontSize: "0.8rem",
                color: "text.secondary",
              }}
            >
              {fmt(row.submitted_at)}
            </Typography>
          </Box>
        ),
      },
    ],
    [isDark],
  );

  const archiveColumns = useMemo(
    () => [
      ...requestColumns,
      {
        field: "archived_at",
        headerName: "Archived",
        width: 140,
        renderCell: ({ row }) => (
          <Box sx={{ display: "flex", alignItems: "center", height: "100%" }}>
            <Typography
              sx={{
                fontFamily: DM,
                fontSize: "0.8rem",
                color: "text.secondary",
              }}
            >
              {fmt(row.archived_at)}
            </Typography>
          </Box>
        ),
      },
    ],
    [requestColumns],
  );

  const Card = ({ children, sx = {} }) => (
    <Box
      sx={{
        backgroundColor: "background.paper",
        borderRadius: "10px",
        border: `1px solid ${border}`,
        p: { xs: 2, sm: 3 },
        ...sx,
      }}
    >
      {children}
    </Box>
  );

  if (loading) {
    return (
      <Box
        sx={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          height: embedded ? "40vh" : "60vh",
        }}
      >
        <BrandedLoader size={46} inline />
      </Box>
    );
  }

  return (
    <Box sx={{ p: embedded ? 0 : { xs: 2, sm: 3 }, fontFamily: DM }}>
      {!embedded && (
        <Box sx={{ mb: 3 }}>
          <Typography
            sx={{
              fontFamily: DM,
              fontWeight: 700,
              fontSize: "1rem",
              color: "text.primary",
              letterSpacing: "-0.02em",
            }}
          >
            Archive Management
          </Typography>
          <Typography
            sx={{
              fontFamily: DM,
              fontSize: "0.72rem",
              color: "text.secondary",
              mt: 0.3,
            }}
          >
            View archived requests and restore or move them to trash.
          </Typography>
        </Box>
      )}

      {msg && !embedded && (
        <Alert
          severity={msg.type}
          onClose={() => setMsg(null)}
          sx={{
            mb: 2,
            borderRadius: "10px",
            fontFamily: DM,
            fontSize: "0.8rem",
            py: 0.75,
          }}
        >
          {msg.text}
        </Alert>
      )}

      <Card sx={{ mb: 2.5 }}>
        <Box sx={{ display: "flex", alignItems: "center", mb: 1.5 }}>
          <Box
            sx={{
              width: 26,
              height: 26,
              borderRadius: "10px",
              backgroundColor: GOLD_08,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              flexShrink: 0,
              mr: 1,
            }}
          >
            <ArchiveOutlinedIcon sx={{ fontSize: 13, color: GOLD }} />
          </Box>
          <Typography
            sx={{
              fontFamily: DM,
              fontSize: "0.72rem",
              fontWeight: 700,
              color: "text.secondary",
              textTransform: "uppercase",
              letterSpacing: "0.08em",
            }}
          >
            Archived Requests
          </Typography>
        </Box>

        {archivedRequests.length === 0 ? (
          <Box
            sx={{
              py: 5,
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: 1,
            }}
          >
            <ArchiveOutlinedIcon
              sx={{
                fontSize: 30,
                color: isDark ? "rgba(255,255,255,0.1)" : "rgba(53,53,53,0.12)",
              }}
            />
            <Typography
              sx={{
                fontFamily: DM,
                fontSize: "0.82rem",
                color: "text.disabled",
              }}
            >
              No archived requests
            </Typography>
          </Box>
        ) : (
          <>
            <Typography
              sx={{
                fontFamily: DM,
                fontSize: "0.72rem",
                color: "text.disabled",
                mb: 1.5,
              }}
            >
              {archivedRequests.length} request(s) archived.
            </Typography>
            <RequestBulkBar
              count={selected.length}
              actionLoading={actionLoading}
              isDark={isDark}
              border={border}
              actions={[
                {
                  label: "Unarchive selected",
                  icon: <UnarchiveOutlinedIcon sx={{ fontSize: 16 }} />,
                  onClick: () => runAction("unarchive", selected),
                },
                {
                  label: "Move selected to trash",
                  icon: <DeleteOutlineOutlinedIcon sx={{ fontSize: 16 }} />,
                  onClick: () =>
                    openConfirm(
                      "Move to Trash",
                      `Move ${selected.length} request(s) to trash?`,
                      () => runAction("moveToTrash", selected),
                      true,
                    ),
                  destructive: true,
                },
              ]}
            />
            <DataGrid
              rows={archivedRequests}
              columns={archiveColumns}
              loading={loading}
              showToolbar={!embedded}
              density="compact"
              autoHeight
              pageSize={10}
              rowsPerPageOptions={[10, 25, 50]}
              checkboxSelection
              rowSelectionModel={{ type: "include", ids: new Set(selected) }}
              onRowSelectionModelChange={(model) =>
                setSelected(model?.ids instanceof Set ? [...model.ids] : [])
              }
              sx={{
                "& .MuiDataGrid-row.Mui-selected": {
                  backgroundColor: isDark
                    ? "rgba(255,255,255,0.06)"
                    : "rgba(33,33,33,0.06)",
                  "&:hover": {
                    backgroundColor: isDark
                      ? "rgba(255,255,255,0.09)"
                      : "rgba(33,33,33,0.09)",
                  },
                },
                "& .MuiCheckbox-root.Mui-checked, & .MuiCheckbox-root.MuiCheckbox-indeterminate":
                  {
                    color: isDark ? "#e0e0e0" : "#212121",
                  },
              }}
            />
          </>
        )}
      </Card>

      <RequestConfirmDialog
        open={confirm.open}
        onClose={closeConfirm}
        onConfirm={runConfirm}
        title={confirm.title}
        message={confirm.message}
        loading={actionLoading}
        destructive={confirm.destructive}
        confirmLabel={confirm.confirmLabel}
      />
    </Box>
  );
}
