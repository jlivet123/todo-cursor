"use client"

import dynamic from 'next/dynamic'
import { AppLayout } from "@/components/app-layout"

// Dynamically import the client component with SSR disabled
const AlterEgosClient = dynamic(
  () => import('./alter-egos-client'),
  { 
    ssr: false,
    loading: () => (
      <AppLayout>
        <div className="container mx-auto py-8 px-4">
          <div className="flex justify-between items-center mb-6">
            <div className="h-8 w-32 bg-gray-200 rounded animate-pulse"></div>
            <div className="h-8 w-24 bg-gray-200 rounded animate-pulse"></div>
          </div>
          <div className="h-12 w-full bg-gray-200 rounded mb-8 animate-pulse"></div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-48 bg-gray-200 rounded animate-pulse"></div>
            ))}
          </div>
        </div>
      </AppLayout>
    )
  }
)

export default function AlterEgosPage() {
  return (
    <AppLayout>
      <AlterEgosClient />
    </AppLayout>
  )
}

function AlterEgosIntroduction() {
  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-medium mb-2">Talk to Your Heroes & Mentors</h3>
        <p>
          Alter Egos lets you have meaningful conversations with the inspiring figures who have shaped our world.
          Whether it's Nelson Mandela's wisdom on courage, Einstein's thoughts on creativity, or Maya Angelou's
          perspective on resilience – connect with the minds that inspire you most.
        </p>
      </div>

      <div>
        <h3 className="text-lg font-medium mb-2">How It Works</h3>
        <h4 className="font-medium mb-1">Create Your Personal Council of Wisdom</h4>
        <ul className="list-disc pl-5 space-y-1 mb-3">
          <li>Add Alter Egos – Choose from history's greatest leaders, thinkers, artists, and visionaries</li>
          <li>Personalize – Add details about why they inspire you and what wisdom you seek</li>
          <li>Organize – Group your alter egos into categories like Leadership, Creativity, or Resilience</li>
        </ul>

        <h4 className="font-medium mb-1">Have Real Conversations</h4>
        <p className="mb-3">
          Start meaningful dialogues with your alter egos. They'll respond with the distinctive voice, wisdom, and
          perspective of the actual historical figure:
        </p>
        <div className="bg-muted p-3 rounded-md mb-3 italic">
          <p className="mb-2">"Nelson, I'm struggling with fear. I have a hard time breaking through it."</p>
          <p>
            "My dear friend, fear is not something we escape—it is something we walk through with dignity. When I was in
            prison for 27 years, fear visited me often. But I learned that courage is not the absence of fear, but the
            triumph over it."
          </p>
        </div>

        <h4 className="font-medium mb-1">Your Personal Growth Journey</h4>
        <ul className="list-disc pl-5 space-y-1">
          <li>Save conversations to revisit wisdom when you need it</li>
          <li>Build your collection of mentors for different areas of your life</li>
          <li>Access timeless guidance whenever you face challenges or need inspiration</li>
        </ul>
      </div>

      <div>
        <h3 className="text-lg font-medium mb-2">Why Alter Egos?</h3>
        <ul className="list-disc pl-5 space-y-1">
          <li>
            <span className="font-medium">Learn from the best</span> – Access centuries of human wisdom and experience
          </li>
          <li>
            <span className="font-medium">Personal development</span> – Gain new perspectives on your challenges
          </li>
          <li>
            <span className="font-medium">Inspiration on demand</span> – Connect with mentors who can guide you through
            difficult times
          </li>
          <li>
            <span className="font-medium">Fascinating conversations</span> – Explore ideas with history's greatest minds
          </li>
        </ul>
      </div>

      <div>
        <h3 className="text-lg font-medium mb-2">Get Started</h3>
        <p>
          Add your first alter ego today and begin conversations that could change how you see the world. Who will you
          talk to first?
        </p>
        <p className="mt-2 font-medium">Alter Egos – Wisdom from history's greatest minds, just a conversation away.</p>
      </div>
    </div>
  )
}
