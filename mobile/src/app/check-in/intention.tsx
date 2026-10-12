import { useRouter } from 'expo-router';

import { CheckInShell } from '@/components/check-in/CheckInShell';
import { FormNav } from '@/components/ui/FormNav';
import { SelectableOption } from '@/components/ui/SelectableOption';
import { INTENTION_COPY, INTENTION_OPTIONS } from '@/constants/checkin';
import { useAppState } from '@/context/AppStateContext';

export default function CheckInIntentionScreen() {
  const router = useRouter();
  const { draft, setFocus } = useAppState();

  return (
    <CheckInShell
      step="intention"
      question="What would you like support with today?"
      supporting="Choose one intention for this meditation."
      footer={
        <FormNav
          onBack={() => router.back()}
          onNext={() => router.push('/check-in/notes')}
          nextDisabled={!draft.focus}
        />
      }>
      {INTENTION_OPTIONS.map((intention) => (
        <SelectableOption
          key={intention}
          title={intention}
          description={INTENTION_COPY[intention]}
          selected={draft.focus === intention}
          onPress={() => setFocus(intention)}
        />
      ))}
    </CheckInShell>
  );
}
