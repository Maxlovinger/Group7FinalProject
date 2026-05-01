import React, { useState, useEffect } from 'react';
import {
  Typography, Box, TextField, Grid, Paper, CircularProgress,
  Slider, Chip, Divider
} from '@mui/material';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell,
  ScatterChart, Scatter, ZAxis, CartesianGrid
} from 'recharts';
import config from '../config.json';

const SERVER = `http://${config.server_host}:${config.server_port}`;

const normalizeCountry = (value) => {
  const v = value.trim().toLowerCase();

  const aliases = {
    us: 'United States',
    usa: 'United States',
    'u.s.': 'United States',
    'u.s.a.': 'United States',
    america: 'United States',
    uk: 'United Kingdom',
    uae: 'United Arab Emirates',
  };

  return aliases[v] || value.trim();
};

const colorFor = score => {
  if (score == null) return '#666';
  if (score > 0.10) return '#00d4aa';
  if (score > 0.00) return '#4db8ff';
  if (score > -0.10) return '#ffb347';
  return '#ff6b35';
};

const DarkTooltip = ({ active, payload, label }) => {
  if (!active || !payload || payload.length === 0) return null;

  const p = payload[0].payload;

  return (
    <Box
      sx={{
        bgcolor: '#111827',
        border: '1px solid #334155',
        borderRadius: 2,
        p: 1.5,
        color: '#e5e7eb',
        fontSize: '12px',
        boxShadow: '0 8px 20px rgba(0,0,0,0.35)',
      }}
    >
      <Typography sx={{ color: '#00d4aa', fontWeight: 700, fontSize: '0.8rem', mb: 0.5 }}>
        {p.country || p.city || p.name || label}
      </Typography>

      {p.year !== undefined && <div>Year: {p.year}</div>}

      {p.risk_reward_score !== undefined && (
        <div>Risk Reward Score: {Number(p.risk_reward_score).toFixed(4)}</div>
      )}

      {p.gdp_per_capita !== undefined && (
        <div>GDP per Capita: ${Number(p.gdp_per_capita).toLocaleString()}</div>
      )}

      {p.total_fatalities !== undefined && (
        <div>Fatalities: {Number(p.total_fatalities).toLocaleString()}</div>
      )}

      {p.total_events !== undefined && (
        <div>Events: {Number(p.total_events).toLocaleString()}</div>
      )}
    </Box>
  );
};

