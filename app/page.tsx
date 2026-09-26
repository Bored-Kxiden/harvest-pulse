import { AuthGate } from '@/components/harbor/auth-gate'
import { HarborApp } from '@/components/harbor/app'
export default function Page() { return <AuthGate><HarborApp/></AuthGate> }
