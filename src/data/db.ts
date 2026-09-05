import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Crypto from "expo-crypto";
import { useEffect, useState } from "react";
import { io, Socket } from "socket.io-client";
import { BuddyProfile, CommunityPost, DirectMessage, GradeEntry, JobListing, QuickLink, ScheduleItem } from "@/types";

export type CampusUser = {
  id: string;
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

export type CampusDB = {
  currentUserId: string | null;
  users: CampusUser[];
  quickLinks: QuickLink[];
  todaySchedule: ScheduleItem[];
  scheduleByUserId: Record<string, ScheduleItem[]>;
  scheduleImage?: string | null;
  buddyProfiles: BuddyProfile[];
  jobListings: JobListing[];
  communityPosts: CommunityPost[];
  gradeEntries: GradeEntry[];
  directMessages: Record<string, DirectMessage[]>;
};

const STORAGE_KEY = "studflow-db";
const SESSION_KEY = "studflow-session-user-id-v2";
const SERVER_URL = process.env.EXPO_PUBLIC_API_URL || "http://localhost:3001";

const defaultUser: CampusUser = {
  id: "demo-user",
  name: "Ata",
  email: "ata2005hh@gmail.com",
  internalEmail: "ata@study2buddy.de",
  linkedEmail: "ata2005hh@gmail.com",
  password: "Atailayda05",
  major: "Informatik",
  semester: 4,
  bio: "Frontend- und App-Entwicklerin mit Fokus auf UX und Lernplattformen.",
  avatarColor: "#7C6CFF",
  campus: "Campus Nord",
  profileImage: null,
  username: "ata",
  friends: [],
  showOnlineStatus: true,
};

const defaultQuickLinks: QuickLink[] = [
  { id: "moodle", label: "Moodle", icon: "book-outline", url: "https://moodle.org/" },
  { id: "campus", label: "Campus-Portal", icon: "school-outline", url: "https://www.studieren-in-hamburg.de/" },
  { id: "mail", label: "Uni-Mail", icon: "mail-outline", url: "https://mail.google.com/" },
  { id: "library", label: "Bibliothek", icon: "library-outline", url: "https://www.google.com/search?q=Universit%C3%A4tsbibliothek" },
  { id: "cafeteria", label: "Mensaplan", icon: "restaurant-outline", url: "https://www.google.com/search?q=Mensaplan+Universit%C3%A4t" },
  { id: "grades", label: "Noten", icon: "stats-chart-outline", url: "https://www.google.com/search?q=Noten+Universit%C3%A4t" },
];

const defaultSchedule: ScheduleItem[] = [];

const defaultBuddyProfiles: BuddyProfile[] = [];

const defaultJobListings: JobListing[] = [];

const defaultCommunityPosts: CommunityPost[] = [];

const defaultGradeEntries: GradeEntry[] = [];

const defaultDirectMessages: Record<string, DirectMessage[]> = {};

export const createDefaultDB = (): CampusDB => ({
  currentUserId: null,
  users: [defaultUser],
  quickLinks: defaultQuickLinks,
  todaySchedule: defaultSchedule,
  scheduleByUserId: {},
  scheduleImage: null,
  buddyProfiles: defaultBuddyProfiles,
  jobListings: defaultJobListings,
  communityPosts: defaultCommunityPosts,
  gradeEntries: defaultGradeEntries,
  directMessages: defaultDirectMessages,
});

let dbState: CampusDB = createDefaultDB();
let localSessionUserId: string | null = null;
const listeners = new Set<() => void>();
let serverSocket: Socket | null = null;

function withUserSchedule(state: CampusDB, userId: string | null): CampusDB {
  const scheduleByUserId = state.scheduleByUserId ?? {};
  if (userId && !scheduleByUserId[userId] && state.todaySchedule.length > 0 && Object.keys(scheduleByUserId).length === 0) {
    scheduleByUserId[userId] = state.todaySchedule;
  }

  return {
    ...state,
    scheduleByUserId,
    todaySchedule: userId ? scheduleByUserId[userId] ?? [] : [],
  };
}

const clone = <T,>(value: T): T => JSON.parse(JSON.stringify(value));
const hashPassword = (password: string) => Crypto.digestStringAsync(Crypto.CryptoDigestAlgorithm.SHA256, password);

function ensureSocket() {
  if (!serverSocket) {
    serverSocket = io(SERVER_URL, {
      transports: ["websocket", "polling"],
      reconnection: true,
      reconnectionAttempts: 10,
    });

    serverSocket.on("db:update", (nextState: CampusDB) => {
      dbState = withUserSchedule({ ...nextState, currentUserId: localSessionUserId }, localSessionUserId);
      listeners.forEach((listener) => listener());
    });

    serverSocket.on("connect", () => {
      serverSocket?.emit("presence:identify", dbState.currentUserId);
      void hydrateFromServer();
    });
  }

  return serverSocket;
}

async function hydrateFromServer(): Promise<CampusDB | null> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 3000);

  try {
    const response = await fetch(`${SERVER_URL}/api/db`, { signal: controller.signal });
    if (!response.ok) {
      return null;
    }

    const parsed = (await response.json()) as CampusDB;
    dbState = withUserSchedule({ ...createDefaultDB(), ...parsed, users: parsed.users ?? createDefaultDB().users, currentUserId: localSessionUserId }, localSessionUserId);
    listeners.forEach((listener) => listener());
    ensureSocket();
    return dbState;
  } catch {
    return null;
  } finally {
    clearTimeout(timeout);
  }
}

