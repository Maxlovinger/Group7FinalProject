import React, { useState, useEffect } from 'react';
import {
  Typography, Box, Grid, Paper, TextField, CircularProgress, Chip
} from '@mui/material';
import FlightLandIcon from '@mui/icons-material/FlightLand';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid
} from 'recharts';
import LazyTable from '../components/LazyTable';
import config from '../config.json';

const SERVER = `http://${config.server_host}:${config.server_port}`;

const airportColumns = [
  { header: 'ICAO', field: 'icao_code', render: v => <code style={{ color: '#4db8ff' }}>{v}</code> },
  { header: 'Airport', field: 'airport_name' },
  { header: 'City', field: 'city', render: v => <strong style={{ color: '#00d4aa' }}>{v}</strong> },
  { header: 'Country', field: 'country_code' },
  {
    header: 'Arrivals',
    field: 'arrival_count',
    render: v => (
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
        <Box sx={{
          width: Math.min(60, Math.max(4, (v / 3000) * 60)),
          height: 6,
          borderRadius: 3,
          bgcolor: '#00d4aa',
          opacity: 0.7,
        }} />
        <span style={{ color: '#aaa', fontFamily: 'monospace', fontSize: '0.8rem' }}>
          {Number(v).toLocaleString()}
        </span>
      </Box>
    ),
  },
];

