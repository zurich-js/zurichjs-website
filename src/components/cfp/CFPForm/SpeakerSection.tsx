import { Upload } from 'lucide-react';
import { ChangeEvent } from 'react';

import { FormState, ValidationErrors } from '../types';

import FormInput from './FormInput';

interface SpeakerSectionProps {
  formState: FormState;
  validationErrors: ValidationErrors;
  onInputChange: (e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => void;
  onImageChange: (e: ChangeEvent<HTMLInputElement>) => void;
}

export default function SpeakerSection({
  formState,
  validationErrors,
  onInputChange,
  onImageChange,
}: SpeakerSectionProps) {
  return (
    <div className="mb-8">
      <div className="flex items-center mb-4">
        <div className="flex items-center justify-center w-10 h-10 bg-js rounded-full text-black font-bold mr-4 shadow-sm">
          1
        </div>
        <h3 className="text-xl font-bold">Speaker Information</h3>
      </div>
      <p className="text-gray-600 mb-6 ml-14">
        Tell us about yourself so we can introduce you properly.
      </p>

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

          {formState.imagePreview && (
            <div className="ml-4 w-16 h-16 relative flex-shrink-0">
              <img
                src={formState.imagePreview}
                alt="Profile preview"
                className="w-full h-full object-cover rounded-md"
              />
            </div>
          )}
        </div>
        {validationErrors.speakerImage && (
          <p className="mt-1 text-sm text-red-600">{validationErrors.speakerImage}</p>
        )}
        <p className="text-xs text-gray-500 mt-1">Recommended: Square image, at least 400x400px</p>
      </div>
    </div>
  );
}
