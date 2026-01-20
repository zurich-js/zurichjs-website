import { useState, useEffect, useRef, useCallback, ChangeEvent } from 'react';

import { STORAGE_KEY } from '../constants';
import { FormState, ValidationErrors, initialFormState } from '../types';

interface UseCFPFormReturn {
  formState: FormState;
  setFormState: React.Dispatch<React.SetStateAction<FormState>>;
  validationErrors: ValidationErrors;
  setValidationErrors: React.Dispatch<React.SetStateAction<ValidationErrors>>;
  isAutoSaving: boolean;
  lastSaved: Date | null;
  hasLoadedFromStorage: boolean;
  handleInputChange: (e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => void;
  handleTopicChange: (topic: string) => void;
  handleImageChange: (e: ChangeEvent<HTMLInputElement>) => void;
  clearStorage: () => void;
  generateEmailBody: () => string;
}

type TrackFn = (event: string, props?: Record<string, string | number | boolean>) => void;

export function useCFPForm(track: TrackFn): UseCFPFormReturn {
  const [formState, setFormState] = useState<FormState>(initialFormState);
  const [validationErrors, setValidationErrors] = useState<ValidationErrors>({});
  const [isAutoSaving, setIsAutoSaving] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [hasLoadedFromStorage, setHasLoadedFromStorage] = useState(false);
  const saveTimeoutRef = useRef<NodeJS.Timeout>(null);

  // Load saved form data on component mount
  useEffect(() => {
    try {
      const savedData = localStorage.getItem(STORAGE_KEY);
      if (savedData) {
        const parsedData = JSON.parse(savedData);
        const { lastSaved: savedTime, ...restoreableData } = parsedData;

        setFormState(prev => ({
          ...prev,
          ...restoreableData,
          // Don't restore these states
          submitted: false,
          isSubmitting: false,
          error: '',
          speakerImage: null,
          imagePreview: null,
        }));

        if (savedTime) {
          setLastSaved(new Date(savedTime));
        }
      }
    } catch (error) {
      console.warn('Failed to restore form data:', error);
      localStorage.removeItem(STORAGE_KEY);
    }
    setHasLoadedFromStorage(true);
  }, []);

  // Check if form has any meaningful data
  const hasFormData = useCallback(() => {
    return (
      formState.firstName.trim() ||
      formState.lastName.trim() ||
      formState.jobTitle.trim() ||
      formState.biography.trim() ||
      formState.email.trim() ||
      formState.linkedinProfile.trim() ||
      formState.githubProfile.trim() ||
      formState.twitterHandle.trim() ||
      formState.title.trim() ||
      formState.description.trim() ||
      formState.talkLength !== '25' ||
      formState.talkLevel !== 'intermediate' ||
      formState.topics.length > 0
    );
  }, [formState]);

  // Save form data to localStorage whenever it changes
  useEffect(() => {
    if (!hasLoadedFromStorage || formState.submitted) return;

    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }

    if (hasFormData()) {
      setIsAutoSaving(true);

      saveTimeoutRef.current = setTimeout(() => {
        try {
          const { speakerImage: _speakerImage, imagePreview: _imagePreview, ...dataToSave } = formState;
          void _speakerImage;
          void _imagePreview;
          const dataWithTimestamp = {
            ...dataToSave,
            lastSaved: new Date().toISOString(),
          };

          localStorage.setItem(STORAGE_KEY, JSON.stringify(dataWithTimestamp));
          setLastSaved(new Date());
        } catch (error) {
          console.error('Failed to save form data:', error);
        } finally {
          setIsAutoSaving(false);
        }
      }, 500);
    } else {
      localStorage.removeItem(STORAGE_KEY);
      setLastSaved(null);
      setIsAutoSaving(false);
    }

    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
    };
  }, [formState, hasLoadedFromStorage, hasFormData]);

  const handleInputChange = useCallback(
    (e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
      const { name, value } = e.target;
      setFormState(prev => ({ ...prev, [name]: value }));

      // Clear validation error for this field when user starts typing
      if (validationErrors[name as keyof ValidationErrors]) {
        setValidationErrors(prev => ({ ...prev, [name]: undefined }));
      }
    },
    [validationErrors]
  );

  const handleTopicChange = useCallback(
    (topic: string) => {
      const newTopics = formState.topics.includes(topic)
        ? formState.topics.filter(t => t !== topic)
        : [...formState.topics, topic];

      track('topic_selection', {
        action: formState.topics.includes(topic) ? 'deselect' : 'select',
        topic: topic,
      });

      setFormState(prev => ({ ...prev, topics: newTopics }));

      // Clear topics validation error if user selects at least one
      if (newTopics.length > 0 && validationErrors.topics) {
        setValidationErrors(prev => ({ ...prev, topics: undefined }));
      }
    },
    [formState.topics, track, validationErrors.topics]
  );

  const handleImageChange = useCallback(
    (e: ChangeEvent<HTMLInputElement>) => {
      if (e.target.files && e.target.files[0]) {
        const file = e.target.files[0];
        const previewUrl = URL.createObjectURL(file);

        track('image_upload', {
          fileSize: file.size,
          fileType: file.type,
        });

        setFormState(prev => ({
          ...prev,
          speakerImage: file,
          imagePreview: previewUrl,
        }));

        // Clear image validation error
        if (validationErrors.speakerImage) {
          setValidationErrors(prev => ({ ...prev, speakerImage: undefined }));
        }
      }
    },
    [track, validationErrors.speakerImage]
  );

  const clearStorage = useCallback(() => {
    localStorage.removeItem(STORAGE_KEY);
    setLastSaved(null);
  }, []);

  const generateEmailBody = useCallback(() => {
    const completedFields = [];
    const missingFields = [];

    if (formState.firstName.trim()) completedFields.push(`First Name: ${formState.firstName}`);
    else missingFields.push('First Name');

    if (formState.lastName.trim()) completedFields.push(`Last Name: ${formState.lastName}`);
    else missingFields.push('Last Name');

    if (formState.jobTitle.trim()) completedFields.push(`Job Title: ${formState.jobTitle}`);
    else missingFields.push('Job Title');

    if (formState.biography.trim()) completedFields.push(`Biography: ${formState.biography}`);
    else missingFields.push('Biography');

    if (formState.email.trim()) completedFields.push(`Email: ${formState.email}`);
    else missingFields.push('Email');

    if (formState.linkedinProfile.trim()) completedFields.push(`LinkedIn: ${formState.linkedinProfile}`);
    else missingFields.push('LinkedIn Profile');

    if (formState.githubProfile.trim()) completedFields.push(`GitHub: ${formState.githubProfile}`);
    if (formState.twitterHandle.trim()) completedFields.push(`Twitter: ${formState.twitterHandle}`);

    if (formState.title.trim()) completedFields.push(`Talk Title: ${formState.title}`);
    else missingFields.push('Talk Title');

    if (formState.description.trim()) completedFields.push(`Talk Description: ${formState.description}`);
    else missingFields.push('Talk Description');

    completedFields.push(`Talk Length: ${formState.talkLength} minutes`);
    completedFields.push(`Talk Level: ${formState.talkLevel}`);

    if (formState.topics.length > 0) completedFields.push(`Topics: ${formState.topics.join(', ')}`);
    else missingFields.push('Talk Topics');

    if (!formState.speakerImage) missingFields.push('Profile Image');

    const emailBody = `Subject: CFP Submission - ${formState.title || 'Talk Proposal'} - ${formState.firstName} ${formState.lastName}

Hi ZurichJS Team,

I'd like to submit my talk proposal for an upcoming meetup. I encountered some issues with the online form, so I'm sending my information via email as suggested.

=== COMPLETED INFORMATION ===
${completedFields.join('\n')}

=== STILL NEED TO PROVIDE ===
${missingFields.join('\n')}

${formState.speakerImage ? '\n(Profile image attached separately)' : ''}

Looking forward to potentially speaking at ZurichJS!

Best regards,
${formState.firstName} ${formState.lastName}`;

    return encodeURIComponent(emailBody);
  }, [formState]);

  return {
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
  };
}