export default function FlightsPage() {
  const [corridors, setCorridors] = useState([]);
  const [busiest, setBusiest] = useState([]);
  const [country, setCountry] = useState('');
  const [loadingCorridors, setLoadingCorridors] = useState(false);
  const [loadingBusiest, setLoadingBusiest] = useState(false);

  useEffect(() => {
    setLoadingCorridors(true);

    fetch(`${SERVER}/travel_corridors?limit=25`)
      .then(r => r.json())
      .then(rows => {
        setCorridors(Array.isArray(rows) ? rows : []);
        setLoadingCorridors(false);
      })
      .catch(() => setLoadingCorridors(false));
  }, []);

  useEffect(() => {
    setLoadingBusiest(true);

    const params = new URLSearchParams();
    if (country.trim()) {
      params.set('country', country.trim().toLowerCase());
    }

    fetch(`${SERVER}/busiest_airports_by_country?${params.toString()}`)
      .then(r => r.json())
      .then(rows => {
        setBusiest(Array.isArray(rows) ? rows : []);
        setLoadingBusiest(false);
      })
      .catch(() => setLoadingBusiest(false));
  }, [country]);

  return (
    <Box>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 1 }}>
        <FlightLandIcon sx={{ color: 'primary.main', fontSize: 32 }} />
        <Typography variant="h4" sx={{ color: 'white' }}>Flight Traffic</Typography>
      </Box>

      <Typography sx={{ color: 'grey.400', mb: 4 }}>
        Top destination airports, busiest international corridors, and busiest airport per country.
      </Typography>

      <Typography variant="h5" sx={{ mb: 2, color: 'white' }}>
        ✈️ Top Airports by Flight Arrivals
      </Typography>

      <LazyTable
        route={`${SERVER}/top_airports`}
        columns={airportColumns}
        defaultPageSize={20}
        rowsPerPageOptions={[10, 20, 50]}
      />

      <Box sx={{ mt: 5 }} />

      <Paper elevation={0} sx={{ p: 3, mb: 4, border: '1px solid #1e2d4a', borderRadius: 2 }}>
        <Typography variant="h6" sx={{ color: 'white', mb: 1 }}>
          🌍 Busiest International Travel Corridors
        </Typography>

        <Typography sx={{ color: 'grey.500', mb: 3 }}>
          This triggers <code>/travel_corridors</code>.
        </Typography>

        {loadingCorridors ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
            <CircularProgress color="primary" />
          </Box>
        ) : corridors.length === 0 ? (
          <Typography sx={{ color: 'grey.500' }}>No corridor data found.</Typography>
        ) : (
          <>
            <ResponsiveContainer width="100%" height={330}>
              <BarChart data={corridors.slice(0, 12)} margin={{ top: 5, right: 10, bottom: 90, left: 10 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e2d4a" />
                <XAxis
                  dataKey={(row) => `${row.from_iso} → ${row.to_iso}`}
                  tick={{ fill: '#888', fontSize: 10 }}
                  angle={-45}
                  textAnchor="end"
                  interval={0}
                />
                <YAxis tick={{ fill: '#888', fontSize: 11 }} />
                <Tooltip
                  contentStyle={{ background: '#111827', border: '1px solid #1e2d4a', borderRadius: 8, color: '#e5e7eb' }}
                  labelStyle={{ color: '#00d4aa', fontWeight: 700 }}
                  formatter={(v, n) => [Number(v).toLocaleString(), n]}
                  labelFormatter={(_, payload) => {
                    const p = payload?.[0]?.payload;
                    return p ? `${p.from_country} → ${p.to_country}` : '';
                  }}
                />
                <Bar dataKey="flight_count" fill="#00d4aa" radius={[3, 3, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>

            <Paper elevation={0} sx={{ mt: 3, border: '1px solid #1e2d4a', borderRadius: 2, overflow: 'hidden' }}>
              {corridors.slice(0, 15).map((row, i) => (
                <Box key={i} sx={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 2,
                  px: 3,
                  py: 1.5,
                  borderBottom: '1px solid #1a2540',
                  '&:last-child': { borderBottom: 'none' },
                  '&:hover': { bgcolor: '#1a2540' },
                }}>
                  <Typography sx={{ width: 36, color: 'grey.600', fontFamily: 'monospace' }}>#{i + 1}</Typography>
                  <Typography sx={{ flex: 1, color: 'white', fontWeight: 600 }}>
                    {row.from_country || row.from_iso} → {row.to_country || row.to_iso}
                  </Typography>
                  <Chip label={`${row.from_iso} → ${row.to_iso}`} size="small" sx={{ bgcolor: '#1e2d4a', color: '#4db8ff' }} />
                  <Chip label={`${Number(row.flight_count).toLocaleString()} flights`} size="small" sx={{ bgcolor: '#00d4aa22', color: '#00d4aa' }} />
                  <Chip label={`${row.pct_of_all_international_flights}%`} size="small" sx={{ bgcolor: '#ffb34722', color: '#ffb347' }} />
                </Box>
              ))}
            </Paper>
          </>
        )}
      </Paper>

      <Paper elevation={0} sx={{ p: 3, mb: 4, border: '1px solid #1e2d4a', borderRadius: 2 }}>
        <Typography variant="h6" sx={{ color: 'white', mb: 1 }}>
          🛬 Busiest Airport by Country
        </Typography>

        <Typography sx={{ color: 'grey.500', mb: 3 }}>
          This triggers <code>/busiest_airports_by_country</code>.
        </Typography>

        <Grid container spacing={2} sx={{ mb: 3 }}>
          <Grid item xs={12} sm={4}>
            <TextField
              fullWidth
              size="small"
              label="Country code optional, e.g. US, FR, GB"
              value={country}
              onChange={e => setCountry(e.target.value)}
            />
          </Grid>
        </Grid>

        {loadingBusiest ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
            <CircularProgress color="primary" />
          </Box>
        ) : busiest.length === 0 ? (
          <Typography sx={{ color: 'grey.500' }}>No busiest airport rows found.</Typography>
        ) : (
          <Paper elevation={0} sx={{ border: '1px solid #1e2d4a', borderRadius: 2, overflow: 'hidden' }}>
            {busiest.slice(0, 25).map((row, i) => (
              <Box key={`${row.country_code}-${row.airport_name}-${i}`} sx={{
                display: 'flex',
                alignItems: 'center',
                gap: 2,
                px: 3,
                py: 1.5,
                borderBottom: '1px solid #1a2540',
                '&:last-child': { borderBottom: 'none' },
                '&:hover': { bgcolor: '#1a2540' },
              }}>
                <Typography sx={{ width: 36, color: 'grey.600', fontFamily: 'monospace' }}>#{i + 1}</Typography>
                <Typography sx={{ flex: 1, color: 'white', fontWeight: 600 }}>{row.airport_name}</Typography>
                <Chip label={row.city || '—'} size="small" sx={{ bgcolor: '#00d4aa22', color: '#00d4aa' }} />
                <Chip label={row.country_code} size="small" sx={{ bgcolor: '#1e2d4a', color: '#4db8ff' }} />
                <Chip label={`${Number(row.incoming_flights).toLocaleString()} arrivals`} size="small" sx={{ bgcolor: '#ffb34722', color: '#ffb347' }} />
              </Box>
            ))}
          </Paper>
        )}
      </Paper>
    </Box>
  );
}