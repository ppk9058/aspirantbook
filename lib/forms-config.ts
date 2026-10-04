export interface FormField {
  name: string
  label: string
  type: "text" | "email" | "tel" | "number" | "select" | "textarea" | "file" | "rating"
  placeholder?: string
  options?: string[]
  required?: boolean
  helpText?: string
  accept?: string
}

export interface FormDefinition {
  slug: string
  title: string
  description: string
  badge: string
  category: "admissions" | "scholarships" | "evaluations" | "support"
  fields: FormField[]
}

export interface FormSubmission {
  id: string
  formSlug: string
  userId?: string
  userName?: string
  userEmail?: string
  data: Record<string, any>
  attachmentUrl?: string
  attachmentName?: string
  status: "SUBMITTED" | "UNDER_REVIEW" | "APPROVED" | "REJECTED" | "RESOLVED"
  adminNotes?: string
  submittedAt: string
}

export const FORM_DEFINITIONS: Record<string, FormDefinition> = {
  admission: {
    slug: "admission",
    title: "Batch Admission Application",
    description: "Apply for seat reservation and admission into our premium engineering & AI batches.",
    badge: "Official Admission",
    category: "admissions",
    fields: [
      { name: "fullName", label: "Full Legal Name", type: "text", placeholder: "e.g. Rahul Sharma", required: true },
      { name: "email", label: "Email Address", type: "email", placeholder: "rahul@example.com", required: true },
      { name: "phone", label: "Contact / WhatsApp Number", type: "tel", placeholder: "+91 9876543210", required: true },
      {
        name: "targetBatch",
        label: "Select Target Batch",
        type: "select",
        options: [
          "Foundation Batch 2026 (AI & Data Science)",
          "Full Stack Web & Distributed Systems",
          "Advanced Machine Learning & LLMs",
          "DSA & Competitive Programming Bootcamp",
        ],
        required: true,
      },
      {
        name: "qualification",
        label: "Highest Education Qualification",
        type: "select",
        options: ["B.Tech / B.E. / B.Sc (Computer Science)", "Other Engineering Degree", "High School / Class 12", "Working Professional / Career Transition"],
        required: true,
      },
      {
        name: "statement",
        label: "Why do you want to join this program?",
        type: "textarea",
        placeholder: "Tell us about your learning goals and career aspirations...",
        required: true,
      },
      {
        name: "resumeOrId",
        label: "Upload Resume or Student ID Proof (PDF/Image)",
        type: "file",
        accept: "application/pdf,image/*",
        helpText: "Accepted formats: PDF, PNG, JPG up to 10MB",
      },
    ],
  },
  scholarship: {
    slug: "scholarship",
    title: "National Merit & Need-based Scholarship",
    description: "Qualify for up to 100% fee waiver based on academic excellence or financial need.",
    badge: "Up to 100% Waiver",
    category: "scholarships",
    fields: [
      { name: "fullName", label: "Applicant Name", type: "text", placeholder: "e.g. Priya Patel", required: true },
      { name: "email", label: "Email Address", type: "email", placeholder: "priya@example.com", required: true },
      { name: "phone", label: "Phone Number", type: "tel", placeholder: "+91 9876543210", required: true },
      { name: "institution", label: "Current College / University / School", type: "text", placeholder: "e.g. IIT Delhi / DTU / Delhi Public School", required: true },
      {
        name: "annualIncome",
        label: "Annual Family Income Bracket",
        type: "select",
        options: ["Below 2.5 LPA", "2.5 LPA - 5 LPA", "5 LPA - 8 LPA", "Above 8 LPA"],
        required: true,
      },
      { name: "cgpa", label: "Current CGPA or 12th Board %", type: "text", placeholder: "e.g. 9.2 CGPA or 94.5%", required: true },
      {
        name: "testDate",
        label: "Preferred Online Scholarship Test Date",
        type: "select",
        options: ["Saturday (11:00 AM - 12:30 PM)", "Sunday (4:00 PM - 5:30 PM)", "Next Weekend"],
        required: true,
      },
      {
        name: "marksheet",
        label: "Upload Latest Marksheet or Income Certificate",
        type: "file",
        accept: "application/pdf,image/*",
        helpText: "Official marksheet or income affidavit in PDF/PNG format",
        required: true,
      },
    ],
  },
  feedback: {
    slug: "feedback",
    title: "Course & Faculty Quality Feedback",
    description: "Help us continually maintain academic excellence and improve your classroom experience.",
    badge: "Student Voice",
    category: "evaluations",
    fields: [
      {
        name: "courseName",
        label: "Select Course or Batch",
        type: "select",
        options: [
          "Python for Beginners & Data Science",
          "Data Science & Machine Learning Bootcamp",
          "Live Classroom Interactive Session",
          "Full-Stack Web Development Track",
        ],
        required: true,
      },
      {
        name: "teachingQuality",
        label: "Teacher Explanation & Clarity (1 - 5 Stars)",
        type: "select",
        options: ["5 - Outstanding", "4 - Very Good", "3 - Average", "2 - Needs Improvement", "1 - Unsatisfactory"],
        required: true,
      },
      {
        name: "pace",
        label: "Lecture Pace",
        type: "select",
        options: ["Just Right", "Slightly Too Fast", "Slightly Too Slow"],
        required: true,
      },
      {
        name: "comments",
        label: "Detailed Feedback & Suggestions",
        type: "textarea",
        placeholder: "What went well? What could our teachers or platform do better?",
        required: true,
      },
    ],
  },
  support: {
    slug: "support",
    title: "Academic & Technical Mentor Support",
    description: "Submit a priority support ticket for live stream issues, billing questions, or portal access.",
    badge: "Priority Helpdesk",
    category: "support",
    fields: [
      { name: "subject", label: "Issue Summary / Subject", type: "text", placeholder: "e.g. Live stream lag on Mobile Web", required: true },
      {
        name: "category",
        label: "Issue Category",
        type: "select",
        options: ["Live Classroom / Streaming", "Video Playback / Notes", "Payment / Invoice / Subscription", "CBT Test / Assessment Bug", "Other"],
        required: true,
      },
      {
        name: "priority",
        label: "Priority Level",
        type: "select",
        options: ["Low", "Medium", "High", "Critical / Class Blocked"],
        required: true,
      },
      {
        name: "details",
        label: "Describe the Issue with Reproduction Steps",
        type: "textarea",
        placeholder: "Please describe what happened, your browser/device, and any error message you saw...",
        required: true,
      },
      {
        name: "screenshot",
        label: "Attach Screenshot or Error Log (Optional)",
        type: "file",
        accept: "image/*,application/pdf",
        helpText: "Screenshots help our engineering team resolve issues in minutes",
      },
    ],
  },
}
