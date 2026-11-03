import { useMutation, useQueryClient } from '@tanstack/react-query';
import ConfirmDialog from '../../components/ui/ConfirmDialog';
import { Banner } from '../../components/ui/Feedback';
import * as dailyApi from '../../api/daily.api';
import { getErrorMessage } from '../../api/client';

export const fmtMs = (ms) => (ms == null ? '-' : ms >= 60000 ? `${Math.floor(ms / 60000)}m ${String(Math.floor((ms % 60000) / 1000)).padStart(2, '0')}s` : `${(ms / 1000).toFixed(1)}s`);

const pointsText = (n) => `${n} ${n === 1 ? 'point' : 'points'}`;

/**
 * The two dialogs of a daily retry, and the call that pays for it.
 *
 * `prompt` is the encouraging box shown right after a missed finish. Its button
 * leads to `confirm`, which states the cost before anything is charged and cannot
 * be confirmed when the balance is too low. `retry` is the `retry` block of the
 * daily view ({ available, cost, points }); `onStarted` receives the new view.
 */
export default function DailyRetryDialogs({ retry, finishedMs, targetMs, promptOpen, confirmOpen, onPromptClose, onConfirmOpen, onConfirmClose, onStarted }) {
  const queryClient = useQueryClient();
  const start = useMutation({
    mutationFn: dailyApi.startDailyRetry,
    onSuccess: (view) => {
      queryClient.setQueryData(['daily'], view);
      queryClient.invalidateQueries({ queryKey: ['me'] });
      onConfirmClose();
      onStarted(view);
    },
    // The balance or the day may have changed since the page loaded: show the real reason and refresh.
    onError: () => queryClient.invalidateQueries({ queryKey: ['daily'] }),
  });

  if (!retry) return null;
  const canAfford = retry.points >= retry.cost;
  const offBy = finishedMs != null && targetMs != null ? Math.max(0, finishedMs - targetMs) : null;

  return (
    <>
      <ConfirmDialog
        open={Boolean(promptOpen && retry.available)}
        eyebrow="So close"
        title="Want another go?"
        body={
          offBy != null
            ? `You were ${fmtMs(offBy)} off the time to beat. A fresh code is a fresh chance, and today's square turns green if you take it.`
            : 'A fresh code is a fresh chance, and today’s square turns green if you take it.'
        }
        cancelLabel="Not now"
        confirmLabel={`Retry for ${pointsText(retry.cost)}`}
        onCancel={onPromptClose}
        onConfirm={() => { onPromptClose(); onConfirmOpen(); }}
      />
      <ConfirmDialog
        open={Boolean(confirmOpen && retry.available)}
        tone="warn"
        eyebrow="Costs points"
        title={`Spend ${pointsText(retry.cost)}?`}
        body={
          canAfford
            ? `A retry costs ${pointsText(retry.cost)}. They are taken from your balance as soon as you confirm. You have ${pointsText(retry.points)}.`
            : `A retry costs ${pointsText(retry.cost)} and you have ${pointsText(retry.points)}. Win a few matches to earn more, then come back.`
        }
        cancelLabel="Cancel"
        confirmLabel={start.isPending ? 'Starting' : `Spend ${pointsText(retry.cost)}`}
        busy={start.isPending}
        confirmDisabled={!canAfford}
        onCancel={() => { start.reset(); onConfirmClose(); }}
        onConfirm={() => start.mutate()}
      >
        {start.isError && <div className="daily-error"><Banner variant="error">{getErrorMessage(start.error, 'Could not start the retry.')}</Banner></div>}
      </ConfirmDialog>
    </>
  );
}