export default function RiskRewardPage() {
  const [year, setYear] = useState(2022);
  const [country, setCountry] = useState('');
  const [limit, setLimit] = useState(20);
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const fetchRiskRewardData = async () => {
      try {
        setLoading(true);

        const params = new URLSearchParams();

        if (year) {
          params.set('year', year);
        }

        if (country.trim()) {
          params.set('country', normalizeCountry(country));
        }

        params.set('limit', limit);

        const response = await fetch(`${SERVER}/risk_reward_score?${params.toString()}`);
        const rows = await response.json();

        const cleaned = Array.isArray(rows)
          ? rows.map(row => ({
              ...row,
              name: row.country,
              risk_reward_score: Number(row.risk_reward_score),
              gdp_per_capita: Number(row.gdp_per_capita),
              total_events: Number(row.total_events),
              total_fatalities: Number(row.total_fatalities),
            }))
          : [];

        setData(cleaned);
      } catch (err) {
        console.error('Failed to fetch risk reward data:', err);
        setData([]);
      } finally {
        setLoading(false);
      }
    };

    fetchRiskRewardData();
  }, [year, country, limit]);

  const top = data.slice(0, 12);

  return (
    <Box>
      <Typography variant="h4" sx={{ mb: 1, color: 'white' }}>
        📊 Risk vs. Reward Index Builder
      </Typography>

      <Typography sx={{ color: 'grey.400', mb: 4 }}>
        Min-max normalises GDP per capita and ACLED fatalities across all country-years, then
        computes <code style={{ color: '#00d4aa' }}>score = norm_gdp − norm_fatalities</code>.
      </Typography>

      <Paper elevation={0} sx={{ p: 3, mb: 4, border: '1px solid #1e2d4a', borderRadius: 2 }}>
        <Grid container spacing={3} alignItems="center">
          <Grid item xs={12} sm={3}>
            <TextField
              fullWidth
              size="small"
              label="Year"
              type="number"
              value={year}
              onChange={e => setYear(e.target.value ? parseInt(e.target.value) : '')}
            />
          </Grid>

          <Grid item xs={12} sm={4}>
            <TextField
              fullWidth
              size="small"
              label="Country (optional)"
              value={country}
              placeholder="US, USA, United States..."
              onChange={e => setCountry(e.target.value)}
            />
          </Grid>

          <Grid item xs={12} sm={5}>
            <Typography variant="caption" sx={{ color: 'grey.500', textTransform: 'uppercase' }}>
              Show top {limit} country-years
            </Typography>
            <Slider
              value={limit}
              onChange={(_, v) => setLimit(v)}
              min={5}
              max={60}
              step={5}
              sx={{ color: 'primary.main', mt: 1 }}
            />
          </Grid>
        </Grid>
      </Paper>

      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
          <CircularProgress color="primary" />
        </Box>
      ) : data.length === 0 ? (
        <Typography sx={{ color: 'grey.500', textAlign: 'center', py: 6 }}>
          No results. Try a different year, use “United States” instead of “US”, or remove the country filter.
        </Typography>
      ) : (
        <>
          <Paper elevation={0} sx={{ p: 3, mb: 4, border: '1px solid #1e2d4a', borderRadius: 2 }}>
            <Typography variant="caption" sx={{ color: 'grey.500', textTransform: 'uppercase', display: 'block', mb: 2 }}>
              Risk vs. Reward Score (higher = better)
            </Typography>

            <ResponsiveContainer width="100%" height={340}>
              <BarChart data={top} margin={{ top: 5, right: 10, bottom: 80, left: 10 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e2d4a" />
                <XAxis
                  dataKey="country"
                  tick={{ fill: '#888', fontSize: 10 }}
                  angle={-40}
                  textAnchor="end"
                  interval={0}
                />
                <YAxis tick={{ fill: '#888', fontSize: 11 }} />
                <Tooltip content={<DarkTooltip />} />
                <Bar dataKey="risk_reward_score" radius={[3, 3, 0, 0]}>
                  {top.map((row, i) => (
                    <Cell key={i} fill={colorFor(row.risk_reward_score)} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </Paper>

          <Paper elevation={0} sx={{ p: 3, mb: 4, border: '1px solid #1e2d4a', borderRadius: 2 }}>
            <Typography variant="caption" sx={{ color: 'grey.500', textTransform: 'uppercase', display: 'block', mb: 2 }}>
              GDP / Conflict Trade-off (size = fatalities)
            </Typography>

            <ResponsiveContainer width="100%" height={300}>
              <ScatterChart margin={{ top: 5, right: 10, bottom: 30, left: 10 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e2d4a" />

                <XAxis
                  type="number"
                  dataKey="gdp_per_capita"
                  name="GDP per capita"
                  tick={{ fill: '#888', fontSize: 11 }}
                  unit="$"
                  label={{ value: 'GDP per capita (USD)', fill: '#888', dy: 18, fontSize: 12 }}
                />

                <YAxis
                  type="number"
                  dataKey="total_fatalities"
                  name="Fatalities"
                  tick={{ fill: '#888', fontSize: 11 }}
                  label={{ value: 'Conflict fatalities', angle: -90, fill: '#888', dx: -25, fontSize: 12 }}
                />

                <ZAxis type="number" dataKey="total_fatalities" range={[40, 300]} />

                <Tooltip
                  content={<DarkTooltip />}
                  cursor={{ strokeDasharray: '3 3' }}
                />

                <Scatter data={data}>
                  {data.map((row, i) => (
                    <Cell key={i} fill={colorFor(row.risk_reward_score)} />
                  ))}
                </Scatter>
              </ScatterChart>
            </ResponsiveContainer>
          </Paper>

          <Paper elevation={0} sx={{ border: '1px solid #1e2d4a', borderRadius: 2, overflow: 'hidden' }}>
            {data.slice(0, limit).map((row, i) => (
              <Box
                key={`${row.country}-${row.year}`}
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  px: 3,
                  py: 1.5,
                  gap: 2,
                  borderBottom: '1px solid #1a2540',
                  '&:hover': { bgcolor: '#1a2540' },
                  '&:last-child': { borderBottom: 'none' },
                }}
              >
                <Typography sx={{ width: 36, color: 'grey.600', fontFamily: 'monospace', fontSize: '0.8rem' }}>
                  #{i + 1}
                </Typography>

                <Typography sx={{ flex: 1, color: 'white', fontWeight: 600 }}>
                  {row.country}
                </Typography>

                <Chip label={row.year} size="small" sx={{ bgcolor: '#1e2d4a', color: 'grey.300', fontFamily: 'monospace' }} />

                <Typography sx={{ width: 130, color: 'grey.400', fontSize: '0.82rem', textAlign: 'right' }}>
                  GDP/cap: ${Number(row.gdp_per_capita || 0).toLocaleString()}
                </Typography>

                <Typography sx={{ width: 110, color: '#ff6b35', fontSize: '0.82rem', textAlign: 'right' }}>
                  💀 {Number(row.total_fatalities || 0).toLocaleString()}
                </Typography>

                <Chip
                  label={Number(row.risk_reward_score ?? 0).toFixed(3)}
                  size="small"
                  sx={{
                    width: 80,
                    fontFamily: 'monospace',
                    fontWeight: 700,
                    bgcolor: `${colorFor(row.risk_reward_score)}22`,
                    color: colorFor(row.risk_reward_score),
                  }}
                />
              </Box>
            ))}
          </Paper>

          <Divider sx={{ borderColor: '#1e2d4a', mt: 5, mb: 2 }} />

          <Typography variant="caption" sx={{ color: 'grey.600' }}>
            Source: World Bank GDP × ACLED conflict events. Score is bounded roughly in [-1, 1] because
            both components are min-max normalised to [0, 1] before subtraction.
          </Typography>
        </>
      )}
    </Box>
  );
}