export async function hydrateDb(): Promise<CampusDB> {
  localSessionUserId = await AsyncStorage.getItem(SESSION_KEY);
  const serverState = await hydrateFromServer();
  if (serverState) {
    return serverState;
  }

  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    if (!raw) {
      dbState = withUserSchedule({ ...createDefaultDB(), currentUserId: localSessionUserId }, localSessionUserId);
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(dbState));
      return dbState;
    }

    const parsed = JSON.parse(raw) as CampusDB;
    dbState = withUserSchedule({ ...createDefaultDB(), ...parsed, users: parsed.users ?? createDefaultDB().users, currentUserId: localSessionUserId }, localSessionUserId);
    listeners.forEach((listener) => listener());
    return dbState;
  } catch (error) {
    dbState = createDefaultDB();
    return dbState;
  }
}

const forbiddenWords = ["bitch", "arsch", "fick", "hure", "idiot", "scheisse", "shit"];

const sanitizeUsername = (value: string) => {
  const base = value
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]/g, "")
    .slice(0, 16);

  return base || "student";
};

export function generateUsernameFromName(name: string) {
  const normalized = sanitizeUsername(name);
  if (forbiddenWords.some((word) => normalized.includes(word))) {
    return "student";
  }

  return normalized;
}

export function buildStudyEmail(username: string) {
  return `${username}@study2buddy.de`;
}

export function isUniversityEmail(email: string) {
  const normalized = email.trim().toLowerCase();
  return /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(normalized) && !normalized.endsWith("@study2buddy.de");
}

function ensureUniqueUsername(baseName: string, excludeUserId?: string) {
  const base = sanitizeUsername(baseName) || "student";
  let candidate = base;
  let suffix = 1;

  while (
    dbState.users.some(
      (user) => user.id !== excludeUserId && user.username.toLowerCase() === candidate.toLowerCase()
    )
  ) {
    candidate = `${base}${suffix}`;
    suffix += 1;
  }

  return candidate;
}

function ensureUniqueStudyEmail(username: string, excludeUserId?: string) {
  const base = buildStudyEmail(username);
  let candidate = base;
  let suffix = 1;

  while (
    dbState.users.some((user) => {
      if (user.id === excludeUserId) {
        return false;
      }

      return (
        user.email.toLowerCase() === candidate.toLowerCase() ||
        (user.internalEmail ?? user.email).toLowerCase() === candidate.toLowerCase()
      );
    })
  ) {
    candidate = buildStudyEmail(`${username}${suffix}`);
    suffix += 1;
  }

  return candidate;
}

export function syncQuickLinksForUser(user: CampusUser) {
  return {
    cafeteria: `https://www.google.com/search?q=${encodeURIComponent(`Mensaplan ${user.campus}`)}`,
    grades: `https://www.google.com/search?q=${encodeURIComponent(`Noten ${user.major}`)}`,
  };
}

export const getDbSnapshot = () => clone(dbState);

