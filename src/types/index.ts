export type AuthContextProps = {
  isLoading: boolean;
  isAuthenticated: boolean;
  token: string | null;
  user: { id: string; email: string; name: string } | null;
  setToken: (token: string | null) => void;
  setUser: (user: { id: string; email: string; name: string } | null) => void;
};

export type ProfileModel = {
  _id?: string;
  userId: string;
  name: string;
  location: string;
  age: number | null;
  lastSeen: string;
  videoUrl?: string;
  avatar?: string;
  sumary: string;
  intro: string;
  lifeStory: string;
  freeTime: string;
  other: string;
  accomplishments: string;
  education: string[];
  employment: string[];
  startup?: {
    name?: string;
    description?: string;
    progress?: string;
    funding?: string;
  };
  cofounderPreferences: {
    requirements: string[];
    idealPersonality: string;
    equity: string;
  };
  interests: {
    shared: string[];
    personal: string[];
  };
  linkedIn?: string;
  /** Approximate minutes since last activity; used for Last seen filter. */
  lastSeenMinutesApprox?: number | null;
  updatedAt?: string | Date;
  viewers?: Record<string, string | boolean>; // Support both old format (boolean) and new format (string: "good", "bad", "visited")
};

export type LastSeenWithinFilter =
  | ""
  | "1d"
  | "7d"
  | "15d"
  | "1m"
  | "2m"
  | "3m";

export type FilterModel = {
  name?: string;
  age?: number;
  location?: string;
  sumary?: string;
  startupName?: string;
  /** Show profiles whose last seen is within this window (more recent than the cutoff). */
  lastSeenWithin?: LastSeenWithinFilter;
  keyword?: string;
  technicalStatus?: "technical" | "non-technical" | "";
  profileStatus?: "yet" | "visited" | "sent" | "good" | "bad" | "";
  /** DD/M/YYYY (e.g. 15/4/2026) or YYYY-MM-DD — show profiles updated on or after that date (UTC midnight). */
  updatedDateFrom?: string;
  updatedDateTo?: string;
};
