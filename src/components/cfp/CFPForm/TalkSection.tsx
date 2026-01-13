import { ChangeEvent } from 'react';

import { FormState, ValidationErrors } from '../types';

import FormInput from './FormInput';

interface TalkSectionProps {
  formState: FormState;
  validationErrors: ValidationErrors;
  onInputChange: (e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => void;
  showDeepDiveOption: boolean;
}

export default function TalkSection({
  formState,
  validationErrors,
  onInputChange,
  showDeepDiveOption,
}: TalkSectionProps) {
  return (
    <div className="mb-8">
      <div className="flex items-center mb-4">
        <div className="flex items-center justify-center w-10 h-10 bg-js rounded-full text-black font-bold mr-4 shadow-sm">
          2
        </div>
        <h3 className="text-xl font-bold">Talk Details</h3>
      </div>
      <p className="text-gray-600 mb-6 ml-14">Share the details of your talk proposal with us.</p>

      <FormInput
        label="Talk Title"
        name="title"
        value={formState.title}
        onChange={onInputChange}
        error={validationErrors.title}
        required
      />

      <FormInput
        label="Talk Description"
        name="description"
        value={formState.description}
        onChange={onInputChange}
        error={validationErrors.description}
        placeholder="Describe your talk, key takeaways, and what the audience will learn. Include any demos or examples you'll show..."
        isTextarea
        rows={5}
        required
      />

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="mb-4">
          <label htmlFor="talkLength" className="block text-gray-700 mb-2 font-medium">
            Talk Length <span className="text-red-500">*</span>
          </label>
          <select
            id="talkLength"
            name="talkLength"
            value={formState.talkLength}
            onChange={onInputChange}
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-js hover:border-gray-400 transition-all"
          >
            <option value="5">Lightning Talk (5 min)</option>
            <option value="25">Standard Talk (25 min)</option>
            {showDeepDiveOption && <option value="35">Deep Dive (35 min)</option>}
          </select>
        </div>

        <div className="mb-4">
          <label htmlFor="talkLevel" className="block text-gray-700 mb-2 font-medium">
            Talk Level <span className="text-red-500">*</span>
          </label>
          <select
            id="talkLevel"
            name="talkLevel"
            value={formState.talkLevel}
            onChange={onInputChange}
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-js hover:border-gray-400 transition-all"
          >
            <option value="beginner">Beginner-friendly</option>
            <option value="intermediate">Intermediate</option>
            <option value="advanced">Advanced</option>
          </select>
        </div>
      </div>
    </div>
  );
}
