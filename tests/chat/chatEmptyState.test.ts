import { readFileSync } from 'fs';
import { join } from 'path';

/**
 * UI empty-state contract without React Native renderer deps.
 * Ensures ChatModule still wires the shared empty copy users see.
 */
describe('Chat empty state copy contract', () => {
  it('ChatModule ListEmpty uses the expected zero-message copy', () => {
    const source = readFileSync(
      join(__dirname, '../../src/screens/modules/ChatModule.tsx'),
      'utf8'
    );
    expect(source).toContain('No messages yet. Start the conversation.');
    expect(source).toContain('ListEmpty');
  });
});
