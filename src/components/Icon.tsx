import {
  Briefcase, Laptop, TrendingUp, PlusCircle, Home, Zap, ShoppingCart, Car, HeartPulse, GraduationCap, Utensils, PartyPopper,
  ShoppingBag, Tv, Sparkles, PiggyBank, Landmark, Tag, Shield, Plane, Gift, Dog, Baby, Gamepad2, Wrench, Smartphone, Coffee,
  Dumbbell, Book, Music, Shirt, Fuel, Bus, Receipt, Wallet, CreditCard, Building2, Target, Trophy, Gem, Bike, Pill, Wifi, Droplets,
  type LucideIcon,
} from 'lucide-react'

export const ICONS: Record<string, LucideIcon> = {
  briefcase: Briefcase, laptop: Laptop, 'trending-up': TrendingUp, 'plus-circle': PlusCircle, home: Home, zap: Zap,
  'shopping-cart': ShoppingCart, car: Car, 'heart-pulse': HeartPulse, 'graduation-cap': GraduationCap, utensils: Utensils,
  'party-popper': PartyPopper, 'shopping-bag': ShoppingBag, tv: Tv, sparkles: Sparkles, 'piggy-bank': PiggyBank, landmark: Landmark,
  tag: Tag, shield: Shield, plane: Plane, gift: Gift, dog: Dog, baby: Baby, gamepad: Gamepad2, wrench: Wrench, smartphone: Smartphone,
  coffee: Coffee, dumbbell: Dumbbell, book: Book, music: Music, shirt: Shirt, fuel: Fuel, bus: Bus, receipt: Receipt, wallet: Wallet,
  'credit-card': CreditCard, building: Building2, target: Target, trophy: Trophy, gem: Gem, bike: Bike, pill: Pill, wifi: Wifi, droplets: Droplets,
}

export function Icon({ name, className, size = 16 }: { name?: string; className?: string; size?: number }) {
  const C = (name && ICONS[name]) || Tag
  return <C className={className} size={size} />
}

/** ícone com fundo tingido pela cor da categoria */
export function IconBadge({ name, color, size = 'md' }: { name?: string; color?: string; size?: 'sm' | 'md' | 'lg' }) {
  const dim = size === 'sm' ? 'h-7 w-7' : size === 'lg' ? 'h-11 w-11' : 'h-9 w-9'
  const px = size === 'sm' ? 14 : size === 'lg' ? 20 : 16
  return (
    <span className={`inline-flex ${dim} shrink-0 items-center justify-center rounded-xl`} style={{ backgroundColor: (color ?? '#888') + '22', color }}>
      <Icon name={name} size={px} />
    </span>
  )
}
