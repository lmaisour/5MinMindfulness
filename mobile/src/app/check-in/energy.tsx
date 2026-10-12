import { useRouter } from 'expo-router';

import { CheckInShell } from '@/components/check-in/CheckInShell';
import { EnergySlider } from '@/components/ui/EnergySlider';
import { FormNav } from '@/components/ui/FormNav';
import { useAppState } from '@/context/AppStateContext';

export default function CheckInEnergyScreen() {
  const router = useRouter();
  const { draft, updateDraft } = useAppState();

  return (
    <CheckInShell
      step="energy"
      question="How’s your energy right now?"
      supporting="There’s no right answer — just a sense of where you are."
      footer={
        <FormNav
          onBack={() => router.back()}
          onNext={() => router.push('/check-in/intention')}
        />
      }>
      <EnergySlider
        value={draft.energyLevel}
        onChange={(energyLevel) => updateDraft({ energyLevel })}
      />
    </CheckInShell>
  );
}
