# WireMock Configuration

This directory is intended for WireMock mock server configurations when using the development Docker environment with the mock profile.

## Usage

```bash
# Start development environment with mock Rally server
docker-compose -f docker/compose/docker-compose.development.yml --profile mock up -d
```

Place your mock Rally API responses in this directory following WireMock's file structure conventions.