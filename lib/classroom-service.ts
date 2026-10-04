import { getAllBatches, getBatchBySlug, Batch } from "@/lib/batches-service"

export type PresentationMode =
  | "camera"
  | "screenshare"
  | "whiteboard"
  | "dual"
  | "presentation"
  | "document"

export type ClassStatus = "UPCOMING" | "LIVE" | "ENDED" | "REPLAY"

export interface ClassroomSettings {
  showViewerCount: boolean
  showLiveBadge: boolean
  enablePolls: boolean
  enableQuestions: boolean
  enableNotes: boolean
  enableResources: boolean
  allowedModes: PresentationMode[]
}

export const DEFAULT_CLASSROOM_SETTINGS: ClassroomSettings = {
  showViewerCount: true,
  showLiveBadge: true,
  enablePolls: true,
  enableQuestions: true,
  enableNotes: true,
  enableResources: true,
  allowedModes: ["dual", "camera", "whiteboard", "screenshare", "presentation", "document"],
}

export interface ChatAttachment {
  title: string
  url: string
  type: "pdf" | "slides" | "code" | "link" | "image"
  size?: string
}

export interface ChatMessage {
  id: string
  userId: string
  userName: string
  userAvatar?: string
  role: "teacher" | "mentor" | "student"
  message: string
  timestamp: string
  timeOffsetSeconds: number
  isPinned?: boolean
  reactions?: Record<string, number>
  attachment?: ChatAttachment
}

export interface PollOption {
  id: string
  text: string
  votes: number
}

export interface ClassPoll {
  id: string
  type: "single" | "multiple" | "true_false" | "rating"
  question: string
  options: PollOption[]
  correctOptionId?: string
  explanation?: string
  durationSeconds: number
  isActive: boolean
  hasVoted?: boolean
  selectedOptionId?: string
  totalVotes: number
}

export interface ClassQuestion {
  id: string
  userId: string
  userName: string
  userAvatar?: string
  question: string
  timestamp: string
  timeOffset: string
  upvotes: number
  isUpvoted?: boolean
  isAnswered: boolean
  teacherAnswer?: string
  isPinned?: boolean
}

export interface StudentNote {
  id: string
  timestampSeconds: number
  timestampFormatted: string
  noteText: string
  createdAt: string
  topic?: string
}

export interface ClassResource {
  id: string
  title: string
  type: "pdf" | "slides" | "code" | "link" | "dpp"
  size?: string
  url: string
  description?: string
}

export interface LiveAssessmentQuestion {
  id: string
  question: string
  options: string[]
  correctAnswer: number
  explanation: string
  points: number
}

export interface LiveAssessment {
  id: string
  title: string
  durationSeconds: number
  questions: LiveAssessmentQuestion[]
  isReleased: boolean
}

export interface HandRaiseEntry {
  userId: string
  userName: string
  queuePosition: number
  isOnStage: boolean
  raisedAt: string
}

export interface ClassParticipant {
  id: string
  name: string
  avatar?: string
  role: "host" | "teacher" | "student" | "mentor"
  isCameraOn: boolean
  isMicOn: boolean
  isSpeaking: boolean
  isOnStage: boolean
  handRaised: boolean
  handRaisedAt?: string
  handRaisePosition?: number
  networkQuality: "excellent" | "good" | "weak" | "reconnecting"
}

export interface LiveClassData {
  id: string
  batchSlug: string
  batchTitle: string
  classTag: string
  subject: string
  topicTitle: string
  status: ClassStatus
  teacher: {
    name: string
    role: string
    avatar: string
    bio: string
  }
  streamUrl: string
  presentationMode: PresentationMode
  viewerCount: number
  durationMinutes: number
  elapsedSeconds: number
  scheduledStartTime: string
  isEnrolled: boolean
  attendancePercentage: number
  isChatDisabledByTeacher?: boolean
  isRecording?: boolean
  participants: ClassParticipant[]
  chatMessages: ChatMessage[]
  polls: ClassPoll[]
  questions: ClassQuestion[]
  notes: StudentNote[]
  resources: ClassResource[]
  liveAssessment: LiveAssessment
  handRaiseQueue: HandRaiseEntry[]
  releasedDpp?: {
    id: string
    title: string
    questionCount: number
    durationMinutes: number
    url: string
  }
  classroomSettings: ClassroomSettings
}

