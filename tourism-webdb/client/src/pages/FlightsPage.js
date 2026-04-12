import React from 'react';
import { Typography, Box } from '@mui/material';
import FlightLandIcon from '@mui/icons-material/FlightLand';
import LazyTable from '../components/LazyTable';
import config from '../config.json';

const SERVER = `http://${config.server_host}:${config.server_port}`;

const airportColumns = [
  { header: 'ICAO',          field: 'icao_code',    render: v => <code style={{ color: '#4db8ff' }}>{v}</code> },
  { header: 'Airport',       field: 'airport_name' },
  { header: 'City',          field: 'city',         render: v => <strong style={{ color: '#00d4aa' }}>{v}</strong> },
  { header: 'Country',       field: 'country_code' },
  {
    header: 'Arrivals',
    field: 'arrival_count',
    render: v => (
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
        <Box sx={{
          width: Math.min(60, Math.max(4, (v / 3000) * 60)),
          height: 6, borderRadius: 3, bgcolor: '#00d4aa', opacity: 0.7,
        }} />
        <span style={{ color: '#aaa', fontFamily: 'monospace', fontSize: '0.8rem' }}>
          {Number(v).toLocaleString()}
        </span>
      </Box>
    ),
  },
];

export default function FlightsPage() {
  return (
    <Box>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 1 }}>
        <FlightLandIcon sx={{ color: 'primary.main', fontSize: 32 }} />
        <Typography variant="h4" sx={{ color: 'white' }}>Flight Traffic</Typography>
      </Box>
      <Typography sx={{ color: 'grey.400', mb: 4 }}>
        Top destination airports by incoming flight volume — a tourism demand proxy from OpenSky data.
      </Typography>

      <LazyTable
        route={`${SERVER}/top_airports`}
        columns={airportColumns}
        defaultPageSize={20}
        rowsPerPageOptions={[10, 20, 50]}
      />
    </Box>
  );
}
