import React, { useState } from 'react';
import {
  Typography, Box, TextField, Grid, Paper, Button, CircularProgress, Chip
} from '@mui/material';
import {
  RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar,
  ResponsiveContainer, Tooltip, Legend
} from 'recharts';
import config from '../config.json';

const SERVER = `http://${config.server_host}:${config.server_port}`;

/**
 * Compare Cities (Page 10 in the project outline).
 * Side-by-side view of two countries on the dimensions of the Risk vs. Reward
 * Index for the same year. Hits /risk_reward_score twice with country filters.
 */
export default function ComparePage() {
  const [a, setA] = useState('United States');
  const [b, setB] = useState('Japan');
  const [year, setYear] = useState(2022);
  const [rowA, setRowA] = useState(null);
  const [rowB, setRowB] = useState(null);
  const [loading, setLoading] = useState(false);

  const compare = async () => {
    setLoading(true);
    setRowA(null); setRowB(null);
    try {
      const [resA, resB] = await Promise.all([
        fetch(`${SERVER}/risk_reward_score?country=${encodeURIComponent(a)}&year=${year}&limit=1`).then(r => r.json()),
        fetch(`${SERVER}/risk_reward_score?country=${encodeURIComponent(b)}&year=${year}&limit=1`).then(r => r.json()),
      ]);
      setRowA(Array.isArray(resA) ? resA[0] : null);
      setRowB(Array.isArray(resB) ? resB[0] : null);
    } finally {
      setLoading(false);
    }
  };

  const log10 = v => v && v > 0 ? Math.log10(v) : 0;
  const radarData = (rowA && rowB) ? [
    { metric: 'GDP per capita (log)', A: log10(rowA.gdp_per_capita), B: log10(rowB.gdp_per_capita) },
    { metric: 'Conflict events (log)', A: log10(rowA.total_events),    B: log10(rowB.total_events) },
    { metric: 'Fatalities (log)',      A: log10(rowA.total_fatalities), B: log10(rowB.total_fatalities) },
    {
      metric: 'Risk-Reward (×10)',
      A: (rowA.risk_reward_score || 0) * 10,
      B: (rowB.risk_reward_score || 0) * 10,
    },
  ] : [];

  const Card = ({ row, color }) => row ? (
    <Paper elevation={0} sx={{ p: 3, border: `1px solid ${color}`, borderRadius: 2, height: '100%' }}>
      <Typography variant="h5" sx={{ color, fontWeight: 800, mb: 1 }}>{row.country}</Typography>
      <Chip label={row.year} size="small" sx={{ bgcolor: '#1e2d4a', color: 'grey.300', fontFamily: 'monospace', mb: 2 }} />
      <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 1.5, fontSize: '0.85rem' }}>
        <Typography sx={{ color: 'grey.500' }}>GDP / capita</Typography>
        <Typography sx={{ color: 'white', fontFamily: 'monospace' }}>${Number(row.gdp_per_capita || 0).toLocaleString()}</Typography>
        <Typography sx={{ color: 'grey.500' }}>Events</Typography>
        <Typography sx={{ color: 'white', fontFamily: 'monospace' }}>{Number(row.total_events).toLocaleString()}</Typography>
        <Typography sx={{ color: 'grey.500' }}>Fatalities</Typography>
        <Typography sx={{ color: '#ff6b35', fontFamily: 'monospace' }}>{Number(row.total_fatalities).toLocaleString()}</Typography>
        <Typography sx={{ color: 'grey.500' }}>R/R Score</Typography>
        <Typography sx={{ color, fontFamily: 'monospace', fontWeight: 700 }}>{Number(row.risk_reward_score ?? 0).toFixed(4)}</Typography>
      </Box>
    </Paper>
  ) : (
    <Paper elevation={0} sx={{ p: 3, border: '1px dashed #1e2d4a', borderRadius: 2, height: '100%' }}>
      <Typography sx={{ color: 'grey.600', textAlign: 'center', pt: 4 }}>
        No data — try a different country or year.
      </Typography>
    </Paper>
  );

  return (
    <Box>
      <Typography variant="h4" sx={{ mb: 1, color: 'white' }}>⚖️ Compare Countries</Typography>
      <Typography sx={{ color: 'grey.400', mb: 4 }}>
        Side-by-side breakdown of two countries on every component of the Risk vs. Reward Index.
      </Typography>

      <Paper elevation={0} sx={{ p: 3, mb: 4, border: '1px solid #1e2d4a', borderRadius: 2 }}>
        <Grid container spacing={2} alignItems="flex-end">
          <Grid item xs={12} sm={4}>
            <TextField fullWidth size="small" label="Country A" value={a} onChange={e => setA(e.target.value)} />
          </Grid>
          <Grid item xs={12} sm={4}>
            <TextField fullWidth size="small" label="Country B" value={b} onChange={e => setB(e.target.value)} />
          </Grid>
          <Grid item xs={6} sm={2}>
            <TextField fullWidth size="small" label="Year" type="number" value={year}
              onChange={e => setYear(parseInt(e.target.value))} />
          </Grid>
          <Grid item xs={6} sm={2}>
            <Button fullWidth variant="contained" onClick={compare} disabled={loading}
              sx={{ bgcolor: 'primary.main', color: '#0a0f1e', fontWeight: 700,
                    '&:hover': { bgcolor: '#00b899' } }}>
              Compare
            </Button>
          </Grid>
        </Grid>
      </Paper>

      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}><CircularProgress color="primary" /></Box>
      ) : (
        <>
          <Grid container spacing={2} sx={{ mb: 4 }}>
            <Grid item xs={12} sm={6}><Card row={rowA} color="#00d4aa" /></Grid>
            <Grid item xs={12} sm={6}><Card row={rowB} color="#ff6b35" /></Grid>
          </Grid>

          {rowA && rowB && (
            <Paper elevation={0} sx={{ p: 3, border: '1px solid #1e2d4a', borderRadius: 2 }}>
              <Typography variant="caption" sx={{ color: 'grey.500', textTransform: 'uppercase', display: 'block', mb: 2 }}>
                Multi-axis comparison (log-scaled where noted)
              </Typography>
              <ResponsiveContainer width="100%" height={360}>
                <RadarChart data={radarData}>
                  <PolarGrid stroke="#1e2d4a" />
                  <PolarAngleAxis dataKey="metric" tick={{ fill: '#aaa', fontSize: 11 }} />
                  <PolarRadiusAxis tick={{ fill: '#666', fontSize: 10 }} />
                  <Radar name={rowA.country} dataKey="A" stroke="#00d4aa" fill="#00d4aa" fillOpacity={0.3} />
                  <Radar name={rowB.country} dataKey="B" stroke="#ff6b35" fill="#ff6b35" fillOpacity={0.3} />
                  <Legend wrapperStyle={{ color: '#aaa' }} />
                  <Tooltip contentStyle={{ background: '#111827', border: '1px solid #1e2d4a', borderRadius: 8 }} />
                </RadarChart>
              </ResponsiveContainer>
            </Paper>
          )}
        </>
      )}
    </Box>
  );
}
