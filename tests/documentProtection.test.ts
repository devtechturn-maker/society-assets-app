import React from 'react';

const mockPrevent = jest.fn(() => Promise.resolve());
const mockAllow = jest.fn(() => Promise.resolve());
jest.mock('expo-screen-capture', () => ({
  preventScreenCaptureAsync: (...a: unknown[]) => mockPrevent(...(a as [])),
  allowScreenCaptureAsync: (...a: unknown[]) => mockAllow(...(a as [])),
}));

const mockFiles: Record<string, string[]> = {};
const mockDeleted: string[] = [];
jest.mock('expo-file-system/legacy', () => ({
  cacheDirectory: 'file:///cache/',
  makeDirectoryAsync: jest.fn(() => Promise.resolve()),
  readDirectoryAsync: jest.fn((dir: string) => Promise.resolve(mockFiles[dir] ?? [])),
  deleteAsync: jest.fn((uri: string) => {
    mockDeleted.push(uri);
    return Promise.resolve();
  }),
}));

jest.mock('react-native', () => ({ Platform: { OS: 'android' } }));

// Minimal effect runner so the hook can be exercised without a renderer.
const mockCleanups: Array<() => void> = [];
jest.mock('react', () => ({
  ...jest.requireActual('react'),
  useEffect: (fn: () => void | (() => void)) => {
    const c = fn();
    if (typeof c === 'function') mockCleanups.push(c);
  },
}));

import { useDocumentScreenProtection, documentProtectionHolders } from '../src/services/screenProtection';
import { secureCachePath, wipeSecureCache } from '../src/services/secureFileCache';

describe('screenshot protection', () => {
  it('blocks capture while any document is shown and allows it only after the last one leaves', () => {
    useDocumentScreenProtection();
    useDocumentScreenProtection();
    useDocumentScreenProtection();
    expect(documentProtectionHolders()).toBe(3);
    expect(mockPrevent).toHaveBeenCalledTimes(1);

    mockCleanups.pop()!();
    mockCleanups.pop()!();
    expect(mockAllow).not.toHaveBeenCalled();
    mockCleanups.pop()!();
    expect(documentProtectionHolders()).toBe(0);
    expect(mockAllow).toHaveBeenCalledTimes(1);
  });

  it('does nothing when inactive', () => {
    mockPrevent.mockClear();
    useDocumentScreenProtection(false);
    expect(mockPrevent).not.toHaveBeenCalled();
    expect(documentProtectionHolders()).toBe(0);
  });
});

describe('secure file cache', () => {
  it('keeps downloads in the private folder with a safe name', async () => {
    expect(await secureCachePath('../tharav 12/../x.pdf')).toBe('file:///cache/secure-docs/.._tharav_12_.._x.pdf');
  });

  it('wipes everything in the app cache, including files left by older builds', async () => {
    mockFiles['file:///cache/'] = ['secure-docs', 'record-1.pdf', 'chat-a.img', 'ImagePicker'];
    await wipeSecureCache();
    expect(mockDeleted.sort()).toEqual(
      ['file:///cache/ImagePicker', 'file:///cache/chat-a.img', 'file:///cache/record-1.pdf', 'file:///cache/secure-docs'].sort()
    );
  });
});

void React;
