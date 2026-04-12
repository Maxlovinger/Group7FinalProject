import React, { useState, useEffect } from 'react';
import {
  Typography, Box, Slider, Grid, Paper, CircularProgress,
  ToggleButton, ToggleButtonGroup, Chip
} from '@mui/material';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import config from '../config.json';

const SERVER = `http://${config.server_host}:${config.server_port}`;

export default function RankingsPage() {
  const [limit, setLimit]     = useState(20);
  const [data, setData]       = useState([]);
  const [loading, setLoading] = useState(false);
  const [view, setView]       = useState('top');

  useEffect(() => {
    setLoading(true);
    fetch(`${SERVER}/flights_by_country?page=1&page_size=60`)
      .then(r => r.json())
      .then(rows => { setData(Array.isArray(rows) ? rows : []); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  const displayed = view === 'top'
    ? data.slice(0, limit)
    : [...data].reverse().slice(0, limit);

  const maxArrivals = Math.max(...displayed.map(d => Number(d.arrival_count) || 0), 1);
  const getColor = (val) => {
    const ratio = val / maxArrivals;
    if (ratio > 0.6) return '#00d4aa';
    if (ratio > 0.3) return '#4db8ff';
    if (ratio > 0.1) return '#ffb347';
    return '#ff6b35';
  };

  return (
    <Box>
      <Typography variant="h4" sx={{ mb: 1, color: 'white' }}>🏆 Global Rankings</Typography>
      <Typography sx={{ color: 'grey.400', mb: 4 }}>
        Countries ranked by total incoming flight arrivals — a proxy for tourism demand.
      </Typography>

      <Paper elevation={0} sx={{ p: 3, mb: 4, border: '1px solid #1e2d4a', borderRadius: 2 }}>
        <Grid container spacing={4} alignItems="center">
          <Grid item xs={12} sm={6}>
            <Typography variant="caption" sx={{ color: 'grey.500', textTransform: 'uppercase', letterSpacing: '0.1em' }}>
              Show {limit} countries
            </Typography>
            <Slider value={limit} onChange={(_, v) => setLimit(v)} min={5} max={40} step={5}
              sx={{ color: 'primary.main', mt: 1 }} />
          </Grid>
          <Grid item xs={12} sm={3}>
            <ToggleButtonGroup value={view} exclusive onChange={(_, v) => v && setView(v)} size="small">
              <ToggleButton value="top"
                sx={{ color: 'grey.400', borderColor: '#1e2d4a', '&.Mui-selected': { bgcolor: '#00d4aa22', color: 'primary.main' } }}>
                Top
              </ToggleButton>
              <ToggleButton value="bottom"
                sx={{ color: 'grey.400', borderColor: '#1e2d4a', '&.Mui-selected': { bgcolor: '#ff6b3522', color: 'secondary.main' } }}>
                Bottom
              </ToggleButton>
            </ToggleButtonGroup>
          </Grid>
        </Grid>
      </Paper>

      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}><CircularProgress color="primary" /></Box>
      ) : (
        <>
          <Paper elevation={0} sx={{ p: 3, mb: 4, border: '1px solid #1e2d4a', borderRadius: 2 }}>
            <Typography variant="caption" sx={{ color: 'grey.500', textTransform: 'uppercase', letterSpacing: '0.1em', mb: 2, display: 'block' }}>
              Flight Arrivals by Country
            </Typography>
            <ResponsiveContainer width="100%" height={320}>
              <BarChart data={displayed} margin={{ top: 5, right: 10, bottom: 80, left: 10 }}>
                <XAxis dataKey="country_name" tick={{ fill: '#666', fontSize: 10 }} angle={-45} textAnchor="end" interval={0} />
                <YAxis tick={{ fill: '#666', fontSize: 11 }} />
                <Tooltip
                  contentStyle={{ background: '#111827', border: '1px solid #1e2d4a', borderRadius: 8 }}
                  labelStyle={{ color: '#00d4aa', fontWeight: 700 }}
                  formatter={v => [Number(v).toLocaleString(), 'Arrivals']}
                />
                <Bar dataKey="arrival_count" radius={[3, 3, 0, 0]}>
                  {displayed.map((entry, i) => (
                    <Cell key={i} fill={getColor(Number(entry.arrival_count))} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </Paper>

          <Paper elevation={0} sx={{ border: '1px solid #1e2d4a', borderRadius: 2, overflow: 'hidden' }}>
            {displayed.map((row, i) => (
              <Box key={row.iso_code || i} sx={{
                display: 'flex', alignItems: 'center', px: 3, py: 1.5,
                borderBottom: '1px solid #1a2540',
                '&:hover': { bgcolor: '#1a2540' },
                '&:last-child': { borderBottom: 'none' },
              }}>
                <Typography sx={{ width: 40, color: 'grey.600', fontFamily: 'monospace', fontSize: '0.8rem' }}>#{i + 1}</Typography>
                <Typography sx={{ flex: 1, color: 'white', fontWeight: 600 }}>{row.country_name || row.iso_code || '—'}</Typography>
                <Chip label={row.iso_code} size="small"
                  sx={{ mr: 2, bgcolor: '#1e2d4a', color: 'grey.400', fontFamily: 'monospace', fontSize: '0.7rem' }} />
                <Chip
                  label={Number(row.arrival_count).toLocaleString()}
                  size="small"
                  sx={{ bgcolor: `${getColor(Number(row.arrival_count))}22`, color: getColor(Number(row.arrival_count)), fontFamily: 'monospace', fontWeight: 700 }}
                />
              </Box>
            ))}
          </Paper>
        </>
      )}
    </Box>
  );
}