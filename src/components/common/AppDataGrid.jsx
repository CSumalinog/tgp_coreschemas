import React, { forwardRef, useEffect, useMemo, useState } from "react";
import { Box, IconButton, Tooltip, Typography, useTheme } from "@mui/material";
import {
  DataGrid as MuiDataGrid,
  GridToolbarExport,
  GridToolbarQuickFilter,
  useGridApiRef,
} from "@mui/x-data-grid";

const GRID_FONT = "'Inter', sans-serif";

function buildGridBaseSx(isDark) {
  const border = isDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.08)";
  const borderLight = isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.06)";
  return {
    border: "none",
    fontFamily: GRID_FONT,
    fontSize: "0.8rem",
    backgroundColor: isDark ? "#1a1a1d" : "#f7f7f8",
    color: "text.primary",
    "& .MuiDataGrid-columnHeaders": {
      backgroundColor: isDark ? "rgba(255,255,255,0.03)" : "#ededee",
      borderBottom: `1px solid ${border}`,
      minHeight: "44px !important",
      maxHeight: "44px !important",
      lineHeight: "44px !important",
    },
    "& .MuiDataGrid-columnHeaderTitle": {
      fontFamily: GRID_FONT,
      fontSize: "0.8rem",
      fontWeight: 550,
      color: "text.secondary",
      letterSpacing: "0.07em",
      textTransform: "uppercase",
    },
    "& .MuiDataGrid-columnSeparator": { display: "none" },
    "& .MuiDataGrid-columnHeader:focus, & .MuiDataGrid-columnHeader:focus-within":
      { outline: "none" },
    "& .MuiDataGrid-menuIcon button": {
      color: "text.disabled",
      padding: "2px",
      borderRadius: "10px",
      transition: "all 0.15s",
      "&:hover": { backgroundColor: "rgba(245,197,43,0.08)", color: "#b45309" },
    },
    "& .MuiDataGrid-menuIcon .MuiSvgIcon-root": { fontSize: "1rem" },
    "& .MuiDataGrid-columnHeader:hover .MuiDataGrid-menuIcon button": {
      color: "text.secondary",
    },
    "& .MuiDataGrid-row": {
      borderBottom: `1px solid ${borderLight}`,
      backgroundColor: isDark ? "#1a1a1d" : "#ffffff",
      transition: "background-color 0.12s",
      "&:last-child": { borderBottom: "none" },
    },
    "& .MuiDataGrid-row:hover": {
      backgroundColor: isDark ? "rgba(255,255,255,0.025)" : "#f9f9f9",
    },
    "& .MuiDataGrid-cell": {
      border: "none",
      outline: "none !important",
      "&:focus, &:focus-within": { outline: "none" },
    },
    "& .MuiCheckbox-root": {
      color: isDark ? "rgba(255,255,255,0.3)" : "rgba(0,0,0,0.25)",
      "& .MuiSvgIcon-root": { fontSize: 18 },
    },
    "& .MuiCheckbox-root.Mui-checked, & .MuiCheckbox-root.MuiCheckbox-indeterminate":
      { color: isDark ? "#e0e0e0" : "#353535" },
    "& .MuiDataGrid-footerContainer": {
      borderTop: `1px solid ${border}`,
      backgroundColor: isDark ? "#1a1a1d" : "#f7f7f8",
      minHeight: "44px",
    },
    "& .MuiTablePagination-root": {
      fontFamily: GRID_FONT,
      fontSize: "0.75rem",
      color: "text.secondary",
    },
    "& .MuiTablePagination-selectLabel, & .MuiTablePagination-displayedRows": {
      fontFamily: GRID_FONT,
      fontSize: "0.75rem",
    },
    "& .MuiDataGrid-virtualScroller": {
      backgroundColor: isDark ? "#1a1a1d" : "#ffffff",
    },
    "& .MuiDataGrid-overlay": {
      backgroundColor: isDark ? "#1a1a1d" : "#ffffff",
    },
    "& .highlighted-row": {
      backgroundColor: isDark
        ? "rgba(245,197,43,0.08)"
        : "rgba(245,197,43,0.10)",
      "&:hover": {
        backgroundColor: isDark
          ? "rgba(245,197,43,0.13)"
          : "rgba(245,197,43,0.15)",
      },
    },
    "& .row--highlighted": {
      backgroundColor: isDark
        ? "rgba(245,197,43,0.08)"
        : "rgba(245,197,43,0.10)",
      "&:hover": {
        backgroundColor: isDark
          ? "rgba(245,197,43,0.13)"
          : "rgba(245,197,43,0.15)",
      },
    },
  };
}

function DefaultNoRowsOverlay() {
  return (
    <Box
      sx={{
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        height: "100%",
        minHeight: 120,
        px: 2,
      }}
    >
      <Typography sx={{ fontSize: "0.8rem", color: "text.secondary" }}>
        No records found.
      </Typography>
    </Box>
  );
}

function DefaultNoResultsOverlay() {
  return (
    <Box
      sx={{
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        height: "100%",
        minHeight: 120,
        px: 2,
      }}
    >
      <Typography sx={{ fontSize: "0.8rem", color: "text.secondary" }}>
        No matching results.
      </Typography>
    </Box>
  );
}

