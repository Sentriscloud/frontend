import { FaucetForm } from '../_components/faucet-form'

export const metadata = {
  title: 'Sentrix Faucet — Testnet (Chain 7120)',
  description: 'Claim free testnet SRX for development on Sentrix Chain testnet.',
}

export default function TestnetFaucetPage() {
  return (
    <FaucetForm
      network="testnet"
      chainId={7120}
      defaultAmountSrx={parseFloat(process.env.TESTNET_DRIP_AMOUNT_SRX ?? '10')}
      turnstileSiteKey={process.env.NEXT_PUBLIC_TESTNET_TURNSTILE_SITE_KEY}
      explorerUrl={process.env.NEXT_PUBLIC_EXPLORER_URL ?? 'https://scan.sentrixchain.com'}
      publicRestUrl={process.env.NEXT_PUBLIC_TESTNET_REST_URL ?? 'https://testnet-api.sentrixchain.com'}
      docsUrl={process.env.NEXT_PUBLIC_DOCS_URL ?? 'https://sentrixchain.com/docs/faucet'}
    />
  )
}
