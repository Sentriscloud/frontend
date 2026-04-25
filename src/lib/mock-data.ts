import type { Token, Holder, Trade } from '@/types'
import { getPrice, getMarketCap, getProgress } from './bonding-curve'

// ── Mock tokens (realistic CoinBlast data) ─────────────
const RAW: Omit<Token, 'price' | 'marketCap' | 'progress'>[] = [
  {
    address: 'SRX20_a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2',
    name: 'Nusantara Token',
    symbol: 'NUSA',
    description: 'The first community token celebrating Indonesian culture and heritage on Sentrix Chain.',
    imageUrl: 'https://api.dicebear.com/7.x/shapes/svg?seed=nusa&backgroundColor=0a5c2f',
    creator: '0x4f3319a747fd564136209cd5d9e7d1a1e4d142be',
    totalSupply: 1_000_000_000,
    tokensSold: 580_000_000,
    createdAt: Math.floor(Date.now() / 1000) - 86400 * 5,
    volume24h: 4_200,
    isGraduated: false,
    isWarned: false,
    isVerified: true,
    website: 'https://nusantaratoken.example.com',
    twitter: 'https://twitter.com/nusantaratoken',
    telegram: 'https://t.me/nusantaratoken',
  },
  {
    address: 'SRX20_b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3',
    name: 'FastChain',
    symbol: 'FSTC',
    description: 'Utility token for FastPoint MikroTik network. Earn FSTC by sharing bandwidth.',
    imageUrl: 'https://api.dicebear.com/7.x/shapes/svg?seed=fastchain&backgroundColor=1e40af',
    creator: '0xeb70fdefd00fdb768dec06c478f450c351499f14',
    totalSupply: 500_000_000,
    tokensSold: 486_000_000,
    createdAt: Math.floor(Date.now() / 1000) - 86400 * 12,
    volume24h: 8_750,
    isGraduated: false,
    isWarned: false,
    isVerified: true,
    website: 'https://fastchain.example.io',
    twitter: 'https://twitter.com/fastchaintoken',
    telegram: 'https://t.me/fastchainofficial',
    discord: 'https://discord.gg/fastchain',
  },
  {
    address: 'SRX20_c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4',
    name: 'SentDoge',
    symbol: 'SDOGE',
    description: 'The funniest dog on Sentrix Chain. Much block. Very chain. Wow.',
    imageUrl: 'https://api.dicebear.com/7.x/shapes/svg?seed=sentdoge&backgroundColor=b45309',
    creator: '0xa7fc67af1ba0c664d859f4c1bcd2eb1f7211f112',
    totalSupply: 420_690_000,
    tokensSold: 210_000_000,
    createdAt: Math.floor(Date.now() / 1000) - 86400 * 2,
    volume24h: 1_100,
    isGraduated: false,
    isWarned: false,
    isVerified: false,
    twitter: 'https://twitter.com/sentdoge',
    telegram: 'https://t.me/sentdoge',
  },
  {
    address: 'SRX20_d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5',
    name: 'Batik Digital',
    symbol: 'BATIK',
    description: 'Tokenizing Indonesian batik heritage — own a piece of cultural art on-chain.',
    imageUrl: 'https://api.dicebear.com/7.x/shapes/svg?seed=batik&backgroundColor=7c3aed',
    creator: '0x2578cad17e3e56c2970a5b5eab45952439f5ba97',
    totalSupply: 100_000_000,
    tokensSold: 12_000_000,
    createdAt: Math.floor(Date.now() / 1000) - 3600 * 6,
    volume24h: 320,
    isGraduated: false,
    isWarned: false,
    isVerified: false,
    // no socials — newly launched
  },
  {
    address: 'SRX20_e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6',
    name: 'Archipelago Coin',
    symbol: 'ARCH',
    description: '17,000 islands, one chain. Community governance token for the Indonesian crypto archipelago.',
    imageUrl: 'https://api.dicebear.com/7.x/shapes/svg?seed=archipelago&backgroundColor=065f46',
    creator: '0xd2116bc9767249ee2394840ee6bb02896009fb07',
    totalSupply: 17_000_000,
    tokensSold: 16_900_000,
    createdAt: Math.floor(Date.now() / 1000) - 86400 * 20,
    volume24h: 650,
    isGraduated: true,
    isWarned: false,
    isVerified: true,
    website: 'https://archipelagocoin.example.com',
    twitter: 'https://twitter.com/archipelagocoin',
    telegram: 'https://t.me/archipelagocoin',
    discord: 'https://discord.gg/archipelago',
  },
  {
    address: 'SRX20_f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1',
    name: 'MoonRupiah',
    symbol: 'MOONRP',
    description: '',
    imageUrl: 'https://api.dicebear.com/7.x/shapes/svg?seed=moonrp&backgroundColor=991b1b',
    creator: '0x0804a00f53fde72d46abd1db7ee3e97cbfd0a107',
    totalSupply: 1_000_000_000_000,
    tokensSold: 50_000_000_000,
    createdAt: Math.floor(Date.now() / 1000) - 3600,
    volume24h: 88,
    isGraduated: false,
    isWarned: true, // no description
    isVerified: false,
    // no socials — warned token
  },
]