function DefaultGridToolbar({
  csvOptions,
  printOptions,
  quickFilterProps,
  showSearch,
  selectedCount,
  selectionActions,
}) {
  if (selectedCount > 0 && selectionActions?.length) {
    return (
      <Box
        sx={{
          display: "flex",
          alignItems: "center",
          py: 0.75,
          pl: 2,
          pr: 1,
          width: "100%",
          bgcolor: "#ededee",
          borderBottom: "1px solid rgba(0,0,0,0.06)",
        }}
      >
        <Typography
          sx={{
            flex: "1 1 100%",
            fontSize: "0.82rem",
            fontWeight: 500,
            color: "text.primary",
          }}
        >
          {selectedCount} selected
        </Typography>
        <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
          {selectionActions.map((action) => (
            <Tooltip key={action.label} title={action.label} arrow>
              <IconButton
                size="small"
                onClick={action.onClick}
                sx={{
                  color:
                    action.color === "error" ? "#dc2626" : "text.secondary",
                  borderRadius: "10px",
                  "&:hover":
                    action.color === "error"
                      ? {
                          backgroundColor: "rgba(239,68,68,0.1)",
                          color: "#b91c1c",
                        }
                      : { backgroundColor: "action.hover" },
                }}
              >
                {action.icon || action.label}
              </IconButton>
            </Tooltip>
          ))}
        </Box>
      </Box>
    );
  }

  // No selection active — check if there's anything to show
  const hasSearch = showSearch;
  const hasExport =
    !csvOptions?.disableToolbarButton || !printOptions?.disableToolbarButton;

  // If both search and export are hidden, don't render the toolbar at all
  if (!hasSearch && !hasExport) return null;

  return (
    <Box
      sx={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        gap: 1,
        width: "100%",
      }}
    >
      {showSearch ? (
        <GridToolbarQuickFilter
          debounceMs={250}
          quickFilterParser={(input) =>
            input
              .split(/\s+/)
              .map((token) => token.trim())
              .filter(Boolean)
          }
          {...quickFilterProps}
        />
      ) : (
        <Box />
      )}

      <GridToolbarExport csvOptions={csvOptions} printOptions={printOptions} />
    </Box>
  );
}

const buildDefaultFileName = () => {
  if (typeof window === "undefined") return "table-export";

  const path = window.location.pathname
    .split("/")
    .filter(Boolean)
    .join("-")
    .trim();

  return path ? `${path}-export` : "table-export";
};

