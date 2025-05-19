"use client"

import { PageLayout } from "@/components/page-layout"
import dynamic from 'next/dynamic'

// Dynamically import the client component with no loading state
const AlterEgosClient = dynamic(
  () => import('./alter-egos-client'),
  { 
    ssr: false,
    loading: () => null
  }
)

export default function AlterEgosPage() {
  return (
    <PageLayout>
      <AlterEgosClient />
    </PageLayout>
  )
}