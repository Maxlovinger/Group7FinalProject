import React, { useState, useEffect } from 'react';
import {
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
  TablePagination, Paper, CircularProgress, Box, Typography
} from '@mui/material';

/**
 * LazyTable – fetches paginated data from `route` and renders it.
 *
 * Props:
 *   route            (string)   – API route, e.g. '/top_airports'
 *   columns          (array)    – [{ header, field, render? }]
 *   defaultPageSize  (int)      – default rows per page (default: 10)
 *   rowsPerPageOptions (array)  – e.g. [10, 25, 50]
 */
export default function LazyTable({
  route,
  columns,
  defaultPageSize = 10,
  rowsPerPageOptions = [10, 25, 50],
}) {
  const [data, setData]         = useState([]);
  const [page, setPage]         = useState(1);
  const [pageSize, setPageSize] = useState(defaultPageSize);
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState(null);

  useEffect(() => {
    setLoading(true);
    setError(null);
    const sep = route.includes('?') ? '&' : '?';
    fetch(`${route}${sep}page=${page}&page_size=${pageSize}`)
      .then(r => r.json())
      .then(rows => {
        setData(Array.isArray(rows) ? rows : []);
        setLoading(false);
      })
      .catch(err => {
        setError(err.message);
        setLoading(false);
      });
  }, [route, page, pageSize]);

  const handlePageChange = (_, newPage) => setPage(newPage + 1);
  const handleSizeChange = e => {
    // TASK: set the pageSize state variable and reset the current page to 1
    setPageSize(parseInt(e.target.value));
    setPage(1);
  };

  if (loading) return (
    <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}>
      <CircularProgress color="primary" />
    </Box>
  );

  if (error) return (
    <Typography color="error" sx={{ py: 2 }}>Error: {error}</Typography>
  );

  return (
    <Paper elevation={0} sx={{ border: '1px solid #1e2d4a', borderRadius: 2, overflow: 'hidden' }}>
      <TableContainer>
        <Table size="small">
          <TableHead>
            <TableRow sx={{ bgcolor: '#111827' }}>
              {columns.map(col => (
                <TableCell key={col.field}
                  sx={{ color: 'primary.main', fontWeight: 700, fontSize: '0.75rem',
                        letterSpacing: '0.08em', textTransform: 'uppercase', borderBottom: '1px solid #1e2d4a' }}>
                  {col.header}
                </TableCell>
              ))}
            </TableRow>
          </TableHead>
          <TableBody>
            {data.map((row, i) => (
              <TableRow key={i}
                sx={{ '&:hover': { bgcolor: '#1a2540' }, '&:last-child td': { border: 0 } }}>
                {/* TASK: map over all columns to render each cell */}
                {columns.map(col => (
                  <TableCell key={col.field}
                    sx={{ color: 'grey.300', fontSize: '0.82rem', borderBottom: '1px solid #1a2540' }}>
                    {col.render ? col.render(row[col.field], row) : (row[col.field] ?? '—')}
                  </TableCell>
                ))}
              </TableRow>
            ))}
            {data.length === 0 && (
              <TableRow>
                <TableCell colSpan={columns.length} align="center" sx={{ color: 'grey.500', py: 4 }}>
                  No results found.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </TableContainer>
      <TablePagination
        component="div"
        count={-1}
        rowsPerPage={pageSize}
        page={page - 1}
        onPageChange={handlePageChange}
        onRowsPerPageChange={handleSizeChange}
        rowsPerPageOptions={rowsPerPageOptions}
        sx={{ borderTop: '1px solid #1e2d4a', color: 'grey.400' }}
      />
    </Paper>
  );
}
