import React, { useState, useEffect } from 'react';
import {
  Typography, Box, TextField, Grid, Paper, Button,
  Alert, Chip, CircularProgress, MenuItem
} from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import CasinoIcon from '@mui/icons-material/Casino';
import config from '../config.json';

const SERVER = `http://${config.server_host}:${config.server_port}`;

export default function SearchPage() {
  const [city, setCity] = useState('');
  const [country, setCountry] = useState('');
  const [countries, setCountries] = useState([]);

  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [loadingCountries, setLoadingCountries] = useState(false);
  const [searched, setSearched] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    setLoadingCountries(true);

    fetch(`${SERVER}/countries`)
      .then(r => r.json())
      .then(rows => {
        setCountries(Array.isArray(rows) ? rows : []);
        setLoadingCountries(false);
      })
      .catch(() => setLoadingCountries(false));
  }, []);

  const handleSearch = () => {
    setLoading(true);
    setError(null);

    fetch(`${SERVER}/search_airports?city=${encodeURIComponent(city)}&country_code=${encodeURIComponent(country)}&page_size=40`)
      .then(r => r.json())
      .then(d => {
        setResults(Array.isArray(d) ? d : []);
        setSearched(true);
        setLoading(false);
      })
      .catch(err => {
        setError(err.message);
        setResults([]);
        setLoading(false);
      });
  };

  const handleSurprise = () => {
    setCity('');
    setCountry('');
    setLoading(true);
    setError(null);

    fetch(`${SERVER}/top_airports?page=1&page_size=12`)
      .then(r => r.json())
      .then(d => {
        setResults(Array.isArray(d) ? d : []);
        setSearched(true);
        setLoading(false);
      })
      .catch(err => {
        setError(err.message);
        setLoading(false);
      });
  };

  return (
    <Box>
      <Typography variant="h4" sx={{ mb: 1, color: 'white' }}>
        🔍 Search Airports
      </Typography>

      <Typography sx={{ color: 'grey.400', mb: 4 }}>
        Find airports by city name or country. The country dropdown triggers <code>/countries</code>.
      </Typography>

      <Paper elevation={0} sx={{ p: 3, mb: 4, border: '1px solid #1e2d4a', borderRadius: 2 }}>
        <Grid container spacing={3} alignItems="flex-end">
          <Grid item xs={12} sm={5}>
            <TextField
              fullWidth
              label="City name"
              variant="outlined"
              size="small"
              value={city}
              onChange={e => setCity(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleSearch()}
            />
          </Grid>

          <Grid item xs={12} sm={4}>
            <TextField
              select
              fullWidth
              label={loadingCountries ? 'Loading countries...' : 'Country optional'}
              variant="outlined"
              size="small"
              value={country}
              onChange={e => setCountry(e.target.value)}
            >
              <MenuItem value="">Any country</MenuItem>
              {countries.map(c => (
                <MenuItem key={c.iso_code} value={c.iso_code}>
                  {c.country_name} ({c.iso_code})
                </MenuItem>
              ))}
            </TextField>
          </Grid>

          <Grid item xs={12}>
            <Box sx={{ display: 'flex', gap: 2 }}>
              <Button
                variant="contained"
                startIcon={<SearchIcon />}
                onClick={handleSearch}
                disabled={loading}
                sx={{
                  bgcolor: 'primary.main',
                  color: '#0a0f1e',
                  fontWeight: 700,
                  '&:hover': { bgcolor: '#00b899' },
                }}
              >
                Search
              </Button>

              <Button
                variant="outlined"
                startIcon={<CasinoIcon />}
                onClick={handleSurprise}
                disabled={loading}
                sx={{
                  borderColor: 'secondary.main',
                  color: 'secondary.main',
                  '&:hover': { borderColor: '#ff8555' },
                }}
              >
                Surprise Me!
              </Button>
            </Box>
          </Grid>
        </Grid>
      </Paper>

      {error && (
        <Alert severity="error" sx={{ mb: 3, bgcolor: '#2d1515', color: '#ff6b35', border: '1px solid #3d2020' }}>
          Search failed: {error}
        </Alert>
      )}

      {loading && (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}>
          <CircularProgress color="primary" />
        </Box>
      )}

      {!loading && searched && (
        <>
          <Typography sx={{ mb: 2, color: 'grey.400' }}>
            {results.length} result{results.length !== 1 ? 's' : ''} found
          </Typography>

          {results.length === 0 ? (
            <Typography sx={{ color: 'grey.600', textAlign: 'center', py: 6 }}>
              No airports matched your search. Try a different city or country.
            </Typography>
          ) : (
            <Grid container spacing={2}>
              {results.map((airport, i) => (
                <Grid item xs={12} sm={6} md={4} key={i}>
                  <Paper elevation={0} sx={{
                    p: 2.5,
                    border: '1px solid #1e2d4a',
                    borderRadius: 2,
                    transition: 'border-color 0.2s, transform 0.15s',
                    '&:hover': {
                      borderColor: 'primary.main',
                      transform: 'translateY(-2px)',
                    },
                  }}>
                    <Typography variant="h6" sx={{ color: 'primary.main', fontWeight: 700, mb: 0.5 }}>
                      {airport.city || '—'}
                    </Typography>

                    <Typography sx={{ color: 'grey.300', fontSize: '0.85rem', mb: 1.5 }}>
                      {airport.airport_name}
                    </Typography>

                    <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                      <Chip
                        label={airport.icao_code}
                        size="small"
                        sx={{ bgcolor: '#4db8ff22', color: '#4db8ff', fontFamily: 'monospace', fontSize: '0.7rem' }}
                      />

                      <Chip
                        label={airport.country_code}
                        size="small"
                        sx={{ bgcolor: '#1e2d4a', color: 'grey.400', fontFamily: 'monospace', fontSize: '0.7rem' }}
                      />

                      {airport.type && (
                        <Chip
                          label={airport.type.replace(/_/g, ' ')}
                          size="small"
                          sx={{ bgcolor: '#1e2d4a', color: 'grey.500', fontSize: '0.7rem' }}
                        />
                      )}
                    </Box>
                  </Paper>
                </Grid>
              ))}
            </Grid>
          )}
        </>
      )}
    </Box>
  );
}