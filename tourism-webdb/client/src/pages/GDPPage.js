import React, { useState, useEffect } from 'react';
import {
  Typography, Box, TextField, Grid, Paper, CircularProgress, Chip, Divider
} from '@mui/material';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer
} from 'recharts';
import config from '../config.json';

const SERVER = `http://${config.server_host}:${config.server_port}`;

/**
 * Country GDP & Economic Profile (Page 4 in the project outline).
 * Top half: national GDP timeline from /country_gdp_timeline (World Bank).
 * Bottom half: city-level breakdown via /city_gdp_context (Global Cities GDP).
 */
export default function GDPPage() {
  const [country, setCountry] = useState('United States');
  const [year,    setYear]    = useState('');
  const [timeline, setTimeline] = useState([]);
  const [cities,   setCities]   = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!country) { setTimeline([]); setCities([]); return; }
    setLoading(true);
    const tl = fetch(`${SERVER}/country_gdp_timeline?country=${encodeURIComponent(country)}`)
      .then(r => r.json()).catch(() => []);
    const cityParams = new URLSearchParams({ country });
    if (year) cityParams.set('year', year);
    const ct = fetch(`${SERVER}/city_gdp_context?${cityParams}`)
      .then(r => r.json()).catch(() => []);
    Promise.all([tl, ct]).then(([t, c]) => {
      setTimeline(Array.isArray(t) ? t : []);
      setCities(Array.isArray(c) ? c : []);
      setLoading(false);
    });
  }, [country, year]);

  return (
    <Box>
      <Typography variant="h4" sx={{ mb: 1, color: 'white' }}>💰 Country GDP & Economic Profile</Typography>
      <Typography sx={{ color: 'grey.400', mb: 4 }}>
        National GDP trends from the World Bank, with city-level drill-down from Global Cities GDP.
      </Typography>

      <Paper elevation={0} sx={{ p: 3, mb: 4, border: '1px solid #1e2d4a', borderRadius: 2 }}>
        <Grid container spacing={2}>
          <Grid item xs={12} sm={6}>
            <TextField fullWidth size="small" label="Country" value={country}
              onChange={e => setCountry(e.target.value)} />
          </Grid>
          <Grid item xs={12} sm={3}>
            <TextField fullWidth size="small" label="Year (city table)" type="number" value={year}
              onChange={e => setYear(e.target.value)} />
          </Grid>
        </Grid>
      </Paper>

      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}><CircularProgress color="primary" /></Box>
      ) : (
        <>
          {/* National timeline */}
          <Paper elevation={0} sx={{ p: 3, mb: 4, border: '1px solid #1e2d4a', borderRadius: 2 }}>
            <Typography variant="caption" sx={{ color: 'grey.500', textTransform: 'uppercase', display: 'block', mb: 2 }}>
              National GDP (Billion USD) – {country || '—'}
            </Typography>
            {timeline.length === 0 ? (
              <Typography sx={{ color: 'grey.600', py: 4, textAlign: 'center' }}>
                No World Bank rows for "{country}". Try the official name (e.g. "United States", "Korea, Rep.").
              </Typography>
            ) : (
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={timeline}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1e2d4a" />
                  <XAxis dataKey="year" tick={{ fill: '#888', fontSize: 11 }} />
                  <YAxis tick={{ fill: '#888', fontSize: 11 }} />
                  <Tooltip
                    contentStyle={{ background: '#111827', border: '1px solid #1e2d4a', borderRadius: 8 }}
                    labelStyle={{ color: '#00d4aa', fontWeight: 700 }}
                    formatter={(v, n) =>
                      n === 'gdp_billion_usd'
                        ? [`$${Number(v).toLocaleString()}B`, 'National GDP']
                        : [Number(v).toLocaleString(), n]
                    }
                  />
                  <Line type="monotone" dataKey="gdp_billion_usd" stroke="#00d4aa" strokeWidth={2}
                    dot={{ r: 3 }} activeDot={{ r: 5 }} />
                </LineChart>
              </ResponsiveContainer>
            )}
          </Paper>

          <Divider sx={{ borderColor: '#1e2d4a', my: 3 }} />

          {/* City breakdown */}
          <Typography variant="h6" sx={{ mb: 2, color: 'white' }}>
            City-Level Breakdown ({cities.length} matches{year ? ` in ${year}` : ''})
          </Typography>

          {cities.length === 0 ? (
            <Typography sx={{ color: 'grey.500', py: 3 }}>
              No matching cities in <code>global_cities_gdp</code> for this country/year.
            </Typography>
          ) : (
            <Paper elevation={0} sx={{ border: '1px solid #1e2d4a', borderRadius: 2, overflow: 'hidden' }}>
              {cities.map((row, i) => (
                <Box key={i} sx={{
                  display: 'flex', alignItems: 'center', px: 3, py: 1.5, gap: 2, flexWrap: 'wrap',
                  borderBottom: '1px solid #1a2540',
                  '&:hover': { bgcolor: '#1a2540' },
                  '&:last-child': { borderBottom: 'none' },
                }}>
                  <Typography sx={{ flex: '1 1 180px', color: 'primary.main', fontWeight: 700 }}>{row.city}</Typography>
                  <Chip label={row.year} size="small" sx={{ bgcolor: '#1e2d4a', color: 'grey.300', fontFamily: 'monospace' }} />
                  <Typography sx={{ width: 160, color: 'grey.300', fontSize: '0.82rem', textAlign: 'right' }}>
                    Metro GDP: ${Number(row.metro_gdp_billion_usd).toFixed(1)}B
                  </Typography>
                  <Typography sx={{ width: 170, color: 'grey.500', fontSize: '0.82rem', textAlign: 'right' }}>
                    National GDP: ${Number(row.national_gdp_billion_usd).toFixed(0)}B
                  </Typography>
                  <Chip
                    label={`${Number(row.pct_of_national_gdp).toFixed(2)}% of GDP`}
                    size="small"
                    sx={{ bgcolor: '#00d4aa22', color: 'primary.main', fontFamily: 'monospace', fontWeight: 700 }}
                  />
                </Box>
              ))}
            </Paper>
          )}
        </>
      )}
    </Box>
  );
}
