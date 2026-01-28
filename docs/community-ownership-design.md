# Community Level Ownership

Future feature: allow users to update/delete their own community levels.

## Design: Secret-Based Ownership with Hash

**Core idea:** Server-generated secret acts as ownership proof. Server stores only the hash.

### Data Model

| Column | Content |
|--------|---------|
| A | Timestamp |
| B | LevelId (hash of secret) |
| C | Level JSON (no secret/levelId embedded) |
| D | Stars |

### Flow

**First share:**
```
Client: POST {level}
Server: generate secret, hash → levelId, append row
Server: return {secret, levelId}
Client: store secret + levelId in localStorage with level
```

**Update:**
```
Client: POST {level, secret}
Server: hash secret → levelId, append new row (version history)
```

**Delete:**
```
Client: POST {action: 'delete', secret}
Server: hash → levelId, delete all rows with that levelId
```

**GET:**
```
Server: return latest row per levelId (deduped by timestamp)
Response: levelId \t level_base64 \t stars (per line)
```

**Star:**
```
Client: POST {action: 'star', levelId, starred}
Server: find latest row with levelId, update stars
```

### Key Properties

- **Secret never stored** - only hash, so DB leak doesn't compromise ownership
- **Append-only updates** - natural version history, no row mutations
- **URL sharing uses levelId** - recipients can play/star but not modify
- **Copying strips secret** - resharing creates new level

### Future: Version History UI

Multiple rows per levelId = version history. Could add dropdown to browse old versions. Data structure already supports it.

### Client Storage

```javascript
// In localStorage with level
{
  id: "local-uuid",
  uid: "levelId",        // public, for starring/linking
  secret: "...",         // private, for update/delete
  name: "...",
  grid: [...],
  ...
}
```

Levels copied from community lack `secret` field → resharing creates new entry.
