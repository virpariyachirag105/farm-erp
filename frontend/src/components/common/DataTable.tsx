import React, { useState, useMemo } from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  TablePagination,
  TextField,
  InputAdornment,
  Box,
  Typography,
  Skeleton,
  TableSortLabel,
} from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import InboxOutlinedIcon from '@mui/icons-material/InboxOutlined';

export interface Column<T> {
  id: string;
  label: string;
  minWidth?: number;
  align?: 'left' | 'right' | 'center';
  render?: (row: T) => React.ReactNode;
  sortable?: boolean;
  sortValue?: (row: T) => string | number | boolean | Date | null | undefined;
}

interface DataTableProps<T> {
  columns: Column<T>[];
  data: T[];
  loading?: boolean;
  searchPlaceholder?: string;
  searchField?: (row: T) => string;
  filterComponent?: React.ReactNode;
  emptyMessage?: string;
  defaultRowsPerPage?: number;
  defaultSortBy?: string;
  defaultSortDirection?: 'asc' | 'desc';
}

export function DataTable<T extends { id?: number | string }>({
  columns,
  data,
  loading = false,
  searchPlaceholder = 'Search records...',
  searchField,
  filterComponent,
  emptyMessage = 'No records found',
  defaultRowsPerPage = 10,
  defaultSortBy,
  defaultSortDirection = 'asc',
}: DataTableProps<T>) {
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(defaultRowsPerPage);
  const [searchQuery, setSearchQuery] = useState('');
  const [orderBy, setOrderBy] = useState<string | null>(defaultSortBy || null);
  const [order, setOrder] = useState<'asc' | 'desc'>(defaultSortDirection);

  // Filtered data based on search input
  const filteredData = useMemo(() => {
    if (!searchQuery.trim()) return data;
    const query = searchQuery.toLowerCase();

    return data.filter((row) => {
      if (searchField) {
        return searchField(row).toLowerCase().includes(query);
      }
      // Fallback: search all primitive values in row
      return Object.values(row).some(
        (val) => val !== null && val !== undefined && String(val).toLowerCase().includes(query)
      );
    });
  }, [data, searchQuery, searchField]);

  // Sorted data based on column and order
  const sortedData = useMemo(() => {
    if (!orderBy) return filteredData;

    const column = columns.find((c) => c.id === orderBy);
    if (!column) return filteredData;

    return [...filteredData].sort((a, b) => {
      let valA: unknown;
      let valB: unknown;

      if (column.sortValue) {
        valA = column.sortValue(a);
        valB = column.sortValue(b);
      } else {
        // Support nested keys like 'dealer.name' or 'farm.name'
        const getNestedVal = (obj: unknown, path: string): unknown => {
          if (!obj || typeof obj !== 'object') return undefined;
          return path.split('.').reduce<unknown>((acc, part) => {
            if (acc && typeof acc === 'object') {
              return (acc as Record<string, unknown>)[part];
            }
            return undefined;
          }, obj);
        };
        valA = getNestedVal(a, column.id);
        valB = getNestedVal(b, column.id);
      }

      // Handle null / undefined - push to bottom regardless of sort order
      const isNullA = valA === undefined || valA === null || valA === '';
      const isNullB = valB === undefined || valB === null || valB === '';

      if (isNullA && isNullB) return 0;
      if (isNullA) return 1;
      if (isNullB) return -1;

      // Compare booleans
      if (typeof valA === 'boolean' && typeof valB === 'boolean') {
        const numA = valA ? 1 : 0;
        const numB = valB ? 1 : 0;
        return order === 'asc' ? numA - numB : numB - numA;
      }

      // Compare numbers
      if (typeof valA === 'number' && typeof valB === 'number') {
        return order === 'asc' ? valA - valB : valB - valA;
      }

      // Compare string values (including numbers formatted as strings and dates)
      const strA = String(valA).trim();
      const strB = String(valB).trim();

      // Check if both are numeric strings
      const numValA = Number(strA);
      const numValB = Number(strB);
      if (!isNaN(numValA) && !isNaN(numValB) && strA !== '' && strB !== '') {
        return order === 'asc' ? numValA - numValB : numValB - numValA;
      }

      // Check if both are date strings (e.g. 2026-03-15 or 2026/03/15)
      const isDateA = (strA.includes('-') || strA.includes('/')) && !isNaN(Date.parse(strA));
      const isDateB = (strB.includes('-') || strB.includes('/')) && !isNaN(Date.parse(strB));
      if (isDateA && isDateB) {
        const timeA = Date.parse(strA);
        const timeB = Date.parse(strB);
        return order === 'asc' ? timeA - timeB : timeB - timeA;
      }

      // Natural alphanumeric string comparison
      const comp = strA.localeCompare(strB, undefined, { numeric: true, sensitivity: 'base' });
      return order === 'asc' ? comp : -comp;
    });
  }, [filteredData, orderBy, order, columns]);

  const handleRequestSort = (property: string) => {
    const isAsc = orderBy === property && order === 'asc';
    setOrder(isAsc ? 'desc' : 'asc');
    setOrderBy(property);
    setPage(0);
  };

  const handleChangePage = (_: unknown, newPage: number) => {
    setPage(newPage);
  };

  const handleChangeRowsPerPage = (event: React.ChangeEvent<HTMLInputElement>) => {
    setRowsPerPage(+event.target.value);
    setPage(0);
  };

  const paginatedData = useMemo(() => {
    return sortedData.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage);
  }, [sortedData, page, rowsPerPage]);

  return (
    <Paper sx={{ width: '100%', overflow: 'hidden', border: '1px solid #e2e8f0', borderRadius: 2 }}>
      {/* Top search & filter bar */}
      {(searchField || filterComponent) && (
        <Box
          sx={{
            p: 2,
            display: 'flex',
            flexDirection: { xs: 'column', sm: 'row' },
            justifyContent: 'space-between',
            alignItems: { xs: 'stretch', sm: 'center' },
            gap: 2,
            borderBottom: '1px solid #e2e8f0',
            backgroundColor: '#ffffff',
          }}
        >
          {searchField && (
            <TextField
              size="small"
              placeholder={searchPlaceholder}
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setPage(0);
              }}
              slotProps={{
                input: {
                  startAdornment: (
                    <InputAdornment position="start">
                      <SearchIcon sx={{ color: '#94a3b8', fontSize: 20 }} />
                    </InputAdornment>
                  ),
                },
              }}
              sx={{ minWidth: { xs: '100%', sm: 280 } }}
            />
          )}

          {filterComponent && (
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, flexWrap: 'wrap' }}>
              {filterComponent}
            </Box>
          )}
        </Box>
      )}

      {/* Table Container */}
      <TableContainer sx={{ maxHeight: 600 }}>
        <Table stickyHeader aria-label="Farm data table">
          <TableHead>
            <TableRow>
              {columns.map((column) => {
                const isSortable = column.sortable ?? (column.id !== 'actions');
                const isSorted = orderBy === column.id;

                return (
                  <TableCell
                    key={column.id}
                    align={column.align || 'left'}
                    sortDirection={isSorted ? order : false}
                    sx={{
                      minWidth: column.minWidth,
                      fontWeight: 700,
                      backgroundColor: '#f8fafc',
                      color: '#475569',
                      borderBottom: '1px solid #e2e8f0',
                      userSelect: 'none',
                    }}
                  >
                    {isSortable ? (
                      <TableSortLabel
                        active={isSorted}
                        direction={isSorted ? order : 'asc'}
                        onClick={() => handleRequestSort(column.id)}
                        sx={{
                          fontWeight: 700,
                          color: '#475569',
                          '&:hover': {
                            color: '#0f172a',
                          },
                          '&.Mui-active': {
                            color: '#0284c7',
                            fontWeight: 800,
                          },
                          '&.Mui-active .MuiTableSortLabel-icon': {
                            color: '#0284c7 !important',
                          },
                        }}
                      >
                        {column.label}
                      </TableSortLabel>
                    ) : (
                      column.label
                    )}
                  </TableCell>
                );
              })}
            </TableRow>
          </TableHead>
          <TableBody>
            {loading ? (
              // Loading skeleton rows
              Array.from({ length: rowsPerPage > 5 ? 5 : rowsPerPage }).map((_, rIdx) => (
                <TableRow key={`skeleton-${rIdx}`}>
                  {columns.map((col, cIdx) => (
                    <TableCell key={`skeleton-cell-${cIdx}`} align={col.align || 'left'}>
                      <Skeleton variant="text" height={28} />
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : paginatedData.length > 0 ? (
              paginatedData.map((row, index) => (
                <TableRow hover role="checkbox" tabIndex={-1} key={row.id ?? index}>
                  {columns.map((column) => {
                    const value = (row as Record<string, unknown>)[column.id];
                    return (
                      <TableCell key={column.id} align={column.align || 'left'}>
                        {column.render ? column.render(row) : (value as React.ReactNode) ?? '-'}
                      </TableCell>
                    );
                  })}
                </TableRow>
              ))
            ) : (
              // Empty State
              <TableRow>
                <TableCell colSpan={columns.length} align="center" sx={{ py: 8 }}>
                  <Box
                    sx={{
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      gap: 1.5,
                      color: '#94a3b8',
                    }}
                  >
                    <InboxOutlinedIcon sx={{ fontSize: 48, strokeWidth: 1 }} />
                    <Typography variant="body1" sx={{ color: '#64748b', fontWeight: 500 }}>
                      {emptyMessage}
                    </Typography>
                    {searchQuery && (
                      <Typography variant="caption" sx={{ color: '#94a3b8' }}>
                        Try clearing search filters
                      </Typography>
                    )}
                  </Box>
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </TableContainer>

      {/* Pagination */}
      {!loading && sortedData.length > 0 && (
        <TablePagination
          rowsPerPageOptions={[5, 10, 25, 50]}
          component="div"
          count={sortedData.length}
          rowsPerPage={rowsPerPage}
          page={page}
          onPageChange={handleChangePage}
          onRowsPerPageChange={handleChangeRowsPerPage}
          sx={{ borderTop: '1px solid #e2e8f0' }}
        />
      )}
    </Paper>
  );
}

export default DataTable;
