# Websocket Server Tests

This directory contains the test suite for the websocket server, focusing on critical functionality without redundant testing of obvious cases.

## Test Philosophy

We follow a **sparingly relevant** testing approach:
- ✅ Test complex logic and edge cases
- ✅ Test rate limiting behavior and IP extraction
- ✅ Test error handling and boundary conditions
- ❌ Don't test obvious Express.js functionality
- ❌ Don't test simple getters/setters
- ❌ Don't test framework behavior

## Running Tests

```bash
# Run all tests
npm test

# Run tests in watch mode
npm run test:watch

# Run tests with coverage
npm run test:coverage

# Run tests for CI (no watch, with coverage)
npm run test:ci
```

## Test Structure

```
tests/
├── middleware/
│   └── rateLimitMiddleware.test.ts  # Rate limiting logic tests
└── README.md                       # This file
```

## Current Test Coverage

The tests focus on the `getClientIP` function and rate limiting middleware, covering:

- **IP Extraction Logic**: Various proxy header scenarios
- **Edge Cases**: Malformed headers, missing data, array headers
- **Fallback Behavior**: When proxy headers are unavailable
- **Security Scenarios**: trustProxy flag behavior

## GitHub Actions Integration

Tests run automatically on:
- Push to `main` or `develop` branches
- Pull requests targeting `main` or `develop`
- Only when websocket-server files change

The CI pipeline includes:
- **Test**: Run on Node.js 18.x and 20.x
- **Lint**: TypeScript compilation check
- **Security**: npm audit for vulnerabilities

## Adding New Tests

When adding tests, focus on:
1. **Non-obvious behavior** that could break
2. **Edge cases** and error conditions
3. **Security-critical** functionality
4. **Complex business logic**

Avoid testing:
- Simple property access
- Framework defaults
- Obvious success paths 