import { Tag } from 'lucide-react';

import { TALK_TOPICS } from '../constants';

interface TopicSelectorProps {
  selectedTopics: string[];
  onTopicChange: (topic: string) => void;
  error?: string;
}

export default function TopicSelector({ selectedTopics, onTopicChange, error }: TopicSelectorProps) {
  return (
    <div className="mb-8">
      <div className="flex items-center mb-4">
        <div className="flex items-center justify-center w-10 h-10 bg-js rounded-full text-black font-bold mr-4 shadow-sm">
          3
        </div>
        <label className="text-xl font-bold">Meetup Talk Topics *</label>
      </div>
      <p className="text-gray-600 mb-4 ml-14">
        Select the topics that best describe your meetup talk. Choose multiple if relevant.
      </p>
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2 sm:gap-3">
        {TALK_TOPICS.map(topic => (
          <button
            key={topic}
            type="button"
            onClick={() => onTopicChange(topic)}
            className={`
              flex items-center justify-center px-3 py-3
              rounded-lg text-sm font-medium
              transition-all transform active:scale-95
              min-h-[52px] text-center
              ${
                selectedTopics.includes(topic)
                  ? 'bg-js text-black shadow-md ring-2 ring-js ring-offset-2'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }
            `}
          >
            <Tag size={14} className="mr-1.5 flex-shrink-0" />
            <span className="leading-tight">{topic}</span>
          </button>
        ))}
      </div>
      {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
    </div>
  );
}
