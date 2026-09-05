import { BuddyProfile, CommunityPost, JobListing, QuickLink, ScheduleItem } from "@/types";

export const quickLinks: QuickLink[] = [
  { id: "moodle", label: "Moodle", icon: "book-outline" },
  { id: "campus", label: "Campus-Portal", icon: "school-outline" },
  { id: "mail", label: "Uni-Mail", icon: "mail-outline" },
  { id: "library", label: "Bibliothek", icon: "library-outline" },
  { id: "cafeteria", label: "Mensaplan", icon: "restaurant-outline" },
  { id: "grades", label: "Noten", icon: "stats-chart-outline" },
];

export const todaySchedule: ScheduleItem[] = [
  { id: "1", day: "Montag", time: "08:15 – 09:45", course: "Lineare Algebra II", room: "Hörsaal A1", type: "Vorlesung" },
  { id: "2", day: "Montag", time: "10:00 – 11:30", course: "Datenbanksysteme", room: "Raum 2.14", type: "Übung" },
  { id: "3", day: "Montag", time: "13:00 – 14:30", course: "Softwaretechnik", room: "Labor 3", type: "Labor" },
  { id: "4", day: "Montag", time: "15:00 – 16:30", course: "BWL Grundlagen", room: "Hörsaal C3", type: "Seminar" },
];

export const buddyProfiles: BuddyProfile[] = [
  {
    id: "2",
    name: "Tom",
    degree: "Wirtschaftsingenieurwesen",
    semester: 2,
    offers: ["BWL", "Excel"],
    wants: ["Java", "Klausurvorbereitung Mathe"],
    matchScore: 87,
    avatarColor: "#FF7A59",
    campus: "Campus Nord",
  },
  {
    id: "3",
    name: "Sara",
    degree: "Medizin",
    semester: 6,
    offers: ["Anatomie", "Biochemie"],
    wants: ["Statistik", "Java"],
    matchScore: 78,
    avatarColor: "#3ECF8E",
    campus: "Campus Süd",
  },
  {
    id: "4",
    name: "Ben",
    degree: "Anglistik",
    semester: 3,
    offers: ["Englisch", "Essay-Feedback"],
    wants: ["Statistik", "Excel"],
    matchScore: 71,
    avatarColor: "#FFC24B",
    campus: "Campus Nord",
  },
];

export const jobListings: JobListing[] = [
  {
    id: "1",
    title: "Werkstudent Softwareentwicklung (m/w/d)",
    company: "NordTech GmbH",
    type: "Werkstudent",
    location: "Hamburg · Hybrid",
    postedDaysAgo: 1,
    tags: ["React", "TypeScript", "20h/Woche"],
  },
  {
    id: "2",
    title: "Praktikum Data Analytics",
    company: "MetricLab",
    type: "Praktikum",
    location: "Remote",
    postedDaysAgo: 2,
    tags: ["SQL", "Python", "6 Monate"],
  },
  {
    id: "3",
    title: "Werkstudent Marketing (m/w/d)",
    company: "Campus Media",
    type: "Werkstudent",
    location: "Berlin · Vor Ort",
    postedDaysAgo: 4,
    tags: ["Social Media", "Content", "15h/Woche"],
  },
  {
    id: "4",
    title: "Minijob Bibliotheksaufsicht",
    company: "Universitätsbibliothek",
    type: "Minijob",
    location: "Campus Nord",
    postedDaysAgo: 6,
    tags: ["Flexibel", "556€-Basis"],
  },
];

export const communityPosts: CommunityPost[] = [
  {
    id: "1",
    author: "Mira K.",
    avatarColor: "#7C6CFF",
    content:
      "Lerngruppe für die Statistik-Klausur nächste Woche? Wir treffen uns Dienstag 17 Uhr in der Bib, 3. Stock.",
    course: "Statistik I",
    comments: 6,
    timeAgo: "2 Std.",
  },
  {
    id: "3",
    author: "Aylin T.",
    avatarColor: "#3ECF8E",
    content: "Kleiner Reminder: Rückmeldefrist für nächstes Semester endet in 3 Tagen!",
    comments: 2,
    timeAgo: "1 Tag",
  },
];
