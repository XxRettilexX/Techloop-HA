# PocketBase Database Service

Lightweight SQLite database with built-in auth, real-time subscriptions, and admin UI.

## Features

- **Auth System**: JWT-based authentication with OAuth2 support
- **Collections**:
  - `users` - User accounts with preferences
  - `boiler_settings` - User-specific boiler configuration
  - `temperature_schedules` - Programmable temperature schedules
  - `boiler_history` - Historical data for charts (7 days retention)
  - `maintenance_logs` - AI maintenance alerts and logs
- **Admin UI**: Available at http://localhost:8090/_/
- **Real-time**: WebSocket subscriptions for live data
- **File Storage**: For user avatars and attachments

## Access

- **Admin Dashboard**: http://localhost:8090/_/
- **API Base URL**: http://localhost:8090/api/
- **Auth Endpoint**: http://localhost:8090/api/collections/users/auth-with-password

## Initial Setup

1. Start the service:
```bash
docker-compose up -d pocketbase
```

2. Create admin account:
- Visit http://localhost:8090/_/
- Set admin email and password

3. Test API:
```bash
# Health check
curl http://localhost:8090/api/health

# List collections
curl http://localhost:8090/api/collections
```

## Database Schema

### Users Collection (auth)
- `email` - User email (unique)
- `password` - Hashed password
- `name` - Display name
- `avatar` - Profile picture
- `preferences` - JSON preferences

### Boiler Settings
- `user` - Relation to user
- `default_temperature` - Default target temp (5-25°C)
- `eco_mode_enabled` - Eco mode flag
- `notifications_enabled` - Push notifications
- `away_mode_temperature` - Temperature when away

### Temperature Schedules
- `user` - Relation to user
- `name` - Schedule name
- `day_of_week` - Day (monday, tuesday, ...)
- `time` - Time (HH:MM format)
- `temperature` - Target temperature
- `enabled` - Active flag

### Boiler History
- `timestamp` - Record timestamp
- `water_temp` - Water temperature
- `return_temp` - Return temperature
- `pressure` - System pressure
- `modulation` - Flame modulation %
- `flame_on` - Flame status
- `setpoint` - Target temperature
- `indoor_temp` - Indoor temperature
- `outdoor_temp` - Outdoor temperature

### Maintenance Logs
- `timestamp` - Event timestamp
- `type` - anomaly/maintenance/warning/info
- `severity` - low/medium/high/critical
- `message` - Description
- `details` - JSON extra data
- `resolved` - Resolution flag

## API Examples

### Authentication
```bash
# Register new user
curl -X POST http://localhost:8090/api/collections/users/records \
  -H "Content-Type: application/json" \
  -d '{
    "email": "user@example.com",
    "password": "secure_password",
    "passwordConfirm": "secure_password",
    "name": "John Doe"
  }'

# Login
curl -X POST http://localhost:8090/api/collections/users/auth-with-password \
  -H "Content-Type: application/json" \
  -d '{
    "identity": "user@example.com",
    "password": "secure_password"
  }'
```

### CRUD Operations
```bash
# Create schedule (with auth token)
curl -X POST http://localhost:8090/api/collections/temperature_schedules/records \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "user": "USER_ID",
    "name": "Morning warmup",
    "day_of_week": "monday",
    "time": "06:30",
    "temperature": 22,
    "enabled": true
  }'

# Get user schedules
curl "http://localhost:8090/api/collections/temperature_schedules/records?filter=(user='USER_ID')" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### Real-time Subscriptions (SSE)
```javascript
const eventSource = new EventSource(
  'http://localhost:8090/api/realtime?subscriptions=boiler_history'
);

eventSource.addEventListener('message', (e) => {
  console.log('New data:', JSON.parse(e.data));
});
```

## Data Retention

Configure in `pocketbase/pb_hooks/cleanup.pb.js`:
- History data: 7 days
- Maintenance logs: 30 days
- Audit logs: 90 days

## Backup

```bash
# Backup database
docker exec pocketbase_db cp /pb/pb_data/data.db /pb/pb_data/backup_$(date +%Y%m%d).db

# Restore from backup
docker cp backup.db pocketbase_db:/pb/pb_data/data.db
docker-compose restart pocketbase
```

## SDK Integration

Install PocketBase SDK in mobile/web apps:

```bash
# Mobile (React Native)
npm install pocketbase

# Web (React)
npm install pocketbase
```

Usage:
```typescript
import PocketBase from 'pocketbase';

const pb = new PocketBase('http://172.28.0.110:8090');

// Auto-refresh auth
pb.authStore.onChange(() => {
  console.log('Auth changed:', pb.authStore.token);
});

// Login
await pb.collection('users').authWithPassword('email', 'password');

// CRUD
const schedules = await pb.collection('temperature_schedules').getFullList();
```
