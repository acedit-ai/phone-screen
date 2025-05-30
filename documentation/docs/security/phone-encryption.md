# Phone Number Encryption

This document describes the phone number encryption system implemented to protect user privacy and ensure security compliance.

## Overview

The system now encrypts phone numbers before storing them in the database and uses deterministic hashing for rate limiting purposes. This ensures that:

1. **Privacy**: Actual phone numbers are never stored in plain text
2. **Security**: Phone numbers are encrypted using AES-256-CBC
3. **Rate Limiting**: Consistent hashing allows for proper rate limiting without exposing phone numbers
4. **Consistency**: Unified phone number normalization across all components

## Environment Setup

Add the following environment variable to your `.env` file:

```bash
# Phone Number Encryption (Generate a strong 32+ character key)
PHONE_ENCRYPTION_KEY="your-secure-encryption-key-here-make-it-long-and-random"
```

**Important**: 
- Use a strong, random key of at least 32 characters
- Never commit this key to version control
- Use different keys for different environments (dev, staging, production)
- Store this key securely (e.g., in your hosting provider's environment variables)

### Generating a Secure Key

You can generate a secure key using Node.js:

```javascript
const crypto = require('crypto');
console.log(crypto.randomBytes(32).toString('hex'));
```

Or using OpenSSL:

```bash
openssl rand -hex 32
```

## Implementation Details

### Phone Number Normalization

All phone numbers are normalized to E.164 format before encryption:

```javascript
// Examples of normalization:
// "+61401148075" → "+61401148075" (already normalized)
// "0401148075" → "+61401148075" (assumes AU number)
// "4011480751" → "+14011480751" (assumes US number)
// "+1 (401) 148-0751" → "+14011480751" (cleaned and normalized)
```

### Encryption Process

1. **Normalization**: Phone number is normalized to E.164 format
2. **Encryption**: AES-256-CBC encryption with a random IV
3. **Storage**: IV + encrypted data stored as `iv:encrypted_data`

### Rate Limiting

For rate limiting, the system:

1. **Normalizes** the phone number
2. **Creates a secure hash** using HMAC-SHA256
3. **Uses the hash as the key** in the database (format: `phone_hash:hash`)

This allows for consistent rate limiting without storing actual phone numbers.

## Migration

If you have existing phone number entries in your database, run the migration endpoint:

```bash
curl -X POST https://your-domain.com/api/admin/migrate-phone-entries
```

This will:
- Convert old `phone:+1234567890` entries to secure `phone_hash:hash` entries
- Merge duplicate entries if they exist
- Clean up old entries

## Database Schema

The rate limiting table stores:

```sql
CREATE TABLE rate_limits (
  id TEXT PRIMARY KEY,              -- Now uses secure hashes for phone numbers
  count INTEGER NOT NULL DEFAULT 0,
  window_start BIGINT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

Key formats:
- IP-based: `192.168.1.1:outbound_call`
- Phone-based: `phone_hash:a1b2c3d4e5f6...` (secure hash)

## Security Benefits

1. **Data Protection**: Phone numbers are encrypted at rest
2. **Privacy**: Database administrators cannot see actual phone numbers
3. **Compliance**: Helps meet data protection regulations (GDPR, CCPA, etc.)
4. **Breach Mitigation**: Even if the database is compromised, phone numbers remain protected

## Performance Considerations

- **Minimal Impact**: Hashing and encryption operations are fast
- **Caching**: Rate limiting keys are cached for performance
- **Database**: Uses indexed lookups for efficient rate limiting checks

## Troubleshooting

### Rate Limiting Not Working

1. Check that `PHONE_ENCRYPTION_KEY` is set
2. Verify phone numbers are being normalized consistently
3. Run the migration script to convert old entries

### Encryption Errors

1. Ensure the encryption key is properly set
2. Check that the key is at least 32 characters
3. Verify the key hasn't changed between deployments

### Performance Issues

1. Monitor database query performance
2. Ensure rate limiting table is properly indexed
3. Consider cleanup of old entries

## Development

In development mode (when `NODE_ENV=development`), encryption warnings will be logged if the key is not set, but the system will continue to function.

For production deployments, the encryption key is required for proper security.

## Best Practices

1. **Key Management**: Use secure key storage (environment variables, key vaults)
2. **Key Rotation**: Plan for periodic key rotation (requires data migration)
3. **Monitoring**: Monitor encryption/decryption performance and errors
4. **Backup**: Ensure encryption keys are included in backup procedures
5. **Testing**: Test encryption/decryption in staging environments

## API Changes

The phone number encryption is transparent to API consumers. The following endpoints continue to work as before:

- `POST /api/call/outbound` - Phone numbers are automatically encrypted
- Rate limiting responses include the same headers
- Error messages do not expose encrypted values

## Future Enhancements

Potential future improvements:

1. **Key Rotation**: Automated key rotation system
2. **Multiple Keys**: Support for multiple encryption keys during transitions
3. **Enhanced Hashing**: Additional security measures for rate limiting keys
4. **Audit Logging**: Detailed logging of encryption/decryption operations 