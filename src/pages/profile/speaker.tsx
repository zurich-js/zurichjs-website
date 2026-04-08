import { useUser } from '@clerk/nextjs';
import { ArrowLeft, Save, Upload } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { ChangeEvent, FormEvent, useEffect, useMemo, useState } from 'react';

import FormInput from '@/components/cfp/CFPForm/FormInput';
import Layout from '@/components/layout/Layout';
import Button from '@/components/ui/Button';

interface SpeakerProfileResponse {
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
  error?: string;
}

interface SpeakerProfileFormState {
  firstName: string;
  lastName: string;
  email: string;
  jobTitle: string;
  biography: string;
  linkedinProfile: string;
  githubProfile: string;
  twitterHandle: string;
  speakerImage: File | null;
  existingSpeakerImageUrl: string | null;
}

const initialState: SpeakerProfileFormState = {
  firstName: '',
  lastName: '',
  email: '',
  jobTitle: '',
  biography: '',
  linkedinProfile: '',
  githubProfile: '',
  twitterHandle: '',
  speakerImage: null,
  existingSpeakerImageUrl: null,
};

export default function SpeakerProfilePage() {
  const router = useRouter();
  const { user, isLoaded } = useUser();
  const [formState, setFormState] = useState<SpeakerProfileFormState>(initialState);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState('');
  const [missingFields, setMissingFields] = useState<string[]>([]);

  const returnTo = useMemo(() => {
    const queryValue = Array.isArray(router.query.returnTo) ? router.query.returnTo[0] : router.query.returnTo;
    return queryValue || '/cfp/form';
  }, [router.query.returnTo]);

  useEffect(() => {
    if (isLoaded && !user) {
      router.push('/');
    }
  }, [isLoaded, router, user]);

  useEffect(() => {
    if (!user) return;

    let isCancelled = false;

    const loadProfile = async () => {
      setIsLoading(true);

      try {
        const response = await fetch('/api/profile/speaker');
        const data = (await response.json()) as SpeakerProfileResponse;

        if (!response.ok) {
          throw new Error(data.error || 'Failed to load speaker profile');
        }

        if (isCancelled) return;

        setFormState({
          firstName: data.firstName,
          lastName: data.lastName,
          email: data.email,
          jobTitle: data.jobTitle,
          biography: data.biography,
          linkedinProfile: data.linkedinProfile,
          githubProfile: data.githubProfile,
          twitterHandle: data.twitterHandle,
          speakerImage: null,
          existingSpeakerImageUrl: data.existingSpeakerImageUrl,
        });
        setMissingFields(data.missingSpeakerFields);
      } catch (loadError) {
        console.error(loadError);
        if (!isCancelled) {
          setError(loadError instanceof Error ? loadError.message : 'Failed to load speaker profile');
        }
      } finally {
        if (!isCancelled) {
          setIsLoading(false);
        }
      }
    };

    void loadProfile();

    return () => {
      isCancelled = true;
    };
  }, [user]);

  const handleInputChange = (e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormState(prev => ({ ...prev, [name]: value }));
    setError('');
  };

  const handleImageChange = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setFormState(prev => ({ ...prev, speakerImage: file }));
    setImagePreview(URL.createObjectURL(file));
    setError('');
  };

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsSaving(true);
    setError('');

    try {
      const body = new FormData();

      body.append('firstName', formState.firstName);
      body.append('lastName', formState.lastName);
      body.append('jobTitle', formState.jobTitle);
      body.append('biography', formState.biography);
      body.append('linkedinProfile', formState.linkedinProfile);
      body.append('githubProfile', formState.githubProfile);
      body.append('twitterHandle', formState.twitterHandle);

      if (formState.speakerImage) {
        body.append('speakerImage', formState.speakerImage);
      }

      const response = await fetch('/api/profile/speaker', {
        method: 'POST',
        body,
      });

      const data = (await response.json()) as SpeakerProfileResponse & { error?: string };

      if (!response.ok) {
        throw new Error(data.error || 'Failed to save speaker profile');
      }

      setFormState(prev => ({
        ...prev,
        firstName: data.firstName,
        lastName: data.lastName,
        email: data.email,
        jobTitle: data.jobTitle,
        biography: data.biography,
        linkedinProfile: data.linkedinProfile,
        githubProfile: data.githubProfile,
        twitterHandle: data.twitterHandle,
        speakerImage: null,
        existingSpeakerImageUrl: data.existingSpeakerImageUrl,
      }));
      setImagePreview(null);
      setMissingFields(data.missingSpeakerFields);

      await router.push(returnTo);
    } catch (saveError) {
      console.error(saveError);
      setError(saveError instanceof Error ? saveError.message : 'Failed to save speaker profile');
    } finally {
      setIsSaving(false);
    }
  };

  if (!isLoaded || !user) {
    return (
      <Layout>
        <div className="w-full pt-20 pb-16 px-4 sm:px-6">
          <div className="max-w-3xl mx-auto text-center text-lg text-gray-600">Loading speaker profile...</div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="w-full pt-20 pb-16 px-4 sm:px-6">
        <div className="max-w-3xl mx-auto">
          <Link href={returnTo} className="inline-flex items-center gap-2 text-sm text-gray-600 hover:text-black mb-6">
            <ArrowLeft size={16} />
            Back to CFP form
          </Link>

          <div className="mb-8">
            <h1 className="text-4xl font-bold text-black mb-3">Speaker Profile</h1>
            <p className="text-lg text-gray-600">
              Update the speaker details we use to pre-fill CFP submissions and introduce you on ZurichJS.
            </p>
          </div>

          {missingFields.length > 0 && (
            <div className="mb-6 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
              Complete these missing fields before submitting a talk: {missingFields.join(', ')}.
            </div>
          )}

          {error && (
            <div className="mb-6 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800">{error}</div>
          )}

          <form onSubmit={handleSubmit} className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormInput
                label="First Name"
                name="firstName"
                value={formState.firstName}
                onChange={handleInputChange}
                required
              />
              <FormInput
                label="Last Name"
                name="lastName"
                value={formState.lastName}
                onChange={handleInputChange}
                required
              />
            </div>

            <FormInput
              label="Email"
              name="email"
              type="email"
              value={formState.email}
              onChange={handleInputChange}
              readOnly
              disabled
              helpText="Your speaker profile is linked to your ZurichJS account email."
            />

            <FormInput
              label="Job Title"
              name="jobTitle"
              value={formState.jobTitle}
              onChange={handleInputChange}
              placeholder="e.g. Senior Frontend Developer"
              required
            />

            <FormInput
              label="Biography"
              name="biography"
              value={formState.biography}
              onChange={handleInputChange}
              placeholder="Share your background, speaking experience, and what you love building."
              isTextarea
              rows={6}
              required
            />

            <FormInput
              label="LinkedIn Profile URL"
              name="linkedinProfile"
              type="url"
              value={formState.linkedinProfile}
              onChange={handleInputChange}
              placeholder="https://linkedin.com/in/your-profile"
              required
            />

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormInput
                label="GitHub Profile"
                name="githubProfile"
                value={formState.githubProfile}
                onChange={handleInputChange}
                placeholder="username"
                helpText="We store this as a GitHub profile URL."
              />
              <FormInput
                label="Twitter / X Handle"
                name="twitterHandle"
                value={formState.twitterHandle}
                onChange={handleInputChange}
                placeholder="@username"
                helpText="We store this as a Twitter profile URL."
              />
            </div>

            <div className="mt-4 mb-8">
              <label htmlFor="speakerImage" className="block text-gray-700 mb-2 font-medium">
                Profile Image <span className="text-red-500">*</span>
              </label>
              <div className="flex items-center gap-4">
                <label
                  htmlFor="speakerImage"
                  className="flex items-center gap-2 w-full px-4 py-3 border border-gray-300 rounded-lg cursor-pointer hover:bg-gray-50 transition-colors"
                >
                  <Upload size={18} />
                  <span className="truncate">{formState.speakerImage ? formState.speakerImage.name : 'Choose an image'}</span>
                  <input
                    type="file"
                    id="speakerImage"
                    name="speakerImage"
                    onChange={handleImageChange}
                    accept="image/*"
                    className="hidden"
                  />
                </label>

                {(imagePreview || formState.existingSpeakerImageUrl) && (
                  <div className="relative w-16 h-16 flex-shrink-0 overflow-hidden rounded-md border border-gray-200">
                    <Image
                      src={imagePreview || formState.existingSpeakerImageUrl || ''}
                      alt="Speaker profile preview"
                      fill
                      unoptimized
                      className="object-cover"
                    />
                  </div>
                )}
              </div>
              <p className="text-xs text-gray-500 mt-2">
                Recommended: square image, at least 400x400px. Uploading a new image replaces your existing one.
              </p>
            </div>

            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <Button href={returnTo} variant="outline" size="lg" className="w-full sm:w-auto">
                Back to CFP
              </Button>
              <Button type="submit" variant="primary" size="lg" disabled={isSaving || isLoading} className="w-full sm:w-auto">
                {isSaving ? (
                  <>
                    <Save size={18} className="mr-2" />
                    Saving...
                  </>
                ) : (
                  'Save Speaker Profile'
                )}
              </Button>
            </div>
          </form>
        </div>
      </div>
    </Layout>
  );
}
