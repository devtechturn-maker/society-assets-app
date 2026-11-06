import { buildMoreMenuItems, FALLBACK_SOCIETY_NAV_SOURCE, prepareBottomTabModules } from '../src/constants/fallbackModules';

describe('chairman More menu order', () => {
  it('follows the chosen order', () => {
    const modules = prepareBottomTabModules(FALLBACK_SOCIETY_NAV_SOURCE, 'society');
    const items = buildMoreMenuItems(modules, 'society', { switchRoleLabel: 'Switch to Member View' });
    const order = items.map((i) => i.routePath);
    const wanted = ['__switch_role__', 'ledger', 'settings', 'reports', 'contracts', 'visitor-admin',
      'about-society', 'subscription', 'about-us', 'help'];
    expect(order.filter((p) => wanted.includes(p))).toEqual(wanted);
    expect(order.slice(0, wanted.length)).toEqual(wanted);
  });
});

describe('member More menu order', () => {
  it('follows the chosen order', () => {
    const { FALLBACK_MEMBER_NAV_SOURCE } = require('../src/constants/fallbackModules');
    const modules = prepareBottomTabModules(FALLBACK_MEMBER_NAV_SOURCE, 'member');
    const items = buildMoreMenuItems(modules, 'member', { switchRoleLabel: 'Switch to Chairman Mode' });
    const order = items.map((i) => i.routePath);
    console.log(order.join(','));
    const wanted = ['__switch_role__', 'visitors', 'about-society', 'about-us', 'help'];
    expect(order.filter((p) => wanted.includes(p))).toEqual(wanted.filter((p) => order.includes(p)));
  });
});
