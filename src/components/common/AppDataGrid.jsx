import React, { forwardRef, useEffect, useMemo, useState } from "react";
import { Box, Typography } from "@mui/material";
import {
  DataGrid as MuiDataGrid,
  GridToolbarContainer,
  GridToolbarExport,
  GridToolbarQuickFilter,
} from "@mui/x-data-grid";

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
}) {
  return (
    <GridToolbarContainer
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
    </GridToolbarContainer>
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
    ...props
  },
  ref,
) {
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
    toolbar: mergedToolbarProps,
    loadingOverlay: {
      variant: "skeleton",
      noRowsVariant: "skeleton",
      ...(slotProps?.loadingOverlay || {}),
    },
  };

  return (
    <MuiDataGrid
      ref={ref}
      columns={columns}
      showToolbar={showToolbar}
      filterModel={resolvedFilterModel}
      onFilterModelChange={handleFilterModelChange}
      slots={{
        ...slots,
        toolbar: slots?.toolbar || DefaultGridToolbar,
        noRowsOverlay: slots?.noRowsOverlay || DefaultNoRowsOverlay,
        noResultsOverlay: slots?.noResultsOverlay || DefaultNoResultsOverlay,
      }}
      slotProps={mergedSlotProps}
      {...props}
    />
  );
});

export { AppDataGrid as DataGrid };
export * from "@mui/x-data-grid";
