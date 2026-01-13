import { useCallback } from 'react';

import { FormState, ValidationErrors } from '../types';

interface UseFormValidationReturn {
  validateForm: (formState: FormState) => ValidationErrors;
  validateField: (name: keyof ValidationErrors, value: string, formState?: FormState) => string | undefined;
  hasErrors: (errors: ValidationErrors) => boolean;
  getErrorCount: (errors: ValidationErrors) => number;
}

export function useFormValidation(): UseFormValidationReturn {
  const validateField = useCallback(
    (name: keyof ValidationErrors, value: string, formState?: FormState): string | undefined => {
      switch (name) {
        case 'firstName':
          if (!value.trim()) return 'First name is required';
          return undefined;

        case 'lastName':
          if (!value.trim()) return 'Last name is required';
          return undefined;

        case 'jobTitle':
          if (!value.trim()) return 'Job title is required';
          return undefined;

        case 'biography':
          if (!value.trim()) return 'Biography is required';
          return undefined;

        case 'email':
          if (!value.trim()) return 'Email is required';
          if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) return 'Please enter a valid email address';
          return undefined;

        case 'linkedinProfile':
          if (!value.trim()) return 'LinkedIn profile URL is required';
          if (!value.includes('linkedin.com')) return 'Please enter a valid LinkedIn profile URL';
          return undefined;

        case 'title':
          if (!value.trim()) return 'Talk title is required';
          return undefined;

        case 'description':
          if (!value.trim()) return 'Talk description is required';
          return undefined;

        case 'speakerImage':
          if (!formState?.speakerImage) return 'Profile image is required';
          return undefined;

        case 'topics':
          if (!formState?.topics.length) return 'Please select at least one topic';
          return undefined;

        default:
          return undefined;
      }
    },
    []
  );

  const validateForm = useCallback(
    (formState: FormState): ValidationErrors => {
      const errors: ValidationErrors = {};

      const firstNameError = validateField('firstName', formState.firstName);
      if (firstNameError) errors.firstName = firstNameError;

      const lastNameError = validateField('lastName', formState.lastName);
      if (lastNameError) errors.lastName = lastNameError;

      const jobTitleError = validateField('jobTitle', formState.jobTitle);
      if (jobTitleError) errors.jobTitle = jobTitleError;

      const biographyError = validateField('biography', formState.biography);
      if (biographyError) errors.biography = biographyError;

      const emailError = validateField('email', formState.email);
      if (emailError) errors.email = emailError;

      const linkedinError = validateField('linkedinProfile', formState.linkedinProfile);
      if (linkedinError) errors.linkedinProfile = linkedinError;

      const titleError = validateField('title', formState.title);
      if (titleError) errors.title = titleError;

      const descriptionError = validateField('description', formState.description);
      if (descriptionError) errors.description = descriptionError;

      const imageError = validateField('speakerImage', '', formState);
      if (imageError) errors.speakerImage = imageError;

      const topicsError = validateField('topics', '', formState);
      if (topicsError) errors.topics = topicsError;

      return errors;
    },
    [validateField]
  );

  const hasErrors = useCallback((errors: ValidationErrors): boolean => {
    return Object.values(errors).some(error => error !== undefined);
  }, []);

  const getErrorCount = useCallback((errors: ValidationErrors): number => {
    return Object.values(errors).filter(error => error !== undefined).length;
  }, []);

  return {
    validateForm,
    validateField,
    hasErrors,
    getErrorCount,
  };
}
