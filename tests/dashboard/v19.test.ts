/** v19: join flats by code, chairman dashboard tiles. */
import { mockHttpClient } from '../utils/httpMockClient';

jest.mock('axios', () => {
  const actual = jest.requireActual('axios');
  const { mockHttpClient: client } = require('../utils/httpMockClient');
  return {
    ...actual,
    create: jest.fn(() => client),
    isAxiosError: actual.isAxiosError,
  };
});

jest.mock('expo-file-system/legacy', () => ({
  documentDirectory: '/tmp/',
  EncodingType: { Base64: 'base64' },
  readAsStringAsync: jest.fn(),
  writeAsStringAsync: jest.fn(),
  deleteAsync: jest.fn(),
}));

jest.mock('../../src/services/storage', () => ({
  getToken: jest.fn(async () => null),
  clearSession: jest.fn(async () => undefined),
}));

jest.mock('../../src/services/session', () => ({
  notifySessionInvalid: jest.fn(),
}));

jest.mock('../../src/services/globalApiLoading', () => ({
  attachGlobalLoadingInterceptors: jest.fn(),
}));

import { dashboardKpis } from '../../src/utils/dashboardKpis';
import type { SocietyOverview } from '../../src/types/api';

type Api = typeof import('../../src/services/api');

const base: SocietyOverview = {
  societyId: 's1',
  societyName: 'Test',
  totalIncome: 1500,
  totalMaintenanceIncome: 1000,
  totalOtherIncome: 500,
  totalExpenses: 300,
  cashOnHand: 100,
  expenseCount: 2,
  totalUsers: 9,
};

describe('join a society', () => {
  it('lists open flats with the join code, not the society id', async () => {
    const { listOnboardingOpenFlats } = require('../../src/services/api') as Api;
    mockHttpClient.get.mockResolvedValueOnce({ data: { message: 'OK', data: [{ flatId: 'f1', flatNumber: 'A-101' }] } });

    const flats = await listOnboardingOpenFlats(' abcd-efgh ');

    expect(mockHttpClient.get).toHaveBeenCalledWith('/auth/onboarding/join-code/ABCDEFGH/open-flats');
    expect(flats).toEqual([{ flatId: 'f1', flatNumber: 'A-101' }]);
  });

  it('has no society search any more', () => {
    expect((require('../../src/services/api') as Record<string, unknown>).searchOnboardingSocieties).toBeUndefined();
  });
});

describe('chairman dashboard tiles', () => {
  const labels = (data: SocietyOverview) => dashboardKpis(data).map((k) => k.label);

  it('shows the four new tiles first when the server sends them', () => {
    const kpis = dashboardKpis({ ...base, totalOutstanding: 2500, openComplaints: 3, todayVisitors: 0 });
    expect(kpis.slice(0, 4)).toEqual([
      { label: 'Maintenance Collected', value: 1000 },
      { label: 'Maintenance Pending', value: 2500 },
      { label: 'Open Complaints', value: 3, isCurrency: false },
      { label: "Today's Visitors", value: 0, isCurrency: false },
    ]);
    expect(kpis).toHaveLength(11);
  });

  it('hides tiles the plan does not include', () => {
    expect(labels({ ...base, totalOutstanding: 0, openComplaints: null, todayVisitors: null })).not.toEqual(
      expect.arrayContaining(['Open Complaints', "Today's Visitors"])
    );
  });

  it('keeps the old tiles on an older server instead of showing zeros', () => {
    expect(labels({ ...base, totalMaintenanceIncome: undefined })).toEqual([
      'Total Income',
      'Other Income',
      'Total Expenses',
      'Cash On Hand',
      'Bank Balance',
      'Expense Count',
      'Total Members',
    ]);
  });
});