export function updateDb(mutator: (draft: CampusDB) => CampusDB, syncServer = true) {
  const nextState = mutator(clone(dbState));
  dbState = withUserSchedule(nextState, nextState.currentUserId ?? localSessionUserId);
  if (syncServer) {
    serverSocket?.emit("presence:identify", dbState.currentUserId);
  }

  if (syncServer) {
    fetch(`${SERVER_URL}/api/db`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(dbState),
    }).catch(() => {
      AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(dbState)).catch(() => undefined);
    });
  }

  AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(dbState)).catch(() => undefined);
  listeners.forEach((listener) => listener());
}

export function useAppDb() {
  const [value, setValue] = useState<CampusDB>(withUserSchedule(dbState, dbState.currentUserId ?? localSessionUserId));

  useEffect(() => {
    const listener = () => setValue(clone(withUserSchedule(dbState, dbState.currentUserId ?? localSessionUserId)));
    listeners.add(listener);
    ensureSocket();
    return () => {
      listeners.delete(listener);
    };
  }, []);

  return value;
}

export const getCurrentUser = () =>
  dbState.users.find((user) => user.id === dbState.currentUserId) ?? null;

export async function loginUser(email: string, password: string) {
  const normalized = email.trim().toLowerCase();
  const user = dbState.users.find((candidate) =>
    candidate.email.toLowerCase() === normalized ||
    candidate.username.toLowerCase() === normalized ||
    (candidate.internalEmail ?? candidate.email).toLowerCase() === normalized
  );

  const passwordHash = await hashPassword(password);
  const passwordMatches = user ? user.password === password || user.password === passwordHash : false;

  if (!user || !passwordMatches) {
    throw new Error("E-Mail oder Passwort falsch.");
  }

  if (user.password === password) {
    updateDb((draft) => ({
      ...draft,
      users: draft.users.map((candidate) => candidate.id === user.id ? { ...candidate, password: passwordHash } : candidate),
    }));
  }

  localSessionUserId = user.id;
  await AsyncStorage.setItem(SESSION_KEY, user.id);
  updateDb((draft) => ({ ...draft, currentUserId: user.id }));
  return user;
}

export async function registerUser(input: {
  name: string;
  username: string;
  password: string;
  major?: string;
  semester?: number;
  bio?: string;
  campus?: string;
}) {
  const name = input.name.trim();
  const username = sanitizeUsername(input.username);
  if (!name) {
    throw new Error("Bitte gib deinen Namen ein.");
  }
  if (!input.username.trim() || username !== input.username.trim().toLowerCase()) {
    throw new Error("Der Benutzername darf nur Buchstaben und Zahlen enthalten.");
  }
  if (input.password.length < 6) {
    throw new Error("Das Passwort muss mindestens 6 Zeichen lang sein.");
  }
  if (dbState.users.some((user) => user.username.toLowerCase() === username)) {
    throw new Error("Dieser Benutzername ist bereits vergeben.");
  }
  const generatedEmail = buildStudyEmail(username);
  const generatedInternalEmail = generatedEmail;
  const passwordHash = await hashPassword(input.password);
  const exists = dbState.users.some(
    (user) =>
      user.email.toLowerCase() === generatedEmail ||
      user.username.toLowerCase() === username ||
      (user.internalEmail ?? user.email).toLowerCase() === generatedInternalEmail
  );

  if (exists) {
    throw new Error("Dieser Benutzername oder diese Mail ist bereits registriert.");
  }

  const newUser: CampusUser = {
    id: `user-${Date.now()}`,
    name,
    email: generatedEmail,
    internalEmail: generatedInternalEmail,
    password: passwordHash,
    major: input.major ?? "Informatik",
    semester: input.semester ?? 1,
    bio: input.bio ?? "Neue:r Student:in mit Leidenschaft für Logik und Lernen.",
    avatarColor: ["#7C6CFF", "#FF7A59", "#3ECF8E", "#FFC24B"][dbState.users.length % 4],
    campus: input.campus ?? "Campus Nord",
    profileImage: null,
    username,
    showOnlineStatus: true,
  };

  localSessionUserId = newUser.id;
  await AsyncStorage.setItem(SESSION_KEY, newUser.id);
  updateDb((draft) => ({
    ...draft,
    users: [...draft.users, newUser],
    currentUserId: newUser.id,
    quickLinks: draft.quickLinks.map((link) => {
      if (link.id === "cafeteria") {
        return { ...link, url: `https://www.google.com/search?q=${encodeURIComponent(`Mensaplan ${newUser.campus}`)}` };
      }
      if (link.id === "grades") {
        return { ...link, url: `https://www.google.com/search?q=${encodeURIComponent(`Noten ${newUser.major}`)}` };
      }
      return link;
    }),
  }));
  return newUser;
}

