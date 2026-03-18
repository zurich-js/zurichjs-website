import { type FormEvent, useState, useEffect } from 'react';

import { FeatureFlags } from '@/constants';
import useEvents from '@/hooks/useEvents';

import { useCFPForm } from '../hooks/useCFPForm';
import { useFormValidation } from '../hooks/useFormValidation';

import SpeakerSection from './SpeakerSection';
import SuccessState from './SuccessState';
import TalkSection from './TalkSection';
import TopicSelector from './TopicSelector';

export default function CFPForm() {
  const { track } = useEvents();
  const [showDeepDiveOption, setShowDeepDiveOption] = useState(false);
  useEffect(() => {
    try {
      const ph = (window as unknown as { posthog?: { isFeatureEnabled?: (f: string) => boolean } }).posthog;
      if (ph?.isFeatureEnabled) setShowDeepDiveOption(ph.isFeatureEnabled(FeatureFlags.CfpDeepDiveOption) ?? false);
    } catch { /* */ }
  }, []);

  const {
    formState,
    setFormState,
    validationErrors,
    setValidationErrors,
    isAutoSaving,
    lastSaved,
    hasLoadedFromStorage,
    handleInputChange,
    handleTopicChange,
    handleImageChange,
    clearStorage,
    generateEmailBody,
  } = useCFPForm(track);

  const { validateForm, hasErrors, getErrorCount } = useFormValidation();

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    const errors = validateForm(formState);
    setValidationErrors(errors);

    if (hasErrors(errors)) {
      track('form_error', {
        errorType: 'validation_failed',
        errorFields: Object.keys(errors).join(', '),
      });
      setFormState(prev => ({ ...prev, error: 'Please fix the highlighted errors below' }));
      // Scroll to top of form to show error
      document.getElementById('cfp-form-top')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      return;
    }

    setFormState(prev => ({ ...prev, isSubmitting: true, error: '' }));

    try {
      const formData = new FormData();
      const fullName = `${formState.firstName} ${formState.lastName}`;

      formData.append('name', fullName);
      formData.append('firstName', formState.firstName);
      formData.append('lastName', formState.lastName);
      formData.append('jobTitle', formState.jobTitle);
      formData.append('biography', formState.biography);
      formData.append('email', formState.email);
      formData.append('linkedinProfile', formState.linkedinProfile);
      formData.append('githubProfile', formState.githubProfile || '');
      formData.append('twitterHandle', formState.twitterHandle || '');
      formData.append('title', formState.title);
      formData.append('description', formState.description);
      formData.append('talkLength', formState.talkLength);
      formData.append('talkLevel', formState.talkLevel);
      formData.append('topics', JSON.stringify(formState.topics));

      if (formState.speakerImage) {
        formData.append('speakerImage', formState.speakerImage);
      }

      track('form_submit', {
        talkLength: formState.talkLength,
        talkLevel: formState.talkLevel,
        topicsCount: formState.topics.length,
      });

      const response = await fetch('/api/submit-talk', {
        method: 'POST',
        body: formData,
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'An error occurred while submitting your talk');
      }

      track('form_submit_success', { talkTitle: formState.title });

      clearStorage();
      setFormState(prev => ({
        ...prev,
        submitted: true,
        isSubmitting: false,
        error: '',
      }));
    } catch (error: unknown) {
      console.error('Submission error:', error);

      track('form_submit_error', {
        errorMessage: error instanceof Error ? error.message : 'Unknown error',
      });

      setFormState(prev => ({
        ...prev,
        isSubmitting: false,
        error: error instanceof Error ? error.message : 'An error occurred while submitting your talk',
      }));
    }
  };

  if (formState.submitted) {
    return <SuccessState />;
  }

  const errorCount = getErrorCount(validationErrors);

  return (
    <div id="cfp-form-top">
      {/* Auto-save status */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2 text-sm text-gray-500">
          {isAutoSaving ? (
            <>
              <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" /></svg>
              <span>Saving...</span>
            </>
          ) : lastSaved ? (
            <>
              <svg className="h-4 w-4 text-green-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M20 6L9 17l-5-5" /></svg>
              <span>Draft saved {lastSaved.toLocaleTimeString()}</span>
            </>
          ) : (
            <>
              <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M15.2 3a2 2 0 0 1 1.4.6l3.8 3.8a2 2 0 0 1 .6 1.4V19a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2z" /><path d="M17 21v-7a1 1 0 0 0-1-1H8a1 1 0 0 0-1 1v7" /><path d="M7 3v4a1 1 0 0 0 1 1h7" /></svg>
              <span>Auto-save enabled</span>
            </>
          )}
        </div>
        {hasLoadedFromStorage && (
          <span className="text-xs text-blue-600 bg-blue-50 px-2 py-1 rounded-full">Restored from draft</span>
        )}
      </div>

      {/* Error banner */}
      {formState.error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl">
          <div className="flex items-start gap-3">
            <svg className="h-5 w-5 text-red-500 mt-0.5 flex-shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10" /><line x1="15" y1="9" x2="9" y2="15" /><line x1="9" y1="9" x2="15" y2="15" /></svg>
            <div>
              <p className="font-semibold text-red-800">{formState.error}</p>
              {errorCount > 0 && (
                <p className="text-sm text-red-600 mt-1">{errorCount} field{errorCount !== 1 ? 's' : ''} need{errorCount === 1 ? 's' : ''} attention</p>
              )}
              {errorCount === 0 && (
                <p className="text-sm text-red-600 mt-2">
                  Having trouble? Email your proposal to{' '}
                  <a href={`mailto:hello@zurichjs.com?subject=Talk Proposal: ${formState.title || 'New Talk'}&body=${encodeURIComponent(generateEmailBody())}`} className="underline font-semibold">
                    hello@zurichjs.com
                  </a>
                </p>
              )}
            </div>
          </div>
        </div>
      )}

      <form
        onSubmit={handleSubmit}
        className="space-y-2"
        encType="multipart/form-data"
      >
        {/* Step 1: Speaker */}
        <div className="bg-white rounded-2xl p-6 md:p-8 border border-gray-100 shadow-sm">
          <SpeakerSection
            formState={formState}
            validationErrors={validationErrors}
            onInputChange={handleInputChange}
            onImageChange={handleImageChange}
          />
        </div>

        {/* Step 2: Talk */}
        <div className="bg-white rounded-2xl p-6 md:p-8 border border-gray-100 shadow-sm">
          <TalkSection
            formState={formState}
            validationErrors={validationErrors}
            onInputChange={handleInputChange}
            showDeepDiveOption={!!showDeepDiveOption}
          />
        </div>

        {/* Step 3: Topics */}
        <div className="bg-white rounded-2xl p-6 md:p-8 border border-gray-100 shadow-sm">
          <TopicSelector
            selectedTopics={formState.topics}
            onTopicChange={handleTopicChange}
            error={validationErrors.topics}
          />
        </div>

        {/* Submit */}
        <div className="pt-4">
          <button
            type="submit"
            disabled={formState.isSubmitting}
            className="w-full sm:w-auto bg-black text-white px-8 py-4 rounded-xl font-bold text-lg hover:bg-gray-800 transition-all duration-200 hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-3"
          >
            {formState.isSubmitting ? (
              <>
                <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24" fill="none"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" /></svg>
                Submitting...
              </>
            ) : (
              'Submit Your Talk'
            )}
          </button>
          <p className="text-xs text-gray-500 mt-3">
            Having trouble? Email your proposal to{' '}
            <a href="mailto:hello@zurichjs.com" className="underline text-blue-600">hello@zurichjs.com</a>
          </p>
        </div>
      </form>
    </div>
  );
}
