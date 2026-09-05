require("dotenv").config();
const express = require("express");
const cors = require("cors");
const http = require("http");
const fs = require("fs");
const path = require("path");
const { Server } = require("socket.io");
const { createClient } = require("@supabase/supabase-js");
const bcrypt = require("bcryptjs");

const app = express();
const server = http.createServer(app);
const port = Number(process.env.PORT || 3001);
const dbFile = process.env.DB_FILE || path.join(__dirname, "data", "db.json");
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = supabaseUrl && supabaseServiceKey ? createClient(supabaseUrl, supabaseServiceKey) : null;
const cloudStateId = "main";
const allowedOrigins = (process.env.CORS_ORIGIN || "http://localhost:19006,http://localhost:8081").split(",").map((origin) => origin.trim()).filter(Boolean);

const io = new Server(server, {
  cors: {
    origin: allowedOrigins,
    credentials: true,
  },
});

const createId = (prefix) => `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

const defaultDb = {
  currentUserId: null,
  users: [],
  quickLinks: [
    { id: "moodle", label: "Moodle", icon: "book-outline", url: "https://moodle.org/" },
    { id: "campus", label: "Campus-Portal", icon: "school-outline", url: "https://www.studieren-in-hamburg.de/" },
    { id: "mail", label: "Uni-Mail", icon: "mail-outline", url: "https://mail.google.com/" },
    { id: "library", label: "Bibliothek", icon: "library-outline", url: "https://www.google.com/search?q=Universit%C3%A4tsbibliothek" },
    { id: "cafeteria", label: "Mensaplan", icon: "restaurant-outline", url: "https://www.google.com/search?q=Mensaplan+Universit%C3%A4t" },
    { id: "grades", label: "Noten", icon: "stats-chart-outline", url: "https://www.google.com/search?q=Noten+Universit%C3%A4t" },
  ],
  todaySchedule: [],
  scheduleImage: null,
  buddyProfiles: [],
  jobListings: [],
  communityPosts: [],
  gradeEntries: [],
  directMessages: {},
};

function ensureDbFile() {
  const dir = path.dirname(dbFile);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  if (!fs.existsSync(dbFile)) {
    fs.writeFileSync(dbFile, JSON.stringify(defaultDb, null, 2));
  }
}

function readDb() {
  ensureDbFile();
  try {
    const raw = fs.readFileSync(dbFile, "utf8");
    const parsed = JSON.parse(raw);
    return { ...defaultDb, ...parsed, users: parsed.users ?? [], communityPosts: parsed.communityPosts ?? [], directMessages: parsed.directMessages ?? {} };
  } catch (error) {
    fs.writeFileSync(dbFile, JSON.stringify(defaultDb, null, 2));
    return { ...defaultDb };
  }
}

function writeDb(nextDb) {
  ensureDbFile();
  const users = (nextDb.users ?? []).map(({ online, ...user }) => user);
  const safeDb = { ...defaultDb, ...nextDb, currentUserId: null, users, communityPosts: nextDb.communityPosts ?? [], directMessages: nextDb.directMessages ?? {} };
  fs.writeFileSync(dbFile, JSON.stringify(safeDb, null, 2));
  void persistCloudDb(safeDb);
  return safeDb;
}

async function persistCloudDb(nextDb) {
  if (!supabase) {
    return;
  }

  const { error } = await supabase.from("studflow_state").upsert({
    id: cloudStateId,
    data: nextDb,
    updated_at: new Date().toISOString(),
  });
  if (error) {
    console.error(`Supabase write failed: ${error.message}`);
  }
}

async function hydrateCloudDb() {
  if (!supabase) {
    return;
  }

  const { data, error } = await supabase
    .from("studflow_state")
    .select("data")
    .eq("id", cloudStateId)
    .maybeSingle();

  if (error) {
    console.error(`Supabase read failed: ${error.message}`);
    return;
  }

  if (data?.data) {
    db = writeDb(data.data);
    emitDb();
    return;
  }

  await persistCloudDb(db);
}

function emitDb() {
  io.emit("db:update", {
    ...db,
    users: db.users.map((user) => ({
      ...user,
      online: user.showOnlineStatus !== false && onlineUserIds.has(user.id),
    })),
  });
}

let db = readDb();
const onlineUserIds = new Set();

app.use(cors({
  origin: true,
  credentials: true,
}));
app.use(express.json({ limit: "10mb" }));

app.get("/", (_, res) => {
  res.json({ name: "StudFlow API", status: "running", health: "/health" });
});

app.get("/health", (_, res) => {
  res.json({ ok: true, status: "healthy", users: db.users.length, port, storage: supabase ? "supabase" : "local" });
});

app.get("/api/db", (_, res) => {
  res.json(db);
});

app.post("/api/auth/register", async (req, res) => {
  const { name, username, email, password, major, semester, bio, campus } = req.body || {};
  if (!name || !password) {
    return res.status(400).json({ error: "Anzeigename und Passwort sind erforderlich." });
  }
  if (String(password).length < 6) {
    return res.status(400).json({ error: "Das Passwort muss mindestens 6 Zeichen lang sein." });
  }

  const cleanName = String(name).trim();
  const cleanUsername = String(username || "").trim().toLowerCase();
  if (!/^[a-z0-9]+$/.test(cleanUsername)) {
    return res.status(400).json({ error: "Der Benutzername darf nur Buchstaben und Zahlen enthalten." });
  }
  const usernameBase = cleanUsername;
  const candidateEmail = `${usernameBase}@study2buddy.de`;

  const existingUser = db.users.find(
    (user) => user.email.toLowerCase() === candidateEmail
      || user.username.toLowerCase() === usernameBase.toLowerCase()
      || (email && (user.linkedEmail ?? "").toLowerCase() === String(email).trim().toLowerCase())
  );

  if (existingUser) {
    return res.status(409).json({ error: "Benutzername oder E-Mail bereits vergeben." });
  }

  const user = {
    id: createId("user"),
    name: cleanName,
    email: candidateEmail,
    internalEmail: candidateEmail,
    password: await bcrypt.hash(String(password), 12),
    major: major || "Informatik",
    semester: Number(semester || 1),
    bio: bio || "Neue:r Student:in mit Leidenschaft für Lernen und Austausch.",
    avatarColor: ["#7C6CFF", "#FF7A59", "#3ECF8E", "#FFC24B"][db.users.length % 4],
    campus: campus || "Campus Nord",
    profileImage: null,
    username: usernameBase,
    showOnlineStatus: true,
  };

  db.users.push(user);
  db.currentUserId = user.id;
  db = writeDb(db);
  emitDb();
  res.status(201).json({ user, message: "Registrierung erfolgreich." });
});

app.post("/api/auth/login", async (req, res) => {
  const { email, password } = req.body || {};
  const input = String(email || "").trim().toLowerCase();

  const user = db.users.find((candidate) => candidate.email.toLowerCase() === input || candidate.username.toLowerCase() === input);

  const passwordMatches = user
    ? user.password.startsWith("$2")
      ? await bcrypt.compare(String(password || ""), user.password)
      : String(user.password) === String(password || "")
    : false;

  if (!user || !passwordMatches) {
    return res.status(401).json({ error: "E-Mail oder Passwort falsch." });
  }

  db.currentUserId = user.id;
  db = writeDb(db);
  emitDb();
  res.json({ user, message: "Login erfolgreich." });
});

app.get("/api/users", (_, res) => {
  res.json(db.users);
});

app.patch("/api/db", (req, res) => {
  const users = Array.isArray(req.body?.users) ? req.body.users : db.users;
  const seenUsernames = new Set();
  const seenUniversityEmails = new Set();
  const seenAppEmails = new Set();
  for (const user of users) {
    const username = String(user.username || "").trim().toLowerCase();
    const universityEmail = String(user.linkedEmail || "").trim().toLowerCase();
    const appEmail = String(user.internalEmail || user.email || "").trim().toLowerCase();
    if (universityEmail && seenUniversityEmails.has(universityEmail)) {
      return res.status(409).json({ error: "Uni-Mails müssen eindeutig sein." });
    }
    if (username && seenUsernames.has(username)) {
      return res.status(409).json({ error: "Benutzernamen müssen eindeutig sein." });
    }
    if (appEmail && seenAppEmails.has(appEmail)) {
      return res.status(409).json({ error: "App-Mails müssen eindeutig sein." });
    }
    if (universityEmail) seenUniversityEmails.add(universityEmail);
    if (username) seenUsernames.add(username);
    if (appEmail) seenAppEmails.add(appEmail);
  }
  db = writeDb(req.body || db);
  emitDb();
  res.json(db);
});

app.get("/api/posts", (_, res) => {
  res.json(db.communityPosts);
});

app.post("/api/posts", (req, res) => {
  const { content, authorId } = req.body || {};
  const user = db.users.find((entry) => entry.id === authorId);
  if (!user || !String(content || "").trim()) {
    return res.status(400).json({ error: "Inhalt oder Nutzer fehlt." });
  }

  const post = {
    id: createId("post"),
    authorId: user.id,
    author: user.name,
    avatarColor: user.avatarColor,
    content: String(content).trim(),
    course: user.major,
    comments: 0,
    commentsList: [],
    timeAgo: "Jetzt",
    threadName: user.name,
    unread: 0,
    profileImage: user.profileImage || null,
  };

  db.communityPosts = [post, ...db.communityPosts];
  db = writeDb(db);
  emitDb();
  res.status(201).json(post);
});

app.delete("/api/posts/:postId", (req, res) => {
  const userId = String(req.body?.userId || "");
  const user = db.users.find((entry) => entry.id === userId);
  const post = db.communityPosts.find((entry) => entry.id === req.params.postId);
  if (!user || !post) {
    return res.status(404).json({ error: "Beitrag oder Nutzer nicht gefunden." });
  }

  const canDelete = post.authorId === user.id || (!post.authorId && post.author === user.name);
  if (!canDelete) {
    return res.status(403).json({ error: "Du darfst diesen Beitrag nicht löschen." });
  }

  db.communityPosts = db.communityPosts.filter((entry) => entry.id !== post.id);
  db = writeDb(db);
  emitDb();
  res.json({ ok: true });
});

app.post("/api/posts/:postId/comments", (req, res) => {
  const { userId, text } = req.body || {};
  const post = db.communityPosts.find((entry) => entry.id === req.params.postId);
  if (!post || !userId || !String(text || "").trim()) {
    return res.status(400).json({ error: "Kommentar oder Benutzer fehlt." });
  }

  const user = db.users.find((entry) => entry.id === userId);
  const comment = {
    id: createId("comment"),
    author: user ? user.name : "User",
    text: String(text).trim(),
    timestamp: new Date().toLocaleTimeString("de-DE", { hour: "2-digit", minute: "2-digit" }),
    me: true,
  };

  post.comments = (post.comments || 0) + 1;
  post.commentsList = [...(post.commentsList || []), comment];
  db = writeDb(db);
  emitDb();
  res.status(201).json(comment);
});

app.get("/api/direct-messages", (_, res) => {
  res.json(db.directMessages || {});
});

app.post("/api/direct-messages", (req, res) => {
  const { threadId, senderId, text } = req.body || {};
  if (!threadId || !senderId || !String(text || "").trim()) {
    return res.status(400).json({ error: "Thread, Sender oder Text fehlen." });
  }

  const message = {
    id: createId("dm"),
    senderId,
    sender: senderId === db.currentUserId ? "me" : "match",
    text: String(text).trim(),
    timestamp: new Date().toLocaleTimeString("de-DE", { hour: "2-digit", minute: "2-digit" }),
    createdAt: new Date().toISOString(),
    readByUserIds: [],
  };

  db.directMessages[threadId] = [...(db.directMessages[threadId] || []), message];
  db = writeDb(db);
  emitDb();
  res.status(201).json(message);
});

app.get("/api/health", (_, res) => {
  res.json({ ok: true, users: db.users.length, posts: db.communityPosts.length });
});

io.on("connection", (socket) => {
  socket.on("presence:identify", (userId) => {
    const previousUserId = socket.data.userId;
    if (previousUserId && previousUserId !== userId) {
      onlineUserIds.delete(previousUserId);
    }

    if (typeof userId !== "string" || !db.users.some((user) => user.id === userId)) {
      delete socket.data.userId;
      emitDb();
      return;
    }

    socket.data.userId = userId;
    onlineUserIds.add(userId);
    emitDb();
  });

  socket.on("disconnect", () => {
    if (!socket.data.userId) {
      return;
    }

    const stillConnected = Array.from(io.sockets.sockets.values()).some(
      (connectedSocket) => connectedSocket.id !== socket.id && connectedSocket.data.userId === socket.data.userId
    );
    if (!stillConnected) {
      onlineUserIds.delete(socket.data.userId);
      emitDb();
    }
  });

  socket.emit("db:update", {
    ...db,
    users: db.users.map((user) => ({
      ...user,
      online: user.showOnlineStatus !== false && onlineUserIds.has(user.id),
    })),
  });
});

server.listen(port, "0.0.0.0", () => {
  console.log(`StudFlow multi-user backend running on http://0.0.0.0:${port}`);
  if (supabase) {
    void hydrateCloudDb();
  } else {
    console.log("Supabase is not configured; using local data/db.json storage.");
  }
});
