export interface FormState {
  firstName: string;
  lastName: string;
  jobTitle: string;
  biography: string;
  email: string;
  linkedinProfile: string;
  githubProfile: string;
  twitterHandle: string;
  speakerImage: File | null;
  title: string;
  description: string;
  talkLength: string;
  talkLevel: 'beginner' | 'intermediate' | 'advanced';
  topics: string[];
  submitted: boolean;
  isSubmitting: boolean;
  error: string;
  imagePreview: string | null;
}

export interface ValidationErrors {
  firstName?: string;
  lastName?: string;
  jobTitle?: string;
  biography?: string;
  email?: string;
  linkedinProfile?: string;
  title?: string;
  description?: string;
  speakerImage?: string;
  topics?: string;
}

export interface TalkSubmissionStats {
  recentSubmissions: number;
  pendingSubmissions: number;
}

export const initialFormState: FormState = {
  firstName: '',
  lastName: '',
  jobTitle: '',
  biography: '',
  email: '',
  linkedinProfile: '',
  githubProfile: '',
  twitterHandle: '',
  speakerImage: null,
  title: '',
  description: '',
  talkLength: '25',
  talkLevel: 'intermediate',
  topics: [],
  submitted: false,
  isSubmitting: false,
  error: '',
  imagePreview: null,
};
