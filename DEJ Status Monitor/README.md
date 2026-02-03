# Terminal Status Monitor

A small internal monitoring tool for tracking terminal status via API checks.

## Features

- **Automated Status Checks**: Runs 3 checks per day (configurable times)
- **Real-time Monitoring**: View all terminals with latest status, last online time, and time since last online
- **Terminal History**: Detailed history view for each terminal with full check records
- **Analytics**: Identify terminals that have been offline all day or were online at least once
- **Concurrent Checks**: Efficiently checks ~400 terminals with controlled concurrency
- **Error Handling**: Robust error handling with retries, timeouts, and status tracking

## Setup

### Prerequisites

- Python 3.11 or higher
- pip

### Installation

1. Create a virtual environment:
```bash
python -m venv venv
```

2. Activate the virtual environment:
- Windows: `venv\Scripts\activate`
- Linux/Mac: `source venv/bin/activate`

3. Install dependencies:
```bash
pip install -r requirements.txt
```

4. Create your TPN file:
   - Create `tpns.txt` in the project root (or set `TPN_FILE_PATH` environment variable)
   - Add one TPN per line
   - Lines starting with `#` are treated as comments
   - Blank lines are ignored

Example `tpns.txt`:
```
TPN001
TPN002
TPN003
# This is a comment
TPN004
```

## Running

### Development Mode

```bash
uvicorn app.main:app --reload
```

The application will be available at `http://localhost:8000`

### Production Mode

```bash
uvicorn app.main:app --host 0.0.0.0 --port 8000
```

## Configuration

### Config File (Recommended)

The application uses a `config.json` file for scheduling configuration:

```json
{
  "check_times": [
    "08:00",
    "14:00",
    "20:00"
  ],
  "checks_per_day": 3,
  "timezone": "America/New_York"
}
```

**Location**: `./config.json` (or set `CONFIG_FILE_PATH` environment variable)

**Settings**:
- `check_times`: Array of times in HH:MM format (24-hour)
- `checks_per_day`: Number of checks per day (should match length of check_times)
- `timezone`: Timezone for scheduled checks (default: `America/New_York` for Eastern time)

**Note**: Times are in Eastern timezone by default. Modify `config.json` to change check times and avoid settlement periods.

### Environment Variables

- `TPN_FILE_PATH`: Path to the TPN file (default: `./tpns.txt`)
- `DB_PATH`: Path to SQLite database file (default: `status_monitor.db`)
- `CONFIG_FILE_PATH`: Path to config.json file (default: `./config.json`)

Example:
```bash
export TPN_FILE_PATH=/path/to/tpns.txt
uvicorn app.main:app --reload
```

## Database

The application uses SQLite for storage. The database file is created automatically on first run.

**Location**: `status_monitor.db` (or as specified by `DB_PATH`)

**Tables**:
- `terminals`: Stores terminal TPNs
- `status_checks`: Stores all status check results with timestamps, status, errors, and raw responses

## Scheduling

The application uses APScheduler to run checks automatically based on the `config.json` file.

**Default Schedule**: 08:00, 14:00, 20:00 (Eastern time)

**Customization**: Edit `config.json` to change check times:
```json
{
  "check_times": ["09:00", "15:00", "21:00"],
  "checks_per_day": 3,
  "timezone": "America/New_York"
}
```

**Timezone**: All scheduled times are in Eastern timezone (`America/New_York`) by default.

**Overlap Protection**: If a check is already running when a scheduled check is triggered, the scheduled check will be skipped to avoid overlapping runs.

**Retry Logic**: If a terminal returns a status other than Online or Offline (e.g., Disconnect, Error, Unknown), the system will automatically retry that terminal at the end of the check run to see if a credible response can be obtained.

## API Endpoints

### Web UI
- `GET /` - Main dashboard with all terminals (supports `?merchant=XXXX` filter)
- `GET /terminal/{tpn}` - Terminal detail page with history
- `GET /merchant/{merchant}` - Merchant view page with statistics and percentage online

### REST API
- `GET /api/terminals` - Get all terminals with latest status
  - Query params: `status`, `last_online_before`, `search`, `merchant` (filter by merchant number - first 4 chars of TPN)
- `GET /api/terminals/{tpn}` - Get terminal info
- `GET /api/terminals/{tpn}/history` - Get terminal check history
  - Query params: `start`, `end`, `limit`
- `POST /api/run-check` - Manually trigger a check run
- `POST /api/reload-tpns` - Reload TPNs from file
- `GET /api/analytics` - Get analytics (always offline today, online at least once today)
- `GET /api/merchants` - Get list of all merchant numbers
- `GET /api/merchants/{merchant}` - Get statistics for a specific merchant

## Concurrency and Performance

- **Concurrent Requests**: 30 simultaneous requests (configurable in `app/services/checker.py`)
- **Request Timeout**: 30 seconds
- **Retries**: 3 attempts with exponential backoff
- **Jitter**: Random 0-500ms delay between requests to be polite to the server

To adjust concurrency, edit `CONCURRENT_REQUESTS` in `app/services/checker.py`.

## Status Types

The application recognizes the following statuses:

- **ONLINE**: Terminal is online (response contains "Online")
- **OFFLINE**: Terminal is offline (response contains "Offline")
- **DISCONNECT**: Terminal is disconnected (response contains "Disconnect" or "Disconnected")
- **ERROR**: Request failed (timeout, network error, etc.)
- **UNKNOWN**: Response format not recognized

## Testing

Run the test suite:

```bash
pytest tests/
```

## Project Structure

```
.
├── app/
│   ├── __init__.py
│   ├── main.py              # FastAPI application
│   ├── db.py                # Database setup
│   ├── models.py            # SQLAlchemy models
│   ├── services/
│   │   ├── checker.py       # Async status checker
│   │   ├── parser.py        # Response parser
│   │   └── tpn_loader.py    # TPN file loader
│   └── templates/
│       ├── base.html
│       ├── index.html
│       └── terminal_detail.html
├── tests/
│   ├── test_parser.py
│   └── test_db.py
├── requirements.txt
├── README.md
└── tpns.txt
```

## Security Notes

- This is an internal tool with no authentication by default
- To add authentication, consider using FastAPI's security dependencies
- The application structure allows easy addition of authentication middleware

## Troubleshooting

### No terminals showing up
- Check that `tpns.txt` exists and contains valid TPNs
- Use the "Reload TPNs" button or `POST /api/reload-tpns` endpoint

### Checks not running
- Check scheduler logs for errors
- Verify the check times are in the correct format (HH:MM)
- Manually trigger a check using the "Run Check Now" button

### Database issues
- Delete `status_monitor.db` to reset (will lose all history)
- Check file permissions on the database file

## License

Internal use only.