export function logoutUser() {
  localSessionUserId = null;
  void AsyncStorage.removeItem(SESSION_KEY);
  updateDb((draft) => ({ ...draft, currentUserId: null }));
}

export function deleteCurrentUser() {
  const currentUser = getCurrentUser();
  if (!currentUser) {
    return;
  }

  localSessionUserId = null;
  void AsyncStorage.removeItem(SESSION_KEY);
  updateDb((draft) => ({
    ...draft,
    currentUserId: null,
    users: draft.users
      .filter((user) => user.id !== currentUser.id)
      .map((user) => ({
        ...user,
        friends: (user.friends ?? []).filter((friendId) => friendId !== currentUser.id),
      })),
    communityPosts: draft.communityPosts.filter((post) => post.author !== currentUser.name),
    directMessages: Object.fromEntries(
      Object.entries(draft.directMessages).filter(([threadId]) => threadId !== currentUser.id && threadId !== `support:${currentUser.id}`),
    ),
  }));
}

export function getFriendsForCurrentUser() {
  const currentUser = getCurrentUser();
  if (!currentUser) {
    return [] as CampusUser[];
  }

  return (currentUser.friends ?? [])
    .map((friendId) => dbState.users.find((user) => user.id === friendId))
    .filter((user): user is CampusUser => !!user);
}

export function addFriend(friendId: string) {
  return sendFriendRequest(friendId);
}

export function sendFriendRequest(friendId: string) {
  const currentUser = getCurrentUser();
  if (!currentUser || !friendId) {
    return null;
  }

  if ((currentUser.friends ?? []).includes(friendId) || (currentUser.friendRequests ?? []).includes(friendId)) {
    return currentUser;
  }

  updateDb((draft) => ({
    ...draft,
    users: draft.users.map((user) => {
      if (user.id === currentUser.id) {
        return { ...user, friendRequests: [...(user.friendRequests ?? []), friendId] };
      }
      return user;
    }),
  }));

  return getCurrentUser();
}

export function acceptFriendRequest(requesterId: string) {
  const currentUser = getCurrentUser();
  if (!currentUser) return null;

  updateDb((draft) => ({
    ...draft,
    users: draft.users.map((user) => {
      if (user.id === currentUser.id) {
        return {
          ...user,
          friendRequests: (user.friendRequests ?? []).filter((id) => id !== requesterId),
          friends: [...new Set([...(user.friends ?? []), requesterId])],
        };
      }
      if (user.id === requesterId) {
        return { ...user, friends: [...new Set([...(user.friends ?? []), currentUser.id])] };
      }
      return user;
    }),
  }));
  return getCurrentUser();
}

export function rejectFriendRequest(requesterId: string) {
  const currentUser = getCurrentUser();
  if (!currentUser) return null;

  updateDb((draft) => ({
    ...draft,
    users: draft.users.map((user) => user.id === currentUser.id
      ? { ...user, friendRequests: (user.friendRequests ?? []).filter((id) => id !== requesterId) }
      : user),
  }));
  return getCurrentUser();
}

export function removeFriend(friendId: string) {
  const currentUser = getCurrentUser();
  if (!currentUser) {
    return null;
  }

  updateDb((draft) => ({
    ...draft,
    users: draft.users.map((user) => {
      if (user.id !== currentUser.id) {
        return user;
      }

      return {
        ...user,
        friends: (user.friends ?? []).filter((id) => id !== friendId),
      };
    }),
    directMessages: Object.fromEntries(
      Object.entries(draft.directMessages).filter(([id]) => id !== friendId && id !== getDirectMessageThreadId(currentUser.id, friendId))
    ),
  }));

  return getCurrentUser();
}

export function blockFriend(friendId: string) {
  removeFriend(friendId);
  return null;
}

export function getDirectMessagesForFriend(friendId: string) {
  const currentUser = getCurrentUser();
  if (!currentUser) {
    return [];
  }

  const threadId = getDirectMessageThreadId(currentUser.id, friendId);
  return dbState.directMessages[threadId] ?? dbState.directMessages[friendId] ?? [];
}

