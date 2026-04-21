import { SignInButton, useUser } from '@clerk/nextjs';
import { motion } from 'framer-motion';
import { LogIn, MessageCircle } from 'lucide-react';
import { useFeatureFlagEnabled } from 'posthog-js/react';
import { FormEvent, useEffect, useMemo, useState } from 'react';

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

interface CFPPrefillData {
  firstName: string;
  lastName: string;
  email: string;
  jobTitle: string;
  biography: string;
  linkedinProfile: string;
  githubProfile: string;
  twitterHandle: string;
  existingSpeakerImageUrl: string | null;
  isExistingSpeaker: boolean;
  missingSpeakerFields: string[];
}

export default function CFPForm() {
  const { user, isLoaded: userLoaded } = useUser();
  const { track } = useEvents();
  const showDeepDiveOption = useFeatureFlagEnabled(FeatureFlags.CfpDeepDiveOption);
  const [isPrefillLoading, setIsPrefillLoading] = useState(false);

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

  const editProfileHref = useMemo(() => '/profile/speaker?returnTo=%2Fcfp%2Fform', []);

  const loadPrefill = async (): Promise<CFPPrefillData> => {
    const response = await fetch('/api/cfp/prefill');

    if (!response.ok) {
      throw new Error('Failed to load CFP prefill');
    }

    return response.json() as Promise<CFPPrefillData>;
  };

  useEffect(() => {
    if (!userLoaded || !user) return;

    let isCancelled = false;

    const prefillForm = async () => {
      setIsPrefillLoading(true);

      try {
        const prefill = await loadPrefill();

        if (isCancelled) return;

        setFormState(prev => ({
          ...prev,
          firstName: prefill.firstName,
          lastName: prefill.lastName,
          email: prefill.email,
          jobTitle: prefill.jobTitle,
          biography: prefill.biography,
          linkedinProfile: prefill.linkedinProfile,
          githubProfile: prefill.githubProfile,
          twitterHandle: prefill.twitterHandle,
          existingSpeakerImageUrl: prefill.existingSpeakerImageUrl,
          isExistingSpeaker: !!prefill.isExistingSpeaker,
          missingSpeakerFields: prefill.missingSpeakerFields,
          speakerImage: null,
          imagePreview: null,
        }));
      } catch (error) {
        console.error('Failed to prefill CFP form:', error);
      } finally {
        if (!isCancelled) {
          setIsPrefillLoading(false);
        }
      }
    };

    void prefillForm();

    return () => {
      isCancelled = true;
    };
  }, [userLoaded, user, setFormState]);

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    let nextFormState = formState;

    if (user) {
      setIsPrefillLoading(true);

      try {
        const prefill = await loadPrefill();

        nextFormState = {
          ...formState,
          firstName: prefill.firstName,
          lastName: prefill.lastName,
          email: prefill.email,
          jobTitle: prefill.jobTitle,
          biography: prefill.biography,
          linkedinProfile: prefill.linkedinProfile,
          githubProfile: prefill.githubProfile,
          twitterHandle: prefill.twitterHandle,
          existingSpeakerImageUrl: prefill.existingSpeakerImageUrl,
          isExistingSpeaker: !!prefill.isExistingSpeaker,
          missingSpeakerFields: prefill.missingSpeakerFields,
          speakerImage: null,
          imagePreview: null,
        };

        setFormState(prev => ({
          ...prev,
          ...nextFormState,
        }));
      } catch (error) {
        console.error('Failed to refresh CFP prefill before submit:', error);
      } finally {
        setIsPrefillLoading(false);
      }
    }

    const errors = validateForm(nextFormState);
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
      const fullName = `${nextFormState.firstName} ${nextFormState.lastName}`;

      formData.append('name', fullName);
      formData.append('firstName', nextFormState.firstName);
      formData.append('lastName', nextFormState.lastName);
      formData.append('jobTitle', nextFormState.jobTitle);
      formData.append('biography', nextFormState.biography);
      formData.append('email', nextFormState.email);
      formData.append('linkedinProfile', nextFormState.linkedinProfile);
      formData.append('githubProfile', nextFormState.githubProfile || '');
      formData.append('twitterHandle', nextFormState.twitterHandle || '');
      formData.append('title', nextFormState.title);
      formData.append('description', nextFormState.description);
      formData.append('talkLength', nextFormState.talkLength);
      formData.append('talkLevel', nextFormState.talkLevel);
      formData.append('topics', JSON.stringify(nextFormState.topics));
      formData.append('submissionMode', user ? 'authenticated' : 'guest');

      if (nextFormState.speakerImage) {
        formData.append('speakerImage', nextFormState.speakerImage);
      }

      track('form_submit', {
        talkLength: nextFormState.talkLength,
        talkLevel: nextFormState.talkLevel,
        topicsCount: nextFormState.topics.length,
        isLoggedIn: !!user,
      });

      const response = await fetch('/api/submit-talk', {
        method: 'POST',
        body: formData,
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'An error occurred while submitting your talk');
      }

      track('form_submit_success', { talkTitle: nextFormState.title });

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

      <div className="mb-6 p-4 bg-white border border-gray-200 rounded-lg">
        <div className="flex items-start gap-2 text-sm text-gray-700">
          <MessageCircle size={16} className="mt-0.5 text-gray-500 flex-shrink-0" />
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
          isSignedIn={!!user}
          editProfileHref={editProfileHref}
          signInCta={
            <SignInButton mode="modal" forceRedirectUrl="/cfp/form">
              <button
                type="button"
                className="inline-flex items-center justify-center gap-2 rounded-md bg-black px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-gray-800"
              >
                <LogIn size={16} />
                Sign In
              </button>
            </SignInButton>
          }
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
            disabled={formState.isSubmitting || isPrefillLoading}
            className="w-full sm:w-auto"
          >
            {formState.isSubmitting || isPrefillLoading ? (
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
                {isPrefillLoading ? 'Refreshing profile...' : 'Submitting...'}
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
