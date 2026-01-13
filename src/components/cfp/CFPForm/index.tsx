import { motion } from 'framer-motion';
import { Save, MessageCircle } from 'lucide-react';
import { useFeatureFlagEnabled } from 'posthog-js/react';
import { FormEvent } from 'react';

import Button from '@/components/ui/Button';
import { FeatureFlags } from '@/constants';
import useEvents from '@/hooks/useEvents';

import { useCFPForm } from '../hooks/useCFPForm';
import { useFormValidation } from '../hooks/useFormValidation';

import AutoSaveIndicator from './AutoSaveIndicator';
import ErrorBanner from './ErrorBanner';
import SpeakerSection from './SpeakerSection';
import SuccessState from './SuccessState';
import TalkSection from './TalkSection';
import TopicSelector from './TopicSelector';

export default function CFPForm() {
  const { track } = useEvents();
  const showDeepDiveOption = useFeatureFlagEnabled(FeatureFlags.CfpDeepDiveOption);

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

  const { validateForm, hasErrors } = useFormValidation();

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

  return (
    <>
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-4">
        <h2 className="text-2xl sm:text-3xl font-bold">Submit Your Talk</h2>
        <AutoSaveIndicator
          isAutoSaving={isAutoSaving}
          lastSaved={lastSaved}
          hasLoadedFromStorage={hasLoadedFromStorage}
        />
      </div>

      <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
        <div className="flex items-start gap-2 text-sm text-blue-800">
          <Save size={16} className="mt-0.5 text-blue-600 flex-shrink-0" />
          <span>
            <strong>Don&apos;t worry about finishing in one go!</strong> Your progress is
            automatically saved to your browser as you type. You can close this page and return
            later to continue where you left off.
          </span>
        </div>
      </div>

      <div className="mb-6 p-3 bg-green-50 border border-green-200 rounded-lg">
        <div className="flex items-start gap-2 text-sm text-green-800">
          <MessageCircle size={16} className="mt-0.5 text-green-600 flex-shrink-0" />
          <span>
            <strong>Having trouble?</strong> You can always email your talk proposal directly to{' '}
            <a href="mailto:hello@zurichjs.com" className="underline font-semibold">
              hello@zurichjs.com
            </a>{' '}
            if you encounter any issues with this form.
          </span>
        </div>
      </div>

      <motion.form
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.5, delay: 0.2 }}
        onSubmit={handleSubmit}
        className="bg-white p-6 md:p-8 rounded-lg shadow-md"
        encType="multipart/form-data"
      >
        {formState.error && (
          <ErrorBanner
            error={formState.error}
            validationErrors={validationErrors}
            generateEmailBody={generateEmailBody}
            onEmailFallback={() => track('email_fallback_used', { error: formState.error })}
          />
        )}

        <SpeakerSection
          formState={formState}
          validationErrors={validationErrors}
          onInputChange={handleInputChange}
          onImageChange={handleImageChange}
        />

        <TalkSection
          formState={formState}
          validationErrors={validationErrors}
          onInputChange={handleInputChange}
          showDeepDiveOption={!!showDeepDiveOption}
        />

        <TopicSelector
          selectedTopics={formState.topics}
          onTopicChange={handleTopicChange}
          error={validationErrors.topics}
        />

        <div className="flex justify-end">
          <Button
            type="submit"
            variant="primary"
            size="lg"
            disabled={formState.isSubmitting}
            className="w-full sm:w-auto"
          >
            {formState.isSubmitting ? (
              <>
                <svg
                  className="animate-spin -ml-1 mr-3 h-5 w-5 text-white"
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                >
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                  />
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                  />
                </svg>
                Submitting...
              </>
            ) : (
              'Submit Your Talk'
            )}
          </Button>
        </div>
      </motion.form>
    </>
  );
}