// In-memory store initialized with rich data for batches
const CLASSROOMS: Record<string, LiveClassData> = {
  "champs-6": {
    id: "class-champs-6",
    batchSlug: "champs-6",
    batchTitle: "Champs 2.0 2027 (Class 6)",
    classTag: "Class 6",
    subject: "Science & Physics",
    topicTitle: "Motion and Measurement of Distances — Concepts & Numerical Applications",
    status: "LIVE",
    teacher: {
      name: "Dr. Arvind Sharma",
      role: "Head of Science & Master Educator",
      avatar: "/curious-avatar.svg",
      bio: "10+ Years Experience • M.Sc (Gold Medalist), Ph.D • Trained 25,000+ school students",
    },
    streamUrl: "https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ?autoplay=1&mute=0&controls=0",
    presentationMode: "dual",
    viewerCount: 1842,
    durationMinutes: 60,
    elapsedSeconds: 2460, // 41 minutes in
    scheduledStartTime: "Today, 05:00 PM",
    isEnrolled: true,
    attendancePercentage: 88,
    chatMessages: [
      {
        id: "msg-pin",
        userId: "teacher-1",
        userName: "Dr. Arvind Sharma (Teacher)",
        role: "teacher",
        message: "📌 Welcome everyone! Please keep your NCERT Science Chapter 10 notebook ready. We are discussing standard units and rectlinear motion.",
        timestamp: "05:01 PM",
        timeOffsetSeconds: 60,
        isPinned: true,
        reactions: { "👍": 142, "❤️": 88 },
      },
      {
        id: "msg-1",
        userId: "stu-1",
        userName: "Aarav Gupta",
        role: "student",
        message: "Good evening Sir! Audio and video are crystal clear.",
        timestamp: "05:02 PM",
        timeOffsetSeconds: 120,
        reactions: { "👍": 12 },
      },
      {
        id: "msg-2",
        userId: "mentor-1",
        userName: "Pooja Verma (Doubt Mentor)",
        role: "mentor",
        message: "Welcome students! If you have any doubt, you can also submit it directly in the Questions tab so Sir can answer.",
        timestamp: "05:05 PM",
        timeOffsetSeconds: 300,
        reactions: { "👍": 34 },
      },
      {
        id: "msg-3",
        userId: "stu-2",
        userName: "Ananya Sharma",
        role: "student",
        message: "Sir, what is the difference between periodic motion and oscillatory motion?",
        timestamp: "05:22 PM",
        timeOffsetSeconds: 1320,
        reactions: { "💡": 19 },
      },
      {
        id: "msg-4",
        userId: "teacher-1",
        userName: "Dr. Arvind Sharma (Teacher)",
        role: "teacher",
        message: "Great question Ananya! Every oscillatory motion is periodic, but every periodic motion (like Earth rotation) is not oscillatory. Let us verify with a quick live poll!",
        timestamp: "05:24 PM",
        timeOffsetSeconds: 1440,
        reactions: { "👏": 95, "❤️": 51 },
      },
      {
        id: "msg-5",
        userId: "stu-3",
        userName: "Kabir Mehta",
        role: "student",
        message: "Understood clearly Sir! Ready for the poll!",
        timestamp: "05:25 PM",
        timeOffsetSeconds: 1500,
        reactions: { "🚀": 40 },
      },
    ],
    polls: [
      {
        id: "poll-1",
        type: "single",
        question: "A pendulum swings back and forth. What type of motion does it execute?",
        options: [
          { id: "opt-1", text: "Rectilinear Motion only", votes: 48 },
          { id: "opt-2", text: "Periodic & Oscillatory Motion", votes: 842 },
          { id: "opt-3", text: "Circular Motion", votes: 65 },
          { id: "opt-4", text: "Rotational Motion", votes: 21 },
        ],
        correctOptionId: "opt-2",
        explanation: "A simple pendulum repeats its to-and-fro path about a mean position at regular intervals, making it both periodic and oscillatory motion.",
        durationSeconds: 60,
        isActive: true,
        hasVoted: false,
        totalVotes: 976,
      },
    ],
    questions: [
      {
        id: "q-1",
        userId: "stu-101",
        userName: "Rohan Verma",
        question: "Why can cubits or handspans not be used as standard units of measurement?",
        timestamp: "05:14 PM",
        timeOffset: "14:20",
        upvotes: 74,
        isUpvoted: true,
        isAnswered: true,
        teacherAnswer: "Because human body proportions vary from person to person! Standard units like meters ensure uniform measurements across the globe.",
        isPinned: true,
      },
      {
        id: "q-2",
        userId: "stu-102",
        userName: "Sneha Reddy",
        question: "Is the movement of the blades of an electric ceiling fan periodic or circular motion?",
        timestamp: "05:28 PM",
        timeOffset: "28:10",
        upvotes: 42,
        isUpvoted: false,
        isAnswered: false,
      },
      {
        id: "q-3",
        userId: "stu-103",
        userName: "Devansh Singh",
        question: "How do we measure the length of a curved line using thread?",
        timestamp: "05:35 PM",
        timeOffset: "35:45",
        upvotes: 29,
        isUpvoted: false,
        isAnswered: false,
      },
    ],
    notes: [
      {
        id: "note-1",
        timestampSeconds: 620,
        timestampFormatted: "10:20",
        noteText: "Standard unit: SI unit of length is metre (m). 1 km = 1000 m, 1 m = 100 cm, 1 cm = 10 mm.",
        createdAt: "05:10 PM",
        topic: "SI Units",
      },
      {
        id: "note-2",
        timestampSeconds: 1450,
        timestampFormatted: "24:10",
        noteText: "Key Formula: Speed = Distance / Time. Every oscillatory motion is periodic but not vice-versa.",
        createdAt: "05:24 PM",
        topic: "Motion Types",
      },
    ],
    resources: [
      {
        id: "res-1",
        title: "Class 6 Science Chapter 10 — Handwritten Teacher Notes.pdf",
        type: "pdf",
        size: "4.2 MB",
        url: "/curious-hero-child.svg",
        description: "Complete summary diagrams with SI units and definitions.",
      },
      {
        id: "res-2",
        title: "Formula & Unit Conversion Quick Reference Sheet.pdf",
        type: "pdf",
        size: "1.1 MB",
        url: "/batch-green.svg",
        description: "Metre, kilometre, centimetre conversion charts.",
      },
      {
        id: "res-3",
        title: "Daily Practice Problem (DPP #12) — 15 Questions",
        type: "dpp",
        size: "15 MCQs",
        url: "#dpp",
        description: "Released right after live lecture concludes.",
      },
    ],
    liveAssessment: {
      id: "live-quiz-6",
      title: "Quick 5-Minute Concept Check: Motion & Measurements",
      durationSeconds: 240, // 4 mins
      isReleased: true,
      questions: [
        {
          id: "lq-1",
          question: "Which of the following is the standard international (SI) unit of length?",
          options: ["Foot", "Metre", "Centimetre", "Kilometre"],
          correctAnswer: 1,
          explanation: "The International System of Units (SI) adopts the metre (m) as standard unit of length.",
          points: 20,
        },
        {
          id: "lq-2",
          question: "How many millimetres are there in one metre?",
          options: ["10 mm", "100 mm", "1,000 mm", "10,000 mm"],
          correctAnswer: 2,
          explanation: "1 metre = 100 centimetres = 1,000 millimetres.",
          points: 20,
        },
        {
          id: "lq-3",
          question: "Motion of a child on a playground swing is an example of:",
          options: ["Periodic motion", "Rectilinear motion", "Circular motion only", "Random motion"],
          correctAnswer: 0,
          explanation: "The swing repeats its path after fixed intervals of time, which is periodic motion.",
          points: 20,
        },
        {
          id: "lq-4",
          question: "Which measurement cannot be performed directly with a straight wooden metre scale?",
          options: ["Length of a table", "Girth of a tree trunk", "Width of a book", "Height of a door"],
          correctAnswer: 1,
          explanation: "Tree trunks have curved surfaces; a flexible measuring tape or thread is required.",
          points: 20,
        },
        {
          id: "lq-5",
          question: "The motion of an electric train along a straight railway track is:",
          options: ["Rotational motion", "Rectilinear motion", "Periodic motion", "Circular motion"],
          correctAnswer: 1,
          explanation: "Motion along a straight line path is known as rectilinear motion.",
          points: 20,
        },
      ],
    },
    handRaiseQueue: [
      {
        userId: "user-current",
        userName: "You (Student)",
        queuePosition: 3,
        isOnStage: false,
        raisedAt: "05:32 PM",
      },
      {
        userId: "user-44",
        userName: "Devansh Roy",
        queuePosition: 1,
        isOnStage: true,
        raisedAt: "05:29 PM",
      },
      {
        userId: "user-59",
        userName: "Simran Kaur",
        queuePosition: 2,
        isOnStage: false,
        raisedAt: "05:30 PM",
      },
    ],
    releasedDpp: {
      id: "dpp-champs-6-10",
      title: "DPP #10: Motion, Measurements & Conversions",
      questionCount: 15,
      durationMinutes: 25,
      url: "/assessments",
    },
    participants: [
      {
        id: "p-t1",
        name: "Dr. Arvind Sharma",
        role: "host",
        isCameraOn: true,
        isMicOn: true,
        isSpeaking: true,
        isOnStage: true,
        handRaised: false,
        networkQuality: "excellent",
      },
      {
        id: "p-s1",
        name: "Devansh Roy",
        role: "student",
        isCameraOn: true,
        isMicOn: true,
        isSpeaking: false,
        isOnStage: true,
        handRaised: false,
        networkQuality: "excellent",
      },
      {
        id: "p-s2",
        name: "Simran Kaur",
        role: "student",
        isCameraOn: false,
        isMicOn: false,
        isSpeaking: false,
        isOnStage: false,
        handRaised: true,
        handRaisePosition: 2,
        networkQuality: "good",
      },
      {
        id: "p-s3",
        name: "Aarav Gupta",
        role: "student",
        isCameraOn: true,
        isMicOn: false,
        isSpeaking: false,
        isOnStage: false,
        handRaised: false,
        networkQuality: "excellent",
      },
      {
        id: "p-current",
        name: "You (Student)",
        role: "student",
        isCameraOn: false,
        isMicOn: false,
        isSpeaking: false,
        isOnStage: false,
        handRaised: false,
        networkQuality: "excellent",
      },
    ],
    classroomSettings: { ...DEFAULT_CLASSROOM_SETTINGS },
  },
  "upsc-foundation": {
    id: "class-upsc-foundation",
    batchSlug: "upsc-foundation",
    batchTitle: "UPSC FOUNDATION 2026-27",
    classTag: "Polity & Governance",
    subject: "Indian Polity & Constitution",
    topicTitle: "Fundamental Rights — Article 14",
    status: "LIVE",
    teacher: {
      name: "Rahul Sharma",
      role: "Senior Faculty & UPSC Mentor",
      avatar: "/curious-avatar.svg",
      bio: "Ex-Civil Servant • 12+ Years Teaching UPSC Aspirants • Mentored 150+ Selected Officers",
    },
    streamUrl: "https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ?autoplay=1&mute=0&controls=0",
    presentationMode: "camera",
    viewerCount: 1284,
    durationMinutes: 90,
    elapsedSeconds: 2840,
    scheduledStartTime: "Today, 06:00 PM",
    isEnrolled: true,
    attendancePercentage: 94,
    isChatDisabledByTeacher: false,
    isRecording: true,
    participants: [
      {
        id: "p-host-rahul",
        name: "Rahul Sharma",
        role: "host",
        isCameraOn: true,
        isMicOn: true,
        isSpeaking: true,
        isOnStage: true,
        handRaised: false,
        networkQuality: "excellent",
      },
      {
        id: "p-stu-a",
        name: "Student A (Pooja Rao)",
        role: "student",
        isCameraOn: true,
        isMicOn: false,
        isSpeaking: false,
        isOnStage: true,
        handRaised: false,
        networkQuality: "excellent",
      },
      {
        id: "p-stu-b",
        name: "Student B (Vikram Malhotra)",
        role: "student",
        isCameraOn: true,
        isMicOn: true,
        isSpeaking: true,
        isOnStage: false,
        handRaised: false,
        networkQuality: "good",
      },
      {
        id: "p-stu-c",
        name: "Student C (Kavita Iyer)",
        role: "student",
        isCameraOn: false,
        isMicOn: false,
        isSpeaking: false,
        isOnStage: false,
        handRaised: false,
        networkQuality: "weak",
      },
      {
        id: "p-stu-amit",
        name: "Amit",
        role: "student",
        isCameraOn: false,
        isMicOn: false,
        isSpeaking: false,
        isOnStage: false,
        handRaised: true,
        handRaisePosition: 4,
        handRaisedAt: "06:14 PM",
        networkQuality: "excellent",
      },
      {
        id: "p-current-user",
        name: "You (Student)",
        role: "student",
        isCameraOn: true,
        isMicOn: false,
        isSpeaking: false,
        isOnStage: false,
        handRaised: false,
        networkQuality: "excellent",
      },
    ],
    chatMessages: [
      {
        id: "msg-polity-pin",
        userId: "rahul-sharma",
        userName: "Rahul Sharma (Teacher)",
        role: "teacher",
        message: "📌 Welcome aspirants! Today we dissect Article 14: Equality before Law & Equal Protection of the Laws with Landmark Case Laws.",
        timestamp: "06:01 PM",
        timeOffsetSeconds: 60,
        isPinned: true,
        reactions: { "👍": 320, "❤️": 210 },
      },
      {
        id: "msg-polity-1",
        userId: "p-stu-a",
        userName: "Pooja Rao",
        role: "student",
        message: "Good evening Sir! The sound and video quality are fantastic.",
        timestamp: "06:02 PM",
        timeOffsetSeconds: 120,
        reactions: { "👍": 45 },
      },
      {
        id: "msg-polity-2",
        userId: "rahul-sharma",
        userName: "Rahul Sharma (Teacher)",
        role: "teacher",
        message: "Remember: 'Equality before law' is borrowed from British common law (negative concept), whereas 'Equal protection of laws' comes from the American Constitution (positive concept).",
        timestamp: "06:12 PM",
        timeOffsetSeconds: 720,
        reactions: { "💡": 142, "👏": 98 },
      },
    ],
    polls: [
      {
        id: "poll-art14-1",
        type: "single",
        question: "From which country's constitution is 'Equal Protection of the Laws' in Article 14 borrowed?",
        options: [
          { id: "opt-uk", text: "United Kingdom (British Common Law)", votes: 98 },
          { id: "opt-usa", text: "United States of America", votes: 842 },
          { id: "opt-ireland", text: "Ireland", votes: 41 },
          { id: "opt-france", text: "France", votes: 15 },
        ],
        correctOptionId: "opt-usa",
        explanation: "Equal protection of laws is of American origin under the 14th Amendment, providing parity of treatment under equal circumstances.",
        durationSeconds: 60,
        isActive: true,
        hasVoted: false,
        totalVotes: 996,
      },
    ],
    questions: [
      {
        id: "q-art14-1",
        userId: "p-stu-amit",
        userName: "Amit",
        question: "Sir, what was the test of reasonable classification established in the State of West Bengal v. Anwar Ali Sarkar case?",
        timestamp: "06:15 PM",
        timeOffset: "15:00",
        upvotes: 48,
        isUpvoted: true,
        isAnswered: true,
        teacherAnswer: "Classification must be founded on an intelligible differentia and must have a rational nexus to the object sought to be achieved.",
        isPinned: true,
      },
    ],
    notes: [
      {
        id: "note-1",
        timestampSeconds: 720,
        timestampFormatted: "12:00",
        noteText: "Article 14: Rule of Law is basic structure of Constitution (Indira Gandhi v. Raj Narain 1975).",
        createdAt: "06:12 PM",
        topic: "Doctrine of Equality",
      },
    ],
    resources: [
      {
        id: "res-art14-pdf",
        title: "UPSC GS-2: Article 14 Landmark Case Summaries (Maneka Gandhi, E.P. Royappa).pdf",
        type: "pdf",
        size: "4.2 MB",
        url: "/curious-hero-child.svg",
        description: "Official aspirantbook Handout with Mindmaps & Previous 10 Years Mains Questions.",
      },
    ],
    liveAssessment: {
      id: "live-quiz-art14",
      title: "5-Question Quick Check: Fundamental Rights & Article 14",
      durationSeconds: 300,
      isReleased: true,
      questions: [
        {
          id: "q1",
          question: "Which landmark case propounded the 'New Doctrine of Equality' against arbitrariness?",
          options: ["E.P. Royappa v. State of Tamil Nadu", "Kesavananda Bharati Case", "Golaknath Case", "Minerva Mills Case"],
          correctAnswer: 0,
          explanation: "Justice P.N. Bhagwati stated equality is dynamic and antithetic to arbitrariness in E.P. Royappa (1974).",
          points: 20,
        },
        {
          id: "q2",
          question: "Does Article 14 apply only to Indian citizens or to all persons?",
          options: ["Citizens only", "All persons (including non-citizens and legal entities)", "Government officials only", "Permanent residents only"],
          correctAnswer: 1,
          explanation: "Article 14 confers the right to 'any person', extending to citizens, foreigners, corporations, and registered societies.",
          points: 20,
        },
      ],
    },
    handRaiseQueue: [
      {
        userId: "p-stu-amit",
        userName: "Amit",
        queuePosition: 4,
        isOnStage: false,
        raisedAt: "06:14 PM",
      },
      {
        userId: "p-stu-11",
        userName: "Neha Singh",
        queuePosition: 1,
        isOnStage: false,
        raisedAt: "06:10 PM",
      },
      {
        userId: "p-stu-22",
        userName: "Rohan Verma",
        queuePosition: 2,
        isOnStage: false,
        raisedAt: "06:11 PM",
      },
      {
        userId: "p-stu-33",
        userName: "Ananya Dixit",
        queuePosition: 3,
        isOnStage: false,
        raisedAt: "06:12 PM",
      },
    ],
    releasedDpp: {
      id: "dpp-upsc-art14",
      title: "DPP #24: Article 14 & Rule of Law Mains Practice",
      questionCount: 10,
      durationMinutes: 30,
      url: "/assessments",
    },
    classroomSettings: { ...DEFAULT_CLASSROOM_SETTINGS },
  },
  "half-yearly-6": {
    id: "class-half-yearly-6",
    batchSlug: "half-yearly-6",
    batchTitle: "Half Yearly Marathon (Class 6)",
    classTag: "Class 6th",
    subject: "Mathematics & Science",
    topicTitle: "Integers & Fractions: Rapid Revision & Live Problem Solving",
    status: "LIVE",
    teacher: {
      name: "Prof. Rajesh Sharma",
      role: "Head of Mathematics & Foundation Expert",
      avatar: "/curious-avatar.svg",
      bio: "15+ Years Teaching Experience • Trained 20,000+ Students for School & Olympiad Exams",
    },
    streamUrl: "https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ?autoplay=1&mute=0&controls=0",
    presentationMode: "camera",
    viewerCount: 940,
    durationMinutes: 75,
    elapsedSeconds: 1980,
    scheduledStartTime: "Today, 05:30 PM",
    isEnrolled: true,
    attendancePercentage: 91,
    isChatDisabledByTeacher: false,
    isRecording: true,
    participants: [
      {
        id: "p-host-rajesh",
        name: "Prof. Rajesh Sharma",
        role: "host",
        isCameraOn: true,
        isMicOn: true,
        isSpeaking: true,
        isOnStage: true,
        handRaised: false,
        networkQuality: "excellent",
      },
      {
        id: "p-stu-1",
        name: "Aarav Gupta",
        role: "student",
        isCameraOn: true,
        isMicOn: false,
        isSpeaking: false,
        isOnStage: true,
        handRaised: false,
        networkQuality: "excellent",
      },
      {
        id: "p-stu-2",
        name: "Ananya Dixit",
        role: "student",
        isCameraOn: false,
        isMicOn: false,
        isSpeaking: false,
        isOnStage: false,
        handRaised: true,
        handRaisePosition: 1,
        networkQuality: "good",
      },
      {
        id: "p-current-user",
        name: "You (Student)",
        role: "student",
        isCameraOn: true,
        isMicOn: false,
        isSpeaking: false,
        isOnStage: false,
        handRaised: false,
        networkQuality: "excellent",
      },
    ],
    chatMessages: [
      {
        id: "msg-hy-pin",
        userId: "rajesh-sharma",
        userName: "Prof. Rajesh Sharma (Teacher)",
        role: "teacher",
        message: "📌 Welcome students! Keep your Maths notebook open. We are solving 10 high-weightage half-yearly marathon problems.",
        timestamp: "05:31 PM",
        timeOffsetSeconds: 60,
        isPinned: true,
        reactions: { "👍": 180, "❤️": 95 },
      },
      {
        id: "msg-hy-1",
        userId: "p-stu-1",
        userName: "Aarav Gupta",
        role: "student",
        message: "Good evening Sir! Ready with NCERT exemplar Chapter 3.",
        timestamp: "05:32 PM",
        timeOffsetSeconds: 120,
        reactions: { "👍": 24 },
      },
    ],
    polls: [
      {
        id: "poll-hy-1",
        type: "single",
        question: "What is the product of (-15) and (-4)?",
        options: [
          { id: "opt-1", text: "-60", votes: 34 },
          { id: "opt-2", text: "+60", votes: 412 },
          { id: "opt-3", text: "-19", votes: 8 },
          { id: "opt-4", text: "+19", votes: 12 },
        ],
        correctOptionId: "opt-2",
        explanation: "The product of two negative integers is always a positive integer: (-a) * (-b) = +(a * b).",
        durationSeconds: 45,
        isActive: true,
        hasVoted: false,
        totalVotes: 466,
      },
    ],
    questions: [
      {
        id: "q-hy-1",
        userId: "p-stu-2",
        userName: "Ananya Dixit",
        question: "Sir, when adding two integers with different signs, which sign does the result take?",
        timestamp: "05:40 PM",
        timeOffset: "10:00",
        upvotes: 38,
        isUpvoted: true,
        isAnswered: true,
        teacherAnswer: "The sum takes the sign of the integer with the greater absolute numerical value.",
        isPinned: true,
      },
    ],
    notes: [
      {
        id: "note-hy-1",
        timestampSeconds: 600,
        timestampFormatted: "10:00",
        noteText: "Rules of Integers: Product of same signs = positive; opposite signs = negative.",
        createdAt: "05:40 PM",
        topic: "Multiplication of Integers",
      },
    ],
    resources: [
      {
        id: "res-hy-maths",
        title: "Class 6 Maths Half-Yearly Quick Formula & Practice Sheet.pdf",
        type: "pdf",
        size: "3.2 MB",
        url: "/curious-hero-child.svg",
        description: "Official aspirantbook Handout with step-by-step solved examples.",
      },
    ],
    liveAssessment: {
      id: "live-quiz-hy-6",
      title: "Quick 5-Minute Marathon Quiz: Integers & Fractions",
      durationSeconds: 240,
      isReleased: true,
      questions: [
        {
          id: "qh1",
          question: "Which of the following integers is smallest?",
          options: ["0", "-1", "-10", "5"],
          correctAnswer: 2,
          explanation: "-10 lies furthest to the left on the number line, hence it is the smallest.",
          points: 25,
        },
      ],
    },
    handRaiseQueue: [
      {
        userId: "p-stu-2",
        userName: "Ananya Dixit",
        queuePosition: 1,
        isOnStage: false,
        raisedAt: "05:42 PM",
      },
    ],
    releasedDpp: {
      id: "dpp-hy-6",
      title: "DPP: Class 6 Maths Integers Practice Sheet",
      questionCount: 15,
      durationMinutes: 20,
      url: "/assessments",
    },
    classroomSettings: { ...DEFAULT_CLASSROOM_SETTINGS },
  },
}