const AppDataGrid = forwardRef(function AppDataGrid(
  {
    columns,
    showToolbar = true,
    slots,
    slotProps,
    filterModel,
    onFilterModelChange,
    exportFileName,
    enableSearch = true,
    persistSearch = true,
    searchStorageKey,
    searchPlaceholder,
    onRowClick,
    getRowClassName,
    selectionActions,
    checkboxSelection: checkboxSelectionProp,
    rowSelectionModel: externalSelectionModel,
    onRowSelectionModelChange,
    apiRef: externalApiRef,
    rowHeight = 56,
    sx: userSx,
    ...props
  },
  ref,
) {
  const theme = useTheme();
  const isDark = theme.palette.mode === "dark";
  const baseSx = useMemo(() => buildGridBaseSx(isDark), [isDark]);
  const mergedSx = useMemo(() => {
    if (!userSx) return baseSx;
    return [baseSx, ...(Array.isArray(userSx) ? userSx : [userSx])];
  }, [baseSx, userSx]);

  const effectiveSearchStorageKey = useMemo(() => {
    if (!persistSearch || !enableSearch) return null;
    if (searchStorageKey) return searchStorageKey;

    const path =
      typeof window !== "undefined" ? window.location.pathname : "table";
    const columnSig = Array.isArray(columns)
      ? columns
          .map((col) => col?.field)
          .filter(Boolean)
          .join("|")
      : "default";

    return `grid-search:${path}:${columnSig || "default"}`;
  }, [columns, enableSearch, persistSearch, searchStorageKey]);

  const [internalFilterModel, setInternalFilterModel] = useState(() => {
    if (!effectiveSearchStorageKey) return undefined;

    try {
      const raw = sessionStorage.getItem(effectiveSearchStorageKey);
      if (!raw) return undefined;
      const parsed = JSON.parse(raw);
      if (!Array.isArray(parsed) || parsed.length === 0) return undefined;

      return {
        items: [],
        quickFilterValues: parsed,
      };
    } catch {
      return undefined;
    }
  });

  useEffect(() => {
    if (!effectiveSearchStorageKey) return;

    try {
      const raw = sessionStorage.getItem(effectiveSearchStorageKey);
      const parsed = raw ? JSON.parse(raw) : [];
      const nextValues = Array.isArray(parsed) ? parsed : [];

      if (typeof filterModel === "undefined") {
        setInternalFilterModel({
          items: [],
          quickFilterValues: nextValues,
        });
      }
    } catch {
      if (typeof filterModel === "undefined") {
        setInternalFilterModel({ items: [], quickFilterValues: [] });
      }
    }
  }, [effectiveSearchStorageKey, filterModel]);

  useEffect(() => {
    if (!effectiveSearchStorageKey) return;

    try {
      const quickValues = internalFilterModel?.quickFilterValues;
      if (!Array.isArray(quickValues) || quickValues.length === 0) {
        sessionStorage.removeItem(effectiveSearchStorageKey);
        return;
      }

      sessionStorage.setItem(
        effectiveSearchStorageKey,
        JSON.stringify(quickValues),
      );
    } catch {
      // Ignore storage errors; filtering still works without persistence.
    }
  }, [effectiveSearchStorageKey, internalFilterModel?.quickFilterValues]);

  const resolvedFilterModel = filterModel ?? internalFilterModel;

  const [highlightedRowId, setHighlightedRowId] = useState(null);

  // Selection (uncontrolled — MUI X v8 model is { ids: Set, type: 'include' })
  const useSelection = !!(selectionActions || checkboxSelectionProp);
  const _internalApiRef = useGridApiRef();
  const resolvedApiRef = externalApiRef || _internalApiRef;
  const [selectedIds, setSelectedIds] = useState([]);

  useEffect(() => {
    if (!externalSelectionModel) return;
    const ids =
      externalSelectionModel?.ids instanceof Set
        ? [...externalSelectionModel.ids]
        : [];
    setSelectedIds(ids);
  }, [externalSelectionModel]);

  const handleSelectionChange = (model) => {
    const ids = model?.ids instanceof Set ? [...model.ids] : [];
    setSelectedIds(ids);
    onRowSelectionModelChange?.(model);
  };

  const handleClearSelection = () => {
    const empty = { type: "include", ids: new Set() };
    resolvedApiRef.current?.setRowSelectionModel(empty);
    setSelectedIds([]);
    onRowSelectionModelChange?.(empty);
  };

  const handleRowClick = (params, event, details) => {
    setHighlightedRowId((prev) => (prev === params.id ? null : params.id));
    onRowClick?.(params, event, details);
  };

  const handleGetRowClassName = (params) => {
    const base = getRowClassName?.(params) || "";
    return params.id === highlightedRowId
      ? `${base} row--highlighted`.trim()
      : base;
  };

  const handleFilterModelChange = (nextModel, details) => {
    if (typeof filterModel === "undefined") {
      setInternalFilterModel(nextModel);
    }

    onFilterModelChange?.(nextModel, details);
  };

  const mergedToolbarProps = useMemo(() => {
    const baseCsvOptions = {
      utf8WithBom: true,
      fileName: exportFileName || buildDefaultFileName(),
      ...(slotProps?.toolbar?.csvOptions || {}),
    };

    const basePrintOptions = {
      disableToolbarButton: true,
      ...(slotProps?.toolbar?.printOptions || {}),
    };

    return {
      ...slotProps?.toolbar,
      csvOptions: baseCsvOptions,
      printOptions: basePrintOptions,
      showSearch: enableSearch,
      quickFilterProps: {
        placeholder: searchPlaceholder || "Search this table...",
        ...(slotProps?.toolbar?.quickFilterProps || {}),
      },
    };
  }, [enableSearch, exportFileName, searchPlaceholder, slotProps]);

  const mergedSlotProps = {
    ...slotProps,
    toolbar: {
      ...mergedToolbarProps,
      selectedCount: selectedIds.length,
      selectionActions: selectionActions?.map((action) => ({
        ...action,
        onClick: () => action.onClick(selectedIds),
      })),
      onClearSelection: handleClearSelection,
    },
    loadingOverlay: {
      variant: "skeleton",
      noRowsVariant: "skeleton",
      ...(slotProps?.loadingOverlay || {}),
    },
  };

  const selectionProps = useSelection
    ? {
        checkboxSelection: true,
        disableRowSelectionOnClick: true,
        disableRowSelectionExcludeModel: true,
        rowSelectionModel: externalSelectionModel,
        onRowSelectionModelChange: handleSelectionChange,
      }
    : {};

  return (
    <MuiDataGrid
      ref={ref}
      columns={columns}
      className={useSelection ? "AppDataGrid--hasCheckbox" : undefined}
      showToolbar={showToolbar}
      filterModel={resolvedFilterModel}
      onFilterModelChange={handleFilterModelChange}
      onRowClick={handleRowClick}
      getRowClassName={handleGetRowClassName}
      apiRef={resolvedApiRef}
      rowHeight={rowHeight}
      {...selectionProps}
      slots={{
        ...slots,
        toolbar: slots?.toolbar || DefaultGridToolbar,
        noRowsOverlay: slots?.noRowsOverlay || DefaultNoRowsOverlay,
        noResultsOverlay: slots?.noResultsOverlay || DefaultNoResultsOverlay,
      }}
      slotProps={mergedSlotProps}
      {...props}
      sx={mergedSx}
    />
  );
});

export { AppDataGrid as DataGrid };
export * from "@mui/x-data-grid";