// Compute derived fields
export const MOCK_TOKENS: Token[] = RAW.map((t) => ({
  ...t,
  price: getPrice(t.tokensSold, t.totalSupply),
  marketCap: getMarketCap(t.tokensSold, t.totalSupply),
  progress: t.isGraduated ? 100 : getProgress(t.tokensSold, t.totalSupply),
}))

// ── Mock holders ──────────────────────────────────────────
export const MOCK_HOLDERS: Holder[] = [
  { address: '0x4f3319a747fd564136209cd5d9e7d1a1e4d142be', amount: 45_000_000, percentage: 7.76 },
  { address: '0xeb70fdefd00fdb768dec06c478f450c351499f14', amount: 38_500_000, percentage: 6.64 },
  { address: '0xa7fc67af1ba0c664d859f4c1bcd2eb1f7211f112', amount: 22_000_000, percentage: 3.79 },
  { address: '0x2578cad17e3e56c2970a5b5eab45952439f5ba97', amount: 18_200_000, percentage: 3.14 },
  { address: '0x753f2f68829fbe76a0132295624f48b27ce2e2d9', amount: 12_500_000, percentage: 2.16 },
]

// ── Mock trades ───────────────────────────────────────────
export const MOCK_TRADES: Trade[] = [
  {
    txHash: '0xabc123def456',
    type: 'buy',
    address: '0x4f3319a747fd564136209cd5d9e7d1a1e4d142be',
    tokenAmount: 1_500_000,
    srxAmount: 150,
    timestamp: Math.floor(Date.now() / 1000) - 120,
  },
  {
    txHash: '0xdef456ghi789',
    type: 'sell',
    address: '0xeb70fdefd00fdb768dec06c478f450c351499f14',
    tokenAmount: 800_000,
    srxAmount: 78.4,
    timestamp: Math.floor(Date.now() / 1000) - 480,
  },
  {
    txHash: '0xghi789jkl012',
    type: 'buy',
    address: '0xa7fc67af1ba0c664d859f4c1bcd2eb1f7211f112',
    tokenAmount: 3_200_000,
    srxAmount: 315,
    timestamp: Math.floor(Date.now() / 1000) - 900,
  },
  {
    txHash: '0xjkl012mno345',
    type: 'buy',
    address: '0x2578cad17e3e56c2970a5b5eab45952439f5ba97',
    tokenAmount: 500_000,
    srxAmount: 49.2,
    timestamp: Math.floor(Date.now() / 1000) - 1800,
  },
]

// ── Aggregate stats ───────────────────────────────────────
export const PLATFORM_STATS = {
  totalTokens: 24,
  totalVolumeSRX: 142_800,
  totalSNTXBurned: 2_400, // 24 tokens × 100 SNTX
  activeTraders: 318,
}