export async function getClassroomData(idOrSlug: string): Promise<LiveClassData> {
  const normalized = idOrSlug.trim().toLowerCase()
  if (CLASSROOMS[normalized]) {
    if (!CLASSROOMS[normalized].classroomSettings) {
      CLASSROOMS[normalized].classroomSettings = { ...DEFAULT_CLASSROOM_SETTINGS }
    }
    return CLASSROOMS[normalized]
  }

  // Generate fallback from batch metadata if batch exists
  const batch = await getBatchBySlug(normalized)
  const title = batch ? batch.title : `Live Class: ${idOrSlug}`
  const classTag = batch ? batch.classTag : "School Prep"
  const teacher = batch?.teachers?.[0] || {
    name: "Master Educator",
    role: "Senior Faculty",
    avatar: "/curious-avatar.svg",
    bio: "Passionate school mentor and educator.",
  }

  const generated: LiveClassData = {
    id: `class-${normalized}`,
    batchSlug: normalized,
    batchTitle: title,
    classTag,
    subject: "Core Foundation",
    topicTitle: `Interactive Live Masterclass: ${title}`,
    status: "LIVE",
    teacher: {
      name: teacher.name,
      role: teacher.role,
      avatar: teacher.avatar || "/curious-avatar.svg",
      bio: ('qualification' in teacher ? (teacher.qualification as string) : ('bio' in teacher ? (teacher.bio as string) : '')) || "Senior Academic Expert",
    },
    streamUrl: "https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ?autoplay=1&mute=0&controls=0",
    presentationMode: "dual",
    viewerCount: 1240,
    durationMinutes: 60,
    elapsedSeconds: 1800,
    scheduledStartTime: "Today, 05:00 PM",
    isEnrolled: true,
    attendancePercentage: 92,
    chatMessages: [
      {
        id: "msg-p",
        userId: "t-1",
        userName: teacher.name + " (Teacher)",
        role: "teacher",
        message: "📌 Welcome to today live class! Please participate actively in the polls.",
        timestamp: "05:00 PM",
        timeOffsetSeconds: 0,
        isPinned: true,
      },
    ],
    polls: [
      {
        id: "poll-gen",
        type: "single",
        question: "Are you following the derivation discussed so far?",
        options: [
          { id: "o1", text: "Yes, 100% clear!", votes: 412 },
          { id: "o2", text: "Mostly clear, need one revision", votes: 120 },
          { id: "o3", text: "Please repeat last step", votes: 34 },
        ],
        correctOptionId: "o1",
        explanation: "Great job! Keep notes handy for the upcoming assessment.",
        durationSeconds: 60,
        isActive: true,
        hasVoted: false,
        totalVotes: 566,
      },
    ],
    questions: [],
    notes: [],
    resources: [
      {
        id: "res-gen-1",
        title: `Class Notes — ${title}.pdf`,
        type: "pdf",
        size: "3.5 MB",
        url: "/curious-hero-child.svg",
      },
    ],
    liveAssessment: {
      id: "live-quiz-gen",
      title: "In-Class Mini Assessment",
      durationSeconds: 300,
      isReleased: true,
      questions: [
        {
          id: "q-gen-1",
          question: "Which approach gives the highest retention in active learning?",
          options: ["Passive reading", "Practice & instant doubts", "Rote memorization", "Skimming"],
          correctAnswer: 1,
          explanation: "Practice and instant feedback yield the highest retention.",
          points: 25,
        },
      ],
    },
    handRaiseQueue: [],
    participants: [
      {
        id: "p-host-gen",
        name: teacher.name,
        role: "host",
        isCameraOn: true,
        isMicOn: true,
        isSpeaking: true,
        isOnStage: true,
        handRaised: false,
        networkQuality: "excellent",
      },
      {
        id: "p-stu-current",
        name: "You (Student)",
        role: "student",
        isCameraOn: true,
        isMicOn: false,
        isSpeaking: false,
        isOnStage: false,
        handRaised: false,
        networkQuality: "excellent",
      },
    ],
    classroomSettings: { ...DEFAULT_CLASSROOM_SETTINGS },
  }

  CLASSROOMS[normalized] = generated
  return generated
}

