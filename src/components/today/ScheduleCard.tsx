import Link from 'next/link';

import { Event } from '@/sanity/queries';

interface ScheduleCardProps {
  event: Event;
}

interface ScheduleItem {
  time: string;
  title: string;
  type: string;
  durationMins: number;
  speaker?: string;
  speakerIds?: string[];
}

export default function ScheduleCard({ event }: ScheduleCardProps) {
  const getTypeColor = (type?: string, durationMins?: number) => {
    if (durationMins && durationMins < 10) {
      return 'bg-gradient-to-r from-orange-100 to-red-100 text-orange-800';
    }
    switch (type?.toLowerCase()) {
      case 'talk':
      case 'presentation':
        return 'bg-gradient-to-r from-blue-100 to-indigo-100 text-blue-800';
      case 'break':
      case 'networking':
        return 'bg-gradient-to-r from-green-100 to-emerald-100 text-green-800';
      case 'welcome':
      case 'opening':
        return 'bg-gradient-to-r from-js/20 to-yellow-100 text-yellow-900';
      case 'closing':
      case 'wrap-up':
        return 'bg-gradient-to-r from-purple-100 to-pink-100 text-purple-800';
      default:
        return 'bg-gradient-to-r from-gray-100 to-slate-100 text-gray-800';
    }
  };

  const getTypeEmoji = (type?: string, durationMins?: number) => {
    if (durationMins && durationMins < 10) return '⚡';
    switch (type?.toLowerCase()) {
      case 'talk':
      case 'presentation': return '🎤';
      case 'break':
      case 'networking': return '☕';
      case 'welcome':
      case 'opening': return '👋';
      case 'closing':
      case 'wrap-up': return '🎉';
      default: return '📋';
    }
  };

  // Create schedule from event data with proper timing
  const eventDate = new Date(event.datetime);
  
  // Doors open: 17:30-18:30
  const doorsOpenTime = new Date(eventDate);
  doorsOpenTime.setHours(17, 30, 0, 0);
  
  // Welcome & intro: 18:30-18:45
  const welcomeTime = new Date(eventDate);
  welcomeTime.setHours(18, 30, 0, 0);
  
  // First talk starts at 18:50
  const firstTalkTime = new Date(eventDate);
  firstTalkTime.setHours(18, 50, 0, 0);

  const baseSchedule: ScheduleItem[] = [
    {
      time: doorsOpenTime.toLocaleTimeString('en-US', { 
        hour: '2-digit', 
        minute: '2-digit',
        hour12: false 
      }),
      title: "Doors Open",
      type: "welcome",
      durationMins: 60,
      speaker: undefined
    },
    {
      time: welcomeTime.toLocaleTimeString('en-US', { 
        hour: '2-digit', 
        minute: '2-digit',
        hour12: false 
      }),
      title: "Welcome & Intro",
      type: "opening",
      durationMins: 15,
      speaker: undefined
    }
  ];

  // Add talks from Sanity data with proper timing and break logic
  let currentTime = firstTalkTime.getTime();
  const talksSchedule: ScheduleItem[] = [];
  
  event.talks.forEach((talk, index) => {
    const talkTime = new Date(currentTime);
    const duration = talk.durationMinutes || 20;
    
    const scheduleItem: ScheduleItem = {
      time: talkTime.toLocaleTimeString('en-US', { 
        hour: '2-digit', 
        minute: '2-digit',
        hour12: false 
      }),
      title: talk.title,
      speaker: talk.speakers.map(s => s.name).join(', '),
      speakerIds: talk.speakers.map(s => s.id),
      type: talk.type || 'talk',
      durationMins: duration
    };
    
    talksSchedule.push(scheduleItem);
    currentTime += duration * 60000; // Add talk duration
    
    // Add 15 min break after 2 talks (index 1 means 2nd talk, 0-indexed)
    if (index === 1) {
      const breakTime = new Date(currentTime);
      talksSchedule.push({
        time: breakTime.toLocaleTimeString('en-US', { 
          hour: '2-digit', 
          minute: '2-digit',
          hour12: false 
        }),
        title: "Pizza Break",
        type: "break",
        durationMins: 15,
        speaker: undefined
      });
      currentTime += 15 * 60000; // Add break duration
    } else if (index < event.talks.length - 1) {
      // Add 5 min buffer between other talks
      currentTime += 5 * 60000;
    }
  });

  // Add networking at the end - starts after last talk, ends at 21:30
  const networkingStartTime = new Date(currentTime + 5 * 60000); // 5 min buffer after last talk
  const networkingEndTime = new Date(eventDate);
  networkingEndTime.setHours(21, 30, 0, 0);
  
  // Calculate networking duration from start time to 21:30
  const networkingDuration = Math.max(30, Math.round((networkingEndTime.getTime() - networkingStartTime.getTime()) / 60000));
  
  const endSchedule: ScheduleItem[] = [{
    time: networkingStartTime.toLocaleTimeString('en-US', { 
      hour: '2-digit', 
      minute: '2-digit',
      hour12: false 
    }),
    title: "Networking & Drinks",
    type: "closing",
    durationMins: networkingDuration,
    speaker: undefined
  }];

  const schedule = [...baseSchedule, ...talksSchedule, ...endSchedule];

  return (
    <div className="space-y-3">
      <h2 className="text-lg font-black text-gray-900">Schedule</h2>
      <p className="text-xs text-gray-500 italic">Times are estimates and subject to change</p>
      
      <div className="space-y-2">
        {schedule.map((item, index) => (
          <div
            key={index}
            className="bg-white rounded-2xl border border-gray-100 hover:border-gray-200 transition-all duration-200 shadow-lg hover:shadow-xl p-3"
          >
            <div className="flex items-center gap-3">
              {/* Time Badge */}
              <div className="bg-black text-js px-2 py-1 rounded-lg text-sm font-bold min-w-[50px] text-center flex-shrink-0">
                {item.time}
              </div>
              
              {/* Type Badge */}
              <div className={`px-2 py-1 rounded-lg text-xs font-semibold flex-shrink-0 ${getTypeColor(item.type, item.durationMins)}`}>
                {getTypeEmoji(item.type, item.durationMins)} {item.type || 'Event'}
              </div>
              
              {/* Content */}
              <div className="flex-1 min-w-0">
                <h3 className="font-bold text-gray-900 text-sm leading-tight">
                  {item.title}
                </h3>
                
                {item.speaker && (
                  <div className="text-xs text-gray-600 mt-1">
                    {item.speakerIds && item.speakerIds.length > 0 ? (
                      <div className="flex flex-wrap gap-1">
                        {item.speakerIds.map((speakerId, speakerIndex) => {
                          const speakerName = item.speaker!.split(', ')[speakerIndex];
                          return (
                            <Link 
                              key={speakerId}
                              href={`/speakers/${speakerId}`}
                              className="text-zurich font-bold hover:text-zurich/80 transition-colors underline"
                            >
                              {speakerName}
                            </Link>
                          );
                        })}
                      </div>
                    ) : (
                      <span className="text-zurich font-bold">{item.speaker}</span>
                    )}
                  </div>
                )}
              </div>
              
              {/* Duration */}
              {item.durationMins && (
                <div className="text-xs text-gray-500 font-medium flex-shrink-0">
                  {item.durationMins}m
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}