export function getDirectMessageThreadId(firstUserId: string, secondUserId: string) {
  return `dm:${[firstUserId, secondUserId].sort().join(":")}`;
}

export function getUnreadDirectMessageCount(messages: DirectMessage[], currentUserId: string | null, muted = false) {
  if (!currentUserId || muted) {
    return 0;
  }

  return messages.filter((message) => {
    const isIncoming = message.senderId ? message.senderId !== currentUserId : message.sender !== "me";
    return isIncoming && !message.readByUserIds?.includes(currentUserId);
  }).length;
}

export function toggleChatNotifications(threadId: string) {
  const currentUser = getCurrentUser();
  if (!currentUser || !threadId) {
    return currentUser;
  }

  const mutedChatThreadIds = currentUser.mutedChatThreadIds ?? [];
  const nextMutedChatThreadIds = mutedChatThreadIds.includes(threadId)
    ? mutedChatThreadIds.filter((id) => id !== threadId)
    : [...mutedChatThreadIds, threadId];

  updateCurrentUser({ mutedChatThreadIds: nextMutedChatThreadIds });
  return { ...currentUser, mutedChatThreadIds: nextMutedChatThreadIds };
}

export function markDirectMessagesAsRead(threadId: string) {
  const currentUser = getCurrentUser();
  if (!currentUser || !threadId) {
    return;
  }

  updateDb((draft) => ({
    ...draft,
    directMessages: {
      ...draft.directMessages,
      [threadId]: (draft.directMessages[threadId] ?? []).map((message) => ({
        ...message,
        readByUserIds: [...new Set([...(message.readByUserIds ?? []), currentUser.id])],
      })),
    },
  }));
}

export function sendDirectMessageToFriend(friendId: string, text: string) {
  const currentUser = getCurrentUser();
  const trimmed = text.trim();

  if (!currentUser || !trimmed || !(currentUser.friends ?? []).includes(friendId)) {
    return null;
  }

  const message: DirectMessage = {
    id: `dm-${Date.now()}`,
    senderId: currentUser.id,
    sender: "me",
    text: trimmed,
    timestamp: new Date().toLocaleTimeString("de-DE", { hour: "2-digit", minute: "2-digit" }),
    createdAt: new Date().toISOString(),
  };

  updateDb((draft) => ({
    ...draft,
    directMessages: {
      ...draft.directMessages,
      [getDirectMessageThreadId(currentUser.id, friendId)]: [
        ...(draft.directMessages[getDirectMessageThreadId(currentUser.id, friendId)] ?? []),
        message,
      ],
    },
  }));

  return message;
}

export function sendSupportMessage(text: string) {
  const currentUser = getCurrentUser();
  const trimmed = text.trim();

  const canWrite = currentUser?.username === "ata" || (currentUser?.linkedEmail ? isUniversityEmail(currentUser.linkedEmail) : false);

  if (!currentUser || !canWrite || !trimmed) {
    return null;
  }

  const message: DirectMessage = {
    id: `support-${Date.now()}`,
    senderId: currentUser.id,
    sender: "me",
    text: trimmed,
    timestamp: new Date().toLocaleTimeString("de-DE", { hour: "2-digit", minute: "2-digit" }),
    createdAt: new Date().toISOString(),
  };

  updateDb((draft) => ({
    ...draft,
    directMessages: {
      ...draft.directMessages,
      [`support:${currentUser.id}`]: [
        ...(draft.directMessages[`support:${currentUser.id}`] ?? []),
        message,
      ],
    },
  }));

  return message;
}

