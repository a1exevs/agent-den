import { describe, expect, it } from 'vitest';

import { isAllowedHost, isAllowedOrigin } from './local-origin';

describe('isAllowedOrigin', () => {
  it('lets hook senders (no Origin) and local pages in', () => {
    expect(isAllowedOrigin(undefined)).toBe(true);
    expect(isAllowedOrigin('http://localhost:4210')).toBe(true);
    expect(isAllowedOrigin('http://127.0.0.1:4317')).toBe(true);
  });

  it('keeps other websites out', () => {
    expect(isAllowedOrigin('https://evil.example')).toBe(false);
    expect(isAllowedOrigin('http://localhost.evil.example')).toBe(false);
    expect(isAllowedOrigin('null')).toBe(false);
  });
});

describe('isAllowedHost', () => {
  it('accepts local host names on any port', () => {
    expect(isAllowedHost('127.0.0.1:4317')).toBe(true);
    expect(isAllowedHost('localhost:4317')).toBe(true);
    expect(isAllowedHost('[::1]:4317')).toBe(true);
  });

  it('rejects a rebinded domain and a missing Host', () => {
    expect(isAllowedHost('evil.example:4317')).toBe(false);
    expect(isAllowedHost('127.0.0.1.evil.example')).toBe(false);
    expect(isAllowedHost(undefined)).toBe(false);
  });
});