export async function addChatMessage(
  classId: string,
  message: { userId: string; userName: string; text: string; role?: "teacher" | "mentor" | "student"; attachment?: ChatAttachment }
): Promise<ChatMessage> {
  const classroom = await getClassroomData(classId)
  const newMsg: ChatMessage = {
    id: `msg-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
    userId: message.userId,
    userName: message.userName,
    role: message.role || "student",
    message: message.text,
    attachment: message.attachment,
    timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    timeOffsetSeconds: classroom.elapsedSeconds,
    reactions: {},
  }
  classroom.chatMessages.push(newMsg)
  return newMsg
}

export async function submitPollVote(
  classId: string,
  pollId: string,
  optionId: string
): Promise<ClassPoll | null> {
  const classroom = await getClassroomData(classId)
  const poll = classroom.polls.find((p) => p.id === pollId)
  if (!poll) return null

  const opt = poll.options.find((o) => o.id === optionId)
  if (opt) {
    opt.votes += 1
    poll.totalVotes += 1
    poll.hasVoted = true
    poll.selectedOptionId = optionId
  }
  return poll
}

export async function submitQuestion(
  classId: string,
  data: { userId: string; userName: string; question: string }
): Promise<ClassQuestion> {
  const classroom = await getClassroomData(classId)
  const newQ: ClassQuestion = {
    id: `q-${Date.now()}`,
    userId: data.userId,
    userName: data.userName,
    question: data.question,
    timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    timeOffset: `${Math.floor(classroom.elapsedSeconds / 60)}:${(classroom.elapsedSeconds % 60).toString().padStart(2, "0")}`,
    upvotes: 1,
    isUpvoted: true,
    isAnswered: false,
  }
  classroom.questions.unshift(newQ)
  return newQ
}

export async function upvoteQuestion(classId: string, questionId: string): Promise<ClassQuestion | null> {
  const classroom = await getClassroomData(classId)
  const q = classroom.questions.find((item) => item.id === questionId)
  if (!q) return null
  if (q.isUpvoted) {
    q.upvotes = Math.max(0, q.upvotes - 1)
    q.isUpvoted = false
  } else {
    q.upvotes += 1
    q.isUpvoted = true
  }
  return q
}

export async function addStudentNote(
  classId: string,
  noteText: string,
  seconds: number
): Promise<StudentNote> {
  const classroom = await getClassroomData(classId)
  const mins = Math.floor(seconds / 60)
  const remSec = Math.floor(seconds % 60)
  const newNote: StudentNote = {
    id: `note-${Date.now()}`,
    timestampSeconds: seconds,
    timestampFormatted: `${mins.toString().padStart(2, "0")}:${remSec.toString().padStart(2, "0")}`,
    noteText,
    createdAt: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
  }
  classroom.notes.unshift(newNote)
  return newNote
}

export async function toggleHandRaise(
  classId: string,
  userId: string,
  userName: string
): Promise<{ handRaised: boolean; queuePosition: number }> {
  const classroom = await getClassroomData(classId)
  const index = classroom.handRaiseQueue.findIndex((h) => h.userId === userId)
  if (index !== -1) {
    classroom.handRaiseQueue.splice(index, 1)
    return { handRaised: false, queuePosition: 0 }
  } else {
    const queuePos = classroom.handRaiseQueue.length + 1
    classroom.handRaiseQueue.push({
      userId,
      userName,
      queuePosition: queuePos,
      isOnStage: false,
      raisedAt: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    })
    return { handRaised: true, queuePosition: queuePos }
  }
}

export async function updatePresentationMode(
  classId: string,
  mode: PresentationMode
): Promise<PresentationMode> {
  const classroom = await getClassroomData(classId)
  classroom.presentationMode = mode
  return classroom.presentationMode
}

export async function endClassAndReleaseDpp(classId: string): Promise<LiveClassData> {
  const classroom = await getClassroomData(classId)
  classroom.status = "ENDED"
  classroom.releasedDpp = {
    id: `dpp-${classroom.batchSlug}-${Date.now()}`,
    title: `Daily Practice Problem (DPP) — ${classroom.topicTitle}`,
    questionCount: 15,
    durationMinutes: 25,
    url: "/assessments",
  }
  return classroom
}

export async function updateClassroomSettings(
  classId: string,
  settings: Partial<ClassroomSettings>
): Promise<ClassroomSettings> {
  const classroom = await getClassroomData(classId)
  classroom.classroomSettings = {
    ...classroom.classroomSettings,
    ...settings,
  }
  return classroom.classroomSettings
}

export async function scheduleClass(
  classId: string,
  data: {
    topicTitle?: string
    subject?: string
    scheduledStartTime?: string
    durationMinutes?: number
  }
): Promise<LiveClassData> {
  const classroom = await getClassroomData(classId)
  if (data.topicTitle) classroom.topicTitle = data.topicTitle
  if (data.subject) classroom.subject = data.subject
  if (data.scheduledStartTime) classroom.scheduledStartTime = data.scheduledStartTime
  if (data.durationMinutes) classroom.durationMinutes = data.durationMinutes
  return classroom
}

export async function setTeacherClassStatus(
  classId: string,
  status: ClassStatus
): Promise<LiveClassData> {
  const classroom = await getClassroomData(classId)
  classroom.status = status
  if (status === "LIVE") {
    classroom.chatMessages.push({
      id: `live-start-${Date.now()}`,
      userId: "system",
      userName: "Classroom System",
      role: "mentor",
      message: "🔴 Live lecture is now in progress! Teacher has started the broadcast.",
      timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      timeOffsetSeconds: classroom.elapsedSeconds || 0,
    })
  }
  if (status === "ENDED") {
    if (!classroom.releasedDpp) {
      classroom.releasedDpp = {
        id: `dpp-${classroom.batchSlug}-${Date.now()}`,
        title: `Daily Practice Problem (DPP) — ${classroom.topicTitle}`,
        questionCount: 15,
        durationMinutes: 25,
        url: "/assessments",
      }
    }
    classroom.chatMessages.push({
      id: `live-end-${Date.now()}`,
      userId: "system",
      userName: "Classroom System",
      role: "mentor",
      message: "🏁 The teacher has concluded today's live lecture. Practice questions (DPP) are now unlocked!",
      timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      timeOffsetSeconds: classroom.elapsedSeconds || 0,
    })
  }
  return classroom
}

export async function sendResourceViaChat(
  classId: string,
  resource: {
    title: string
    url: string
    type: "pdf" | "slides" | "code" | "link" | "image"
    size?: string
    note?: string
  }
): Promise<ChatMessage> {
  const classroom = await getClassroomData(classId)
  const newMsg: ChatMessage = {
    id: `res-msg-${Date.now()}`,
    userId: "teacher-main",
    userName: `${classroom.teacher.name} (Teacher)`,
    role: "teacher",
    message: resource.note || `📎 Shared resource: "${resource.title}". Tap below to view or download.`,
    timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    timeOffsetSeconds: classroom.elapsedSeconds || 0,
    isPinned: true,
    attachment: {
      title: resource.title,
      url: resource.url,
      type: resource.type,
      size: resource.size || "2.4 MB",
    },
  }
  classroom.chatMessages.push(newMsg)
  return newMsg
}

export async function deletePoll(classId: string, pollId: string): Promise<ClassPoll[]> {
  const classroom = await getClassroomData(classId)
  classroom.polls = classroom.polls.filter((p) => p.id !== pollId)
  return classroom.polls
}

export async function deleteQuestion(classId: string, questionId: string): Promise<ClassQuestion[]> {
  const classroom = await getClassroomData(classId)
  classroom.questions = classroom.questions.filter((q) => q.id !== questionId)
  return classroom.questions
}

export async function deleteResource(classId: string, resourceId: string): Promise<ClassResource[]> {
  const classroom = await getClassroomData(classId)
  classroom.resources = classroom.resources.filter((r) => r.id !== resourceId)
  return classroom.resources
}

export async function toggleChatDisabledByTeacher(classId: string, disabled: boolean): Promise<boolean> {
  const classroom = await getClassroomData(classId)
  classroom.isChatDisabledByTeacher = disabled
  return classroom.isChatDisabledByTeacher
}

export async function toggleRecordingStatus(classId: string, isRecording: boolean): Promise<boolean> {
  const classroom = await getClassroomData(classId)
  classroom.isRecording = isRecording
  return classroom.isRecording
}

export async function muteParticipant(classId: string, participantId: string): Promise<ClassParticipant | null> {
  const classroom = await getClassroomData(classId)
  const participant = classroom.participants.find((p) => p.id === participantId)
  if (participant) {
    participant.isMicOn = false
    participant.isSpeaking = false
    return participant
  }
  return null
}

export async function requestUnmuteParticipant(classId: string, participantId: string): Promise<{ success: boolean; message: string }> {
  const classroom = await getClassroomData(classId)
  const participant = classroom.participants.find((p) => p.id === participantId)
  if (participant) {
    // In realistic WebRTC, server sends a prompt request to the student
    return { success: true, message: `Unmute invitation sent to ${participant.name}` }
  }
  return { success: false, message: "Participant not found" }
}

export async function disableParticipantCamera(classId: string, participantId: string): Promise<ClassParticipant | null> {
  const classroom = await getClassroomData(classId)
  const participant = classroom.participants.find((p) => p.id === participantId)
  if (participant) {
    participant.isCameraOn = false
    return participant
  }
  return null
}

export async function removeParticipant(classId: string, participantId: string): Promise<ClassParticipant[]> {
  const classroom = await getClassroomData(classId)
  classroom.participants = classroom.participants.filter((p) => p.id !== participantId)
  classroom.handRaiseQueue = classroom.handRaiseQueue.filter((h) => h.userId !== participantId)
  return classroom.participants
}

export async function bringParticipantToStage(classId: string, participantId: string): Promise<ClassParticipant | null> {
  const classroom = await getClassroomData(classId)
  const participant = classroom.participants.find((p) => p.id === participantId)
  if (participant) {
    participant.isOnStage = true
    participant.handRaised = false
    // Also update queue if present
    const qIndex = classroom.handRaiseQueue.findIndex((h) => h.userId === participantId)
    if (qIndex !== -1) {
      classroom.handRaiseQueue[qIndex].isOnStage = true
    }
    return participant
  }
  return null
}

export async function removeParticipantFromStage(classId: string, participantId: string): Promise<ClassParticipant | null> {
  const classroom = await getClassroomData(classId)
  const participant = classroom.participants.find((p) => p.id === participantId)
  if (participant) {
    participant.isOnStage = false
    const qIndex = classroom.handRaiseQueue.findIndex((h) => h.userId === participantId)
    if (qIndex !== -1) {
      classroom.handRaiseQueue.splice(qIndex, 1)
    }
    return participant
  }
  return null
}

export async function createTeacherPoll(
  classId: string,
  pollData: { question: string; options: string[]; durationSeconds?: number }
): Promise<ClassPoll> {
  const classroom = await getClassroomData(classId)
  const newPoll: ClassPoll = {
    id: `poll-${Date.now()}`,
    type: "single",
    question: pollData.question,
    options: pollData.options.map((opt, i) => ({
      id: `opt-${i + 1}`,
      text: opt,
      votes: 0,
    })),
    durationSeconds: pollData.durationSeconds || 60,
    isActive: true,
    hasVoted: false,
    totalVotes: 0,
  }
  classroom.polls.unshift(newPoll)
  return newPoll
}

export function generateClassSessionToken(classId: string, userId: string, role: string): { token: string; expiresAt: number } {
  const expiresAt = Date.now() + 1000 * 60 * 180 // 3 hours
  const payload = `${classId}:${userId}:${role}:${expiresAt}`
  // Basic mock token encoding for session
  const token = typeof Buffer !== "undefined" ? Buffer.from(payload).toString("base64") : btoa(payload)
  return { token, expiresAt }
}

