import { DirectoryHubModule } from './DirectoryHubModule';
import { DirectoryFamilyMembersModule } from './DirectoryFamilyMembersModule';
import { DirectoryImportantContactsModule } from './DirectoryImportantContactsModule';
import { DirectoryMembersModule } from './DirectoryMembersModule';
import { DirectorySocietyStaffModule } from './DirectorySocietyStaffModule';
import { DirectoryVehiclesModule } from './DirectoryVehiclesModule';

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
        if (memberPortal && sectionId === 'family-members') {
          return <DirectoryFamilyMembersModule onBack={onBack} />;
        }
        if (memberPortal && sectionId === 'vehicles') {
          return <DirectoryVehiclesModule onBack={onBack} />;
        }
        if (memberPortal && sectionId === 'important-contacts') {
          return <DirectoryImportantContactsModule onBack={onBack} />;
        }
        if (memberPortal && sectionId === 'society-staff') {
          return <DirectorySocietyStaffModule onBack={onBack} />;
        }
        return null;
      }}
    />
  );
}
