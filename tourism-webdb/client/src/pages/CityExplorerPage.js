import React, { useState } from 'react';
import {
  Typography, Box, TextField, Grid, Paper, Button, CircularProgress, Chip, Divider
} from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import FlightLandIcon from '@mui/icons-material/FlightLand';
import AttachMoneyIcon from '@mui/icons-material/AttachMoney';
import GroupsIcon from '@mui/icons-material/Groups';
import StatCard from '../components/StatCard';
import config from '../config.json';

const SERVER = `http://${config.server_host}:${config.server_port}`;

/**
 * City Explorer (Page 2 in the project outline).
 * Combines /city_profile (flights + global_cities_gdp) with /conflict_summary
 * (ACLED) so users get a single-page risk-vs-reward snapshot for one city.
 */
export default function CityExplorerPage() {
  const [city,    setCity]    = useState('');
  const [profile, setProfile] = useState(null);
  const [conflict, setConflict] = useState(null);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);

  const handleSearch = async () => {
    if (!city) return;
    setLoading(true); setSearched(true);
    setProfile(null); setConflict(null);
    try {
      const res  = await fetch(`${SERVER}/city_profile?city=${encodeURIComponent(city)}`);
      const rows = await res.json();
      const row  = Array.isArray(rows) && rows.length ? rows[0] : null;
      setProfile(row);

      if (row?.country_name) {
        const cRes  = await fetch(`${SERVER}/conflict_summary?country=${encodeURIComponent(row.country_name)}`);
        const cRows = await cRes.json();
        if (Array.isArray(cRows) && cRows.length) {
          const totals = cRows.reduce((acc, r) => ({
            events:     acc.events     + Number(r.total_events     || 0),
            fatalities: acc.fatalities + Number(r.total_fatalities || 0),
            years:      acc.years + 1,
          }), { events: 0, fatalities: 0, years: 0 });
          setConflict(totals);
        }
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box>
      <Typography variant="h4" sx={{ mb: 1, color: 'white' }}>🌆 City Explorer</Typography>
      <Typography sx={{ color: 'grey.400', mb: 4 }}>
        Look up any city to see its tourism arrivals, metro GDP, and the conflict footprint of
        its country — the three components of the Risk vs. Reward Index in one place.
      </Typography>

      <Paper elevation={0} sx={{ p: 3, mb: 4, border: '1px solid #1e2d4a', borderRadius: 2 }}>
        <Grid container spacing={2} alignItems="flex-end">
          <Grid item xs={12} sm={8}>
            <TextField
              fullWidth size="small" label='City name (e.g. "Paris", "Tokyo", "Lagos")'
              value={city} onChange={e => setCity(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleSearch()}
            />
          </Grid>
          <Grid item xs={12} sm={4}>
            <Button fullWidth variant="contained" startIcon={<SearchIcon />} onClick={handleSearch}
              disabled={loading || !city}
              sx={{ bgcolor: 'primary.main', color: '#0a0f1e', fontWeight: 700,
                    '&:hover': { bgcolor: '#00b899' } }}>
              Look up city
            </Button>
          </Grid>
        </Grid>
      </Paper>

      {loading && (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}><CircularProgress color="primary" /></Box>
      )}

      {!loading && searched && !profile && (
        <Typography sx={{ color: 'grey.600', textAlign: 'center', py: 6 }}>
          No flight arrivals on record for "{city}". The OpenSky sample only covers cities with
          ICAO-coded airports — try a major hub like "London", "Frankfurt", or "Sydney".
        </Typography>
      )}

      {!loading && profile && (
        <>
          {/* Header card */}
          <Paper elevation={0} sx={{ p: 3, mb: 4, border: '1px solid #1e2d4a', borderRadius: 2 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, flexWrap: 'wrap' }}>
              <Typography variant="h4" sx={{ color: 'primary.main', fontWeight: 800 }}>
                {profile.city}
              </Typography>
              <Chip label={profile.country_name || profile.country_code}
                sx={{ bgcolor: '#1e2d4a', color: 'grey.300', fontFamily: 'monospace' }} />
              <Chip label={profile.country_code}
                sx={{ bgcolor: '#4db8ff22', color: '#4db8ff', fontFamily: 'monospace' }} />
            </Box>
          </Paper>

          {/* Stat trio */}
          <Grid container spacing={2} sx={{ mb: 4 }}>
            <Grid item xs={12} sm={4}>
              <StatCard
                label="Flight Arrivals"
                value={Number(profile.arrival_count || 0).toLocaleString()}
                icon={<FlightLandIcon />}
                color="#00d4aa"
              />
            </Grid>
            <Grid item xs={12} sm={4}>
              <StatCard
                label="Metro GDP (B USD)"
                value={profile.metro_gdp_billion_usd != null
                  ? `$${Number(profile.metro_gdp_billion_usd).toFixed(1)}`
                  : '—'}
                icon={<AttachMoneyIcon />}
                color="#4db8ff"
              />
            </Grid>
            <Grid item xs={12} sm={4}>
              <StatCard
                label="Metro Population"
                value={profile.metro_population
                  ? Number(profile.metro_population).toLocaleString()
                  : '—'}
                icon={<GroupsIcon />}
                color="#ffb347"
              />
            </Grid>
          </Grid>

          <Divider sx={{ borderColor: '#1e2d4a', my: 3 }} />

          {/* Country-level conflict */}
          <Typography variant="h6" sx={{ mb: 2, color: 'white' }}>
            Country-Level Conflict Footprint
          </Typography>
          {conflict ? (
            <Grid container spacing={2}>
              <Grid item xs={12} sm={6}>
                <StatCard
                  label="Total ACLED Events"
                  value={Number(conflict.events).toLocaleString()}
                  color="#ffb347"
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <StatCard
                  label="Total Fatalities"
                  value={Number(conflict.fatalities).toLocaleString()}
                  color="#ff6b35"
                />
              </Grid>
            </Grid>
          ) : (
            <Typography sx={{ color: 'grey.500' }}>
              No matching ACLED rows for {profile.country_name}.
            </Typography>
          )}
        </>
      )}
    </Box>
  );
}
