import { redirect } from 'next/navigation'

// Root redirects to /login — middleware handles authenticated users
export default function HomePage() {
  redirect('/login')
}
