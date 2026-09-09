import Link from "next/link";

import { Event } from "@/sanity/queries";

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
    if (durationMins && durationMins <= 10) {
      return "bg-gray-500 text-white";
    }
    switch (type?.toLowerCase()) {
      case "talk":
      case "presentation":
        return "bg-black text-white";
      case "break":
      case "networking":
        return "bg-green-100 text-green-800";
      case "welcome":
      case "opening":
        return "bg-js/20 text-js-darker";
      case "closing":
      case "wrap-up":
        return "bg-gradient-to-r from-purple-100 to-pink-100 text-purple-800";
      default:
        return "bg-gradient-to-r from-black to-gray-800 text-white";
    }
  };

  // Keep the existing estimated meetup timings until the final timetable is confirmed.
  // Use minutes in Zurich local time so server and browser timezones agree.
  const formatTime = (minutes: number) =>
    `${Math.floor(minutes / 60)
      .toString()
      .padStart(2, "0")}:${(minutes % 60).toString().padStart(2, "0")}`;
  const doorsTime = new Date(event.datetime).toLocaleTimeString("en-GB", {
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Europe/Zurich",
  });
  const [doorsHour, doorsMinute] = doorsTime.split(":").map(Number);
  const schedule: ScheduleItem[] = [
    {
      time: doorsTime,
      title: "Doors open & early conference badge pickup",
      type: "welcome",
      durationMins: Math.max(0, 18 * 60 + 30 - (doorsHour * 60 + doorsMinute)),
    },
    { time: "18:30", title: "Welcome & Intro", type: "opening", durationMins: 15 },
  ];

  let currentTime = 18 * 60 + 50;
  event.talks.forEach((talk, index) => {
    const duration = talk.durationMinutes || 20;
    schedule.push({
      time: formatTime(currentTime),
      title: talk.title,
      speaker: talk.speakers.map((speaker) => speaker.name.trim()).join(", "),
      speakerIds: talk.speakers.map((speaker) => speaker.id),
      type: talk.type || "talk",
      durationMins: duration,
    });
    currentTime += duration;
    if (index === 1 && index < event.talks.length - 1) {
      schedule.push({
        time: formatTime(currentTime),
        title: "Pizza Break",
        type: "break",
        durationMins: 15,
      });
      currentTime += 15;
    } else if (index < event.talks.length - 1) {
      currentTime += 5;
    }
  });
  currentTime += 5;
  schedule.push({
    time: formatTime(currentTime),
    title: "Networking & Drinks",
    type: "closing",
    durationMins: Math.max(0, 21 * 60 + 30 - currentTime),
  });

  return (
    <div className="space-y-3">
      <h2 className="text-xl font-bold text-gray-900">Schedule</h2>
      <p className="text-xs sm:text-sm text-gray-500 italic">
        Times are estimates and subject to change
      </p>

      <div className="space-y-2">
        {schedule.map((item, index) => (
          <div key={index} className="bg-gray-100 rounded-xl sm:rounded-2xl p-2.5 sm:p-3">
            {/* Mobile optimized layout */}
            <div className="space-y-2">
              {/* Time, Type and Duration Row */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  {/* Time Badge */}
                  {item.time && (
                    <div
                      className={`px-2 py-1 rounded-md text-xs font-bold min-w-[45px] text-center flex-shrink-0 ${getTypeColor(item.type, item.durationMins)}`}
                    >
                      {item.time}
                    </div>
                  )}
                </div>

                {/* Duration */}
                {item.durationMins > 0 && (
                  <div className="text-xs text-gray-500 font-medium">{item.durationMins}m</div>
                )}
              </div>

              {/* Content Row */}
              <div>
                <h3 className="font-bold text-gray-900 text-sm leading-tight">{item.title}</h3>

                {item.speaker && (
                  <div className="text-xs text-gray-600 mt-1">
                    {item.speakerIds && item.speakerIds.length > 0 ? (
                      <div className="flex flex-wrap gap-1">
                        {item.speakerIds.map((speakerId, speakerIndex) => {
                          const speakerName = item.speaker!.split(", ")[speakerIndex];
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
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
