import { ethers } from 'ethers'

export const SENTRIX_CHAIN_ID = 7119
export const SENTRIX_CHAIN_HEX = `0x${SENTRIX_CHAIN_ID.toString(16)}` // 0x1bcf

export const SENTRIX_CHAIN_PARAMS = {
  chainId: SENTRIX_CHAIN_HEX,
  chainName: 'Sentrix Chain',
  nativeCurrency: {
    name: 'Sentrix',
    symbol: 'SRX',
    // 18 decimals at the EVM boundary (see canonical-contracts/WSRX.sol —
    // native ledger uses 8 decimals; the EVM db adapter scales by 1e10 so
    // eth_getBalance / msg.value / wei conventions all work normally).
    decimals: 18,
  },
  rpcUrls: [process.env.NEXT_PUBLIC_RPC_URL ?? 'https://rpc.sentrixchain.com/rpc'],
  blockExplorerUrls: [
    process.env.NEXT_PUBLIC_EXPLORER_URL ?? 'https://scan.sentrixchain.com',
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

/** Get SRX balance for an address (returns value in SRX, not wei). */
export async function getSRXBalance(address: string): Promise<number> {
  try {
    const provider = getReadProvider()
    // eth_getBalance returns wei (1 SRX = 1e18 wei) at the EVM boundary.
    // Earlier code divided by 1e8 ("sentri") which under-reports by 10^10×;
    // confirmed via WSRX.sol comment + standard EVM behaviour.
    const balance = await provider.getBalance(address)
    return Number(ethers.formatEther(balance))
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
