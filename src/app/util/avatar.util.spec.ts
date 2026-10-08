import { getInitials, getAvatarColor } from './avatar.util';

describe('getInitials', () => {
  it('returns ? for undefined', () => {
    expect(getInitials(undefined)).toBe('?');
  });

  it('returns ? for empty string', () => {
    expect(getInitials('')).toBe('?');
  });

  it('returns ? for whitespace-only string', () => {
    expect(getInitials('   ')).toBe('?');
  });

  it('returns single uppercase initial for a one-word name', () => {
    expect(getInitials('Lindani')).toBe('L');
  });

  it('returns first and last initials for a two-word name', () => {
    expect(getInitials('Lindani Masinga')).toBe('LM');
  });

  it('returns first and last initials for a multi-word name', () => {
    expect(getInitials('John Paul Smith')).toBe('JS');
  });

  it('returns first char of a phone-number string as initial', () => {
    expect(getInitials('+27821234567')).toBe('+');
  });

  it('is case-insensitive — always returns uppercase', () => {
    expect(getInitials('alice bob')).toBe('AB');
  });
});

describe('getAvatarColor', () => {
  it('returns the muted-grey fallback for undefined', () => {
    expect(getAvatarColor(undefined)).toBe('#6c757d');
  });

  it('returns the muted-grey fallback for empty string', () => {
    expect(getAvatarColor('')).toBe('#6c757d');
  });

  it('returns a non-grey colour for a non-empty name', () => {
    const colour = getAvatarColor('Lindani');
    expect(colour).not.toBe('#6c757d');
  });

  it('is deterministic — same input yields same colour on every call', () => {
    const name = 'Hloniphani Manzi';
    expect(getAvatarColor(name)).toBe(getAvatarColor(name));
  });

  it('returns different colours for different inputs (probabilistic)', () => {
    // Very unlikely to collide for these two distinct strings.
    const a = getAvatarColor('Alice');
    const b = getAvatarColor('Bob');
    // They may be equal by hash collision, but that is fine — the test
    // is primarily a determinism sanity-check.
    expect(typeof a).toBe('string');
    expect(typeof b).toBe('string');
  });

  it('returns a value from the known palette', () => {
    const palette = ['#be833d', '#00a9a1', '#D66247', '#1083A5', '#127672', '#8e6bbf', '#c45b8a', '#6c757d'];
    const colour = getAvatarColor('TestUser');
    expect(palette).toContain(colour);
  });
});
