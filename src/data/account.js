import {
  Bell,
  Cloud,
  CreditCard,
  HelpCircle,
  Link2,
  LockKeyhole,
  MonitorSmartphone,
  Shield,
  UserRound,
} from 'lucide-react'

export const navItems = [
  { id: 'account', label: 'My Account', icon: UserRound },
  { id: 'security', label: 'Security', icon: Shield },
  { id: 'privacy', label: 'Privacy', icon: LockKeyhole },
  { id: 'notifications', label: 'Notifications', icon: Bell },
  { id: 'devices', label: 'Devices', icon: MonitorSmartphone },
  { id: 'linked', label: 'Linked accounts', icon: Link2 },
  { id: 'payments', label: 'Payments', icon: CreditCard },
  { id: 'storage', label: 'Data & storage', icon: Cloud },
  { id: 'help', label: 'Help', icon: HelpCircle },
]

// The only two OAuth providers actually wired up in Firebase Auth for
// this app (see src/config/firebase/auth.js + LoginPage's buttons).
export const oauthProviders = [
  { id: 'google.com', name: 'Google', mark: 'G' },
  { id: 'github.com', name: 'GitHub', mark: 'GH' },
]
