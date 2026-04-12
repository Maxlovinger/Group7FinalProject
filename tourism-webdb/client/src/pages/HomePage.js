import React, { useState, useEffect } from 'react';
import { Typography, Grid, Box, Divider, Chip } from '@mui/material';
import FlightIcon from '@mui/icons-material/Flight';
import PublicIcon from '@mui/icons-material/Public';
import WarningIcon from '@mui/icons-material/Warning';
import StatCard from '../components/StatCard';
import LazyTable from '../components/LazyTable';
import config from '../config.json';

const SERVER = `http://${config.server_host}:${config.server_port}`;

const cityColumns = [
  { header: 'Airport',   field: 'airport_name' },
  { header: 'City',      field: 'city',         render: v => <strong style={{ color: '#00d4aa' }}>{v}</strong> },
  { header: 'Country',   field: 'country_code' },
  { header: 'Arrivals',  field: 'arrival_count', render: v => Number(v).toLocaleString() },
];

export default function HomePage() {
  // TASK: add state variable for author name (default '')
  const [author, setAuthor]         = useState('');
  const [flightStats, setFlightStats] = useState(null);

  // TASK: fetch author name and flight stats on mount
  useEffect(() => {
    fetch(`${SERVER}/author/name`)
      .then(r => r.json())
      .then(d => setAuthor(d.data))
      .catch(console.error);

    fetch(`${SERVER}/flight_stats`)
      .then(r => r.json())
      .then(d => setFlightStats(d))
      .catch(console.error);
  }, []);

  return (
    <Box>
      {/* Header */}
      <Box sx={{ mb: 5 }}>
        <Chip label="CIS 5500 · Spring 2026" size="small"
          sx={{ mb: 2, bgcolor: '#1e2d4a', color: 'primary.main', fontFamily: 'monospace' }} />
        <Typography variant="h3" sx={{ fontWeight: 900, color: 'white', letterSpacing: '-0.04em', lineHeight: 1.1 }}>
          Tourism<br />
          <Box component="span" sx={{ color: 'primary.main' }}>Risk vs Reward</Box>
          <Box component="span" sx={{ color: 'grey.600' }}> Index</Box>
        </Typography>
        <Typography sx={{ mt: 2, color: 'grey.400', maxWidth: 560, lineHeight: 1.7 }}>
          A city-level analytical framework integrating economic indicators, conflict intensity,
          and flight arrival data to score global destinations.
        </Typography>
      </Box>

      {/* Stat Cards */}
      <Grid container spacing={2} sx={{ mb: 5 }}>
        <Grid item xs={12} sm={4}>
          <StatCard
            label="Flight Records"
            value={flightStats ? Number(flightStats.total_flights).toLocaleString() : '…'}
            icon={<FlightIcon />}
            color="#00d4aa"
          />
        </Grid>
        <Grid item xs={12} sm={4}>
          <StatCard
            label="Unique Arrival Airports"
            value={flightStats ? Number(flightStats.unique_arrival_airports).toLocaleString() : '…'}
            icon={<PublicIcon />}
            color="#4db8ff"
          />
        </Grid>
        <Grid item xs={12} sm={4}>
          <StatCard
            label="Departure Airports"
            value={flightStats ? Number(flightStats.unique_departure_airports).toLocaleString() : '…'}
            icon={<WarningIcon />}
            color="#ff6b35"
          />
        </Grid>
      </Grid>

      <Divider sx={{ borderColor: '#1e2d4a', mb: 4 }} />

      {/* Top Cities Table */}
      <Typography variant="h5" sx={{ mb: 2, color: 'white' }}>
        ✈️ Top Airports by Flight Arrivals
      </Typography>
      <LazyTable
        route={`${SERVER}/top_airports`}
        columns={cityColumns}
        defaultPageSize={10}
        rowsPerPageOptions={[10, 25]}
      />

      {/* TASK: display "Created by [author]" */}
      <Typography sx={{ mt: 4, color: 'grey.600', fontSize: '0.8rem', textAlign: 'center' }}>
        Created by {author || 'Group 7'}
      </Typography>
    </Box>
  );
}
