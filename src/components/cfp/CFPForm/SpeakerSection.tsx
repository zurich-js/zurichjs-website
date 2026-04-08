import { Disclosure, DisclosureButton, DisclosurePanel } from '@headlessui/react';
import { AlertTriangle, ArrowRight, Upload } from 'lucide-react';
import Image from 'next/image';
import { ChangeEvent, ReactNode } from 'react';

import Button from '@/components/ui/Button';

import { FormState, ValidationErrors } from '../types';

import FormInput from './FormInput';

interface SpeakerSectionProps {
  formState: FormState;
  validationErrors: ValidationErrors;
  onInputChange: (e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => void;
  onImageChange: (e: ChangeEvent<HTMLInputElement>) => void;
  isSignedIn: boolean;
  editProfileHref: string;
  signInCta: ReactNode;
}

function SpeakerOverviewRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="py-3 border-b border-gray-100 last:border-b-0">
      <div className="text-sm font-medium text-gray-500 mb-1">{label}</div>
      <div className="text-gray-900 whitespace-pre-line break-words">{value || 'Not set yet'}</div>
    </div>
  );
}

export default function SpeakerSection({
  formState,
  validationErrors,
  onInputChange,
  onImageChange,
  isSignedIn,
  editProfileHref,
  signInCta,
}: SpeakerSectionProps) {
  const fullName = `${formState.firstName} ${formState.lastName}`.trim();

  return (
    <div className="mb-8">
      <div className="flex items-center mb-4">
        <div className="flex items-center justify-center w-10 h-10 bg-js rounded-full text-black font-bold mr-4 shadow-sm">
          1
        </div>
        <h3 className="text-xl font-bold">Speaker Information</h3>
      </div>

      <p className="text-gray-600 mb-6">
        {isSignedIn
          ? 'We will use your saved speaker profile details for this submission.'
          : 'Tell us about yourself so we can introduce you properly.'}
      </p>

      {!isSignedIn && (
        <div className="mb-6 rounded-xl border border-gray-200 bg-white p-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h4 className="text-base font-semibold text-gray-900">Already have an account?</h4>
              <p className="text-sm text-gray-600">
                Sign in to pre-fill your speaker information and continue from your saved profile.
              </p>
            </div>
            {signInCta}
          </div>
        </div>
      )}

      {isSignedIn ? (
        <Disclosure as="div" defaultOpen={formState.missingSpeakerFields.length > 0}>
          {({ open }) => (
            <div className="rounded-2xl border border-gray-200 bg-white shadow-sm overflow-hidden">
              <DisclosureButton className="w-full p-5 text-left hover:bg-gray-50 transition-colors">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex items-start gap-4">
                    {(formState.imagePreview || formState.existingSpeakerImageUrl) && (
                      <div className="relative w-16 h-16 flex-shrink-0 overflow-hidden rounded-full border border-gray-200 bg-gray-50">
                        <Image
                          src={formState.imagePreview || formState.existingSpeakerImageUrl || ''}
                          alt="Speaker profile"
                          fill
                          unoptimized
                          className="object-cover"
                        />
                      </div>
                    )}
                    <div>
                      <h4 className="text-lg font-semibold text-gray-900">{fullName || 'Your speaker profile'}</h4>
                      <p className="text-sm text-gray-500 mt-2">
                        {formState.jobTitle || 'Job title not set'} {formState.email ? `• ${formState.email}` : ''}
                      </p>
                    </div>
                  </div>

                  <div className="text-sm font-medium text-gray-700">
                    {open ? 'Collapse' : 'Expand'}
                  </div>
                </div>
              </DisclosureButton>

              <DisclosurePanel className="px-5 pb-5 border-t border-gray-100">
                <div className="flex flex-col gap-4 pt-5 sm:flex-row sm:items-start sm:justify-between">
                  <p className="text-sm text-gray-600">
                    Update your speaker profile if anything needs to change before you submit.
                  </p>

                  <Button href={editProfileHref} variant="outline" size="sm" className="w-full sm:w-auto">
                    Edit&nbsp;Profile&nbsp;Information
                    <ArrowRight size={16} className="ml-2" />
                  </Button>
                </div>

                {formState.missingSpeakerFields.length > 0 && (
                  <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
                    <div className="flex items-start gap-2">
                      <AlertTriangle size={16} className="mt-0.5 flex-shrink-0" />
                      <span>
                        Missing required speaker details: {formState.missingSpeakerFields.join(', ')}. Update your speaker profile before submitting.
                      </span>
                    </div>
                  </div>
                )}

                <div className="mt-5">
                  <SpeakerOverviewRow label="Biography" value={formState.biography} />
                  <SpeakerOverviewRow label="LinkedIn" value={formState.linkedinProfile} />
                  <SpeakerOverviewRow label="GitHub" value={formState.githubProfile} />
                  <SpeakerOverviewRow label="Twitter / X" value={formState.twitterHandle} />
                </div>
              </DisclosurePanel>
            </div>
          )}
        </Disclosure>
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <FormInput
              label="First Name"
              name="firstName"
              value={formState.firstName}
              onChange={onInputChange}
              error={validationErrors.firstName}
              required
            />
            <FormInput
              label="Last Name"
              name="lastName"
              value={formState.lastName}
              onChange={onInputChange}
              error={validationErrors.lastName}
              required
            />
          </div>

          <FormInput
            label="Job Title"
            name="jobTitle"
            value={formState.jobTitle}
            onChange={onInputChange}
            error={validationErrors.jobTitle}
            placeholder="e.g. Senior Frontend Developer, Tech Lead, Product Manager"
            required
          />

          <FormInput
            label="Biography"
            name="biography"
            value={formState.biography}
            onChange={onInputChange}
            error={validationErrors.biography}
            placeholder="Share your background, experience with JavaScript, connection to Zurich, or what motivates you to speak..."
            isTextarea
            rows={5}
            required
          />

          <FormInput
            label="Email"
            name="email"
            type="email"
            value={formState.email}
            onChange={onInputChange}
            error={validationErrors.email}
            required
          />

          <FormInput
            label="LinkedIn Profile URL"
            name="linkedinProfile"
            type="url"
            value={formState.linkedinProfile}
            onChange={onInputChange}
            error={validationErrors.linkedinProfile}
            placeholder="https://linkedin.com/in/your-profile"
            required
          />

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FormInput
              label="GitHub Profile (optional)"
              name="githubProfile"
              value={formState.githubProfile}
              onChange={onInputChange}
              placeholder="username"
            />
            <FormInput
              label="Twitter Handle (optional)"
              name="twitterHandle"
              value={formState.twitterHandle}
              onChange={onInputChange}
              placeholder="@username"
            />
          </div>

          <div className="mb-6 mt-4">
            <label htmlFor="speakerImage" className="block text-gray-700 mb-2 font-medium">
              Profile Image <span className="text-red-500">*</span>
            </label>
            <div className="flex items-center">
              <div className="flex-1">
                <label
                  htmlFor="speakerImage"
                  className={`flex items-center gap-2 w-full px-4 py-3 border rounded-lg cursor-pointer hover:bg-gray-50 transition-colors ${
                    validationErrors.speakerImage ? 'border-red-500 bg-red-50' : 'border-gray-300'
                  }`}
                >
                  <Upload size={18} />
                  <span className="truncate">
                    {formState.speakerImage ? formState.speakerImage.name : 'Choose an image'}
                  </span>
                  <input
                    type="file"
                    id="speakerImage"
                    name="speakerImage"
                    onChange={onImageChange}
                    accept="image/*"
                    className="hidden"
                  />
                </label>
              </div>

              {(formState.imagePreview || formState.existingSpeakerImageUrl) && (
                <div className="ml-4 w-16 h-16 relative flex-shrink-0">
                  <Image
                    src={formState.imagePreview || formState.existingSpeakerImageUrl || ''}
                    alt="Profile preview"
                    fill
                    unoptimized
                    className="object-cover rounded-md"
                  />
                </div>
              )}
            </div>
            {validationErrors.speakerImage && (
              <p className="mt-1 text-sm text-red-600">{validationErrors.speakerImage}</p>
            )}
            <p className="text-xs text-gray-500 mt-1">Recommended: Square image, at least 400x400px</p>
          </div>
        </>
      )}
    </div>
  );
}
