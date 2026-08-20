import { describe, expect, it } from 'vitest';
import db from '../db.js';

describe('database pool', () => {
  it('exports a mysql pool with a query method', () => {
    expect(db).toHaveProperty('query');
    expect(db.query).toBeTypeOf('function');
  });
});
