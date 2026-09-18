import { PremiumLoadingScreen } from './PremiumLoadingScreen';

type Props = {
  label?: string;
};

/** @deprecated Use PremiumLoadingScreen */
export function PremiumSplashContent({ label = 'Loading...' }: Props) {
  return <PremiumLoadingScreen label={label} />;
}
