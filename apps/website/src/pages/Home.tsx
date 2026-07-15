import { Hero } from "../sections/Hero";
import { NetworkLiveStats } from "../sections/NetworkLiveStats";
import { Network } from "../sections/Network";
import { ChainOverview } from "../sections/ChainOverview";
import { RatesAndFees } from "../sections/RatesAndFees";
import { ExplorerFeatures } from "../sections/ExplorerFeatures";
import { NetworkReference } from "../sections/NetworkReference";
import { Stack } from "../sections/Stack";
import { WalletConfiguration } from "../sections/WalletConfiguration";
import { Faq } from "../sections/Faq";
import { Build } from "../sections/Build";
import { Footer } from "../sections/Footer";

export function Home() {
  return (
    <>
      <main>
        <Hero />
        <NetworkLiveStats />
        <Network />
        <ChainOverview />
        <RatesAndFees />
        <ExplorerFeatures />
        <NetworkReference />
        <Stack />
        <WalletConfiguration />
        <Faq />
        <Build />
      </main>
      <Footer />
    </>
  );
}
