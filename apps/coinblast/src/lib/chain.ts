import { ethers } from 'ethers'

export const SENTRIX_CHAIN_ID = 7119
export const SENTRIX_CHAIN_HEX = `0x${SENTRIX_CHAIN_ID.toString(16)}` // 0x1bcf

export const SENTRIX_CHAIN_PARAMS = {
  chainId: SENTRIX_CHAIN_HEX,
  chainName: 'Sentrix Chain',
  nativeCurrency: {
    name: 'Sentrix',
    symbol: 'SRX',
    decimals: 8,
  },
  rpcUrls: [process.env.NEXT_PUBLIC_RPC_URL ?? 'https://rpc.sentrixchain.com/rpc'],
  blockExplorerUrls: [
    process.env.NEXT_PUBLIC_EXPLORER_URL ?? 'https://sentrixscan.sentriscloud.com',
  ],
}

/** Read-only provider — for fetching balances, chain info, etc. */
export function getReadProvider(): ethers.JsonRpcProvider {
  return new ethers.JsonRpcProvider(
    process.env.NEXT_PUBLIC_RPC_URL ?? 'https://rpc.sentrixchain.com/rpc'
  )
}

/**
 * Connect MetaMask → switch to Sentrix Chain (add if not present).
 * Returns { provider, signer, address }.
 */
export async function connectWallet(): Promise<{
  provider: ethers.BrowserProvider
  signer: ethers.JsonRpcSigner
  address: string
}> {
  if (typeof window === 'undefined') {
    throw new Error('Not in browser environment')
  }

  const win = window as Window & { ethereum?: ethers.Eip1193Provider & { request: (args: { method: string; params?: unknown[] }) => Promise<unknown> } }

  if (!win.ethereum) {
    throw new Error('MetaMask not found. Please install MetaMask to connect.')
  }

  // Request accounts
  await win.ethereum.request({ method: 'eth_requestAccounts' })

  // Switch to Sentrix Chain
  try {
    await win.ethereum.request({
      method: 'wallet_switchEthereumChain',
      params: [{ chainId: SENTRIX_CHAIN_HEX }],
    })
  } catch (e: unknown) {
    const err = e as { code?: number }
    // 4902 = chain not added yet
    if (err?.code === 4902) {
      await win.ethereum.request({
        method: 'wallet_addEthereumChain',
        params: [SENTRIX_CHAIN_PARAMS],
      })
    } else {
      throw e
    }
  }

  const provider = new ethers.BrowserProvider(win.ethereum)
  const signer = await provider.getSigner()
  const address = await signer.getAddress()

  return { provider, signer, address }
}

/** Get SRX balance for an address (returns value in SRX, not sentri). */
export async function getSRXBalance(address: string): Promise<number> {
  try {
    const provider = getReadProvider()
    const result = await provider.send('eth_getBalance', [address, 'latest']) as string
    // Balance is in sentri (1 SRX = 100_000_000 sentri)
    const sentri = BigInt(result)
    return Number(sentri) / 100_000_000
  } catch {
    return 0
  }
}

/** Get current chain height. */
export async function getChainHeight(): Promise<number> {
  try {
    const res = await fetch(
      `${process.env.NEXT_PUBLIC_API_URL ?? 'https://api.sentrixchain.com'}/chain/info`
    )
    const data = await res.json()
    return data.height ?? 0
  } catch {
    return 0
  }
}
