import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  Alert,
  Box,
  CircularProgress,
  IconButton,
  Tooltip,
  Typography,
  useTheme,
} from "@mui/material";
import DeleteForeverOutlinedIcon from "@mui/icons-material/DeleteForeverOutlined";
import DeleteOutlineOutlinedIcon from "@mui/icons-material/DeleteOutlineOutlined";
import RestoreFromTrashOutlinedIcon from "@mui/icons-material/RestoreFromTrashOutlined";
import { DataGrid } from "../../../components/common/AppDataGrid";
import RequestBulkBar from "./RequestBulkBar";
import RequestConfirmDialog from "./RequestConfirmDialog";
import {
  BORDER,
  BORDER_DARK,
  buildEventDateDisplay,
  DM,
  fmt,
  GOLD,
  RED,
  RED_08,
  StatusPill,
} from "./sharedStyles.jsx";

export default function TrashManagementBase({
  embedded = false,
  onStateChange,
  onToast,
  onSuppressArchivableIds,
  adapter,
}) {
  const theme = useTheme();
  const isDark = theme.palette.mode === "dark";
  const border = isDark ? BORDER_DARK : BORDER;

  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [msg, setMsg] = useState(null);
  const [ctx, setCtx] = useState(null);
  const [trashedRequests, setTrashedRequests] = useState([]);
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
      const rows = await adapter.fetchTrashed(scope);
      setTrashedRequests(rows || []);
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
        if (type === "restore") {
          await adapter.restore(ids, ctx);
          notify("success", `${ids.length} request(s) restored.`);
          onSuppressArchivableIds?.(ids);
        }
        if (type === "deleteForever") {
          await adapter.deleteForever(ids, ctx);
          notify("success", `${ids.length} request(s) permanently deleted.`);
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
    [adapter, ctx, notify, onStateChange, onSuppressArchivableIds, refresh],
  );

  const emptyTrash = async () => {
    const ids = trashedRequests.map((r) => r.id);
    if (!ids.length) return;
    await runAction("deleteForever", ids);
  };

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
        flex: 1,
        minWidth: 200,
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
                fontSize: "0.78rem",
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
                fontSize: "0.78rem",
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

  const trashColumns = useMemo(
    () => [
      ...requestColumns,
      {
        field: "trashed_at",
        headerName: "Trashed",
        width: 140,
        renderCell: ({ row }) => (
          <Box sx={{ display: "flex", alignItems: "center", height: "100%" }}>
            <Typography
              sx={{
                fontFamily: DM,
                fontSize: "0.78rem",
                color: "text.secondary",
              }}
            >
              {fmt(row.trashed_at)}
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
        <CircularProgress size={28} sx={{ color: GOLD }} />
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
            Trash
          </Typography>
          <Typography
            sx={{
              fontFamily: DM,
              fontSize: "0.72rem",
              color: "text.secondary",
              mt: 0.3,
            }}
          >
            Restore or permanently delete trashed requests.
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
            fontSize: "0.78rem",
            py: 0.75,
          }}
        >
          {msg.text}
        </Alert>
      )}

      <Card>
        {trashedRequests.length > 0 && (
          <Box sx={{ display: "flex", justifyContent: "flex-end", mb: 1.5 }}>
            <Tooltip title="Empty Trash" arrow>
              <IconButton
                size="small"
                disabled={actionLoading}
                onClick={() =>
                  openConfirm(
                    "Empty Trash",
                    `Permanently remove all ${trashedRequests.length} trashed request(s)? This cannot be undone.`,
                    emptyTrash,
                    true,
                    "Delete",
                  )
                }
                sx={{
                  width: 32,
                  height: 32,
                  borderRadius: "4px",
                  color: RED,
                  backgroundColor: RED_08,
                  border: "1px solid rgba(220,38,38,0.2)",
                  "&:hover": { backgroundColor: "rgba(220,38,38,0.15)" },
                }}
              >
                <DeleteForeverOutlinedIcon sx={{ fontSize: 16 }} />
              </IconButton>
            </Tooltip>
          </Box>
        )}

        {trashedRequests.length === 0 ? (
          <Box
            sx={{
              py: 6,
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: 1,
            }}
          >
            <DeleteOutlineOutlinedIcon
              sx={{
                fontSize: 32,
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
              Trash is empty
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
              {trashedRequests.length} request(s) in trash.
            </Typography>
            <RequestBulkBar
              count={selected.length}
              actionLoading={actionLoading}
              isDark={isDark}
              border={border}
              actions={[
                {
                  label: "Restore selected",
                  icon: <RestoreFromTrashOutlinedIcon sx={{ fontSize: 16 }} />,
                  onClick: () => runAction("restore", selected),
                },
                {
                  label: "Delete selected forever",
                  icon: <DeleteForeverOutlinedIcon sx={{ fontSize: 16 }} />,
                  onClick: () =>
                    openConfirm(
                      "Delete Forever",
                      `Permanently remove ${selected.length} request(s)? This cannot be undone.`,
                      () => runAction("deleteForever", selected),
                      true,
                      "Delete",
                    ),
                  destructive: true,
                },
              ]}
            />
            <DataGrid
              rows={trashedRequests}
              columns={trashColumns}
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
