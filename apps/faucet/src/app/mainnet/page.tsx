import { FaucetForm } from '../_components/faucet-form'

export const metadata = {
  title: 'Sentrix Faucet — Mainnet (Chain 7119)',
  description: 'Claim a tiny amount of SRX on Sentrix Chain mainnet for new wallet onboarding (gas-only).',
}

export default function MainnetFaucetPage() {
  return (
    <FaucetForm
      network="mainnet"
      chainId={7119}
      defaultAmountSrx={parseFloat(process.env.MAINNET_DRIP_AMOUNT_SRX ?? '0.01')}
      turnstileSiteKey={process.env.NEXT_PUBLIC_MAINNET_TURNSTILE_SITE_KEY}
      explorerUrl={process.env.NEXT_PUBLIC_EXPLORER_URL ?? 'https://scan.sentrixchain.com'}
      publicRestUrl={process.env.NEXT_PUBLIC_MAINNET_REST_URL ?? 'https://api.sentrixchain.com'}
      docsUrl={process.env.NEXT_PUBLIC_DOCS_URL ?? 'https://sentrixchain.com/docs/faucet'}
    />
  )
}
