import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import Sheet from './Sheet';
import { respondSurvey } from '../../api/survey.api';

/**
 * Release survey pop-up, offered once per account after the first few games
 * (the server decides when; see GET /survey). The survey is an external form,
 * so "Take the survey" opens it in a new tab and records that it was opened.
 */
export default function SurveyPrompt({ survey, canShow }) {
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(true);
  const answer = useMutation({
    mutationFn: respondSurvey,
    onSettled: () => queryClient.invalidateQueries({ queryKey: ['survey'] }),
  });

  function respond(action) {
    setOpen(false);
    answer.mutate(action);
  }

  return (
    <Sheet open={Boolean(survey?.due && canShow && open)} onClose={() => respond('dismissed')} variant="center" accent="p" labelledBy="survey-title">
      <p className="text-xs font-bold uppercase tracking-wide text-vio">Quick survey</p>
      <h2 id="survey-title" className="font-display pr-8 text-2xl font-bold">How is guessIo {survey?.version} treating you?</h2>
      <p className="mt-2 text-[13px] text-mute">You have played a few games now. A short survey helps us decide what to fix and build next.</p>
      <div className="mt-5 grid gap-3">
        <a
          href={survey?.url || '#'}
          target="_blank"
          rel="noopener noreferrer"
          className="btn"
          onClick={() => respond('opened')}
        >
          Take the survey
        </a>
        <button type="button" className="btn alt" onClick={() => respond('dismissed')}>Not now</button>
      </div>
    </Sheet>
  );
}
