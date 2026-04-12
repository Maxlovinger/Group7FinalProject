import React, { useState, useEffect } from 'react';
import {
  Typography, Box, TextField, Grid, Paper, CircularProgress, Chip
} from '@mui/material';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid
} from 'recharts';
import config from '../config.json';

const SERVER = `http://${config.server_host}:${config.server_port}`;

export default function ConflictPage() {
  const [topCountries, setTopCountries]   = useState([]);
  const [filtered, setFiltered]           = useState([]);
  const [countryFilter, setCountryFilter] = useState('');
  const [yearFilter, setYearFilter]       = useState('');
  const [loading, setLoading]             = useState(false);
  const [searching, setSearching]         = useState(false);

  // Load top conflict countries on mount
  useEffect(() => {
    setLoading(true);
    fetch(`${SERVER}/top_conflict_countries?limit=15`)
      .then(r => r.json())
      .then(d => { setTopCountries(d); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  // Search conflict by filters
  useEffect(() => {
    if (!countryFilter && !yearFilter) { setFiltered([]); return; }
    setSearching(true);
    const params = new URLSearchParams();
    if (countryFilter) params.set('country', countryFilter);
    if (yearFilter)    params.set('year', yearFilter);
    fetch(`${SERVER}/conflict_summary?${params}`)
      .then(r => r.json())
      .then(d => { setFiltered(d); setSearching(false); })
      .catch(() => setSearching(false));
  }, [countryFilter, yearFilter]);

  return (
    <Box>
      <Typography variant="h4" sx={{ mb: 1, color: 'white' }}>⚔️ Conflict Intensity</Typography>
      <Typography sx={{ color: 'grey.400', mb: 4 }}>
        Aggregated ACLED conflict event data across 6 global regions.
      </Typography>

      {/* Search Controls */}
      <Paper elevation={0} sx={{ p: 3, mb: 4, border: '1px solid #1e2d4a', borderRadius: 2 }}>
        <Grid container spacing={2}>
          <Grid item xs={12} sm={6}>
            <TextField
              fullWidth label="Filter by Country" variant="outlined" size="small"
              value={countryFilter}
              onChange={e => setCountryFilter(e.target.value)}
              sx={{ '& .MuiOutlinedInput-root': { borderRadius: 1.5 } }}
            />
          </Grid>
          <Grid item xs={12} sm={3}>
            <TextField
              fullWidth label="Year (e.g. 2021)" variant="outlined" size="small"
              value={yearFilter}
              onChange={e => setYearFilter(e.target.value)}
              sx={{ '& .MuiOutlinedInput-root': { borderRadius: 1.5 } }}
            />
          </Grid>
        </Grid>
      </Paper>

      {/* Filtered Results */}
      {(countryFilter || yearFilter) && (
        <Box sx={{ mb: 5 }}>
          <Typography variant="h6" sx={{ mb: 2, color: 'white' }}>Search Results</Typography>
          {searching ? (
            <CircularProgress color="primary" size={24} />
          ) : (
            <Paper elevation={0} sx={{ border: '1px solid #1e2d4a', borderRadius: 2, overflow: 'hidden' }}>
              {filtered.length === 0 ? (
                <Typography sx={{ p: 3, color: 'grey.500' }}>No results found.</Typography>
              ) : filtered.map((row, i) => (
                <Box key={i} sx={{
                  display: 'flex', flexWrap: 'wrap', gap: 2, px: 3, py: 1.5,
                  borderBottom: '1px solid #1a2540', alignItems: 'center',
                  '&:last-child': { borderBottom: 'none' },
                  '&:hover': { bgcolor: '#1a2540' },
                }}>
                  <Typography sx={{ flex: '0 0 140px', color: 'primary.main', fontWeight: 600 }}>{row.country}</Typography>
                  <Chip label={`${row.year}`} size="small" sx={{ bgcolor: '#1e2d4a', color: 'grey.300' }} />
                  <Typography sx={{ color: 'grey.400', fontSize: '0.82rem' }}>
                    📌 {Number(row.total_events).toLocaleString()} events
                  </Typography>
                  <Typography sx={{ color: '#ff6b35', fontSize: '0.82rem', fontWeight: 600 }}>
                    💀 {Number(row.total_fatalities).toLocaleString()} fatalities
                  </Typography>
                  {row.total_exposure && (
                    <Typography sx={{ color: 'grey.500', fontSize: '0.82rem' }}>
                      👥 {Number(row.total_exposure).toLocaleString()} exposed
                    </Typography>
                  )}
                </Box>
              ))}
            </Paper>
          )}
        </Box>
      )}

      {/* Top Countries Chart */}
      <Typography variant="h6" sx={{ mb: 2, color: 'white' }}>Most Conflict-Affected Countries (All Time)</Typography>
      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}>
          <CircularProgress color="primary" />
        </Box>
      ) : (
        <Paper elevation={0} sx={{ p: 3, border: '1px solid #1e2d4a', borderRadius: 2 }}>
          <ResponsiveContainer width="100%" height={340}>
            <BarChart data={topCountries} layout="vertical" margin={{ left: 60, right: 20 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1e2d4a" horizontal={false} />
              <XAxis type="number" tick={{ fill: '#666', fontSize: 11 }} />
              <YAxis type="category" dataKey="country" tick={{ fill: '#aaa', fontSize: 11 }} width={100} />
              <Tooltip
                contentStyle={{ background: '#111827', border: '1px solid #1e2d4a', borderRadius: 8 }}
                labelStyle={{ color: '#ff6b35', fontWeight: 700 }}
                formatter={(v, n) => [Number(v).toLocaleString(), n === 'total_fatalities' ? 'Fatalities' : 'Events']}
              />
              <Bar dataKey="total_fatalities" fill="#ff6b35" radius={[0, 3, 3, 0]} name="total_fatalities" />
            </BarChart>
          </ResponsiveContainer>
        </Paper>
      )}
    </Box>
  );
}
