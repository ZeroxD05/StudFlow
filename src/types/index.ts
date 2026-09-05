export type QuickLink = {
  id: string;
  label: string;
  icon: keyof typeof import("@expo/vector-icons/build/Ionicons").default.glyphMap;
  url?: string;
};

export type GradeEntry = {
  id: string;
  course: string;
  topic: string;
  grade: string;
  date: string;
};

export type DirectMessage = {
  id: string;
  senderId?: string;
  sender: "me" | "match";
  text: string;
  timestamp: string;
  createdAt?: string;
  readByUserIds?: string[];
};

export type ScheduleItem = {
  id: string;
  day: string;
  time: string;
  course: string;
  room: string;
  type: "Vorlesung" | "Übung" | "Seminar" | "Labor";
  completed?: boolean;
};

export type BuddyProfile = {
  id: string;
  name: string;
  degree: string;
  semester: number;
  offers: string[];
  wants: string[];
  matchScore: number;
  avatarColor: string;
  campus: string;
  connected?: boolean;
  requestSent?: boolean;
};

export type JobListing = {
  id: string;
  title: string;
  company: string;
  type: "Werkstudent" | "Praktikum" | "Minijob";
  location: string;
  postedDaysAgo: number;
  tags: string[];
  saved?: boolean;
};

export type CommunityComment = {
  id: string;
  authorId?: string;
  author: string;
  text: string;
  timestamp: string;
  me?: boolean;
};

export type CommunityPost = {
  id: string;
  authorId?: string;
  author: string;
  avatarColor: string;
  content: string;
  course?: string;
  comments: number;
  commentsList?: CommunityComment[];
  timeAgo: string;
  threadName?: string;
  unread?: number;
  profileImage?: string | null;
};

export type CampusUser = {
  id: string;
  tenantId?: string;
  role?: "student" | "admin";
  name: string;
  email: string;
  internalEmail?: string;
  linkedEmail?: string;
  password: string;
  major: string;
  semester: number;
  bio: string;
  avatarColor: string;
  campus: string;
  profileImage?: string | null;
  username: string;
  friends?: string[];
  friendRequests?: string[];
  online?: boolean;
  showOnlineStatus?: boolean;
  notificationsMuted?: boolean;
  mutedChatThreadIds?: string[];
  scheduleRemindersEnabled?: boolean;
};

export type Tenant = {
  id: string;
  name: string;
  emailDomain?: string;
  adminEmail?: string;
};

export type UniversityNews = {
  id: string;
  tenantId: string;
  title: string;
  body: string;
  createdAt: string;
};
