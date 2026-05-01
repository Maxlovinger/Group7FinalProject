import React, { useState, useEffect } from 'react';
import {
  Typography, Box, TextField, Grid, Paper, CircularProgress, Chip
} from '@mui/material';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell, CartesianGrid
} from 'recharts';
import config from '../config.json';

const SERVER = `http://${config.server_host}:${config.server_port}`;

/**
 * Post-Conflict Recovery Tracker (Page 8 in the project outline).
 * Hits /recovery_timeline and shows years_to_recovery for each country whose
 * fatalities returned to a 3-year pre-peak baseline.
 */
export default function RecoveryPage() {
  const [country, setCountry] = useState('');
  const [data,    setData]    = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setLoading(true);
    const url = country
      ? `${SERVER}/recovery_timeline?country=${encodeURIComponent(country)}`
      : `${SERVER}/recovery_timeline`;
    fetch(url)
      .then(r => r.json())
      .then(rows => { setData(Array.isArray(rows) ? rows : []); setLoading(false); })
      .catch(()  => setLoading(false));
  }, [country]);

  // Fastest first; cap chart at 25 to keep it readable
  const chartData = data.slice(0, 25);
  const colorFor = y =>
    y <= 2 ? '#00d4aa' : y <= 5 ? '#4db8ff' : y <= 10 ? '#ffb347' : '#ff6b35';

  return (
    <Box>
      <Typography variant="h4" sx={{ mb: 1, color: 'white' }}>🕊️ Post-Conflict Recovery Tracker</Typography>
      <Typography sx={{ color: 'grey.400', mb: 4 }}>
        For each country, finds the peak conflict year and the first post-peak year where annual
        fatalities returned to the average of the three pre-peak years.
      </Typography>

      <Paper elevation={0} sx={{ p: 3, mb: 4, border: '1px solid #1e2d4a', borderRadius: 2 }}>
        <Grid container spacing={2}>
          <Grid item xs={12} sm={6}>
            <TextField fullWidth size="small" label="Filter by country (optional)" value={country}
              onChange={e => setCountry(e.target.value)} />
          </Grid>
        </Grid>
      </Paper>

      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}><CircularProgress color="primary" /></Box>
      ) : data.length === 0 ? (
        <Typography sx={{ color: 'grey.500', textAlign: 'center', py: 6 }}>
          No countries with a clean recovery curve match this filter.
        </Typography>
      ) : (
        <>
          <Paper elevation={0} sx={{ p: 3, mb: 4, border: '1px solid #1e2d4a', borderRadius: 2 }}>
            <Typography variant="caption" sx={{ color: 'grey.500', textTransform: 'uppercase', display: 'block', mb: 2 }}>
              Years to recovery (fastest first)
            </Typography>
            <ResponsiveContainer width="100%" height={360}>
              <BarChart data={chartData} layout="vertical" margin={{ left: 60, right: 20 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e2d4a" horizontal={false} />
                <XAxis type="number" tick={{ fill: '#666', fontSize: 11 }} />
                <YAxis type="category" dataKey="country" tick={{ fill: '#aaa', fontSize: 11 }} width={120} />
                <Tooltip
                  contentStyle={{ background: '#111827', border: '1px solid #1e2d4a', borderRadius: 8 }}
                  labelStyle={{ color: '#00d4aa', fontWeight: 700 }}
                  formatter={(v, n) => [v, n === 'years_to_recovery' ? 'Years to recovery' : n]}
                />
                <Bar dataKey="years_to_recovery" radius={[0, 3, 3, 0]}>
                  {chartData.map((row, i) => (
                    <Cell key={i} fill={colorFor(Number(row.years_to_recovery))} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </Paper>

          <Paper elevation={0} sx={{ border: '1px solid #1e2d4a', borderRadius: 2, overflow: 'hidden' }}>
            {data.map((row, i) => (
              <Box key={row.country} sx={{
                display: 'flex', alignItems: 'center', px: 3, py: 1.5, gap: 2, flexWrap: 'wrap',
                borderBottom: '1px solid #1a2540',
                '&:hover': { bgcolor: '#1a2540' },
                '&:last-child': { borderBottom: 'none' },
              }}>
                <Typography sx={{ width: 36, color: 'grey.600', fontFamily: 'monospace', fontSize: '0.8rem' }}>
                  #{i + 1}
                </Typography>
                <Typography sx={{ flex: '1 1 200px', color: 'white', fontWeight: 600 }}>{row.country}</Typography>
                <Chip label={`Peak: ${row.peak_year}`} size="small" sx={{ bgcolor: '#3a1d1d', color: '#ff6b35', fontFamily: 'monospace' }} />
                <Chip label={`Recovered: ${row.recovery_year}`} size="small" sx={{ bgcolor: '#0f3d34', color: '#00d4aa', fontFamily: 'monospace' }} />
                <Typography sx={{ width: 160, color: 'grey.500', fontSize: '0.82rem', textAlign: 'right' }}>
                  Peak fatalities: {Number(row.peak_fatalities).toLocaleString()}
                </Typography>
                <Chip
                  label={`${row.years_to_recovery} yr${row.years_to_recovery === 1 ? '' : 's'}`}
                  size="small"
                  sx={{
                    width: 80, fontFamily: 'monospace', fontWeight: 700,
                    bgcolor: `${colorFor(Number(row.years_to_recovery))}22`,
                    color: colorFor(Number(row.years_to_recovery)),
                  }}
                />
              </Box>
            ))}
          </Paper>
        </>
      )}
    </Box>
  );
}
