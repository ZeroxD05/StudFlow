require("dotenv").config();
const express = require("express");
const cors = require("cors");
const http = require("http");
const crypto = require("crypto");
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
const configuredOrigins = (process.env.CORS_ORIGIN || "").split(",").map((origin) => origin.trim()).filter(Boolean);
const allowedOrigins = [...new Set([
  "http://localhost:19006",
  "http://localhost:8081",
  "https://studflow.onrender.com",
  "https://studflow-1.onrender.com",
  ...configuredOrigins,
])];
const authSecret = process.env.AUTH_SECRET;
if (!authSecret) {
  throw new Error("AUTH_SECRET must be configured.");
}

const io = new Server(server, {
  cors: {
    origin: allowedOrigins,
    credentials: true,
  },
});

const createId = (prefix) => `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
const normalizeTenantId = (value) => String(value || "study2buddy-demo").trim().toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/ä/g, "ae").replace(/ö/g, "oe").replace(/ü/g, "ue").replace(/ß/g, "ss").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 64) || "study2buddy-demo";
const findTenant = (tenantId) => (db.tenants || []).find((entry) => entry.id === tenantId || normalizeTenantId(entry.name) === tenantId);
const createAuthToken = (userId, tenantId) => {
  const payload = Buffer.from(JSON.stringify({ userId, tenantId, exp: Date.now() + 1000 * 60 * 60 * 24 * 30 })).toString("base64url");
  const signature = crypto.createHmac("sha256", authSecret).update(payload).digest("base64url");
  return `${payload}.${signature}`;
};
const getAuthUser = (req) => {
  const token = String(req.headers.authorization || "").replace(/^Bearer\s+/i, "");
  const [payload, signature] = token.split(".");
  if (!payload || !signature) return null;
  const expected = crypto.createHmac("sha256", authSecret).update(payload).digest("base64url");
  if (signature.length !== expected.length || !crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expected))) return null;
  try {
    const data = JSON.parse(Buffer.from(payload, "base64url").toString("utf8"));
    const user = db.users.find((entry) => entry.id === data.userId);
    return data.exp > Date.now() && user && user.tenantId === data.tenantId ? user : null;
  } catch {
    return null;
  }
};
const requireAuth = (req, res, next) => {
  const user = getAuthUser(req);
  if (!user) return res.status(401).json({ error: "Authentifizierung erforderlich." });
  req.authUser = user;
  next();
};
const requireAdmin = (req, res, next) => {
  requireAuth(req, res, () => {
    if (req.authUser.role !== "admin") return res.status(403).json({ error: "Adminrechte erforderlich." });
    next();
  });
};
const requireTenantAdmin = (req, res, next) => {
  requireAuth(req, res, () => {
    const tenant = (db.tenants || []).find((entry) => entry.id === req.authUser.tenantId);
    const authorized = req.authUser.role === "admin" && (!tenant?.adminEmail || tenant.adminEmail === req.authUser.linkedEmail);
    if (!authorized) return res.status(403).json({ error: "Keine News-Berechtigung für diese Hochschule." });
    next();
  });
};
const requireCentralAdmin = (req, res, next) => {
  requireAuth(req, res, () => {
    if (req.authUser.username !== "ata") return res.status(403).json({ error: "Nur der zentrale Admin darf Hochschulen verwalten." });
    next();
  });
};

const defaultDb = {
  currentUserId: null,
  tenants: [{ id: "study2buddy-demo", name: "Study2Buddy Demo", emailDomain: "study2buddy.de" }],
  tenantNews: [],
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
  scheduleByUserId: {},
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
    const users = (parsed.users ?? []).map((user) => ({ ...user, tenantId: user.tenantId || "study2buddy-demo", role: user.role || (user.username === "ata" ? "admin" : "student") }));
    return { ...defaultDb, ...parsed, users, tenants: parsed.tenants ?? defaultDb.tenants, tenantNews: parsed.tenantNews ?? [], communityPosts: parsed.communityPosts ?? [], directMessages: parsed.directMessages ?? {}, scheduleByUserId: parsed.scheduleByUserId ?? {} };
  } catch (error) {
    fs.writeFileSync(dbFile, JSON.stringify(defaultDb, null, 2));
    return { ...defaultDb };
  }
}

function writeDb(nextDb) {
  ensureDbFile();
  const users = (nextDb.users ?? []).map(({ online, ...user }) => ({ ...user, tenantId: user.tenantId || "study2buddy-demo", role: user.role || (user.username === "ata" ? "admin" : "student") }));
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
  for (const socket of io.sockets.sockets.values()) {
    const tenantId = socket.data.tenantId;
    if (!tenantId) continue;
    const tenantUsers = db.users.filter((user) => user.tenantId === tenantId);
    const tenantUserIds = new Set(tenantUsers.map((user) => user.id));
    socket.emit("db:update", {
      ...db,
      currentUserId: socket.data.userId || null,
      users: tenantUsers.map((user) => ({ ...user, online: user.showOnlineStatus !== false && onlineUserIds.has(user.id) })),
      communityPosts: db.communityPosts.filter((post) => tenantUserIds.has(post.authorId)),
      tenantNews: (db.tenantNews || []).filter((news) => news.tenantId === tenantId),
      directMessages: Object.fromEntries(Object.entries(db.directMessages || {}).filter(([threadId]) => threadId.split(":").some((id) => tenantUserIds.has(id)))),
      scheduleByUserId: Object.fromEntries(Object.entries(db.scheduleByUserId || {}).filter(([userId]) => tenantUserIds.has(userId))),
    });
  }
}

let db = readDb();
const onlineUserIds = new Set();

async function applySupportPassword() {
  const password = process.env.SUPPORT_PASSWORD;
  if (!password) return;
  let user = db.users.find((entry) => entry.username === "ata");
  if (!user) {
    user = {
      id: "demo-user",
      tenantId: "study2buddy-demo",
      name: "Ata",
      email: "ata2005hh@gmail.com",
      internalEmail: "ata@study2buddy.de",
      linkedEmail: "ata2005hh@gmail.com",
      password: "",
      major: "Informatik",
      semester: 4,
      bio: "Frontend- und Lern-Apps mit Fokus auf UX und Lernplattformen.",
      avatarColor: "#7C6CFF",
      campus: "Campus Nord",
      profileImage: null,
      username: "ata",
      friends: [],
      showOnlineStatus: true,
    };
    db.users.push(user);
  }
  const matches = user.password.startsWith("$2") ? await bcrypt.compare(password, user.password) : user.password === password;
  if (!matches) {
    user.password = await bcrypt.hash(password, 12);
    db = writeDb(db);
  }
}

app.use(cors({
  origin: allowedOrigins,
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
  const authUser = getAuthUser(_);
  if (!authUser) return res.status(401).json({ error: "Authentifizierung erforderlich." });
  const tenantUsers = db.users.filter((entry) => entry.tenantId === authUser.tenantId);
  const tenantUserIds = new Set(tenantUsers.map((entry) => entry.id));
  res.json({
    ...db,
    currentUserId: authUser.id,
    users: tenantUsers,
    communityPosts: db.communityPosts.filter((post) => tenantUserIds.has(post.authorId)),
    tenantNews: (db.tenantNews || []).filter((news) => news.tenantId === authUser.tenantId),
    directMessages: Object.fromEntries(Object.entries(db.directMessages || {}).filter(([threadId]) => threadId.split(":").some((id) => tenantUserIds.has(id)))),
    scheduleByUserId: Object.fromEntries(Object.entries(db.scheduleByUserId || {}).filter(([userId]) => tenantUserIds.has(userId))),
  });
});

app.post("/api/auth/register", async (req, res) => {
  const { name, username, linkedEmail, password, major, semester, bio, campus } = req.body || {};
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
  const universityEmail = String(linkedEmail || "").trim().toLowerCase();
  const emailDomain = universityEmail.split("@")[1] || "";
  const tenant = (db.tenants || []).find((entry) => entry.emailDomain === emailDomain);
  if (!tenant) {
    return res.status(400).json({ error: "Deine Uni-Mail-Domain ist noch nicht für StudFlow freigeschaltet." });
  }

  const existingUser = db.users.find(
    (user) => user.email.toLowerCase() === candidateEmail
      || user.username.toLowerCase() === usernameBase.toLowerCase()
      || (universityEmail && (user.linkedEmail ?? "").toLowerCase() === universityEmail)
  );

  if (existingUser) {
    return res.status(409).json({ error: "Benutzername oder E-Mail bereits vergeben." });
  }

  const user = {
    id: createId("user"),
    tenantId: normalizeTenantId(req.body?.tenantId || campus),
    name: cleanName,
    email: candidateEmail,
    internalEmail: candidateEmail,
    linkedEmail: universityEmail,
    tenantId: tenant.id,
    role: tenant.adminEmail === universityEmail ? "admin" : "student",
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
  res.status(201).json({ user, token: createAuthToken(user.id, user.tenantId), message: "Registrierung erfolgreich." });
});

app.post("/api/auth/login", async (req, res) => {
  const { email, password } = req.body || {};
  const input = String(email || "").trim().toLowerCase();

  const user = db.users.find((candidate) => candidate.email.toLowerCase() === input || candidate.username.toLowerCase() === input || (candidate.linkedEmail ?? "").toLowerCase() === input);

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
  res.json({ user, token: createAuthToken(user.id, user.tenantId), message: "Login erfolgreich." });
});

app.get("/api/users", requireAuth, (_, res) => {
  res.json(db.users);
});

app.get("/api/admin/tenants", requireCentralAdmin, (_, res) => {
  res.json(db.tenants || []);
});

app.post("/api/admin/tenants", requireCentralAdmin, (req, res) => {
  const name = String(req.body?.name || "").trim();
  const emailDomain = String(req.body?.emailDomain || "").trim().toLowerCase().replace(/^@/, "");
  const adminEmail = String(req.body?.adminEmail || "").trim().toLowerCase();
  const id = normalizeTenantId(name);
  if (!name || !/^[^@\s]+\.[^@\s]+$/.test(emailDomain) || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(adminEmail) || id === "study2buddy-demo") return res.status(400).json({ error: "Bitte Hochschulname, Uni-Mail-Domain und Admin-Mail angeben." });
  if ((db.tenants || []).some((tenant) => tenant.emailDomain === emailDomain)) return res.status(409).json({ error: "Diese Uni-Mail-Domain existiert bereits." });
  if ((db.tenants || []).some((tenant) => tenant.id === id)) return res.status(409).json({ error: "Diese Hochschule existiert bereits." });
  const tenant = { id, name, emailDomain, adminEmail };
  db.tenants = [...(db.tenants || []), tenant];
  db = writeDb(db);
  res.status(201).json(tenant);
});

app.patch("/api/admin/tenants/:tenantId", requireCentralAdmin, (req, res) => {
  const tenant = (db.tenants || []).find((entry) => entry.id === req.params.tenantId);
  if (!tenant) return res.status(404).json({ error: "Hochschule nicht gefunden." });
  const adminEmail = String(req.body?.adminEmail || "").trim().toLowerCase();
  if (adminEmail && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(adminEmail)) return res.status(400).json({ error: "Ungültige Admin-Mail." });
  tenant.adminEmail = adminEmail || undefined;
  db = writeDb(db);
  res.json(tenant);
});

app.delete("/api/admin/tenants/:tenantId", requireCentralAdmin, (req, res) => {
  if (req.params.tenantId === "study2buddy-demo") return res.status(400).json({ error: "Der Default-Tenant kann nicht gelöscht werden." });
  if (!(db.tenants || []).some((entry) => entry.id === req.params.tenantId)) return res.status(404).json({ error: "Hochschule nicht gefunden." });
  db.tenants = db.tenants.filter((entry) => entry.id !== req.params.tenantId);
  db = writeDb(db);
  res.json({ ok: true });
});

app.post("/api/admin/news", requireTenantAdmin, (req, res) => {
  const title = String(req.body?.title || "").trim();
  const body = String(req.body?.body || "").trim();
  if (!title || !body) return res.status(400).json({ error: "Titel und Inhalt fehlen." });
  const news = { id: createId("news"), tenantId: req.authUser.tenantId, title, body, createdAt: new Date().toISOString() };
  db.tenantNews = [news, ...(db.tenantNews || [])];
  db = writeDb(db);
  emitDb();
  res.status(201).json(news);
});

app.patch("/api/admin/news/:newsId", requireTenantAdmin, (req, res) => {
  const news = (db.tenantNews || []).find((entry) => entry.id === req.params.newsId && entry.tenantId === req.authUser.tenantId);
  const title = String(req.body?.title || "").trim();
  const body = String(req.body?.body || "").trim();
  if (!news) return res.status(404).json({ error: "News nicht gefunden." });
  if (!title || !body) return res.status(400).json({ error: "Titel und Inhalt fehlen." });
  news.title = title;
  news.body = body;
  db = writeDb(db);
  emitDb();
  res.json(news);
});

app.delete("/api/admin/news/:newsId", requireTenantAdmin, (req, res) => {
  const exists = (db.tenantNews || []).some((entry) => entry.id === req.params.newsId && entry.tenantId === req.authUser.tenantId);
  if (!exists) return res.status(404).json({ error: "News nicht gefunden." });
  db.tenantNews = (db.tenantNews || []).filter((entry) => entry.id !== req.params.newsId);
  db = writeDb(db);
  emitDb();
  res.json({ ok: true });
});

app.post("/api/admin/users", requireAuth, async (req, res) => {
  const { tenantId, name, username, linkedEmail, password } = req.body || {};
  const tenant = findTenant(tenantId);
  const { role } = req.body || {};
  const canCreate = req.authUser.username === "ata" || (req.authUser.role === "admin" && req.authUser.tenantId === tenantId) || (req.authUser.role === "lecturer" && req.authUser.tenantId === tenantId && role === "student");
  if (!canCreate) return res.status(403).json({ error: "Keine Berechtigung für dieses Konto." });
  if (!["student", "lecturer", "admin"].includes(role)) return res.status(400).json({ error: "Ungültige Rolle." });
  const missing = [
    !tenantId ? "Tenant-ID" : null,
    !name ? "Name" : null,
    !username ? "Benutzername" : null,
    !linkedEmail ? "Admin-Mail" : null,
    !password ? "Passwort" : null,
  ].filter(Boolean);
  if (missing.length) return res.status(400).json({ error: `Fehlt: ${missing.join(", ")}.` });
  if (!tenant) return res.status(404).json({ error: `Tenant nicht gefunden: ${tenantId}` });
  if (db.users.some((user) => user.username === username || user.linkedEmail === linkedEmail)) return res.status(409).json({ error: "Benutzername oder Uni-Mail existiert bereits." });
  const user = { id: createId("user"), tenantId, role, name: String(name).trim(), username: String(username).trim().toLowerCase(), email: `${String(username).trim().toLowerCase()}@study2buddy.de`, internalEmail: `${String(username).trim().toLowerCase()}@study2buddy.de`, linkedEmail: String(linkedEmail).trim().toLowerCase(), password: await bcrypt.hash(String(password), 12), major: "", semester: 1, bio: "", avatarColor: "#1E4FD8", campus: tenant.name, friends: [], showOnlineStatus: true };
  db.users.push(user);
  db = writeDb(db);
  emitDb();
  res.status(201).json(user);
});

app.patch("/api/schedules", requireAuth, (req, res) => {
  const userId = req.authUser.id;
  const schedule = Array.isArray(req.body?.schedule) ? req.body.schedule : null;
  if (!userId || !db.users.some((user) => user.id === userId) || !schedule) {
    return res.status(400).json({ error: "Nutzer oder Stundenplan fehlt." });
  }

  db.scheduleByUserId = { ...(db.scheduleByUserId || {}), [userId]: schedule };
  db = writeDb(db);
  emitDb();
  res.json({ ok: true });
});

app.patch("/api/db", requireAuth, (req, res) => {
  const tenantId = req.authUser.tenantId;
  const tenantUserIds = new Set(db.users.filter((user) => user.tenantId === tenantId).map((user) => user.id));
  const incomingUsers = Array.isArray(req.body?.users) ? req.body.users.filter((user) => tenantUserIds.has(user.id)) : [];
  const users = db.users.map((user) => incomingUsers.find((incoming) => incoming.id === user.id) ?? user);
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
  db = writeDb({
    ...db,
    users,
    communityPosts: db.communityPosts.filter((post) => !tenantUserIds.has(post.authorId)).concat((req.body?.communityPosts || []).filter((post) => tenantUserIds.has(post.authorId))),
    directMessages: { ...db.directMessages, ...(Object.fromEntries(Object.entries(req.body?.directMessages || {}).filter(([threadId]) => threadId.split(":").some((id) => tenantUserIds.has(id))))) },
    scheduleByUserId: { ...db.scheduleByUserId, ...(Object.fromEntries(Object.entries(req.body?.scheduleByUserId || {}).filter(([userId]) => tenantUserIds.has(userId)))) },
  });
  emitDb();
  res.json(db);
});

app.get("/api/posts", requireAuth, (_, res) => {
  res.json(db.communityPosts);
});

app.post("/api/posts", requireAuth, (req, res) => {
  const { content } = req.body || {};
  const user = req.authUser;
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

app.delete("/api/posts/:postId", requireAuth, (req, res) => {
  const user = req.authUser;
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

app.post("/api/posts/:postId/comments", requireAuth, (req, res) => {
  const { text } = req.body || {};
  const post = db.communityPosts.find((entry) => entry.id === req.params.postId);
  if (!post || !String(text || "").trim()) {
    return res.status(400).json({ error: "Kommentar oder Benutzer fehlt." });
  }

  const user = req.authUser;
  const comment = {
    id: createId("comment"),
    authorId: user?.id,
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

app.get("/api/direct-messages", requireAuth, (_, res) => {
  res.json(db.directMessages || {});
});

app.post("/api/direct-messages", requireAuth, (req, res) => {
  const { threadId, text } = req.body || {};
  if (!threadId || !String(text || "").trim()) {
    return res.status(400).json({ error: "Thread, Sender oder Text fehlen." });
  }
  const tenantUserIds = new Set(db.users.filter((user) => user.tenantId === req.authUser.tenantId).map((user) => user.id));
  if (!threadId.split(":").some((id) => tenantUserIds.has(id))) {
    return res.status(403).json({ error: "Thread gehört nicht zu deiner Hochschule." });
  }

  const message = {
    id: createId("dm"),
    senderId: req.authUser.id,
    sender: "me",
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
    socket.data.tenantId = db.users.find((user) => user.id === userId)?.tenantId;
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
    void hydrateCloudDb().then(applySupportPassword);
  } else {
    console.log("Supabase is not configured; using local data/db.json storage.");
    void applySupportPassword();
  }
});
