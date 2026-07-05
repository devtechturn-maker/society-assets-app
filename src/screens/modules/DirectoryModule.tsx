import { DirectoryHubModule } from './DirectoryHubModule';
import { DirectoryMembersModule } from './DirectoryMembersModule';

type Props = {
  memberPortal?: boolean;
};

export function DirectoryModule({ memberPortal = false }: Props) {
  return (
    <DirectoryHubModule
      portal={memberPortal ? 'member' : 'society'}
      renderSection={(sectionId, onBack) => {
        if (sectionId === 'members') {
          return (
            <DirectoryMembersModule
              onBack={onBack}
              memberPortal={memberPortal}
              canManage={!memberPortal}
            />
          );
        }
        return null;
      }}
    />
  );
}