export function updateCurrentUser(changes: Partial<CampusUser>) {
  const current = getCurrentUser();
  if (!current) {
    return null;
  }

  const nextBaseName = changes.name?.trim() ? changes.name.trim() : current.name;
  if (changes.linkedEmail !== undefined) {
    const linkedEmail = changes.linkedEmail.trim().toLowerCase();
    if (linkedEmail && !isUniversityEmail(linkedEmail)) {
      throw new Error("Bitte gib eine gültige Uni-Mail ein.");
    }
    if (linkedEmail && dbState.users.some((user) => user.id !== current.id && (user.linkedEmail ?? "").toLowerCase() === linkedEmail)) {
      throw new Error("Diese Uni-Mail ist bereits registriert.");
    }
  }
  const nextUser = {
    ...current,
    ...changes,
    name: nextBaseName,
    username: current.username,
    email: current.email,
    internalEmail: current.internalEmail ?? current.email,
  };

  const nextLinks = syncQuickLinksForUser(nextUser);
  updateDb((draft) => ({
    ...draft,
    users: draft.users.map((user) => (user.id === current.id ? nextUser : user)),
    communityPosts: draft.communityPosts.map((post) => {
      if (post.author !== current.name) {
        return post;
      }

      return {
        ...post,
        author: nextUser.name,
        profileImage: nextUser.profileImage ?? null,
        avatarColor: nextUser.avatarColor,
      };
    }),
    quickLinks: draft.quickLinks.map((link) => {
      if (link.id === "cafeteria") {
        return { ...link, url: nextLinks.cafeteria };
      }
      if (link.id === "grades") {
        return { ...link, url: nextLinks.grades };
      }
      return link;
    }),
  }));

  return nextUser;
}

export function addCommentToPost(postId: string, text: string) {
  const currentUser = getCurrentUser();
  const trimmed = text.trim();

  if (!currentUser || !trimmed) {
    return null;
  }

  const comment = {
    id: `comment-${Date.now()}`,
    authorId: currentUser.id,
    author: currentUser.name,
    text: trimmed,
    timestamp: new Date().toLocaleTimeString("de-DE", { hour: "2-digit", minute: "2-digit" }),
    me: true,
  };

  updateDb((draft) => ({
    ...draft,
    communityPosts: draft.communityPosts.map((post) => {
      if (post.id !== postId) {
        return post;
      }

      return {
        ...post,
        comments: post.comments + 1,
        commentsList: [...(post.commentsList ?? []), comment],
      };
    }),
  }), false);

  void fetch(`${SERVER_URL}/api/posts/${encodeURIComponent(postId)}/comments`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ userId: currentUser.id, text: trimmed }),
  }).catch(() => {
    void hydrateDb();
  });

  return comment;
}

export function addCommunityPost(content: string) {
  const currentUser = getCurrentUser();
  if (!currentUser || !content.trim()) {
    return null;
  }

  const newPost: CommunityPost = {
    id: `post-${Date.now()}`,
    authorId: currentUser.id,
    author: currentUser.name,
    avatarColor: currentUser.avatarColor,
    content: content.trim(),
    course: currentUser.major,
    comments: 0,
    timeAgo: "Jetzt",
    threadName: currentUser.name,
    unread: 0,
    profileImage: currentUser.profileImage ?? null,
  };

  updateDb((draft) => ({ ...draft, communityPosts: [newPost, ...draft.communityPosts] }));
  return newPost;
}

export async function deleteCommunityPost(postId: string) {
  const currentUser = getCurrentUser();
  if (!currentUser) {
    throw new Error("Kein Nutzer angemeldet.");
  }

  const post = dbState.communityPosts.find((entry) => entry.id === postId);
  const canDelete = post && (post.authorId === currentUser.id || (!post.authorId && post.author === currentUser.name));
  if (!canDelete) {
    throw new Error("Du darfst diesen Beitrag nicht löschen.");
  }

  dbState = {
    ...dbState,
    communityPosts: dbState.communityPosts.filter((entry) => entry.id !== postId),
  };
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(dbState)).catch(() => undefined);
  listeners.forEach((listener) => listener());

  try {
    const response = await fetch(`${SERVER_URL}/api/posts/${encodeURIComponent(postId)}`, {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId: currentUser.id }),
    });
    if (!response.ok) {
      await hydrateDb();
      throw new Error("Der Beitrag konnte auf dem Server nicht gelöscht werden.");
    }
  } catch {
    await hydrateDb();
    throw new Error("Der Beitrag konnte nicht gelöscht werden.");
  }
}

export function toggleBuddyConnection(profileId: string) {
  updateDb((draft) => ({
    ...draft,
    buddyProfiles: draft.buddyProfiles.map((profile) =>
      profile.id === profileId ? { ...profile, connected: !profile.connected } : profile
    ),
  }));
}

export function toggleSavedJob(jobId: string) {
  updateDb((draft) => ({
    ...draft,
    jobListings: draft.jobListings.map((job) =>
      job.id === jobId ? { ...job, saved: !job.saved } : job
    ),
  }));
}
