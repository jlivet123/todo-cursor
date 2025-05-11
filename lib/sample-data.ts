import { format, addDays, startOfToday } from "date-fns"
import type { Task } from "./storage"

// Generate dates for the next 7 days
const today = startOfToday()
const dates = Array.from({ length: 7 }, (_, i) => {
  const date = addDays(today, i)
  return format(date, "MMM d")
})

// Sample tasks with different categories, completion statuses, and features
export const sampleTasks: Task[] = [
  // Day 1 (Today)
  {
    id: "task-1",
    text: "Complete project proposal",
    completed: false,
    category: "work",
    timeDisplay: "1:30",
    startDate: dates[0],
    dueDate: dates[2],
    notes: "Include budget estimates and timeline",
    subtasks: [
      { id: "subtask-1-1", text: "Research competitors", completed: true },
      { id: "subtask-1-2", text: "Draft executive summary", completed: false },
      { id: "subtask-1-3", text: "Create presentation slides", completed: false },
    ],
    position: 0,
  },
  {
    id: "task-2",
    text: "Grocery shopping",
    completed: true,
    category: "personal",
    startDate: dates[0],
    notes: "Don't forget reusable bags",
    subtasks: [
      { id: "subtask-2-1", text: "Fruits and vegetables", completed: true },
      { id: "subtask-2-2", text: "Dairy products", completed: true },
      { id: "subtask-2-3", text: "Bread and cereals", completed: true },
    ],
    position: 1,
  },
  {
    id: "task-3",
    text: "Read 'Atomic Habits'",
    completed: false,
    category: "read",
    timeDisplay: "0:45",
    startDate: dates[0],
    notes: "Chapter 3-5",
    subtasks: [],
    position: 2,
  },

  // Day 2 (Tomorrow)
  {
    id: "task-4",
    text: "Team meeting",
    completed: false,
    category: "work",
    timeDisplay: "1:00",
    time: "10:00 AM",
    startDate: dates[1],
    notes: "Prepare status update for ongoing projects",
    subtasks: [
      { id: "subtask-4-1", text: "Prepare slides", completed: false },
      { id: "subtask-4-2", text: "Review metrics", completed: false },
    ],
    position: 0,
  },
  {
    id: "task-5",
    text: "Gym workout",
    completed: false,
    category: "personal",
    timeDisplay: "1:00",
    time: "6:30 PM",
    startDate: dates[1],
    subtasks: [
      { id: "subtask-5-1", text: "Cardio - 20 min", completed: false },
      { id: "subtask-5-2", text: "Strength training - 30 min", completed: false },
      { id: "subtask-5-3", text: "Stretching - 10 min", completed: false },
    ],
    position: 1,
  },

  // Day 3
  {
    id: "task-6",
    text: "Client presentation",
    completed: false,
    category: "work",
    timeDisplay: "2:00",
    time: "2:00 PM",
    startDate: dates[2],
    dueDate: dates[2],
    notes: "Final review with the team at 10 AM",
    subtasks: [
      { id: "subtask-6-1", text: "Finalize slides", completed: false },
      { id: "subtask-6-2", text: "Practice presentation", completed: false },
      { id: "subtask-6-3", text: "Prepare for Q&A", completed: false },
    ],
    position: 0,
  },
  {
    id: "task-7",
    text: "Call parents",
    completed: false,
    category: "personal",
    time: "7:00 PM",
    startDate: dates[2],
    subtasks: [],
    position: 1,
  },

  // Day 4
  {
    id: "task-8",
    text: "Quarterly report review",
    completed: false,
    category: "work",
    timeDisplay: "3:00",
    startDate: dates[3],
    dueDate: dates[5],
    notes: "Focus on Q3 performance metrics",
    subtasks: [
      { id: "subtask-8-1", text: "Analyze sales data", completed: false },
      { id: "subtask-8-2", text: "Compare with previous quarters", completed: false },
      { id: "subtask-8-3", text: "Draft recommendations", completed: false },
    ],
    position: 0,
  },
  {
    id: "task-9",
    text: "Read 'Deep Work'",
    completed: false,
    category: "read",
    timeDisplay: "1:00",
    startDate: dates[3],
    notes: "Chapter 1-2",
    subtasks: [],
    position: 1,
  },

  // Day 5
  {
    id: "task-10",
    text: "Website redesign meeting",
    completed: false,
    category: "work",
    timeDisplay: "1:30",
    time: "11:00 AM",
    startDate: dates[4],
    notes: "Bring wireframes and user feedback",
    subtasks: [
      { id: "subtask-10-1", text: "Review user feedback", completed: false },
      { id: "subtask-10-2", text: "Discuss design options", completed: false },
    ],
    position: 0,
  },
  {
    id: "task-11",
    text: "Dinner with friends",
    completed: false,
    category: "personal",
    time: "7:30 PM",
    startDate: dates[4],
    notes: "At Italian restaurant downtown",
    subtasks: [
      { id: "subtask-11-1", text: "Make reservation", completed: true },
      { id: "subtask-11-2", text: "Buy wine", completed: false },
    ],
    position: 1,
  },

  // Day 6
  {
    id: "task-12",
    text: "Code review",
    completed: false,
    category: "work",
    timeDisplay: "2:00",
    startDate: dates[5],
    notes: "Focus on new authentication module",
    subtasks: [
      { id: "subtask-12-1", text: "Review PR #123", completed: false },
      { id: "subtask-12-2", text: "Test edge cases", completed: false },
      { id: "subtask-12-3", text: "Document findings", completed: false },
    ],
    position: 0,
  },
  {
    id: "task-13",
    text: "Home cleaning",
    completed: false,
    category: "personal",
    timeDisplay: "2:00",
    startDate: dates[5],
    subtasks: [
      { id: "subtask-13-1", text: "Vacuum and dust", completed: false },
      { id: "subtask-13-2", text: "Clean bathroom", completed: false },
      { id: "subtask-13-3", text: "Do laundry", completed: false },
    ],
    position: 1,
  },

  // Day 7
  {
    id: "task-14",
    text: "Weekly planning",
    completed: false,
    category: "work",
    timeDisplay: "1:00",
    startDate: dates[6],
    notes: "Set goals for next week",
    subtasks: [
      { id: "subtask-14-1", text: "Review this week's accomplishments", completed: false },
      { id: "subtask-14-2", text: "Set priorities for next week", completed: false },
      { id: "subtask-14-3", text: "Schedule important meetings", completed: false },
    ],
    position: 0,
  },
  {
    id: "task-15",
    text: "Read 'The Psychology of Money'",
    completed: false,
    category: "read",
    timeDisplay: "1:30",
    startDate: dates[6],
    notes: "Chapters 4-6",
    subtasks: [],
    position: 1,
  },
]
